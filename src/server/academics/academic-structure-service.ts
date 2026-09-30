import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import type {
  AcademicStructureEntity,
  AcademicStructureServerMessages,
  AcademicStructureState,
  AcademicYearSetupInput,
  ClassSectionInput,
  CourseOfferingInput,
  EducationStageInput,
  GradeLevelInput,
  LessonPeriodInput,
  ScheduleProfileInput,
  SubjectInput,
} from "@/lib/academic-structure-validation";
import { timeValue } from "@/lib/academic-structure-validation";

export type AcademicStructureActor = {
  schoolId: string;
  actorUserId: string;
  actorMembershipId: string;
  locale: Locale;
  defaultLocale: Locale;
  messages: AcademicStructureServerMessages;
};

function error(
  message: string,
  fieldErrors?: AcademicStructureState["fieldErrors"],
): AcademicStructureState {
  return { status: "error", message, fieldErrors };
}

async function audit(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  data: {
    action: string;
    entityType: string;
    entityId: string;
    beforeData?: Prisma.InputJsonValue;
    afterData?: Prisma.InputJsonValue;
    changedFields: string[];
    reason?: string;
  },
) {
  await tx.auditEvent.create({
    data: {
      schoolId: actor.schoolId,
      actorUserId: actor.actorUserId,
      actorMembershipId: actor.actorMembershipId,
      source: "USER",
      ...data,
    },
  });
}

function translationData(
  actor: AcademicStructureActor,
  names: Record<Locale, string>,
) {
  return SUPPORTED_LOCALES.map((locale) => ({
    school: { connect: { id: actor.schoolId } },
    locale,
    name: names[locale],
  }));
}

