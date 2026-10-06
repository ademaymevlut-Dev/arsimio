import type {
  StudentFinanceContractItemKind,
  StudentFinanceContractItemStatus,
  StudentFinanceContractStatus,
} from "@/generated/prisma/client";
import { validRevision, validSchoolId } from "./platform-school-validation";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const ZERO = BigInt(0);
const HUNDRED = BigInt(100);
const FIVE_THOUSAND = BigInt(5000);
const TEN_THOUSAND = BigInt(10000);
const CONTRACT_STATUSES = new Set<StudentFinanceContractStatus>([
  "DRAFT",
  "ACTIVE",
  "CANCELLED",
]);
const ITEM_KINDS = new Set<StudentFinanceContractItemKind>([
  "TUITION",
  "MEAL",
  "TRANSPORT",
  "UNIFORM",
  "BOOK_MATERIAL",
  "EXAM_ACTIVITY",
  "OTHER",
  "LATE_FEE",
]);
const ITEM_STATUSES = new Set<StudentFinanceContractItemStatus>([
  "ACTIVE",
  "ARCHIVED",
]);

export type FinanceField =
  | "record"
  | "contractId"
  | "itemId"
  | "studentProfileId"
  | "academicYearId"
  | "responsibleGuardianRelationshipId"
  | "protocolNumber"
  | "contractStatus"
  | "currencyCode"
  | "issuedOn"
  | "note"
  | "itemKind"
  | "itemDescription"
  | "grossAmount"
  | "discountRate"
  | "itemStatus"
  | "sortOrder"
  | "itemNote";

export type FinanceState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<FinanceField, string>>;
  entityId?: string;
};

export type SaveStudentFinanceContractInput = {
  contractId: string | null;
  revision: string | null;
  studentProfileId: string;
  academicYearId: string;
  responsibleGuardianRelationshipId: string;
  protocolNumber: string;
  status: StudentFinanceContractStatus;
  currencyCode: string;
  issuedOn: Date;
  note: string | null;
};

export type StudentFinanceContractItemAmounts = {
  grossAmount: string;
  discountRate: string;
  discountAmount: string;
  netAmount: string;
};

export type SaveStudentFinanceContractItemInput =
  StudentFinanceContractItemAmounts & {
    contractId: string;
    itemId: string | null;
    revision: string | null;
    kind: StudentFinanceContractItemKind;
    description: string;
    status: StudentFinanceContractItemStatus;
    sortOrder: number;
    note: string | null;
  };

type Parsed<T> =
  | { success: true; data: T }
  | { success: false; state: FinanceState };

function text(value: FormDataEntryValue | null, max: number) {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
}

function optionalText(value: FormDataEntryValue | null, max: number) {
  if (value === null || value === "") return null;
  return text(value, max);
}

