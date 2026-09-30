import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import { tr } from "../src/i18n/dictionaries/tr";
import {
  persistGuardianRelationship,
  persistPrimaryGuardian,
  persistStudent,
  persistStudentTransition,
} from "../src/server/students/student-service";

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
const rollback = new Error("EXPECTED_STUDENT_RECORDS_TEST_ROLLBACK");
const fixturePrefix = `student-records-${randomUUID()}`;
const admittedOn = new Date("2026-09-01T00:00:00.000Z");
let passed = 0;

function pass(message: string) {
  passed += 1;
  console.log(`PASS ${message}`);
}

try {
  await db.$transaction(
    async (tx) => {
      process.env.PERSON_IDENTITY_ENCRYPTION_KEY ??= "7f".repeat(32);
      const actorUser = await tx.user.create({ data: { status: "ACTIVE" } });
      const school = await tx.school.create({
        data: {
          slug: `${fixturePrefix}-a`,
          name: "Student records A",
          status: "ACTIVE",
        },
      });
      const otherSchool = await tx.school.create({
        data: {
          slug: `${fixturePrefix}-b`,
          name: "Student records B",
          status: "ACTIVE",
        },
      });
      const membership = await tx.schoolMembership.create({
        data: {
          schoolId: school.id,
          userId: actorUser.id,
          username: "student.admin",
          status: "ACTIVE",
        },
      });
      const year = await tx.academicYear.create({
        data: {
          schoolId: school.id,
          name: "2026 / 2027",
          startDate: admittedOn,
          endDate: new Date("2027-06-30T00:00:00.000Z"),
          status: "ACTIVE",
        },
      });
      const grade = await tx.gradeLevelDefinition.create({
        data: {
          schoolId: school.id,
          code: "1",
          displayLabel: "1. Sınıf",
          sequence: 1,
        },
      });
      const section = await tx.classSectionDefinition.create({
        data: {
          schoolId: school.id,
          gradeLevelDefinitionId: grade.id,
          code: "A",
          displayLabel: "1 / A",
        },
      });
      const annualClass = await tx.academicYearClassSection.create({
        data: {
          schoolId: school.id,
          academicYearId: year.id,
          classSectionDefinitionId: section.id,
        },
      });
      const actor = {
        schoolId: school.id,
        actorUserId: actorUser.id,
        actorMembershipId: membership.id,
        messages: tr.studentServer,
      };

      const firstResult = await persistStudent(tx, actor, {
        firstName: "Ada",
        middleName: null,
        lastName: "Yılmaz",
        birthDate: new Date("2018-05-10T00:00:00.000Z"),
        birthPlace: "Prishtina",
        nationalityText: "Kosova",
        sex: "FEMALE",
        identity: {
          type: "NATIONAL_ID",
          value: "1234-5678",
          countryCode: "XK",
        },
        academicYearId: year.id,
        academicYearClassSectionId: annualClass.id,
        admittedOn,
      });
      assert.equal(firstResult.status, "success");
      assert.ok(firstResult.entityId);
      const student = await tx.studentProfile.findUniqueOrThrow({
        where: { id: firstResult.entityId },
        include: {
          person: { include: { identities: true } },
          enrollments: { include: { placements: true } },
          lifecycleEvents: true,
        },
      });
      assert.equal(student.studentNumber, "1");
      assert.equal(student.person.identities[0]?.lastFour, "5678");
      assert.notEqual(
        Buffer.from(student.person.identities[0]!.encryptedValue).toString("utf8"),
        "1234-5678",
      );
      assert.equal(student.enrollments.length, 1);
      assert.equal(student.enrollments[0]!.placements.length, 1);
      assert.equal(student.lifecycleEvents[0]?.type, "ACTIVATED");
      pass("student creation atomically creates person, protected identity, permanent number, enrollment, placement, and lifecycle");

      const duplicateIdentity = await persistStudent(tx, actor, {
        firstName: "Duplicate",
        middleName: null,
        lastName: "Identity",
        birthDate: null,
        birthPlace: null,
        nationalityText: null,
        sex: null,
        identity: {
          type: "NATIONAL_ID",
          value: "1234 5678",
          countryCode: "XK",
        },
        academicYearId: year.id,
        academicYearClassSectionId: annualClass.id,
        admittedOn,
      });
      assert.equal(duplicateIdentity.status, "error");
      assert.equal(
        await tx.person.count({ where: { schoolId: school.id } }),
        1,
      );
      pass("normalized identity lookup rejects duplicates without leaking or creating partial records");

      const secondResult = await persistStudent(tx, actor, {
        firstName: "Deniz",
        middleName: null,
        lastName: "Kaya",
        birthDate: null,
        birthPlace: null,
        nationalityText: null,
        sex: null,
        identity: null,
        academicYearId: year.id,
        academicYearClassSectionId: annualClass.id,
        admittedOn,
      });
      assert.equal(secondResult.status, "success");
      const secondStudent = await tx.studentProfile.findUniqueOrThrow({
        where: { id: secondResult.entityId },
      });
      assert.equal(secondStudent.studentNumber, "2");
      pass("school-local student numbers are monotonic and do not contain an academic year");

      const existingPerson = await tx.person.create({
        data: {
          schoolId: school.id,
          firstName: "Mira",
          lastName: "Yılmaz",
        },
      });
      const firstGuardianResult = await persistGuardianRelationship(tx, actor, {
        studentProfileId: student.id,
        mode: "existing",
        guardianPersonId: existingPerson.id,
        relationshipType: "MOTHER",
        isLegalGuardian: true,
        isPrimaryContact: true,
        firstName: null,
        middleName: null,
        lastName: null,
        phone: null,
        email: null,
      });
      assert.equal(firstGuardianResult.status, "success");
      assert.equal(
        await tx.person.count({ where: { id: existingPerson.id } }),
        1,
      );
      pass("an existing person is linked as a guardian without creating a duplicate person record");

      const foreignPerson = await tx.person.create({
        data: {
          schoolId: otherSchool.id,
          firstName: "Foreign",
          lastName: "Person",
        },
      });
      const foreignResult = await persistGuardianRelationship(tx, actor, {
        studentProfileId: student.id,
        mode: "existing",
        guardianPersonId: foreignPerson.id,
        relationshipType: "FATHER",
        isLegalGuardian: true,
        isPrimaryContact: false,
        firstName: null,
        middleName: null,
        lastName: null,
        phone: null,
        email: null,
      });
      assert.equal(foreignResult.status, "error");
      pass("guardian linking rejects a person from another tenant");

      const secondGuardianResult = await persistGuardianRelationship(tx, actor, {
        studentProfileId: student.id,
        mode: "new",
        guardianPersonId: null,
        relationshipType: "FATHER",
        isLegalGuardian: true,
        isPrimaryContact: true,
        firstName: "Arben",
        middleName: null,
        lastName: "Yılmaz",
        phone: "+383 44 123 456",
        email: "arben@example.com",
      });
      assert.equal(secondGuardianResult.status, "success");
      assert.equal(
        await tx.guardianRelationship.count({
          where: {
            studentProfileId: student.id,
            archivedAt: null,
            isPrimaryContact: true,
          },
        }),
        1,
      );
      const secondGuardian = await tx.guardianRelationship.findUniqueOrThrow({
        where: { id: secondGuardianResult.entityId },
        include: { guardianPerson: { include: { contactPoints: true } } },
      });
      assert.equal(secondGuardian.guardianPerson.contactPoints.length, 2);
      pass("new parent creation stores person contacts and atomically replaces the primary guardian");

      assert.ok(firstGuardianResult.entityId);
      const primaryResult = await persistPrimaryGuardian(tx, actor, {
        studentProfileId: student.id,
        relationshipId: firstGuardianResult.entityId,
      });
      assert.equal(primaryResult.status, "success");
      assert.equal(
        (
          await tx.guardianRelationship.findUniqueOrThrow({
            where: { id: firstGuardianResult.entityId },
          })
        ).isPrimaryContact,
        true,
      );
      pass("primary guardian changes preserve the one-primary invariant");

      const currentStudent = await tx.studentProfile.findUniqueOrThrow({
        where: { id: student.id },
      });
      const inactiveResult = await persistStudentTransition(tx, actor, {
        studentProfileId: student.id,
        revision: currentStudent.updatedAt.toISOString(),
        transition: "inactive",
        effectiveOn: new Date("2026-10-01T00:00:00.000Z"),
        exitReason: "OTHER_SCHOOL",
        note: "Verification transfer",
      });
      assert.equal(inactiveResult.status, "success");
      const inactiveStudent = await tx.studentProfile.findUniqueOrThrow({
        where: { id: student.id },
        include: {
          enrollments: { include: { placements: true } },
          lifecycleEvents: true,
        },
      });
      assert.equal(inactiveStudent.status, "INACTIVE");
      assert.equal(inactiveStudent.enrollments[0]?.status, "COMPLETED");
      assert.ok(inactiveStudent.enrollments[0]?.placements[0]?.validTo);
      assert.ok(
        inactiveStudent.lifecycleEvents.some(
          (event) => event.type === "TRANSFERRED_OUT",
        ),
      );
      pass("inactivation closes active enrollment and placement while retaining history and reason");

      const staleResult = await persistStudentTransition(tx, actor, {
        studentProfileId: student.id,
        revision: currentStudent.updatedAt.toISOString(),
        transition: "reactivate",
        effectiveOn: new Date("2026-10-02T00:00:00.000Z"),
        exitReason: null,
        note: null,
      });
      assert.equal(staleResult.status, "error");
      pass("optimistic revision checks reject stale lifecycle changes");

      const events = await tx.auditEvent.findMany({
        where: { schoolId: school.id },
      });
      assert.ok(events.length >= 6);
      assert.ok(
        events.every(
          (event) =>
            event.actorUserId === actorUser.id &&
            event.actorMembershipId === membership.id,
        ),
      );
      pass("student, guardian, primary, and lifecycle writes are tenant-audited");

      throw rollback;
    },
    { isolationLevel: "Serializable", timeout: 60_000 },
  );
} catch (error) {
  if (error !== rollback) {
    console.error("Student records verification failed; details withheld.", {
      afterCheck: passed,
      name: error instanceof Error ? error.name : "unknown",
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "unknown",
      meta:
        typeof error === "object" && error !== null && "meta" in error
          ? error.meta
          : undefined,
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