async function ensureDraftStructureVersion(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
) {
  const draft = await tx.academicStructureVersion.findFirst({
    where: { schoolId: actor.schoolId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });
  if (draft) return draft;
  const published = await tx.academicStructureVersion.findFirst({
    where: { schoolId: actor.schoolId, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { levels: true },
  });
  const count = await tx.academicStructureVersion.count({ where: { schoolId: actor.schoolId } });
  const created = await tx.academicStructureVersion.create({
    data: {
      schoolId: actor.schoolId,
      name: `Akademik Yapı ${count + 1}`,
      createdById: actor.actorUserId,
    },
  });
  if (published?.levels.length) {
    await tx.academicStructureLevel.createMany({
      data: published.levels.map((level) => ({
        academicStructureVersionId: created.id,
        schoolId: actor.schoolId,
        gradeLevelDefinitionId: level.gradeLevelDefinitionId,
        educationStageDefinitionId: level.educationStageDefinitionId,
        sequence: level.sequence,
      })),
      skipDuplicates: true,
    });
  }
  return created;
}

async function ensureDraftCurriculumVersion(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
) {
  const draft = await tx.curriculumVersion.findFirst({
    where: { schoolId: actor.schoolId, status: "DRAFT" },
    orderBy: [{ revision: "desc" }, { createdAt: "desc" }],
  });
  if (draft) return draft;
  const published = await tx.curriculumVersion.findFirst({
    where: { schoolId: actor.schoolId, status: "PUBLISHED" },
    orderBy: [{ revision: "desc" }, { publishedAt: "desc" }],
    include: { items: true },
  });
  const created = await tx.curriculumVersion.create({
    data: {
      schoolId: actor.schoolId,
      name: published?.name ?? "Okul Müfredatı",
      revision: (published?.revision ?? 0) + 1,
      createdById: actor.actorUserId,
    },
  });
  if (published?.items.length) {
    await tx.curriculumItem.createMany({
      data: published.items.map((item) => ({
        schoolId: actor.schoolId,
        curriculumVersionId: created.id,
        gradeLevelDefinitionId: item.gradeLevelDefinitionId,
        subjectId: item.subjectId,
        deliveryType: item.deliveryType,
        gradingBucket: item.gradingBucket,
      })),
      skipDuplicates: true,
    });
  }
  return created;
}

async function ensureDraftScheduleVersion(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  profileId: string,
) {
  const profile = await tx.scheduleProfile.findFirst({
    where: { id: profileId, schoolId: actor.schoolId, archivedAt: null },
  });
  if (!profile) return null;
  const draft = await tx.scheduleProfileVersion.findFirst({
    where: { schoolId: actor.schoolId, scheduleProfileId: profileId, status: "DRAFT" },
    orderBy: { version: "desc" },
  });
  if (draft) return draft;
  const published = await tx.scheduleProfileVersion.findFirst({
    where: { schoolId: actor.schoolId, scheduleProfileId: profileId, status: "PUBLISHED" },
    orderBy: { version: "desc" },
    include: { periods: { include: { translations: true } } },
  });
  const created = await tx.scheduleProfileVersion.create({
    data: {
      schoolId: actor.schoolId,
      scheduleProfileId: profile.id,
      version: (published?.version ?? 0) + 1,
    },
  });
  for (const period of published?.periods ?? []) {
    await tx.schedulePeriod.create({
      data: {
        schoolId: actor.schoolId,
        scheduleProfileVersionId: created.id,
        code: period.code,
        defaultName: period.defaultName,
        sequence: period.sequence,
        startTime: period.startTime,
        endTime: period.endTime,
        translations: {
          create: period.translations.map((translation) => ({
            school: { connect: { id: actor.schoolId } },
            locale: translation.locale,
            name: translation.name,
          })),
        },
      },
    });
  }
  return created;
}

export async function persistEducationStage(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: EducationStageInput,
): Promise<AcademicStructureState> {
  const snapshot = { code: input.code, sequence: input.sequence, names: input.names };
  if (!input.id) {
    const created = await tx.educationStageDefinition.create({
      data: {
        schoolId: actor.schoolId,
        code: input.code,
        defaultName: input.names[actor.defaultLocale],
        sequence: input.sequence,
        translations: { create: translationData(actor, input.names) },
      },
    });
    await audit(tx, actor, {
      action: "academic.stage-definition.created",
      entityType: "EducationStageDefinition",
      entityId: created.id,
      afterData: snapshot,
      changedFields: ["code", "sequence", "names"],
    });
    return { status: "success", message: actor.messages.stageCreated };
  }
  const current = await tx.educationStageDefinition.findFirst({
    where: { id: input.id, schoolId: actor.schoolId, archivedAt: null },
    include: { translations: true },
  });
  if (!current) return error(actor.messages.unavailable);
  if (current.updatedAt.toISOString() !== input.revision) return error(actor.messages.conflict);
  const updated = await tx.educationStageDefinition.updateMany({
    where: { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt },
    data: { code: input.code, sequence: input.sequence, defaultName: input.names[actor.defaultLocale] },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  for (const locale of SUPPORTED_LOCALES) {
    await tx.educationStageDefinitionTranslation.upsert({
      where: { educationStageDefinitionId_locale: { educationStageDefinitionId: current.id, locale } },
      create: { educationStageDefinitionId: current.id, schoolId: actor.schoolId, locale, name: input.names[locale] },
      update: { name: input.names[locale] },
    });
  }
  await audit(tx, actor, {
    action: "academic.stage-definition.updated",
    entityType: "EducationStageDefinition",
    entityId: current.id,
    beforeData: { code: current.code, sequence: current.sequence },
    afterData: snapshot,
    changedFields: ["code", "sequence", "names"],
  });
  return { status: "success", message: actor.messages.stageUpdated };
}

export async function persistGradeLevel(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: GradeLevelInput,
): Promise<AcademicStructureState> {
  const stage = await tx.educationStageDefinition.findFirst({
    where: { id: input.educationStageId, schoolId: actor.schoolId, archivedAt: null },
    select: { id: true },
  });
  if (!stage) return error(actor.messages.unavailable);
  const version = await ensureDraftStructureVersion(tx, actor);
  const snapshot = {
    educationStageId: stage.id,
    code: input.code,
    displayLabel: input.displayLabel,
    sequence: input.sequence,
    structureVersionId: version.id,
  };
  if (!input.id) {
    const created = await tx.gradeLevelDefinition.create({
      data: {
        schoolId: actor.schoolId,
        code: input.code,
        displayLabel: input.displayLabel,
        sequence: input.sequence,
      },
    });
    await tx.academicStructureLevel.create({
      data: {
        academicStructureVersionId: version.id,
        schoolId: actor.schoolId,
        gradeLevelDefinitionId: created.id,
        educationStageDefinitionId: stage.id,
        sequence: input.sequence,
      },
    });
    await audit(tx, actor, {
      action: "academic.grade-definition.created",
      entityType: "GradeLevelDefinition",
      entityId: created.id,
      afterData: snapshot,
      changedFields: Object.keys(snapshot),
    });
    return { status: "success", message: actor.messages.gradeCreated };
  }
  const current = await tx.gradeLevelDefinition.findFirst({
    where: { id: input.id, schoolId: actor.schoolId, archivedAt: null },
  });
  if (!current) return error(actor.messages.unavailable);
  if (current.updatedAt.toISOString() !== input.revision) return error(actor.messages.conflict);
  const updated = await tx.gradeLevelDefinition.updateMany({
    where: { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt },
    data: { code: input.code, displayLabel: input.displayLabel, sequence: input.sequence },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  await tx.academicStructureLevel.upsert({
    where: {
      academicStructureVersionId_gradeLevelDefinitionId: {
        academicStructureVersionId: version.id,
        gradeLevelDefinitionId: current.id,
      },
    },
    create: {
      academicStructureVersionId: version.id,
      schoolId: actor.schoolId,
      gradeLevelDefinitionId: current.id,
      educationStageDefinitionId: stage.id,
      sequence: input.sequence,
    },
    update: { educationStageDefinitionId: stage.id, sequence: input.sequence },
  });
  await audit(tx, actor, {
    action: "academic.grade-definition.updated",
    entityType: "GradeLevelDefinition",
    entityId: current.id,
    beforeData: { code: current.code, displayLabel: current.displayLabel, sequence: current.sequence },
    afterData: snapshot,
    changedFields: ["code", "displayLabel", "sequence", "educationStageId"],
  });
  return { status: "success", message: actor.messages.gradeUpdated };
}

export async function persistClassSection(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: ClassSectionInput,
): Promise<AcademicStructureState> {
  const grade = await tx.gradeLevelDefinition.findFirst({
    where: { id: input.gradeLevelId, schoolId: actor.schoolId, archivedAt: null },
    select: { id: true },
  });
  if (!grade) return error(actor.messages.unavailable);
  const snapshot = {
    gradeLevelId: grade.id,
    code: input.code,
    displayLabel: input.displayLabel,
    sequence: input.sequence,
  };
  if (!input.id) {
    const created = await tx.classSectionDefinition.create({
      data: {
        schoolId: actor.schoolId,
        gradeLevelDefinitionId: grade.id,
        code: input.code,
        displayLabel: input.displayLabel,
        sequence: input.sequence,
      },
    });
    await audit(tx, actor, {
      action: "academic.section-definition.created",
      entityType: "ClassSectionDefinition",
      entityId: created.id,
      afterData: snapshot,
      changedFields: Object.keys(snapshot),
    });
    return { status: "success", message: actor.messages.sectionCreated };
  }
  const current = await tx.classSectionDefinition.findFirst({
    where: { id: input.id, schoolId: actor.schoolId, archivedAt: null },
  });
  if (!current) return error(actor.messages.unavailable);
  if (current.updatedAt.toISOString() !== input.revision) return error(actor.messages.conflict);
  const updated = await tx.classSectionDefinition.updateMany({
    where: { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt },
    data: {
      gradeLevelDefinitionId: grade.id,
      code: input.code,
      displayLabel: input.displayLabel,
      sequence: input.sequence,
    },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  await audit(tx, actor, {
    action: "academic.section-definition.updated",
    entityType: "ClassSectionDefinition",
    entityId: current.id,
    beforeData: { gradeLevelId: current.gradeLevelDefinitionId, code: current.code },
    afterData: snapshot,
    changedFields: ["gradeLevelId", "code", "displayLabel", "sequence"],
  });
  return { status: "success", message: actor.messages.sectionUpdated };
}

export async function persistSubject(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: SubjectInput,
): Promise<AcademicStructureState> {
  const snapshot = { names: input.names, track: input.track };
  if (!input.id) {
    const created = await tx.subject.create({
      data: {
        schoolId: actor.schoolId,
        name: input.names[actor.defaultLocale],
        track: input.track,
        translations: { create: translationData(actor, input.names) },
      },
    });
    await audit(tx, actor, {
      action: "academic.subject.created",
      entityType: "Subject",
      entityId: created.id,
      afterData: snapshot,
      changedFields: ["names", "track"],
    });
    return { status: "success", message: actor.messages.subjectCreated };
  }
  const current = await tx.subject.findFirst({
    where: { id: input.id, schoolId: actor.schoolId, archivedAt: null },
    include: { translations: true },
  });
  if (!current) return error(actor.messages.unavailable);
  if (current.updatedAt.toISOString() !== input.revision) return error(actor.messages.conflict);
  const updated = await tx.subject.updateMany({
    where: { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt },
    data: { name: input.names[actor.defaultLocale], track: input.track },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  for (const locale of SUPPORTED_LOCALES) {
    await tx.subjectTranslation.upsert({
      where: { subjectId_locale: { subjectId: current.id, locale } },
      create: { subjectId: current.id, schoolId: actor.schoolId, locale, name: input.names[locale] },
      update: { name: input.names[locale] },
    });
  }
  await audit(tx, actor, {
    action: "academic.subject.updated",
    entityType: "Subject",
    entityId: current.id,
    beforeData: { track: current.track },
    afterData: snapshot,
    changedFields: ["names", "track"],
  });
  return { status: "success", message: actor.messages.subjectUpdated };
}

export async function persistCourseOffering(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: CourseOfferingInput,
): Promise<AcademicStructureState> {
  const [grade, subject] = await Promise.all([
    tx.gradeLevelDefinition.findFirst({
      where: { id: input.gradeLevelId, schoolId: actor.schoolId, archivedAt: null },
      select: { id: true },
    }),
    tx.subject.findFirst({
      where: { id: input.subjectId, schoolId: actor.schoolId, archivedAt: null },
      select: { id: true },
    }),
  ]);
  if (!grade || !subject) return error(actor.messages.unavailable);
  const version = await ensureDraftCurriculumVersion(tx, actor);
  const existing = await tx.curriculumItem.findFirst({
    where: {
      curriculumVersionId: version.id,
      gradeLevelDefinitionId: grade.id,
      subjectId: subject.id,
    },
  });
  if (existing) return error(actor.messages.duplicate);
  const created = await tx.curriculumItem.create({
    data: {
      schoolId: actor.schoolId,
      curriculumVersionId: version.id,
      gradeLevelDefinitionId: grade.id,
      subjectId: subject.id,
      deliveryType: input.track,
    },
  });
  await audit(tx, actor, {
    action: "academic.curriculum-item.created",
    entityType: "CurriculumItem",
    entityId: created.id,
    afterData: { curriculumVersionId: version.id, ...input },
    changedFields: ["gradeLevelId", "subjectId", "track"],
  });
  return { status: "success", message: actor.messages.offeringCreated };
}

export async function persistScheduleProfile(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: ScheduleProfileInput,
): Promise<AcademicStructureState> {
  if (!input.id) {
    const created = await tx.scheduleProfile.create({
      data: { schoolId: actor.schoolId, code: input.code, name: input.name, kind: input.kind },
    });
    await audit(tx, actor, {
      action: "academic.schedule-profile.created",
      entityType: "ScheduleProfile",
      entityId: created.id,
      afterData: { code: input.code, name: input.name, kind: input.kind },
      changedFields: ["code", "name", "kind"],
    });
    return { status: "success", message: actor.messages.profileCreated };
  }
  const current = await tx.scheduleProfile.findFirst({
    where: { id: input.id, schoolId: actor.schoolId, archivedAt: null },
  });
  if (!current) return error(actor.messages.unavailable);
  if (current.updatedAt.toISOString() !== input.revision) return error(actor.messages.conflict);
  const updated = await tx.scheduleProfile.updateMany({
    where: { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt },
    data: { code: input.code, name: input.name, kind: input.kind },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  await audit(tx, actor, {
    action: "academic.schedule-profile.updated",
    entityType: "ScheduleProfile",
    entityId: current.id,
    beforeData: { code: current.code, name: current.name, kind: current.kind },
    afterData: { code: input.code, name: input.name, kind: input.kind },
    changedFields: ["code", "name", "kind"],
  });
  return { status: "success", message: actor.messages.profileUpdated };
}

export async function persistLessonPeriod(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: LessonPeriodInput,
): Promise<AcademicStructureState> {
  const version = await ensureDraftScheduleVersion(tx, actor, input.profileId);
  if (!version) return error(actor.messages.unavailable);
  let targetId = input.id;
  if (input.id) {
    const original = await tx.schedulePeriod.findFirst({
      where: { id: input.id, schoolId: actor.schoolId },
      include: { scheduleProfileVersion: true },
    });
    if (!original || original.updatedAt.toISOString() !== input.revision)
      return error(actor.messages.conflict);
    if (original.scheduleProfileVersionId !== version.id) {
      const clone = await tx.schedulePeriod.findFirst({
        where: { schoolId: actor.schoolId, scheduleProfileVersionId: version.id, code: original.code },
        select: { id: true },
      });
      targetId = clone?.id ?? null;
    }
  }
  const overlap = await tx.schedulePeriod.findFirst({
    where: {
      schoolId: actor.schoolId,
      scheduleProfileVersionId: version.id,
      id: targetId ? { not: targetId } : undefined,
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
    select: { id: true },
  });
  if (overlap) return error(actor.messages.overlap, { startTime: actor.messages.overlap, endTime: actor.messages.overlap });
  const snapshot = {
    profileId: input.profileId,
    scheduleProfileVersionId: version.id,
    code: input.code,
    names: input.names,
    sequence: input.sequence,
    startTime: timeValue(input.startTime),
    endTime: timeValue(input.endTime),
  };
  if (!targetId) {
    const created = await tx.schedulePeriod.create({
      data: {
        schoolId: actor.schoolId,
        scheduleProfileVersionId: version.id,
        code: input.code,
        defaultName: input.names[actor.defaultLocale],
        sequence: input.sequence,
        startTime: input.startTime,
        endTime: input.endTime,
        translations: { create: translationData(actor, input.names) },
      },
    });
    await audit(tx, actor, {
      action: "academic.schedule-period.created",
      entityType: "SchedulePeriod",
      entityId: created.id,
      afterData: snapshot,
      changedFields: Object.keys(snapshot),
    });
    return { status: "success", message: actor.messages.periodCreated };
  }
  const current = await tx.schedulePeriod.findFirst({
    where: { id: targetId, schoolId: actor.schoolId, scheduleProfileVersionId: version.id },
  });
  if (!current) return error(actor.messages.unavailable);
  await tx.schedulePeriod.update({
    where: { id: current.id },
    data: {
      code: input.code,
      defaultName: input.names[actor.defaultLocale],
      sequence: input.sequence,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });
  for (const locale of SUPPORTED_LOCALES) {
    await tx.schedulePeriodTranslation.upsert({
      where: { schedulePeriodId_locale: { schedulePeriodId: current.id, locale } },
      create: { schedulePeriodId: current.id, schoolId: actor.schoolId, locale, name: input.names[locale] },
      update: { name: input.names[locale] },
    });
  }
  await audit(tx, actor, {
    action: "academic.schedule-period.updated",
    entityType: "SchedulePeriod",
    entityId: current.id,
    afterData: snapshot,
    changedFields: ["code", "names", "sequence", "startTime", "endTime"],
  });
  return { status: "success", message: actor.messages.periodUpdated };
}

export async function runAcademicYearSetup(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: AcademicYearSetupInput,
): Promise<AcademicStructureState> {
  const year = await tx.academicYear.findFirst({
    where: {
      id: input.academicYearId,
      schoolId: actor.schoolId,
      status: { in: ["DRAFT", "ACTIVE"] },
      archivedAt: null,
    },
  });
  if (!year) return error(actor.messages.unavailable);
  let structure = year.academicStructureVersionId
    ? await tx.academicStructureVersion.findFirst({
        where: { id: year.academicStructureVersionId, schoolId: actor.schoolId },
      })
    : await tx.academicStructureVersion.findFirst({
        where: { schoolId: actor.schoolId, status: "DRAFT" },
        orderBy: { createdAt: "desc" },
      });
  structure ??= await tx.academicStructureVersion.findFirst({
    where: { schoolId: actor.schoolId, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });
  structure ??= await ensureDraftStructureVersion(tx, actor);
  if (!structure) return error(actor.messages.unavailable);
  let curriculum = await tx.curriculumVersion.findFirst({
    where: { schoolId: actor.schoolId, status: "DRAFT" },
    orderBy: [{ revision: "desc" }, { createdAt: "desc" }],
  });
  curriculum ??= await tx.curriculumVersion.findFirst({
    where: {
      schoolId: actor.schoolId,
      yearCurricula: { some: { academicYearId: year.id } },
    },
    orderBy: [{ revision: "desc" }, { publishedAt: "desc" }],
  });
  curriculum ??= await tx.curriculumVersion.findFirst({
    where: { schoolId: actor.schoolId, status: "PUBLISHED" },
    orderBy: [{ revision: "desc" }, { publishedAt: "desc" }],
  });
  curriculum ??= await ensureDraftCurriculumVersion(tx, actor);
  let scheduleVersion = null;
  if (input.profileId) {
    scheduleVersion = await tx.scheduleProfileVersion.findFirst({
      where: {
        schoolId: actor.schoolId,
        scheduleProfileId: input.profileId,
        status: "DRAFT",
      },
      orderBy: { version: "desc" },
    });
    scheduleVersion ??= await tx.scheduleProfileVersion.findFirst({
      where: {
        schoolId: actor.schoolId,
        scheduleProfileId: input.profileId,
        status: "PUBLISHED",
      },
      orderBy: { version: "desc" },
    });
    scheduleVersion ??= await ensureDraftScheduleVersion(tx, actor, input.profileId);
    if (!scheduleVersion) return error(actor.messages.unavailable);
  }
  const idempotencyKey = [
    year.id,
    structure.id,
    curriculum.id,
    scheduleVersion?.id ?? "no-profile",
  ].join(":");
  const previous = await tx.academicYearSetupRun.findUnique({
    where: { schoolId_idempotencyKey: { schoolId: actor.schoolId, idempotencyKey } },
  });
  if (previous?.status === "SUCCEEDED")
    return { status: "success", message: actor.messages.noChange };

  const run = previous ?? (await tx.academicYearSetupRun.create({
    data: {
      schoolId: actor.schoolId,
      academicYearId: year.id,
      idempotencyKey,
      inputSnapshot: {
        structureVersionId: structure.id,
        curriculumVersionId: curriculum.id,
        scheduleProfileVersionId: scheduleVersion?.id ?? null,
      },
      startedById: actor.actorUserId,
    },
  }));
  await tx.academicYear.update({
    where: { id: year.id },
    data: { setupStatus: "IN_PROGRESS", academicStructureVersionId: structure.id },
  });
  const now = new Date();
  if (structure.status === "DRAFT") {
    await tx.academicStructureVersion.update({
      where: { id: structure.id },
      data: { status: "PUBLISHED", publishedAt: now },
    });
  }
  if (curriculum.status === "DRAFT") {
    await tx.curriculumVersion.update({
      where: { id: curriculum.id },
      data: { status: "PUBLISHED", publishedAt: now },
    });
  }
  if (scheduleVersion?.status === "DRAFT") {
    await tx.scheduleProfileVersion.update({
      where: { id: scheduleVersion.id },
      data: { status: "PUBLISHED", publishedAt: now },
    });
  }
  const [levels, curriculumItems, definitions] = await Promise.all([
    tx.academicStructureLevel.findMany({
      where: { schoolId: actor.schoolId, academicStructureVersionId: structure.id },
    }),
    tx.curriculumItem.findMany({
      where: { schoolId: actor.schoolId, curriculumVersionId: curriculum.id },
    }),
    tx.classSectionDefinition.findMany({
      where: { schoolId: actor.schoolId, archivedAt: null },
    }),
  ]);
  const gradeIds = new Set(levels.map((level) => level.gradeLevelDefinitionId));
  const activeDefinitions = definitions.filter((definition) => gradeIds.has(definition.gradeLevelDefinitionId));
  const gradesWithCurriculum = new Set(curriculumItems.map((item) => item.gradeLevelDefinitionId));
  for (const gradeLevelDefinitionId of gradesWithCurriculum) {
    await tx.academicYearCurriculum.upsert({
      where: {
        academicYearId_gradeLevelDefinitionId_curriculumVersionId_validFrom: {
          academicYearId: year.id,
          gradeLevelDefinitionId,
          curriculumVersionId: curriculum.id,
          validFrom: year.startDate,
        },
      },
      create: {
        schoolId: actor.schoolId,
        academicYearId: year.id,
        gradeLevelDefinitionId,
        curriculumVersionId: curriculum.id,
        validFrom: year.startDate,
        validTo: year.endDate,
      },
      update: { validTo: year.endDate },
    });
  }
  let createdSections = 0;
  let createdOfferings = 0;
  for (const definition of activeDefinitions) {
    const existing = await tx.academicYearClassSection.findUnique({
      where: {
        academicYearId_classSectionDefinitionId: {
          academicYearId: year.id,
          classSectionDefinitionId: definition.id,
        },
      },
    });
    const annualSection = existing
      ? await tx.academicYearClassSection.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            scheduleProfileVersionId: scheduleVersion?.id ?? existing.scheduleProfileVersionId,
          },
        })
      : await tx.academicYearClassSection.create({
          data: {
            schoolId: actor.schoolId,
            academicYearId: year.id,
            classSectionDefinitionId: definition.id,
            scheduleProfileVersionId: scheduleVersion?.id ?? null,
          },
        });
    if (!existing) createdSections += 1;
    for (const item of curriculumItems.filter(
      (candidate) => candidate.gradeLevelDefinitionId === definition.gradeLevelDefinitionId,
    )) {
      const offering = await tx.courseOffering.findFirst({
        where: {
          schoolId: actor.schoolId,
          academicYearId: year.id,
          academicYearClassSectionId: annualSection.id,
          subjectId: item.subjectId,
          validFrom: year.startDate,
        },
        select: { id: true },
      });
      if (!offering) {
        await tx.courseOffering.create({
          data: {
            schoolId: actor.schoolId,
            academicYearId: year.id,
            academicYearClassSectionId: annualSection.id,
            subjectId: item.subjectId,
            curriculumItemId: item.id,
            source: "CURRICULUM",
            validFrom: year.startDate,
            validTo: year.endDate,
          },
        });
        createdOfferings += 1;
      }
    }
  }
  const resultSummary = {
    activeDefinitionCount: activeDefinitions.length,
    curriculumItemCount: curriculumItems.length,
    createdSections,
    createdOfferings,
  };
  await tx.academicYearSetupRun.update({
    where: { id: run.id },
    data: { status: "SUCCEEDED", resultSummary, finishedAt: now },
  });
  await tx.academicYear.update({
    where: { id: year.id },
    data: { setupStatus: "READY", setupCompletedAt: now },
  });
  await audit(tx, actor, {
    action: "academic.year-setup.completed",
    entityType: "AcademicYearSetupRun",
    entityId: run.id,
    afterData: resultSummary,
    changedFields: ["setupStatus", "classSections", "courseOfferings"],
  });
  return { status: "success", message: actor.messages.setupCompleted };
}

export async function transitionAcademicStructure(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: {
    entity: AcademicStructureEntity;
    transition: "archive" | "restore";
    id: string;
    revision: string;
  },
): Promise<AcademicStructureState> {
  const archive = input.transition === "archive";
  const archivedAt = archive ? new Date() : null;
  let entityType = "";

  if (input.entity === "offering") {
    const item = await tx.curriculumItem.findFirst({
      where: { id: input.id, schoolId: actor.schoolId },
    });
    if (!item || item.updatedAt.toISOString() !== input.revision) return error(actor.messages.conflict);
    if (!archive) return error(actor.messages.ruleViolation);
    const draft = await ensureDraftCurriculumVersion(tx, actor);
    const target = item.curriculumVersionId === draft.id
      ? item
      : await tx.curriculumItem.findFirst({
          where: {
            curriculumVersionId: draft.id,
            gradeLevelDefinitionId: item.gradeLevelDefinitionId,
            subjectId: item.subjectId,
          },
        });
    if (!target) return { status: "success", message: actor.messages.noChange };
    await tx.curriculumItem.delete({ where: { id: target.id } });
    entityType = "CurriculumItem";
  } else if (input.entity === "period") {
    const period = await tx.schedulePeriod.findFirst({
      where: { id: input.id, schoolId: actor.schoolId },
      include: { scheduleProfileVersion: true },
    });
    if (!period || period.updatedAt.toISOString() !== input.revision) return error(actor.messages.conflict);
    if (!archive) return error(actor.messages.ruleViolation);
    const draft = await ensureDraftScheduleVersion(tx, actor, period.scheduleProfileVersion.scheduleProfileId);
    if (!draft) return error(actor.messages.unavailable);
    const target = period.scheduleProfileVersionId === draft.id
      ? period
      : await tx.schedulePeriod.findFirst({
          where: { scheduleProfileVersionId: draft.id, code: period.code },
        });
    if (target) await tx.schedulePeriod.delete({ where: { id: target.id } });
    entityType = "SchedulePeriod";
  } else {
    const delegates = {
      stage: tx.educationStageDefinition,
      grade: tx.gradeLevelDefinition,
      section: tx.classSectionDefinition,
      subject: tx.subject,
      profile: tx.scheduleProfile,
    } as const;
    const delegate = delegates[input.entity as keyof typeof delegates];
    if (!delegate) return error(actor.messages.unavailable);
    const current = await (delegate.findFirst as (args: unknown) => Promise<{
      id: string;
      updatedAt: Date;
      archivedAt: Date | null;
    } | null>)({ where: { id: input.id, schoolId: actor.schoolId } });
    if (!current) return error(actor.messages.unavailable);
    if (current.updatedAt.toISOString() !== input.revision) return error(actor.messages.conflict);
    if (archive === Boolean(current.archivedAt))
      return { status: "success", message: actor.messages.noChange };
    if (input.entity === "stage" && archive) {
      const dependencies = await tx.academicStructureLevel.count({
        where: {
          schoolId: actor.schoolId,
          educationStageDefinitionId: current.id,
          gradeLevelDefinition: { archivedAt: null },
        },
      });
      if (dependencies) return error(actor.messages.dependency);
    }
    if (input.entity === "grade" && archive) {
      const dependencies = await tx.classSectionDefinition.count({
        where: { schoolId: actor.schoolId, gradeLevelDefinitionId: current.id, archivedAt: null },
      });
      if (dependencies) return error(actor.messages.dependency);
    }
    if (input.entity === "subject" && archive) {
      const dependencies = await tx.curriculumItem.count({
        where: { schoolId: actor.schoolId, subjectId: current.id, curriculumVersion: { status: "DRAFT" } },
      });
      if (dependencies) return error(actor.messages.dependency);
    }
    const result = await (delegate.updateMany as (args: unknown) => Promise<{ count: number }>)({
      where: { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt },
      data: { archivedAt },
    });
    if (result.count !== 1) return error(actor.messages.conflict);
    entityType = {
      stage: "EducationStageDefinition",
      grade: "GradeLevelDefinition",
      section: "ClassSectionDefinition",
      subject: "Subject",
      profile: "ScheduleProfile",
    }[input.entity as "stage" | "grade" | "section" | "subject" | "profile"];
  }

  await audit(tx, actor, {
    action: `academic.${input.entity}.${input.transition}d`,
    entityType,
    entityId: input.id,
    changedFields: input.entity === "offering" || input.entity === "period" ? ["versionedDefinition"] : ["archivedAt"],
  });
  return { status: "success", message: archive ? actor.messages.archived : actor.messages.restored };
}
