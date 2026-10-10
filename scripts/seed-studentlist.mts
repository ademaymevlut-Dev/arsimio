import assert from "node:assert/strict";
import {
  createCipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import type {
  GuardianRelationshipType,
  IdentityType,
  PersonSex,
  Prisma,
} from "../src/generated/prisma/client";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
neonConfig.webSocketConstructor = globalThis.WebSocket;

const SOURCE_FILE = "docs/studentlist.csv";
const SOURCE_MARKER = "studentlist.csv";
const PER_SCHOOL_TARGET = 120;
const SCHOOL_SLUGS = ["horizonedu", "gjimcamedu"] as const;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
assert.ok(
  args.every((arg) => arg === "--apply"),
  "Only --apply is supported. Without --apply the script runs as dry-run.",
);

const connection =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;
assert.ok(connection, "Database connection is required.");

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: connection }),
});

type CsvRow = {
  lineNumber: number;
  width: number;
  repaired: boolean;
  id: string;
  stuDateReg: string;
  stuRegClass: string | null;
  stuPersid: string | null;
  stuName: string;
  stuSurname: string;
  stuFather: string | null;
  stuMother: string | null;
  stuProfession: string | null;
  stuGender: string | null;
  stuBirthday: string | null;
  stuBorned: string | null;
  stuNationaly: string | null;
  stuRezidence: string | null;
  stuLagja: string | null;
  stuAdresses: string | null;
  stuPhones1: string | null;
  stuPhones2: string | null;
  stuEmail1: string | null;
  stuEmail2: string | null;
  stuSituation: string;
};

type PlannedRow = {
  schoolSlug: (typeof SCHOOL_SLUGS)[number];
  row: CsvRow;
};

type ImportStats = {
  selected: number;
  existing: number;
  createdStudents: number;
  createdGuardians: number;
  createdRelationships: number;
  createdContacts: number;
  createdIdentities: number;
  skippedIdentities: number;
  duplicateIdentities: number;
  lifecycleEvents: number;
  auditEvents: number;
};

function blankToNull(value: string | null | undefined) {
  const trimmed = (value ?? "").normalize("NFKC").trim();
  return trimmed.length ? trimmed : null;
}

