import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import { LEGACY_SUBJECT_CATALOG } from "./data/legacy-subject-catalog";
import { planSubjectSeed } from "./lib/subject-seed-plan";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
neonConfig.webSocketConstructor = globalThis.WebSocket;

const args = process.argv.slice(2);
const schoolArg = args.find((arg) => arg.startsWith("--school="));
const schoolSlug = schoolArg?.slice("--school=".length);
const apply = args.includes("--apply");
assert.ok(schoolSlug && /^[a-z0-9][a-z0-9-]{1,78}$/.test(schoolSlug),
  "Use --school=<school-slug> (for example --school=horizonedu).");
assert.ok(args.every((arg) => arg === schoolArg || arg === "--apply"),
  "Only --school=<school-slug> and --apply are supported.");
const connection =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;
assert.ok(connection, "Database connection is required.");

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: connection }),
});

try {
  const school = await db.school.findUnique({ where: { slug: schoolSlug } });
  assert.ok(school && school.status === "ACTIVE" && !school.archivedAt,
    "The requested active school was not found.");
  const locale = ["tr", "sq", "en"].includes(school.defaultLocale)
    ? (school.defaultLocale as "tr" | "sq" | "en")
    : "tr";

  async function plan() {
    const existing = await db.subject.findMany({
      where: { schoolId: school!.id },
      include: { translations: { select: { locale: true, name: true } } },
    });
    return planSubjectSeed(LEGACY_SUBJECT_CATALOG, existing);
  }

  if (!apply) {
    const result = await plan();
    console.log(JSON.stringify({
      mode: "dry-run",
      school: school.slug,
      catalog: LEGACY_SUBJECT_CATALOG.length,
      toCreate: result.create.length,
      unchanged: result.unchanged.length,
      conflicts: result.conflicts,
      writes: false,
    }, null, 2));
    if (result.conflicts.length) process.exitCode = 1;
  } else {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.subject.findMany({
        where: { schoolId: school.id },
        include: { translations: { select: { locale: true, name: true } } },
      });
      const currentPlan = planSubjectSeed(LEGACY_SUBJECT_CATALOG, existing);
      assert.equal(currentPlan.conflicts.length, 0,
        `Subject catalog has conflicts: ${currentPlan.conflicts.join("; ")}`);

      const toCreate = currentPlan.create.map((entry) => ({ id: randomUUID(), entry }));
      if (toCreate.length) {
        const inserted = await tx.subject.createMany({
          data: toCreate.map(({ id, entry }) => ({
            id,
            schoolId: school.id,
            name: entry[locale],
            track: entry.track,
          })),
        });
        assert.equal(inserted.count, toCreate.length);
        const translations = await tx.subjectTranslation.createMany({
          data: toCreate.flatMap(({ id, entry }) =>
            (["tr", "sq", "en"] as const).map((language) => ({
              subjectId: id,
              schoolId: school.id,
              locale: language,
              name: entry[language],
            })),
          ),
        });
        assert.equal(translations.count, toCreate.length * 3);
        const audits = await tx.auditEvent.createMany({
          data: toCreate.map(({ id, entry }) => ({
            schoolId: school.id,
            source: "IMPORT" as const,
            action: "academic.subject.seeded",
            entityType: "Subject",
            entityId: id,
            afterData: {
              names: { tr: entry.tr, sq: entry.sq, en: entry.en },
              track: entry.track,
            },
            changedFields: ["names", "track"],
            reason: "Legacy HorizonEdu subject catalog screenshot, 2026-09-23",
          })),
        });
        assert.equal(audits.count, toCreate.length);
      }
      return currentPlan;
    }, { isolationLevel: "Serializable", timeout: 30000 });

    console.log(JSON.stringify({
      mode: "applied",
      school: school.slug,
      created: result.create.length,
      unchanged: result.unchanged.length,
      catalog: LEGACY_SUBJECT_CATALOG.length,
    }, null, 2));
  }
} finally {
  await db.$disconnect();
}
