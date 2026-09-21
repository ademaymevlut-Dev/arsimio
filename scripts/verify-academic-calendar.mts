import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  persistAcademicTerm,
  persistAcademicYear,
  transitionAcademicTerm,
  transitionAcademicYear,
} from "../src/server/academics/academic-calendar-service";

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
const rollback = new Error("EXPECTED_ACADEMIC_CALENDAR_TEST_ROLLBACK");
const fixturePrefix = `academic-calendar-${randomUUID()}`;
let passed = 0;

function pass(message: string) {
  passed++;
  console.log(`PASS ${message}`);
}

try {
  const permissions = await db.permission.findMany({
    where: { code: { in: ["academics.read", "academics.manage"] } },
    select: { code: true },
  });
  assert.deepEqual(
    permissions.map(({ code }) => code).sort(),
    ["academics.manage", "academics.read"],
  );
  const schoolAdminRoles = await db.role.findMany({
    where: { scope: "SCHOOL", code: "SCHOOL_ADMIN" },
    select: {
      id: true,
      permissions: {
        where: {
          permission: {
            code: { in: ["academics.read", "academics.manage"] },
          },
        },
        select: { permissionId: true },
      },
    },
  });
  assert.ok(schoolAdminRoles.length > 0, "At least one SCHOOL_ADMIN role is required");
  assert.ok(schoolAdminRoles.every((role) => role.permissions.length === 2));
  pass("academic permissions exist on every current school administrator role");

  await db.$transaction(
    async (tx) => {
      const actor = await tx.user.create({ data: { status: "ACTIVE" } });
      const school = await tx.school.create({
        data: {
          slug: `${fixturePrefix}-a`,
          name: "Academic calendar test school A",
          status: "ACTIVE",
        },
      });
      const otherSchool = await tx.school.create({
        data: {
          slug: `${fixturePrefix}-b`,
          name: "Academic calendar test school B",
          status: "ACTIVE",
        },
      });
      const membership = await tx.schoolMembership.create({
        data: {
          schoolId: school.id,
          userId: actor.id,
          username: "calendar.admin",
          status: "ACTIVE",
        },
      });
      const actorContext = {
        schoolId: school.id,
        actorUserId: actor.id,
        actorMembershipId: membership.id,
      };

      assert.equal(
        (
          await persistAcademicYear(tx, actorContext, {
            id: null,
            revision: null,
            name: "2026 / 2027",
            startDate: new Date("2026-09-01T00:00:00.000Z"),
            endDate: new Date("2027-06-30T00:00:00.000Z"),
          })
        ).status,
        "success",
      );
      const firstYear = await tx.academicYear.findFirstOrThrow({
        where: { schoolId: school.id, name: "2026 / 2027" },
      });
      for (const term of [
        {
          name: "1. Dönem",
          sequence: 1,
          startDate: new Date("2026-09-01T00:00:00.000Z"),
          endDate: new Date("2027-01-22T00:00:00.000Z"),
        },
        {
          name: "2. Dönem",
          sequence: 2,
          startDate: new Date("2027-02-08T00:00:00.000Z"),
          endDate: new Date("2027-06-30T00:00:00.000Z"),
        },
      ]) {
        assert.equal(
          (
            await persistAcademicTerm(tx, actorContext, {
              id: null,
              revision: null,
              academicYearId: firstYear.id,
              ...term,
            })
          ).status,
          "success",
        );
      }
      const overlap = await persistAcademicTerm(tx, actorContext, {
        id: null,
        revision: null,
        academicYearId: firstYear.id,
        name: "Çakışan dönem",
        sequence: 3,
        startDate: new Date("2027-01-20T00:00:00.000Z"),
        endDate: new Date("2027-02-10T00:00:00.000Z"),
      });
      assert.equal(overlap.status, "error");
      assert.equal(
        await tx.academicTerm.count({
          where: { schoolId: school.id, academicYearId: firstYear.id },
        }),
        2,
      );
      pass("year and non-overlapping terms persist atomically; overlap is rejected");

      assert.equal(
        (
          await transitionAcademicYear(tx, actorContext, {
            id: firstYear.id,
            revision: firstYear.updatedAt.toISOString(),
            transition: "activate",
          })
        ).status,
        "success",
      );
      const firstTerm = await tx.academicTerm.findFirstOrThrow({
        where: { academicYearId: firstYear.id, sequence: 1 },
      });
      assert.equal(
        (
          await transitionAcademicTerm(tx, actorContext, {
            id: firstTerm.id,
            revision: firstTerm.updatedAt.toISOString(),
            transition: "activate",
          })
        ).status,
        "success",
      );

      assert.equal(
        (
          await persistAcademicYear(tx, actorContext, {
            id: null,
            revision: null,
            name: "2027 / 2028",
            startDate: new Date("2027-09-01T00:00:00.000Z"),
            endDate: new Date("2028-06-30T00:00:00.000Z"),
          })
        ).status,
        "success",
      );
      const nextYear = await tx.academicYear.findFirstOrThrow({
        where: { schoolId: school.id, name: "2027 / 2028" },
      });
      assert.equal(
        (
          await persistAcademicTerm(tx, actorContext, {
            id: null,
            revision: null,
            academicYearId: nextYear.id,
            name: "1. Dönem",
            sequence: 1,
            startDate: nextYear.startDate,
            endDate: new Date("2028-01-21T00:00:00.000Z"),
          })
        ).status,
        "success",
      );
      assert.equal(
        (
          await transitionAcademicYear(tx, actorContext, {
            id: nextYear.id,
            revision: nextYear.updatedAt.toISOString(),
            transition: "activate",
          })
        ).status,
        "success",
      );
      assert.equal(
        await tx.academicYear.count({
          where: { schoolId: school.id, status: "ACTIVE" },
        }),
        1,
      );
      assert.equal(
        (await tx.academicYear.findUniqueOrThrow({ where: { id: firstYear.id } }))
          .status,
        "CLOSED",
      );
      assert.equal(
        (await tx.academicTerm.findUniqueOrThrow({ where: { id: firstTerm.id } }))
          .status,
        "CLOSED",
      );
      pass("activating a new year closes the previous active year and term");

      const otherYear = await tx.academicYear.create({
        data: {
          schoolId: otherSchool.id,
          name: "Other school year",
          startDate: new Date("2026-09-01T00:00:00.000Z"),
          endDate: new Date("2027-06-30T00:00:00.000Z"),
        },
      });
      const crossSchoolWrite = await persistAcademicYear(tx, actorContext, {
        id: otherYear.id,
        revision: otherYear.updatedAt.toISOString(),
        name: "Tenant escape attempt",
        startDate: otherYear.startDate,
        endDate: otherYear.endDate,
      });
      assert.equal(crossSchoolWrite.status, "error");
      assert.equal(
        (await tx.academicYear.findUniqueOrThrow({ where: { id: otherYear.id } }))
          .name,
        "Other school year",
      );
      pass("service rejects an academic record owned by another school");

      const events = await tx.auditEvent.findMany({
        where: { schoolId: school.id },
      });
      assert.ok(events.length >= 9);
      assert.ok(
        events.every(
          (event) =>
            event.actorUserId === actor.id &&
            event.actorMembershipId === membership.id,
        ),
      );
      assert.ok(
        events.some(
          (event) =>
            event.action === "academic.term.closed" &&
            event.reason?.includes("automatically"),
        ),
      );
      pass("every successful mutation records the tenant actor and automatic changes");

      throw rollback;
    },
    { isolationLevel: "Serializable", timeout: 60000 },
  );
} catch (error) {
  if (error !== rollback) {
    console.error("Academic calendar verification failed; details withheld.", {
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