function currencyCode(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function provided(value: FormDataEntryValue | null) {
  return typeof value === "string" && value !== "";
}

function parseMoneyCents(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const units = BigInt(match[1]);
  const cents = BigInt((match[2] ?? "").padEnd(2, "0"));
  return units * HUNDRED + cents;
}

function parsePercentBasisPoints(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const whole = BigInt(match[1]);
  const decimals = BigInt((match[2] ?? "").padEnd(2, "0"));
  const basisPoints = whole * HUNDRED + decimals;
  return basisPoints <= TEN_THOUSAND ? basisPoints : null;
}

function formatCents(cents: bigint) {
  const sign = cents < ZERO ? "-" : "";
  const absolute = cents < ZERO ? -cents : cents;
  return `${sign}${absolute / HUNDRED}.${(absolute % HUNDRED).toString().padStart(2, "0")}`;
}

function formatBasisPoints(basisPoints: bigint) {
  return `${basisPoints / HUNDRED}.${(basisPoints % HUNDRED).toString().padStart(2, "0")}`;
}

function parseSortOrder(value: FormDataEntryValue | null) {
  if (value === null || value === "") return 0;
  if (typeof value !== "string" || !/^\d{1,4}$/.test(value)) return null;
  return Number.parseInt(value, 10);
}

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

export function formatStudentFinanceContractDisplayNumber(
  academicYearName: string,
  protocolNumber: string,
) {
  return `${academicYearName.trim()} - Protocol ${protocolNumber.trim()}`;
}

export function calculateStudentFinanceContractItemAmounts(
  grossAmount: string,
  discountRate: string,
): StudentFinanceContractItemAmounts | null {
  const grossCents = parseMoneyCents(grossAmount);
  const basisPoints = parsePercentBasisPoints(discountRate);
  if (grossCents === null || basisPoints === null || grossCents <= ZERO)
    return null;

  const discountCents =
    (grossCents * basisPoints + FIVE_THOUSAND) / TEN_THOUSAND;
  const netCents = grossCents - discountCents;

  return {
    grossAmount: formatCents(grossCents),
    discountRate: formatBasisPoints(basisPoints),
    discountAmount: formatCents(discountCents),
    netAmount: formatCents(netCents),
  };
}

export function parseSaveStudentFinanceContract(
  form: FormData,
): Parsed<SaveStudentFinanceContractInput> {
  const contractIdRaw = form.get("contractId");
  const contractId =
    typeof contractIdRaw === "string" && contractIdRaw ? contractIdRaw : null;
  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && revisionRaw ? revisionRaw : null;
  const studentProfileId = form.get("studentProfileId");
  const academicYearId = form.get("academicYearId");
  const responsibleGuardianRelationshipId = form.get(
    "responsibleGuardianRelationshipId",
  );
  const protocolNumber = text(form.get("protocolNumber"), 80);
  const statusRaw = form.get("contractStatus");
  const status =
    typeof statusRaw === "string" &&
    CONTRACT_STATUSES.has(statusRaw as StudentFinanceContractStatus)
      ? (statusRaw as StudentFinanceContractStatus)
      : "DRAFT";
  const code = currencyCode(form.get("currencyCode")) ?? "EUR";
  const issuedOnRaw = form.get("issuedOn");
  const issuedOn = parseDateOnly(issuedOnRaw);
  const noteRaw = form.get("note");
  const note = optionalText(noteRaw, 1000);
  const fieldErrors: FinanceState["fieldErrors"] = {};

  if (contractId && !validSchoolId(contractId))
    fieldErrors.record = "Kontrat kaydi gecersiz.";
  if (contractId && !validRevision(revision))
    fieldErrors.record = "Kontrat kaydi guncel degil.";
  if (!validSchoolId(studentProfileId))
    fieldErrors.studentProfileId = "Ogrenci kaydi gecersiz.";
  if (!validSchoolId(academicYearId))
    fieldErrors.academicYearId = "Ogretim yili gecersiz.";
  if (!validSchoolId(responsibleGuardianRelationshipId))
    fieldErrors.responsibleGuardianRelationshipId =
      "Odeme sorumlusu veli gecersiz.";
  if (!protocolNumber) fieldErrors.protocolNumber = "Protokol no gecersiz.";
  if (
    provided(statusRaw) &&
    !CONTRACT_STATUSES.has(statusRaw as StudentFinanceContractStatus)
  )
    fieldErrors.contractStatus = "Kontrat durumu gecersiz.";
  if (
    provided(form.get("currencyCode")) &&
    !currencyCode(form.get("currencyCode"))
  )
    fieldErrors.currencyCode = "Para birimi gecersiz.";
  if (!issuedOn) fieldErrors.issuedOn = "Protokol tarihi gecersiz.";
  if (provided(noteRaw) && !note) fieldErrors.note = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(studentProfileId) ||
    !validSchoolId(academicYearId) ||
    !validSchoolId(responsibleGuardianRelationshipId) ||
    !protocolNumber ||
    !issuedOn ||
    (contractId && (!validSchoolId(contractId) || !validRevision(revision)))
  ) {
    return {
      success: false,
      state: {
        status: "error",
        message: "Finans kontrat bilgileri gecersiz.",
        fieldErrors,
      },
    };
  }

  return {
    success: true,
    data: {
      contractId,
      revision,
      studentProfileId,
      academicYearId,
      responsibleGuardianRelationshipId,
      protocolNumber,
      status,
      currencyCode: code,
      issuedOn,
      note,
    },
  };
}

