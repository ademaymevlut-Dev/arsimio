import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  persistClassSection,
  persistCourseOffering,
  persistEducationStage,
  persistGradeLevel,
  persistLessonPeriod,
  persistSubject,
  transitionAcademicStructure,
} from "../src/server/academics/academic-structure-service";
import { tr } from "../src/i18n/dictionaries/tr";

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
const rollback = new Error("EXPECTED_ACADEMIC_STRUCTURE_TEST_ROLLBACK");
const fixturePrefix = `academic-structure-${randomUUID()}`;
let passed = 0;

function pass(message: string) {
  passed++;
  console.log(`PASS ${message}`);
}

try {
  await db.$transaction(
    async (tx) => {
      const actor = await tx.user.create({ data: { status: "ACTIVE" } });
      const school = await tx.school.create({
        data: {
          slug: `${fixturePrefix}-a`,
          name: "Academic structure school A",
          status: "ACTIVE",
        },
      });
      const otherSchool = await tx.school.create({
        data: {
          slug: `${fixturePrefix}-b`,
          name: "Academic structure school B",
          status: "ACTIVE",
        },
      });
      const membership = await tx.schoolMembership.create({
        data: {
          schoolId: school.id,
          userId: actor.id,
          username: "structure.admin",
          status: "ACTIVE",
        },
      });
      const year = await tx.academicYear.create({
        data: {
          schoolId: school.id,
          name: "2026 / 2027",
          startDate: new Date("2026-09-01T00:00:00.000Z"),
          endDate: new Date("2027-06-30T00:00:00.000Z"),
        },
      });
      const otherYear = await tx.academicYear.create({
        data: {
          schoolId: otherSchool.id,
          name: "Other year",
          startDate: new Date("2026-09-01T00:00:00.000Z"),
          endDate: new Date("2027-06-30T00:00:00.000Z"),
        },
      });
      const actorContext = {
        schoolId: school.id,
        actorUserId: actor.id,
        actorMembershipId: membership.id,
        locale: "tr" as const,
        defaultLocale: "tr" as const,
        messages: tr.academicStructureServer,
      };

      assert.equal(
        (
          await persistEducationStage(tx, actorContext, {
            id: null,
            revision: null,
            academicYearId: year.id,
            code: "PRIMARY",
            sequence: 1,
            names: {
              tr: "İlkokul",
              sq: "Shkolla fillore",
              en: "Primary School",
            },
          })
        ).status,
        "success",
      );
      const stage = await tx.educationStage.findFirstOrThrow({
        where: { schoolId: school.id, academicYearId: year.id },
        include: { translations: true },
      });
      assert.equal(stage.translations.length, 3);
      assert.equal(new Set(stage.translations.map(({ educationStageId }) => educationStageId)).size, 1);
      pass("one education stage id owns all three localized names");

      assert.equal(
        (
          await persistGradeLevel(tx, actorContext, {
            id: null,
            revision: null,
            academicYearId: year.id,
            educationStageId: stage.id,
            code: "4",
            sequence: 4,
          })
        ).status,
        "success",
      );
      const grade = await tx.gradeLevel.findFirstOrThrow({
        where: { schoolId: school.id, academicYearId: year.id, code: "4" },
      });
      assert.equal(
        (
          await persistGradeLevel(tx, actorContext, {
            id: null,
            revision: null,
            academicYearId: otherYear.id,
            educationStageId: stage.id,
            code: "5",
            sequence: 5,
          })
        ).status,
        "error",
      );
      pass("grade levels are scoped to one school, year and education stage");

      assert.equal(
        (
          await persistClassSection(tx, actorContext, {
            id: null,
            revision: null,
            academicYearId: year.id,
            gradeLevelId: grade.id,
            code: "1",
          })
        ).status,
        "success",
      );
      const section = await tx.classSection.findFirstOrThrow({
        where: { schoolId: school.id, academicYearId: year.id },
      });
      pass("a class section is linked to the selected year's grade level");

      assert.equal(
        (
          await persistSubject(tx, actorContext, {
            id: null,
            revision: null,
            track: "GENERAL",
            names: {
              tr: "Matematik",
              sq: "Matematikë",
              en: "Mathematics",
            },
          })
        ).status,
        "success",
      );
      const subject = await tx.subject.findFirstOrThrow({
        where: { schoolId: school.id },
        include: { translations: true },
      });
      assert.deepEqual(
        subject.translations.map(({ locale }) => locale).sort(),
        ["en", "sq", "tr"],
      );
      assert.equal(subject.track, "GENERAL");
      pass("subject catalog stores three translations under one subject id");

      assert.equal(
        (
          await persistCourseOffering(tx, actorContext, {
            academicYearId: year.id,
            classSectionId: section.id,
            subjectId: subject.id,
          })
        ).status,
        "success",
      );
      const offering = await tx.courseOffering.findFirstOrThrow({
        where: { schoolId: school.id, academicYearId: year.id },
      });
      assert.equal(
        (
          await persistCourseOffering(tx, actorContext, {
            academicYearId: year.id,
            classSectionId: section.id,
            subjectId: subject.id,
          })
        ).status,
        "error",
      );
      pass("class–subject plan prevents duplicate assignments");

      assert.equal(
        (
          await persistLessonPeriod(tx, actorContext, {
            id: null,
            revision: null,
            academicYearId: year.id,
            names: { tr: "1. Ders", sq: "Ora e 1-rë", en: "Period 1" },
            sequence: 1,
            startTime: new Date("1970-01-01T08:00:00.000Z"),
            endTime: new Date("1970-01-01T08:45:00.000Z"),
          })
        ).status,
        "success",
      );
      assert.equal(
        (
          await persistLessonPeriod(tx, actorContext, {
            id: null,
            revision: null,
            academicYearId: year.id,
            names: { tr: "Çakışan", sq: "Mbivendosje", en: "Overlap" },
            sequence: 2,
            startTime: new Date("1970-01-01T08:30:00.000Z"),
            endTime: new Date("1970-01-01T09:15:00.000Z"),
          })
        ).status,
        "error",
      );
      assert.equal(await tx.lessonPeriod.count({ where: { academicYearId: year.id } }), 1);
      pass("lesson periods keep three labels and reject overlapping times");

      const stageArchive = await transitionAcademicStructure(tx, actorContext, {
        entity: "stage",
        transition: "archive",
        id: stage.id,
        revision: stage.updatedAt.toISOString(),
      });
      assert.equal(stageArchive.status, "error");
      pass("a parent record cannot be archived while an active child uses it");

      assert.equal(
        (
          await transitionAcademicStructure(tx, actorContext, {
            entity: "offering",
            transition: "archive",
            id: offering.id,
            revision: offering.updatedAt.toISOString(),
          })
        ).status,
        "success",
      );
      const subjectRevision = await tx.subject.findUniqueOrThrow({ where: { id: subject.id } });
      assert.equal(
        (
          await transitionAcademicStructure(tx, actorContext, {
            entity: "subject",
            transition: "archive",
            id: subject.id,
            revision: subjectRevision.updatedAt.toISOString(),
          })
        ).status,
        "success",
      );
      const archivedOffering = await tx.courseOffering.findUniqueOrThrow({ where: { id: offering.id } });
      assert.equal(
        (
          await transitionAcademicStructure(tx, actorContext, {
            entity: "offering",
            transition: "restore",
            id: offering.id,
            revision: archivedOffering.updatedAt.toISOString(),
          })
        ).status,
        "error",
      );
      pass("an archived relation cannot be restored while its parent is archived");

      const events = await tx.auditEvent.findMany({ where: { schoolId: school.id } });
      assert.ok(events.length >= 8);
      assert.ok(
        events.every(
          (event) =>
            event.actorUserId === actor.id &&
            event.actorMembershipId === membership.id,
        ),
      );
      pass("successful academic structure mutations are tenant-audited");

      throw rollback;
    },
    { isolationLevel: "Serializable", timeout: 60000 },
  );
} catch (error) {
  if (error !== rollback) {
    console.error("Academic structure verification failed; details withheld.", {
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
