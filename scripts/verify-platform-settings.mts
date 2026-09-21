import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import { persistSchoolSettings } from "../src/server/platform/school-settings-service";
import { DEFAULT_BRANDING } from "../src/lib/school-branding";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
const connection =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;
assert.ok(connection, "Database connection is required");
neonConfig.webSocketConstructor = globalThis.WebSocket;
const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: connection }),
});
const rollback = new Error("EXPECTED_SETTINGS_TEST_ROLLBACK");
const fixturePrefix = `settings-test-${randomUUID()}`;
let passed = 0;
function pass(message: string) {
  passed++;
  console.log(`PASS ${message}`);
}

try {
  await db.$transaction(
    async (tx) => {
      // No roles, credentials or sessions are created. Everything is rolled back.
      const actor = await tx.user.create({ data: { status: "ACTIVE" } });
      const school = await tx.school.create({
        data: {
          slug: `${fixturePrefix}-a`,
          name: "Test school A",
          status: "ACTIVE",
        },
      });
      const other = await tx.school.create({
        data: {
          slug: `${fixturePrefix}-b`,
          name: "Test school B",
          status: "ACTIVE",
          branding: { create: { primaryColor: "#0f766e" } },
        },
      });
      const base = {
        id: school.id,
        actorUserId: actor.id,
        revision: school.updatedAt.toISOString(),
        kind: "profile" as const,
        profile: { name: "Updated test school", legalName: "Test legal name" },
        colors: null,
      };
      const profile = await persistSchoolSettings(tx, base);
      assert.equal(profile.status, "success");
      assert.equal(
        (await tx.school.findUniqueOrThrow({ where: { id: school.id } })).name,
        "Updated test school",
      );
      pass("profile changes persist through the real service");
      const unchanged = await persistSchoolSettings(tx, {
        ...base,
        revision: profile.revision!,
      });
      assert.equal(unchanged.status, "success");
      assert.equal(unchanged.revision, profile.revision);
      assert.equal(
        await tx.auditEvent.count({ where: { schoolId: school.id } }),
        1,
      );
      pass("unchanged profile submits do not write or create audit noise");
      assert.equal(
        (
          await persistSchoolSettings(tx, {
            ...base,
            profile: { name: "Stale name", legalName: null },
          })
        ).status,
        "error",
      );
      assert.equal(
        (await tx.school.findUniqueOrThrow({ where: { id: school.id } })).name,
        "Updated test school",
      );
      pass("stale profile revision cannot overwrite a newer save");

      const brandInput = {
        ...base,
        kind: "branding" as const,
        revision: "new",
        profile: null,
        colors: { ...DEFAULT_BRANDING },
      };
      const created = await persistSchoolSettings(tx, brandInput);
      assert.equal(created.status, "success");
      assert.ok(created.revision);
      assert.equal(
        (await persistSchoolSettings(tx, brandInput)).status,
        "error",
      );
      pass(
        "missing branding is created once and duplicate creation is rejected",
      );
      const asset = await tx.schoolBranding.update({
        where: { schoolId: school.id },
        data: {
          logoAssetKey: "fixtures/existing-logo.png",
          iconAssetKey: "fixtures/existing-icon.png",
        },
      });
      const revised = await persistSchoolSettings(tx, {
        ...brandInput,
        revision: asset.updatedAt.toISOString(),
        colors: { ...DEFAULT_BRANDING, primaryColor: "#123456" },
      });
      assert.equal(revised.status, "success");
      const savedBrand = await tx.schoolBranding.findUniqueOrThrow({
        where: { schoolId: school.id },
      });
      assert.equal(savedBrand.primaryColor, "#123456");
      assert.equal(savedBrand.logoAssetKey, "fixtures/existing-logo.png");
      assert.equal(savedBrand.iconAssetKey, "fixtures/existing-icon.png");
      pass("color updates preserve existing logo and icon assets");
      assert.equal(
        (
          await persistSchoolSettings(tx, {
            ...brandInput,
            revision: asset.updatedAt.toISOString(),
          })
        ).status,
        "error",
      );
      pass("stale branding revision is rejected");
      assert.equal(
        (await tx.school.findUniqueOrThrow({ where: { id: other.id } })).name,
        "Test school B",
      );
      assert.equal(
        (
          await tx.schoolBranding.findUniqueOrThrow({
            where: { schoolId: other.id },
          })
        ).primaryColor,
        "#0f766e",
      );
      pass("another school's profile and branding remain unchanged");

      const events = await tx.auditEvent.findMany({
        where: { schoolId: school.id, actorUserId: actor.id },
        orderBy: { createdAt: "asc" },
      });
      assert.equal(events.length, 3);
      assert.ok(
        events.some(
          (event) =>
            event.action === "platform.school.updated" &&
            event.beforeData &&
            event.afterData,
        ),
      );
      assert.equal(
        events.filter((event) => event.action === "platform.branding.updated")
          .length,
        2,
      );
      assert.equal(
        JSON.stringify(events).includes("fixtures/existing-logo.png"),
        false,
      );
      pass(
        "successful settings changes have transactional before/after audit; conflicts do not",
      );
      await tx.school.update({
        where: { id: school.id },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
      assert.equal(
        (
          await persistSchoolSettings(tx, {
            ...base,
            revision: profile.revision!,
          })
        ).status,
        "error",
      );
      assert.equal(
        (
          await persistSchoolSettings(tx, {
            ...brandInput,
            revision: revised.revision!,
          })
        ).status,
        "error",
      );
      assert.equal(
        (await persistSchoolSettings(tx, { ...base, id: randomUUID() })).status,
        "error",
      );
      pass("archived and missing schools reject settings writes");
      throw rollback;
    },
    { isolationLevel: "Serializable", timeout: 60000 },
  );
} catch (error) {
  if (error !== rollback) {
    console.error("Platform verification failed; sensitive details withheld.", {
      afterCheck: passed,
      name: error instanceof Error ? error.name : "unknown",
    });
    process.exitCode = 1;
  } else {
    assert.equal(
      await db.school.count({ where: { slug: { startsWith: fixturePrefix } } }),
      0,
    );
    console.log(
      `${passed} database checks passed. All fixtures and writes rolled back; no test data retained.`,
    );
  }
} finally {
  await db.$disconnect();
}