export function parseSaveStudentFinanceContractItem(
  form: FormData,
): Parsed<SaveStudentFinanceContractItemInput> {
  const contractId = form.get("contractId");
  const itemIdRaw = form.get("itemId");
  const itemId = typeof itemIdRaw === "string" && itemIdRaw ? itemIdRaw : null;
  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && revisionRaw ? revisionRaw : null;
  const kindRaw = form.get("itemKind");
  const kind =
    typeof kindRaw === "string" &&
    ITEM_KINDS.has(kindRaw as StudentFinanceContractItemKind)
      ? (kindRaw as StudentFinanceContractItemKind)
      : null;
  const description = text(form.get("itemDescription"), 200);
  const grossCents = parseMoneyCents(form.get("grossAmount"));
  const discountBasisPoints =
    parsePercentBasisPoints(form.get("discountRate")) ?? ZERO;
  const amounts =
    grossCents !== null
      ? calculateStudentFinanceContractItemAmounts(
          formatCents(grossCents),
          formatBasisPoints(discountBasisPoints),
        )
      : null;
  const statusRaw = form.get("itemStatus");
  const status =
    typeof statusRaw === "string" &&
    ITEM_STATUSES.has(statusRaw as StudentFinanceContractItemStatus)
      ? (statusRaw as StudentFinanceContractItemStatus)
      : "ACTIVE";
  const sortOrder = parseSortOrder(form.get("sortOrder"));
  const noteRaw = form.get("itemNote");
  const note = optionalText(noteRaw, 1000);
  const fieldErrors: FinanceState["fieldErrors"] = {};

  if (!validSchoolId(contractId)) fieldErrors.contractId = "Kontrat gecersiz.";
  if (itemId && !validSchoolId(itemId)) fieldErrors.itemId = "Kalem gecersiz.";
  if (itemId && !validRevision(revision))
    fieldErrors.record = "Kalem kaydi guncel degil.";
  if (!kind) fieldErrors.itemKind = "Kalem turu gecersiz.";
  if (!description) fieldErrors.itemDescription = "Kalem aciklamasi gecersiz.";
  if (grossCents === null || grossCents <= ZERO)
    fieldErrors.grossAmount = "Brut tutar gecersiz.";
  if (
    provided(form.get("discountRate")) &&
    parsePercentBasisPoints(form.get("discountRate")) === null
  )
    fieldErrors.discountRate = "Indirim yuzdesi gecersiz.";
  if (
    provided(statusRaw) &&
    !ITEM_STATUSES.has(statusRaw as StudentFinanceContractItemStatus)
  )
    fieldErrors.itemStatus = "Kalem durumu gecersiz.";
  if (sortOrder === null) fieldErrors.sortOrder = "Siralama gecersiz.";
  if (provided(noteRaw) && !note) fieldErrors.itemNote = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(contractId) ||
    (itemId && (!validSchoolId(itemId) || !validRevision(revision))) ||
    !kind ||
    !description ||
    !amounts ||
    sortOrder === null
  ) {
    return {
      success: false,
      state: {
        status: "error",
        message: "Finans kalem bilgileri gecersiz.",
        fieldErrors,
      },
    };
  }

  return {
    success: true,
    data: {
      contractId,
      itemId,
      revision,
      kind,
      description,
      ...amounts,
      status,
      sortOrder,
      note,
    },
  };
}