function compact(value: string | null | undefined, maxLength?: number) {
  const normalized = blankToNull(value)?.replace(/\s+/g, " ") ?? null;
  if (!normalized) return null;
  return maxLength ? normalized.slice(0, maxLength) : normalized;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes) {
        if (next === '"') {
          current += '"';
          index += 1;
        } else if (next === "," || next === undefined) {
          inQuotes = false;
        } else {
          current += char;
        }
      } else if (current.length === 0) {
        inQuotes = true;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function logicalCsvLines(text: string) {
  const rawLines = text.split(/\r?\n/);
  const [header, ...dataLines] = rawLines;
  const lines = [header ?? ""];
  let current = "";

  for (const rawLine of dataLines) {
    if (!rawLine.trim()) continue;
    if (/^\d+,/.test(rawLine)) {
      if (current) lines.push(current);
      current = rawLine;
    } else {
      current += rawLine;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 6 && /^[+]?[\d\s()./-]+$/.test(trimmed);
}

function isPasswordHash(value: string) {
  return value.trim().startsWith("pbkdf2:") || /^\d{3,8}$/.test(value.trim());
}

function fixBrokenCsvRow(fields: string[], lineNumber: number): CsvRow | null {
  if (fields.length < 21) return null;

  const prefix = fields.slice(0, 15);
  const tail = fields.slice(15);
  const statusIndex = tail.findLastIndex((value) =>
    ["active", "passive"].includes(value.trim().toLowerCase()),
  );
  if (statusIndex < 0) return null;

  const situation = tail[statusIndex]!.trim();
  const beforeStatus = tail.slice(0, statusIndex);
  const afterStatus = tail.slice(statusIndex + 1);
  const withoutHash = beforeStatus.filter((value) => !isPasswordHash(value));

  const emailsFromRight: string[] = [];
  const remainingAfterEmails: string[] = [];
  for (let index = withoutHash.length - 1; index >= 0; index -= 1) {
    const value = withoutHash[index]!;
    if (emailsFromRight.length < 2 && isEmail(value)) {
      emailsFromRight.unshift(value);
    } else {
      remainingAfterEmails.unshift(value);
    }
  }

  const phonesFromRight: string[] = [];
  const addressParts: string[] = [];
  for (let index = remainingAfterEmails.length - 1; index >= 0; index -= 1) {
    const value = remainingAfterEmails[index]!;
    if (phonesFromRight.length < 2 && isPhone(value)) {
      phonesFromRight.unshift(value);
    } else {
      addressParts.unshift(value);
    }
  }

  const directHash = afterStatus.find(isPasswordHash);
  const row = toCsvRow(
    [
      ...prefix,
      addressParts.join(", "),
      phonesFromRight[0] ?? "",
      phonesFromRight[1] ?? "",
      emailsFromRight[0] ?? "",
      emailsFromRight[1] ?? "",
      situation,
      directHash ?? "",
    ],
    lineNumber,
    fields.length,
    true,
  );
  return row;
}

function toCsvRow(
  fields: string[],
  lineNumber: number,
  width: number,
  repaired: boolean,
): CsvRow {
  return {
    lineNumber,
    width,
    repaired,
    id: compact(fields[0], 80) ?? "",
    stuDateReg: compact(fields[1], 20) ?? "",
    stuRegClass: compact(fields[2], 40),
    stuPersid: compact(fields[3], 80),
    stuName: compact(fields[4], 100) ?? "",
    stuSurname: compact(fields[5], 100) ?? "",
    stuFather: compact(fields[6], 100),
    stuMother: compact(fields[7], 100),
    stuProfession: compact(fields[8], 150),
    stuGender: compact(fields[9], 40),
    stuBirthday: compact(fields[10], 20),
    stuBorned: compact(fields[11], 150),
    stuNationaly: compact(fields[12], 100),
    stuRezidence: compact(fields[13], 120),
    stuLagja: compact(fields[14], 120),
    stuAdresses: compact(fields[15], 500),
    stuPhones1: compact(fields[16], 80),
    stuPhones2: compact(fields[17], 80),
    stuEmail1: compact(fields[18], 320),
    stuEmail2: compact(fields[19], 320),
    stuSituation: compact(fields[20], 40) ?? "",
  };
}

function parseStudentList() {
  const text = readFileSync(SOURCE_FILE, "utf8").replace(/^\uFEFF/, "");
  const lines = logicalCsvLines(text).filter((line) => line.trim().length > 0);
  const header = parseCsvLine(lines[0] ?? "");
  assert.equal(header.length, 22, "Unexpected studentlist.csv header width.");

  const rows: CsvRow[] = [];
  const invalid: Array<{ lineNumber: number; reason: string; width: number }> = [];

  for (let index = 1; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const fields = parseCsvLine(lines[index]!);
    const cleanStatus = fields[20]?.trim().toLowerCase();

    let row: CsvRow | null = null;
    if (
      fields.length === 22 &&
      (cleanStatus === "active" || cleanStatus === "passive")
    ) {
      row = toCsvRow(fields, lineNumber, fields.length, false);
    } else {
      row = fixBrokenCsvRow(fields, lineNumber);
    }

    if (!row) {
      invalid.push({
        lineNumber,
        reason: "CSV row could not be repaired.",
        width: fields.length,
      });
      continue;
    }

    if (!row.id || !row.stuName || !row.stuSurname) {
      invalid.push({
        lineNumber,
        reason: "Student id/name/surname is missing.",
        width: fields.length,
      });
      continue;
    }

    rows.push(row);
  }

  return { rows, invalid, totalLines: lines.length - 1 };
}

function parseDateOnly(value: string | null) {
  const text = compact(value, 20);
  if (!text) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

function mapSex(value: string | null): PersonSex | null {
  const normalized = (value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
  if (["1", "m", "male", "mashkull"].includes(normalized)) return "MALE";
  if (["2", "f", "female", "femer", "vajze", "vajza"].includes(normalized))
    return "FEMALE";
  return null;
}

function normalizePhone(value: string | null) {
  const raw = compact(value, 80);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return {
    value: raw,
    normalizedValue: `${raw.startsWith("+") ? "+" : ""}${digits}`,
  };
}

function normalizeEmail(value: string | null) {
  const raw = compact(value, 320);
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (!isEmail(normalized)) return null;
  return { value: raw, normalizedValue: normalized };
}

function encryptionKey(value = process.env.PERSON_IDENTITY_ENCRYPTION_KEY) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const decoded = /^[0-9a-f]{64}$/i.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");
  return decoded.length === 32 ? decoded : null;
}

function normalizeIdentity(value: string) {
  return value.normalize("NFKC").toUpperCase().replace(/[\s.-]+/g, "");
}

function protectIdentity(schoolId: string, type: IdentityType, value: string) {
  const key = encryptionKey();
  if (!key) return null;
  const normalized = normalizeIdentity(value);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`${schoolId}:${type}`, "utf8"));
  const encrypted = Buffer.concat([
    cipher.update(value.trim(), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const lookupHash = createHmac("sha256", key)
    .update(`${schoolId}:${type}:${normalized}`)
    .digest("hex");
  const checksum = createHash("sha256").update(encrypted).digest("hex");

  return {
    encryptedValue: new Uint8Array(
      Buffer.concat([Buffer.from([1]), iv, tag, encrypted]),
    ),
    lookupHash,
    lastFour: normalized.slice(-4),
    checksum,
  };
}

async function allocateStudentNumber(
  tx: Prisma.TransactionClient,
  schoolId: string,
) {
  const rows = await tx.$queryRaw<Array<{ allocated: bigint }>>`
    INSERT INTO "school_number_sequences" ("school_id", "kind", "next_value", "updated_at")
    VALUES (${schoolId}::uuid, 'STUDENT_NUMBER'::"SchoolSequenceKind", 2, CURRENT_TIMESTAMP)
    ON CONFLICT ("school_id", "kind") DO UPDATE
      SET "next_value" = "school_number_sequences"."next_value" + 1,
          "updated_at" = CURRENT_TIMESTAMP
    RETURNING "next_value" - 1 AS "allocated"
  `;
  const allocated = rows[0]?.allocated;
  if (!allocated || allocated < BigInt(1))
    throw new Error("STUDENT_NUMBER_ALLOCATION_FAILED");
  return allocated.toString();
}

function sourceNote(row: CsvRow) {
  return `${SOURCE_MARKER} legacy_id=${row.id} legacy_class=${row.stuRegClass ?? "-"} source_line=${row.lineNumber}`;
}

async function createContactPoints(
  tx: Prisma.TransactionClient,
  schoolId: string,
  personId: string,
  contacts: {
    phone: ReturnType<typeof normalizePhone>;
    email: ReturnType<typeof normalizeEmail>;
  },
) {
  let count = 0;
  if (contacts.phone) {
    await tx.personContactPoint.create({
      data: {
        schoolId,
        personId,
        kind: "PHONE",
        value: contacts.phone.value,
        normalizedValue: contacts.phone.normalizedValue,
        isPrimaryForPerson: true,
      },
    });
    count += 1;
  }
  if (contacts.email) {
    await tx.personContactPoint.create({
      data: {
        schoolId,
        personId,
        kind: "EMAIL",
        value: contacts.email.value,
        normalizedValue: contacts.email.normalizedValue,
        isPrimaryForPerson: true,
      },
    });
    count += 1;
  }
  return count;
}

async function createGuardian(
  tx: Prisma.TransactionClient,
  input: {
    schoolId: string;
    studentProfileId: string;
    firstName: string | null;
    fallbackLastName: string;
    occupationText: string | null;
    relationshipType: GuardianRelationshipType;
    isPrimary: boolean;
    phone: ReturnType<typeof normalizePhone>;
    email: ReturnType<typeof normalizeEmail>;
    legacyId: string;
  },
) {
  if (!input.firstName) return { guardian: 0, relationship: 0, contacts: 0 };
  const person = await tx.person.create({
    data: {
      schoolId: input.schoolId,
      firstName: input.firstName,
      lastName: input.fallbackLastName,
      occupationText: input.occupationText,
    },
  });
  const relationship = await tx.guardianRelationship.create({
    data: {
      schoolId: input.schoolId,
      studentProfileId: input.studentProfileId,
      guardianPersonId: person.id,
      relationshipType: input.relationshipType,
      isLegalGuardian: true,
      isPrimaryContact: input.isPrimary,
      isFinancialResponsible: input.isPrimary,
      note: `${SOURCE_MARKER} legacy_id=${input.legacyId}`,
    },
  });
  const contacts = await createContactPoints(tx, input.schoolId, person.id, {
    phone: input.phone,
    email: input.email,
  });
  return {
    guardian: 1,
    relationship: relationship ? 1 : 0,
    contacts,
  };
}

async function importOneStudent(
  tx: Prisma.TransactionClient,
  schoolId: string,
  row: CsvRow,
) {
  const marker = sourceNote(row);
  const existing = await tx.studentProfile.findFirst({
    where: {
      schoolId,
      internalNote: { contains: `${SOURCE_MARKER} legacy_id=${row.id}` },
    },
    select: { id: true },
  });
  if (existing) {
    return {
      existing: 1,
      createdStudents: 0,
      createdGuardians: 0,
      createdRelationships: 0,
      createdContacts: 0,
      createdIdentities: 0,
      skippedIdentities: 0,
      duplicateIdentities: 0,
      lifecycleEvents: 0,
      auditEvents: 0,
    } satisfies Omit<ImportStats, "selected">;
  }

  const admittedOn = parseDateOnly(row.stuDateReg) ?? new Date("2026-09-01T00:00:00.000Z");
  const birthDate = parseDateOnly(row.stuBirthday);
  const studentNumber = await allocateStudentNumber(tx, schoolId);
  const person = await tx.person.create({
    data: {
      schoolId,
      firstName: row.stuName,
      lastName: row.stuSurname,
      birthDate,
      birthPlace: row.stuBorned,
      nationalityText: row.stuNationaly,
      sex: mapSex(row.stuGender),
    },
  });
  const student = await tx.studentProfile.create({
    data: {
      schoolId,
      personId: person.id,
      studentNumber,
      admittedOn,
      residenceCity: row.stuRezidence,
      neighborhood: row.stuLagja,
      addressLine: row.stuAdresses,
      internalNote: marker,
    },
  });
  await tx.studentLifecycleEvent.create({
    data: {
      schoolId,
      studentProfileId: student.id,
      type: "ACTIVATED",
      effectiveOn: admittedOn,
      note: "Imported from studentlist.csv without academic placement.",
    },
  });

  let createdIdentities = 0;
  let skippedIdentities = 0;
  let duplicateIdentities = 0;
  const identityValue = row.stuPersid;
  if (identityValue) {
    const protectedIdentity = protectIdentity(schoolId, "NATIONAL_ID", identityValue);
    if (!protectedIdentity) {
      skippedIdentities += 1;
    } else {
      const duplicate = await tx.personIdentity.findFirst({
        where: {
          schoolId,
          type: "NATIONAL_ID",
          lookupHash: protectedIdentity.lookupHash,
        },
        select: { id: true },
      });
      if (duplicate) {
        duplicateIdentities += 1;
      } else {
        await tx.personIdentity.create({
          data: {
            schoolId,
            personId: person.id,
            type: "NATIONAL_ID",
            countryCode: "XK",
            encryptedValue: protectedIdentity.encryptedValue,
            lookupHash: protectedIdentity.lookupHash,
            lastFour: protectedIdentity.lastFour,
          },
        });
        createdIdentities += 1;
      }
    }
  }

  const fatherIsPrimary = Boolean(row.stuFather);
  const father = await createGuardian(tx, {
    schoolId,
    studentProfileId: student.id,
    firstName: row.stuFather,
    fallbackLastName: row.stuSurname,
    occupationText: row.stuProfession,
    relationshipType: "FATHER",
    isPrimary: fatherIsPrimary,
    phone: normalizePhone(row.stuPhones1),
    email: normalizeEmail(row.stuEmail1),
    legacyId: row.id,
  });
  const mother = await createGuardian(tx, {
    schoolId,
    studentProfileId: student.id,
    firstName: row.stuMother,
    fallbackLastName: row.stuSurname,
    occupationText: row.stuProfession,
    relationshipType: "MOTHER",
    isPrimary: !fatherIsPrimary,
    phone: normalizePhone(row.stuPhones2),
    email: normalizeEmail(row.stuEmail2),
    legacyId: row.id,
  });

  await tx.auditEvent.create({
    data: {
      schoolId,
      source: "IMPORT",
      action: "student.seeded",
      entityType: "StudentProfile",
      entityId: student.id,
      afterData: {
        source: SOURCE_MARKER,
        legacyId: row.id,
        legacyClass: row.stuRegClass,
        sourceLine: row.lineNumber,
        studentNumber,
        guardians: {
          father: Boolean(row.stuFather),
          mother: Boolean(row.stuMother),
          primary: fatherIsPrimary ? "FATHER" : "MOTHER",
        },
        academicPlacement: null,
      },
      changedFields: [
        "person",
        "studentProfile",
        "studentNumber",
        "guardians",
        "contactPoints",
      ],
      reason: "Demo studentlist.csv seed, academic assignment intentionally omitted.",
    },
  });

  return {
    existing: 0,
    createdStudents: 1,
    createdGuardians: father.guardian + mother.guardian,
    createdRelationships: father.relationship + mother.relationship,
    createdContacts: father.contacts + mother.contacts,
    createdIdentities,
    skippedIdentities,
    duplicateIdentities,
    lifecycleEvents: 1,
    auditEvents: 1,
  } satisfies Omit<ImportStats, "selected">;
}

function emptyStats(selected: number): ImportStats {
  return {
    selected,
    existing: 0,
    createdStudents: 0,
    createdGuardians: 0,
    createdRelationships: 0,
    createdContacts: 0,
    createdIdentities: 0,
    skippedIdentities: 0,
    duplicateIdentities: 0,
    lifecycleEvents: 0,
    auditEvents: 0,
  };
}

function addStats(target: ImportStats, delta: Omit<ImportStats, "selected">) {
  target.existing += delta.existing;
  target.createdStudents += delta.createdStudents;
  target.createdGuardians += delta.createdGuardians;
  target.createdRelationships += delta.createdRelationships;
  target.createdContacts += delta.createdContacts;
  target.createdIdentities += delta.createdIdentities;
  target.skippedIdentities += delta.skippedIdentities;
  target.duplicateIdentities += delta.duplicateIdentities;
  target.lifecycleEvents += delta.lifecycleEvents;
  target.auditEvents += delta.auditEvents;
}

try {
  const parsed = parseStudentList();
  const activeRows = parsed.rows.filter(
    (row) => row.stuSituation.trim().toLowerCase() === "active",
  );
  assert.ok(
    activeRows.length >= PER_SCHOOL_TARGET * SCHOOL_SLUGS.length,
    `Need at least ${PER_SCHOOL_TARGET * SCHOOL_SLUGS.length} active rows.`,
  );

  const selected: PlannedRow[] = SCHOOL_SLUGS.flatMap((schoolSlug, schoolIndex) =>
    activeRows
      .slice(
        schoolIndex * PER_SCHOOL_TARGET,
        (schoolIndex + 1) * PER_SCHOOL_TARGET,
      )
      .map((row) => ({ schoolSlug, row })),
  );

  const schools = await db.school.findMany({
    where: {
      slug: { in: [...SCHOOL_SLUGS] },
      status: "ACTIVE",
      archivedAt: null,
    },
    select: { id: true, slug: true, name: true },
  });
  const schoolBySlug = new Map(schools.map((school) => [school.slug, school]));
  for (const slug of SCHOOL_SLUGS) {
    assert.ok(schoolBySlug.has(slug), `Active school not found: ${slug}`);
  }

  const existingBySchool = Object.fromEntries(
    await Promise.all(
      SCHOOL_SLUGS.map(async (schoolSlug) => {
        const school = schoolBySlug.get(schoolSlug)!;
        const count = await db.studentProfile.count({
          where: {
            schoolId: school.id,
            internalNote: { contains: `${SOURCE_MARKER} legacy_id=` },
          },
        });
        return [schoolSlug, count] as const;
      }),
    ),
  );

  if (!apply) {
    const plannedBySchool = Object.fromEntries(
      SCHOOL_SLUGS.map((schoolSlug) => [
        schoolSlug,
        selected.filter((entry) => entry.schoolSlug === schoolSlug).length,
      ]),
    );
    console.log(JSON.stringify({
      mode: "dry-run",
      file: SOURCE_FILE,
      rows: {
        source: parsed.totalLines,
        parsed: parsed.rows.length,
        invalid: parsed.invalid.length,
        repaired: parsed.rows.filter((row) => row.repaired).length,
        active: activeRows.length,
        passive: parsed.rows.length - activeRows.length,
      },
      selection: {
        targetPerSchool: PER_SCHOOL_TARGET,
        plannedBySchool,
        existingSeededBySchool: existingBySchool,
        academicAssignments: false,
        accounts: false,
      },
      identityProtectionConfigured: Boolean(encryptionKey()),
      sample: selected.slice(0, 3).map((entry) => ({
        school: entry.schoolSlug,
        legacyId: entry.row.id,
        student: `${entry.row.stuName} ${entry.row.stuSurname}`,
      })),
      invalidRows: parsed.invalid.slice(0, 10),
      writes: false,
    }, null, 2));
  } else {
    const result = Object.fromEntries(
      SCHOOL_SLUGS.map((schoolSlug) => [
        schoolSlug,
        emptyStats(
          selected.filter((entry) => entry.schoolSlug === schoolSlug).length,
        ),
      ]),
    ) as Record<(typeof SCHOOL_SLUGS)[number], ImportStats>;

    for (const [index, entry] of selected.entries()) {
      const school = schoolBySlug.get(entry.schoolSlug)!;
      const delta = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('arsimio_studentlist_seed_v1'))`;
        return importOneStudent(tx, school.id, entry.row);
      }, { isolationLevel: "Serializable", timeout: 30000 });
      addStats(result[entry.schoolSlug], delta);

      if ((index + 1) % 20 === 0 || index + 1 === selected.length) {
        console.error(`[seed:studentlist] processed ${index + 1}/${selected.length}`);
      }
    }

    console.log(JSON.stringify({
      mode: "applied",
      file: SOURCE_FILE,
      academicAssignments: false,
      accounts: false,
      schools: result,
      identityProtectionConfigured: Boolean(encryptionKey()),
    }, null, 2));
  }
} finally {
  await db.$disconnect();
}
