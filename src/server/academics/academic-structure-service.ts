import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import type {
  AcademicStructureEntity,
  AcademicStructureServerMessages,
  AcademicStructureState,
  ClassSectionInput,
  CourseOfferingInput,
  EducationStageInput,
  GradeLevelInput,
  LessonPeriodInput,
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

async function yearExists(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  academicYearId: string,
) {
  return tx.academicYear.findFirst({
    where: { id: academicYearId, schoolId: actor.schoolId, status: { not: "ARCHIVED" } },
    select: { id: true },
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

async function updateTranslations(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  kind: "stage" | "subject" | "period",
  entityId: string,
  academicYearId: string | null,
  names: Record<Locale, string>,
) {
  for (const locale of SUPPORTED_LOCALES) {
    if (kind === "stage") {
      await tx.educationStageTranslation.upsert({
        where: { educationStageId_locale: { educationStageId: entityId, locale } },
        create: {
          educationStageId: entityId,
          schoolId: actor.schoolId,
          academicYearId: academicYearId!,
          locale,
          name: names[locale],
        },
        update: { name: names[locale] },
      });
    } else if (kind === "subject") {
      await tx.subjectTranslation.upsert({
        where: { subjectId_locale: { subjectId: entityId, locale } },
        create: {
          subjectId: entityId,
          schoolId: actor.schoolId,
          locale,
          name: names[locale],
        },
        update: { name: names[locale] },
      });
    } else {
      await tx.lessonPeriodTranslation.upsert({
        where: { lessonPeriodId_locale: { lessonPeriodId: entityId, locale } },
        create: {
          lessonPeriodId: entityId,
          schoolId: actor.schoolId,
          academicYearId: academicYearId!,
          locale,
          name: names[locale],
        },
        update: { name: names[locale] },
      });
    }
  }
}

export async function persistEducationStage(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: EducationStageInput,
): Promise<AcademicStructureState> {
  if (!(await yearExists(tx, actor, input.academicYearId)))
    return error(actor.messages.unavailable);
  const snapshot = {
    academicYearId: input.academicYearId,
    code: input.code,
    sequence: input.sequence,
    names: input.names,
  };
  if (!input.id) {
    const created = await tx.educationStage.create({
      data: {
        schoolId: actor.schoolId,
        academicYearId: input.academicYearId,
        code: input.code,
        name: input.names[actor.defaultLocale],
        sequence: input.sequence,
        translations: { create: translationData(actor, input.names) },
      },
    });
    await audit(tx, actor, {
      action: "academic.stage.created",
      entityType: "EducationStage",
      entityId: created.id,
      afterData: snapshot,
      changedFields: ["academicYearId", "code", "sequence", "names"],
    });
    return { status: "success", message: actor.messages.stageCreated };
  }
  const current = await tx.educationStage.findFirst({
    where: { id: input.id, schoolId: actor.schoolId, academicYearId: input.academicYearId },
    include: { translations: true },
  });
  if (!current || current.archivedAt) return error(actor.messages.unavailable);
  if (current.updatedAt.toISOString() !== input.revision)
    return error(actor.messages.conflict);
  const updated = await tx.educationStage.updateMany({
    where: { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt },
    data: {
      code: input.code,
      sequence: input.sequence,
      name: input.names[actor.defaultLocale],
    },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  await updateTranslations(tx, actor, "stage", current.id, input.academicYearId, input.names);
  await audit(tx, actor, {
    action: "academic.stage.updated",
    entityType: "EducationStage",
    entityId: current.id,
    beforeData: {
      academicYearId: current.academicYearId,
      code: current.code,
      sequence: current.sequence,
      names: Object.fromEntries(current.translations.map((item) => [item.locale, item.name])),
    },
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
  const stage = await tx.educationStage.findFirst({
    where: {
      id: input.educationStageId,
      schoolId: actor.schoolId,
      academicYearId: input.academicYearId,
      archivedAt: null,
    },
    select: { id: true },
  });
  if (!stage || !(await yearExists(tx, actor, input.academicYearId)))
    return error(actor.messages.unavailable);
  const snapshot = {
    academicYearId: input.academicYearId,
    educationStageId: stage.id,
    code: input.code,
    sequence: input.sequence,
  };
  if (!input.id) {
    const created = await tx.gradeLevel.create({
      data: { schoolId: actor.schoolId, ...snapshot },
    });
    await audit(tx, actor, {
      action: "academic.grade.created",
      entityType: "GradeLevel",
      entityId: created.id,
      afterData: snapshot,
      changedFields: Object.keys(snapshot),
    });
    return { status: "success", message: actor.messages.gradeCreated };
  }
  const current = await tx.gradeLevel.findFirst({
    where: { id: input.id, schoolId: actor.schoolId, academicYearId: input.academicYearId },
  });
  if (!current || current.archivedAt) return error(actor.messages.unavailable);
  if (current.updatedAt.toISOString() !== input.revision)
    return error(actor.messages.conflict);
  const updated = await tx.gradeLevel.updateMany({
    where: { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt },
    data: { educationStageId: stage.id, code: input.code, sequence: input.sequence },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  await audit(tx, actor, {
    action: "academic.grade.updated",
    entityType: "GradeLevel",
    entityId: current.id,
    beforeData: {
      academicYearId: current.academicYearId,
      educationStageId: current.educationStageId,
      code: current.code,
      sequence: current.sequence,
    },
    afterData: snapshot,
    changedFields: ["educationStageId", "code", "sequence"],
  });
  return { status: "success", message: actor.messages.gradeUpdated };
}

export async function persistClassSection(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: ClassSectionInput,
): Promise<AcademicStructureState> {
  const grade = await tx.gradeLevel.findFirst({
    where: {
      id: input.gradeLevelId,
      schoolId: actor.schoolId,
      academicYearId: input.academicYearId,
      archivedAt: null,
      educationStage: { archivedAt: null },
    },
    select: { id: true },
  });
  if (!grade || !(await yearExists(tx, actor, input.academicYearId)))
    return error(actor.messages.unavailable);
  const snapshot = {
    academicYearId: input.academicYearId,
    gradeLevelId: grade.id,
    code: input.code,
  };
  if (!input.id) {
    const created = await tx.classSection.create({
      data: { schoolId: actor.schoolId, ...snapshot },
    });
    await audit(tx, actor, {
      action: "academic.section.created",
      entityType: "ClassSection",
      entityId: created.id,
      afterData: snapshot,
      changedFields: Object.keys(snapshot),
    });
    return { status: "success", message: actor.messages.sectionCreated };
  }
  const current = await tx.classSection.findFirst({
    where: { id: input.id, schoolId: actor.schoolId, academicYearId: input.academicYearId },
  });
  if (!current || current.archivedAt) return error(actor.messages.unavailable);
  if (current.updatedAt.toISOString() !== input.revision)
    return error(actor.messages.conflict);
  const updated = await tx.classSection.updateMany({
    where: { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt },
    data: { gradeLevelId: grade.id, code: input.code },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  await audit(tx, actor, {
    action: "academic.section.updated",
    entityType: "ClassSection",
    entityId: current.id,
    beforeData: {
      academicYearId: current.academicYearId,
      gradeLevelId: current.gradeLevelId,
      code: current.code,
    },
    afterData: snapshot,
    changedFields: ["gradeLevelId", "code"],
  });
  return { status: "success", message: actor.messages.sectionUpdated };
}

export async function persistSubject(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: SubjectInput,
): Promise<AcademicStructureState> {
  const snapshot = { names: input.names };
  if (!input.id) {
    const created = await tx.subject.create({
      data: {
        schoolId: actor.schoolId,
        name: input.names[actor.defaultLocale],
        translations: { create: translationData(actor, input.names) },
      },
    });
    await audit(tx, actor, {
      action: "academic.subject.created",
      entityType: "Subject",
      entityId: created.id,
      afterData: snapshot,
      changedFields: ["names"],
    });
    return { status: "success", message: actor.messages.subjectCreated };
  }
  const current = await tx.subject.findFirst({
    where: { id: input.id, schoolId: actor.schoolId },
    include: { translations: true },
  });
  if (!current || current.archivedAt) return error(actor.messages.unavailable);
  if (current.updatedAt.toISOString() !== input.revision)
    return error(actor.messages.conflict);
  const updated = await tx.subject.updateMany({
    where: { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt },
    data: { name: input.names[actor.defaultLocale] },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  await updateTranslations(tx, actor, "subject", current.id, null, input.names);
  await audit(tx, actor, {
    action: "academic.subject.updated",
    entityType: "Subject",
    entityId: current.id,
    beforeData: {
      names: Object.fromEntries(current.translations.map((item) => [item.locale, item.name])),
    },
    afterData: snapshot,
    changedFields: ["names"],
  });
  return { status: "success", message: actor.messages.subjectUpdated };
}

export async function persistCourseOffering(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: CourseOfferingInput,
): Promise<AcademicStructureState> {
  const [section, subject] = await Promise.all([
    tx.classSection.findFirst({
      where: {
        id: input.classSectionId,
        schoolId: actor.schoolId,
        academicYearId: input.academicYearId,
        archivedAt: null,
        gradeLevel: { archivedAt: null, educationStage: { archivedAt: null } },
      },
      select: { id: true },
    }),
    tx.subject.findFirst({
      where: { id: input.subjectId, schoolId: actor.schoolId, archivedAt: null },
      select: { id: true },
    }),
  ]);
  if (!section || !subject || !(await yearExists(tx, actor, input.academicYearId)))
    return error(actor.messages.unavailable);
  const existing = await tx.courseOffering.findUnique({
    where: {
      academicYearId_classSectionId_subjectId: {
        academicYearId: input.academicYearId,
        classSectionId: section.id,
        subjectId: subject.id,
      },
    },
  });
  if (existing) {
    if (!existing.archivedAt) return error(actor.messages.duplicate);
    await tx.courseOffering.update({
      where: { id: existing.id },
      data: { archivedAt: null },
    });
    await audit(tx, actor, {
      action: "academic.offering.restored",
      entityType: "CourseOffering",
      entityId: existing.id,
      beforeData: { archived: true },
      afterData: { archived: false },
      changedFields: ["archivedAt"],
    });
    return { status: "success", message: actor.messages.offeringCreated };
  }
  const snapshot = {
    academicYearId: input.academicYearId,
    classSectionId: section.id,
    subjectId: subject.id,
  };
  const created = await tx.courseOffering.create({
    data: { schoolId: actor.schoolId, ...snapshot },
  });
  await audit(tx, actor, {
    action: "academic.offering.created",
    entityType: "CourseOffering",
    entityId: created.id,
    afterData: snapshot,
    changedFields: Object.keys(snapshot),
  });
  return { status: "success", message: actor.messages.offeringCreated };
}

export async function persistLessonPeriod(
  tx: Prisma.TransactionClient,
  actor: AcademicStructureActor,
  input: LessonPeriodInput,
): Promise<AcademicStructureState> {
  if (!(await yearExists(tx, actor, input.academicYearId)))
    return error(actor.messages.unavailable);
  const overlap = await tx.lessonPeriod.findFirst({
    where: {
      schoolId: actor.schoolId,
      academicYearId: input.academicYearId,
      archivedAt: null,
      id: input.id ? { not: input.id } : undefined,
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
    select: { id: true },
  });
  if (overlap)
    return error(actor.messages.overlap, {
      startTime: actor.messages.overlap,
      endTime: actor.messages.overlap,
    });
  const snapshot = {
    academicYearId: input.academicYearId,
    names: input.names,
    sequence: input.sequence,
    startTime: timeValue(input.startTime),
    endTime: timeValue(input.endTime),
  };
  if (!input.id) {
    const created = await tx.lessonPeriod.create({
      data: {
        schoolId: actor.schoolId,
        academicYearId: input.academicYearId,
        name: input.names[actor.defaultLocale],
        sequence: input.sequence,
        startTime: input.startTime,
        endTime: input.endTime,
        translations: { create: translationData(actor, input.names) },
      },
    });
    await audit(tx, actor, {
      action: "academic.period.created",
      entityType: "LessonPeriod",
      entityId: created.id,
      afterData: snapshot,
      changedFields: Object.keys(snapshot),
    });
    return { status: "success", message: actor.messages.periodCreated };
  }
  const current = await tx.lessonPeriod.findFirst({
    where: { id: input.id, schoolId: actor.schoolId, academicYearId: input.academicYearId },
    include: { translations: true },
  });
  if (!current || current.archivedAt) return error(actor.messages.unavailable);
  if (current.updatedAt.toISOString() !== input.revision)
    return error(actor.messages.conflict);
  const updated = await tx.lessonPeriod.updateMany({
    where: { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt },
    data: {
      name: input.names[actor.defaultLocale],
      sequence: input.sequence,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  await updateTranslations(tx, actor, "period", current.id, input.academicYearId, input.names);
  await audit(tx, actor, {
    action: "academic.period.updated",
    entityType: "LessonPeriod",
    entityId: current.id,
    beforeData: {
      academicYearId: current.academicYearId,
      names: Object.fromEntries(current.translations.map((item) => [item.locale, item.name])),
      sequence: current.sequence,
      startTime: timeValue(current.startTime),
      endTime: timeValue(current.endTime),
    },
    afterData: snapshot,
    changedFields: ["names", "sequence", "startTime", "endTime"],
  });
  return { status: "success", message: actor.messages.periodUpdated };
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
  const nextArchivedAt = archive ? new Date() : null;
  let current: { id: string; updatedAt: Date; archivedAt: Date | null } | null = null;

  if (input.entity === "stage") {
    current = await tx.educationStage.findFirst({ where: { id: input.id, schoolId: actor.schoolId } });
    if (archive && current) {
      const dependencies = await tx.gradeLevel.count({
        where: { educationStageId: current.id, schoolId: actor.schoolId, archivedAt: null },
      });
      if (dependencies) return error(actor.messages.dependency);
    }
    if (!archive && current) {
      const stage = await tx.educationStage.findFirst({
        where: {
          id: current.id,
          schoolId: actor.schoolId,
          academicYear: { status: { not: "ARCHIVED" } },
        },
        select: { id: true },
      });
      if (!stage) return error(actor.messages.dependency);
    }
  } else if (input.entity === "grade") {
    current = await tx.gradeLevel.findFirst({ where: { id: input.id, schoolId: actor.schoolId } });
    if (archive && current) {
      const dependencies = await tx.classSection.count({
        where: { gradeLevelId: current.id, schoolId: actor.schoolId, archivedAt: null },
      });
      if (dependencies) return error(actor.messages.dependency);
    }
    if (!archive && current) {
      const parent = await tx.gradeLevel.findFirst({
        where: {
          id: current.id,
          schoolId: actor.schoolId,
          academicYear: { status: { not: "ARCHIVED" } },
          educationStage: { archivedAt: null },
        },
        select: { id: true },
      });
      if (!parent) return error(actor.messages.dependency);
    }
  } else if (input.entity === "section") {
    current = await tx.classSection.findFirst({ where: { id: input.id, schoolId: actor.schoolId } });
    if (archive && current) {
      const dependencies = await tx.courseOffering.count({
        where: { classSectionId: current.id, schoolId: actor.schoolId, archivedAt: null },
      });
      if (dependencies) return error(actor.messages.dependency);
    }
    if (!archive && current) {
      const parent = await tx.classSection.findFirst({
        where: {
          id: current.id,
          schoolId: actor.schoolId,
          academicYear: { status: { not: "ARCHIVED" } },
          gradeLevel: {
            archivedAt: null,
            educationStage: { archivedAt: null },
          },
        },
        select: { id: true },
      });
      if (!parent) return error(actor.messages.dependency);
    }
  } else if (input.entity === "subject") {
    current = await tx.subject.findFirst({ where: { id: input.id, schoolId: actor.schoolId } });
    if (archive && current) {
      const dependencies = await tx.courseOffering.count({
        where: { subjectId: current.id, schoolId: actor.schoolId, archivedAt: null },
      });
      if (dependencies) return error(actor.messages.dependency);
    }
  } else if (input.entity === "offering") {
    current = await tx.courseOffering.findFirst({ where: { id: input.id, schoolId: actor.schoolId } });
    if (!archive && current) {
      const parents = await tx.courseOffering.findFirst({
        where: {
          id: current.id,
          schoolId: actor.schoolId,
          academicYear: { status: { not: "ARCHIVED" } },
          subject: { archivedAt: null },
          classSection: {
            archivedAt: null,
            gradeLevel: {
              archivedAt: null,
              educationStage: { archivedAt: null },
            },
          },
        },
        select: { id: true },
      });
      if (!parents) return error(actor.messages.dependency);
    }
  } else {
    current = await tx.lessonPeriod.findFirst({ where: { id: input.id, schoolId: actor.schoolId } });
    if (!archive && current) {
      const period = await tx.lessonPeriod.findFirst({
        where: {
          id: current.id,
          schoolId: actor.schoolId,
          academicYear: { status: { not: "ARCHIVED" } },
        },
        select: { id: true },
      });
      if (!period) return error(actor.messages.dependency);
    }
  }

  if (!current) return error(actor.messages.unavailable);
  if (current.updatedAt.toISOString() !== input.revision)
    return error(actor.messages.conflict);
  if (archive === Boolean(current.archivedAt))
    return { status: "success", message: actor.messages.noChange };

  const where = { id: current.id, schoolId: actor.schoolId, updatedAt: current.updatedAt };
  let count = 0;
  if (input.entity === "stage")
    count = (await tx.educationStage.updateMany({ where, data: { archivedAt: nextArchivedAt } })).count;
  else if (input.entity === "grade")
    count = (await tx.gradeLevel.updateMany({ where, data: { archivedAt: nextArchivedAt } })).count;
  else if (input.entity === "section")
    count = (await tx.classSection.updateMany({ where, data: { archivedAt: nextArchivedAt } })).count;
  else if (input.entity === "subject")
    count = (await tx.subject.updateMany({ where, data: { archivedAt: nextArchivedAt } })).count;
  else if (input.entity === "offering")
    count = (await tx.courseOffering.updateMany({ where, data: { archivedAt: nextArchivedAt } })).count;
  else
    count = (await tx.lessonPeriod.updateMany({ where, data: { archivedAt: nextArchivedAt } })).count;
  if (count !== 1) return error(actor.messages.conflict);

  const entityType = {
    stage: "EducationStage",
    grade: "GradeLevel",
    section: "ClassSection",
    subject: "Subject",
    offering: "CourseOffering",
    period: "LessonPeriod",
  }[input.entity];
  await audit(tx, actor, {
    action: `academic.${input.entity}.${input.transition}d`,
    entityType,
    entityId: current.id,
    beforeData: { archivedAt: current.archivedAt?.toISOString() ?? null },
    afterData: { archivedAt: nextArchivedAt?.toISOString() ?? null },
    changedFields: ["archivedAt"],
  });
  return {
    status: "success",
    message: archive ? actor.messages.archived : actor.messages.restored,
  };
}
