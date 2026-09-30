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
  persistScheduleProfile,
  persistSubject,
  runAcademicYearSetup,
  transitionAcademicStructure,
} from "../src/server/academics/academic-structure-service";
import { tr } from "../src/i18n/dictionaries/tr";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const connection = process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
assert.ok(connection, "Database connection is required");
neonConfig.webSocketConstructor = globalThis.WebSocket;
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: connection }) });
const rollback = new Error("EXPECTED_ACADEMIC_STRUCTURE_TEST_ROLLBACK");
const fixturePrefix = `academic-structure-${randomUUID()}`;
let passed = 0;

function pass(message: string) {
  passed += 1;
  console.log(`PASS ${message}`);
}

try {
  await db.$transaction(async (tx) => {
    const actor = await tx.user.create({ data: { status: "ACTIVE" } });
    const school = await tx.school.create({
      data: { slug: `${fixturePrefix}-a`, name: "Academic structure A", status: "ACTIVE" },
    });
    const otherSchool = await tx.school.create({
      data: { slug: `${fixturePrefix}-b`, name: "Academic structure B", status: "ACTIVE" },
    });
    const membership = await tx.schoolMembership.create({
      data: { schoolId: school.id, userId: actor.id, username: "structure.admin", status: "ACTIVE" },
    });
    const year = await tx.academicYear.create({
      data: {
        schoolId: school.id,
        name: "2026 / 2027",
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

    assert.equal((await persistEducationStage(tx, actorContext, {
      id: null,
      revision: null,
      code: "PRIMARY",
      sequence: 1,
      names: { tr: "İlkokul", sq: "Shkolla fillore", en: "Primary School" },
    })).status, "success");
    const stage = await tx.educationStageDefinition.findFirstOrThrow({
      where: { schoolId: school.id },
      include: { translations: true },
    });
    assert.equal(stage.translations.length, 3);
    pass("stage master data owns all localized names without a year foreign key");

    const foreignStage = await tx.educationStageDefinition.create({
      data: { schoolId: otherSchool.id, code: "OTHER", defaultName: "Other", sequence: 1 },
    });
    assert.equal((await persistGradeLevel(tx, actorContext, {
      id: null,
      revision: null,
      educationStageId: foreignStage.id,
      code: "X",
      displayLabel: "Cross tenant",
      sequence: 1,
    })).status, "error");
    pass("tenant scope rejects a foreign stage relation");

    assert.equal((await persistGradeLevel(tx, actorContext, {
      id: null,
      revision: null,
      educationStageId: stage.id,
      code: "4",
      displayLabel: "4. Sınıf",
      sequence: 4,
    })).status, "success");
    const grade = await tx.gradeLevelDefinition.findFirstOrThrow({ where: { schoolId: school.id } });
    const structureVersion = await tx.academicStructureVersion.findFirstOrThrow({ where: { schoolId: school.id } });
    assert.equal(await tx.academicStructureLevel.count({ where: { academicStructureVersionId: structureVersion.id } }), 1);
    pass("stable grade identity is mapped through a draft structure version");

    assert.equal((await persistClassSection(tx, actorContext, {
      id: null,
      revision: null,
      gradeLevelId: grade.id,
      code: "A",
      displayLabel: null,
      sequence: 1,
    })).status, "success");
    const section = await tx.classSectionDefinition.findFirstOrThrow({ where: { schoolId: school.id } });
    assert.equal(section.gradeLevelDefinitionId, grade.id);
    pass("section definition is school-wide and reusable across years");

    assert.equal((await persistSubject(tx, actorContext, {
      id: null,
      revision: null,
      names: { tr: "Matematik", sq: "Matematikë", en: "Mathematics" },
      track: "GENERAL",
    })).status, "success");
    const subject = await tx.subject.findFirstOrThrow({ where: { schoolId: school.id } });
    assert.equal((await persistCourseOffering(tx, actorContext, {
      gradeLevelId: grade.id,
      subjectId: subject.id,
      track: "GENERAL",
    })).status, "success");
    const curriculumItem = await tx.curriculumItem.findFirstOrThrow({ where: { schoolId: school.id } });
    assert.equal(curriculumItem.gradeLevelDefinitionId, grade.id);
    pass("curriculum binds one subject to a grade instead of every section");

    assert.equal((await persistScheduleProfile(tx, actorContext, {
      id: null,
      revision: null,
      code: "MORNING",
      name: "Sabahçı",
      kind: "MORNING",
    })).status, "success");
    const profile = await tx.scheduleProfile.findFirstOrThrow({ where: { schoolId: school.id } });
    assert.equal((await persistLessonPeriod(tx, actorContext, {
      id: null,
      revision: null,
      profileId: profile.id,
      code: "P1",
      names: { tr: "1. Ders", sq: "Ora 1", en: "Period 1" },
      sequence: 1,
      startTime: new Date("1970-01-01T08:00:00.000Z"),
      endTime: new Date("1970-01-01T08:40:00.000Z"),
    })).status, "success");
    assert.equal((await persistLessonPeriod(tx, actorContext, {
      id: null,
      revision: null,
      profileId: profile.id,
      code: "P2",
      names: { tr: "2. Ders", sq: "Ora 2", en: "Period 2" },
      sequence: 2,
      startTime: new Date("1970-01-01T08:20:00.000Z"),
      endTime: new Date("1970-01-01T09:00:00.000Z"),
    })).status, "error");
    pass("period overlap is checked inside its schedule profile version");

    assert.equal((await runAcademicYearSetup(tx, actorContext, {
      academicYearId: year.id,
      profileId: profile.id,
    })).status, "success");
    assert.equal(await tx.academicYearClassSection.count({ where: { academicYearId: year.id } }), 1);
    assert.equal(await tx.courseOffering.count({ where: { academicYearId: year.id } }), 1);
    assert.equal((await tx.academicYear.findUniqueOrThrow({ where: { id: year.id } })).setupStatus, "READY");
    const versionCount = await tx.curriculumVersion.count({ where: { schoolId: school.id } });
    const setupRunCount = await tx.academicYearSetupRun.count({ where: { academicYearId: year.id } });
    assert.equal((await runAcademicYearSetup(tx, actorContext, {
      academicYearId: year.id,
      profileId: profile.id,
    })).status, "success");
    assert.equal(await tx.academicYearClassSection.count({ where: { academicYearId: year.id } }), 1);
    assert.equal(await tx.courseOffering.count({ where: { academicYearId: year.id } }), 1);
    assert.equal(await tx.curriculumVersion.count({ where: { schoolId: school.id } }), versionCount);
    assert.equal(await tx.academicYearSetupRun.count({ where: { academicYearId: year.id } }), setupRunCount);
    pass("year setup publishes versions and remains idempotent");

    const stageRevision = await tx.educationStageDefinition.findUniqueOrThrow({ where: { id: stage.id } });
    assert.equal((await transitionAcademicStructure(tx, actorContext, {
      entity: "stage",
      transition: "archive",
      id: stage.id,
      revision: stageRevision.updatedAt.toISOString(),
    })).status, "error");
    pass("a stage in an active grade mapping cannot be archived");

    const events = await tx.auditEvent.findMany({ where: { schoolId: school.id } });
    assert.ok(events.length >= 7);
    assert.ok(events.every((event) => event.actorUserId === actor.id && event.actorMembershipId === membership.id));
    pass("successful master, version and setup writes are tenant-audited");
    throw rollback;
  }, { isolationLevel: "Serializable", timeout: 60000 });
} catch (error) {
  if (error !== rollback) {
    console.error("Academic structure verification failed; details withheld.", {
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
    assert.equal(await db.school.count({ where: { slug: { startsWith: fixturePrefix } } }), 0);
    console.log(`${passed} database checks passed. All fixtures and writes rolled back; no test data retained.`);
  }
} finally {
  await db.$disconnect();
}
