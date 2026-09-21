import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { SUPPORTED_LOCALES, type Locale, type LocalizedNames } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";
import { tr } from "@/i18n/dictionaries/tr";
import {
  dateOnlyValue,
  type AcademicCalendarState,
  type AcademicServerMessages,
  type AcademicTermInput,
  type AcademicTransition,
  type AcademicYearInput,
} from "@/lib/academic-calendar-validation";

type ActorContext = {
  schoolId: string;
  actorUserId: string;
  actorMembershipId: string;
  locale: Locale;
  defaultLocale: Locale;
  messages: AcademicServerMessages;
};

export function academicCalendarConflict(
  messages: AcademicServerMessages = tr.academicServer,
): AcademicCalendarState {
  return { status: "error", message: messages.conflict };
}

function unavailable(messages: AcademicServerMessages): AcademicCalendarState {
  return { status: "error", message: messages.unavailable };
}

function editableDraftOnly(
  messages: AcademicServerMessages,
): AcademicCalendarState {
  return { status: "error", message: messages.draftOnly };
}

function yearSnapshot(year: {
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  archivedAt?: Date | null;
  archivedById?: string | null;
}) {
  return {
    name: year.name,
    startDate: dateOnlyValue(year.startDate),
    endDate: dateOnlyValue(year.endDate),
    status: year.status,
    archivedAt: year.archivedAt?.toISOString() ?? null,
    archivedById: year.archivedById ?? null,
  };
}

function termSnapshot(term: {
  name: string;
  translations?: { locale: string; name: string }[];
  sequence: number;
  startDate: Date;
  endDate: Date;
  status: string;
  academicYearId: string;
  archivedAt?: Date | null;
  archivedById?: string | null;
}) {
  return {
    academicYearId: term.academicYearId,
    name: term.name,
    names: Object.fromEntries(
      term.translations?.map((translation) => [
        translation.locale,
        translation.name,
      ]) ?? [],
    ),
    sequence: term.sequence,
    startDate: dateOnlyValue(term.startDate),
    endDate: dateOnlyValue(term.endDate),
    status: term.status,
    archivedAt: term.archivedAt?.toISOString() ?? null,
    archivedById: term.archivedById ?? null,
  };
}

async function auditTermStatusChange(
  tx: Prisma.TransactionClient,
  actor: ActorContext,
  term: Parameters<typeof termSnapshot>[0] & { id: string },
  nextStatus: "ACTIVE" | "CLOSED" | "ARCHIVED",
  reason: string,
) {
  const beforeData = termSnapshot(term);
  await audit(tx, actor, {
    action: `academic.term.${
      nextStatus === "ACTIVE"
        ? "activated"
        : nextStatus === "CLOSED"
          ? "closed"
          : "archived"
    }`,
    entityType: "AcademicTerm",
    entityId: term.id,
    beforeData,
    afterData: { ...beforeData, status: nextStatus },
    changedFields:
      nextStatus === "ARCHIVED"
        ? ["status", "archivedAt", "archivedById"]
        : ["status"],
    reason,
  });
}

async function audit(
  tx: Prisma.TransactionClient,
  actor: ActorContext,
  data: {
    action: string;
    entityType: "AcademicYear" | "AcademicTerm";
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

export async function persistAcademicYear(
  tx: Prisma.TransactionClient,
  actor: ActorContext,
  input: AcademicYearInput,
): Promise<AcademicCalendarState> {
  if (!input.id) {
    const created = await tx.academicYear.create({
      data: {
        schoolId: actor.schoolId,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        createdById: actor.actorUserId,
        updatedById: actor.actorUserId,
      },
    });
    await audit(tx, actor, {
      action: "academic.year.created",
      entityType: "AcademicYear",
      entityId: created.id,
      afterData: yearSnapshot(created),
      changedFields: ["name", "startDate", "endDate", "status"],
    });
    return { status: "success", message: actor.messages.yearCreated };
  }

  const current = await tx.academicYear.findFirst({
    where: { id: input.id, schoolId: actor.schoolId },
  });
  if (!current) return unavailable(actor.messages);
  if (current.status !== "DRAFT") return editableDraftOnly(actor.messages);
  if (current.updatedAt.toISOString() !== input.revision)
    return academicCalendarConflict(actor.messages);
  const beforeData = yearSnapshot(current);
  const afterData = {
    ...beforeData,
    name: input.name,
    startDate: dateOnlyValue(input.startDate),
    endDate: dateOnlyValue(input.endDate),
  };
  const changedFields = Object.keys(afterData).filter(
    (key) =>
      beforeData[key as keyof typeof beforeData] !==
      afterData[key as keyof typeof afterData],
  );
  if (!changedFields.length)
    return { status: "success", message: actor.messages.noChange };

  const result = await tx.academicYear.updateMany({
    where: {
      id: current.id,
      schoolId: actor.schoolId,
      status: "DRAFT",
      updatedAt: new Date(input.revision as string),
    },
    data: {
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      updatedById: actor.actorUserId,
    },
  });
  if (result.count !== 1) return academicCalendarConflict(actor.messages);
  await audit(tx, actor, {
    action: "academic.year.updated",
    entityType: "AcademicYear",
    entityId: current.id,
    beforeData,
    afterData,
    changedFields,
  });
  return { status: "success", message: actor.messages.yearUpdated };
}

export async function persistAcademicTerm(
  tx: Prisma.TransactionClient,
  actor: ActorContext,
  input: AcademicTermInput,
): Promise<AcademicCalendarState> {
  const year = await tx.academicYear.findFirst({
    where: { id: input.academicYearId, schoolId: actor.schoolId },
    select: { id: true, status: true, startDate: true, endDate: true },
  });
  if (!year) return unavailable(actor.messages);
  if (year.status !== "DRAFT")
    return {
      status: "error",
      message: actor.messages.termDraftYearOnly,
    };
  if (input.startDate < year.startDate || input.endDate > year.endDate)
    return {
      status: "error",
      message: actor.messages.termOutsideYear,
      fieldErrors: {
        startDate: actor.messages.checkYearRange,
        endDate: actor.messages.checkYearRange,
      },
    };

  const overlap = await tx.academicTerm.findFirst({
    where: {
      schoolId: actor.schoolId,
      academicYearId: year.id,
      id: input.id ? { not: input.id } : undefined,
      status: { not: "ARCHIVED" },
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
    include: { translations: true },
  });
  if (overlap)
    return {
      status: "error",
      message: formatMessage(actor.messages.overlapMessage, {
        name:
          overlap.translations.find(
            (translation) => translation.locale === actor.locale,
          )?.name ?? overlap.name,
      }),
      fieldErrors: {
        startDate: actor.messages.overlapField,
        endDate: actor.messages.overlapField,
      },
    };

  if (!input.id) {
    const created = await tx.academicTerm.create({
      data: {
        schoolId: actor.schoolId,
        academicYearId: year.id,
        name: input.names[actor.defaultLocale],
        sequence: input.sequence,
        startDate: input.startDate,
        endDate: input.endDate,
        createdById: actor.actorUserId,
        updatedById: actor.actorUserId,
        translations: {
          create: SUPPORTED_LOCALES.map((locale) => ({
            school: { connect: { id: actor.schoolId } },
            locale,
            name: input.names[locale],
          })),
        },
      },
      include: { translations: true },
    });
    await audit(tx, actor, {
      action: "academic.term.created",
      entityType: "AcademicTerm",
      entityId: created.id,
      afterData: termSnapshot(created),
      changedFields: [
        "academicYearId",
        "names.tr",
        "names.sq",
        "names.en",
        "sequence",
        "startDate",
        "endDate",
        "status",
      ],
    });
    return { status: "success", message: actor.messages.termCreated };
  }

  const current = await tx.academicTerm.findFirst({
    where: {
      id: input.id,
      schoolId: actor.schoolId,
      academicYearId: year.id,
    },
    include: { translations: true },
  });
  if (!current) return unavailable(actor.messages);
  if (current.status !== "DRAFT") return editableDraftOnly(actor.messages);
  if (current.updatedAt.toISOString() !== input.revision)
    return academicCalendarConflict(actor.messages);
  const beforeData = termSnapshot(current);
  const afterData = {
    ...beforeData,
    name: input.names[actor.defaultLocale],
    names: input.names,
    sequence: input.sequence,
    startDate: dateOnlyValue(input.startDate),
    endDate: dateOnlyValue(input.endDate),
  };
  const changedFields = [
    ...(beforeData.sequence !== afterData.sequence ? ["sequence"] : []),
    ...(beforeData.startDate !== afterData.startDate ? ["startDate"] : []),
    ...(beforeData.endDate !== afterData.endDate ? ["endDate"] : []),
    ...SUPPORTED_LOCALES.filter(
      (locale) =>
        (beforeData.names as Partial<LocalizedNames>)[locale] !==
        input.names[locale],
    ).map((locale) => `names.${locale}`),
  ];
  if (!changedFields.length)
    return { status: "success", message: actor.messages.noChange };

  const result = await tx.academicTerm.updateMany({
    where: {
      id: current.id,
      schoolId: actor.schoolId,
      academicYearId: year.id,
      status: "DRAFT",
      updatedAt: new Date(input.revision as string),
    },
    data: {
      name: input.names[actor.defaultLocale],
      sequence: input.sequence,
      startDate: input.startDate,
      endDate: input.endDate,
      updatedById: actor.actorUserId,
    },
  });
  if (result.count !== 1) return academicCalendarConflict(actor.messages);
  for (const locale of SUPPORTED_LOCALES) {
    await tx.academicTermTranslation.upsert({
      where: {
        academicTermId_locale: {
          academicTermId: current.id,
          locale,
        },
      },
      create: {
        academicTermId: current.id,
        schoolId: actor.schoolId,
        locale,
        name: input.names[locale],
      },
      update: { name: input.names[locale] },
    });
  }
  await audit(tx, actor, {
    action: "academic.term.updated",
    entityType: "AcademicTerm",
    entityId: current.id,
    beforeData,
    afterData,
    changedFields,
  });
  return { status: "success", message: actor.messages.termUpdated };
}

export async function transitionAcademicYear(
  tx: Prisma.TransactionClient,
  actor: ActorContext,
  input: { id: string; revision: string; transition: AcademicTransition },
): Promise<AcademicCalendarState> {
  const current = await tx.academicYear.findFirst({
    where: { id: input.id, schoolId: actor.schoolId },
    include: {
      terms: {
        where: { status: { not: "ARCHIVED" } },
        include: { translations: true },
      },
    },
  });
  if (!current) return unavailable(actor.messages);
  if (current.updatedAt.toISOString() !== input.revision)
    return academicCalendarConflict(actor.messages);

  const beforeData = yearSnapshot(current);
  let nextStatus: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  let archivedAt: Date | null = null;
  let archivedById: string | null = null;
  let reason: string;
  let previousActiveYear: typeof current | null = null;

  if (input.transition === "activate") {
    if (current.status !== "DRAFT")
      return academicCalendarConflict(actor.messages);
    if (!current.terms.length)
      return {
        status: "error",
        message: actor.messages.yearNeedsTerm,
      };
    previousActiveYear = await tx.academicYear.findFirst({
      where: {
        schoolId: actor.schoolId,
        status: "ACTIVE",
        archivedAt: null,
        id: { not: current.id },
      },
      include: {
        terms: {
          where: { status: { not: "ARCHIVED" } },
          include: { translations: true },
        },
      },
    });
    nextStatus = "ACTIVE";
    reason =
      "Academic year activated; all non-archived terms activated with it.";
  } else if (input.transition === "close") {
    if (current.status !== "ACTIVE")
      return academicCalendarConflict(actor.messages);
    nextStatus = "CLOSED";
    reason = "Academic year and all non-archived terms closed together.";
  } else if (input.transition === "archive") {
    if (!(["DRAFT", "CLOSED"] as string[]).includes(current.status))
      return academicCalendarConflict(actor.messages);
    const archivedOn = new Date();
    nextStatus = "ARCHIVED";
    archivedAt = archivedOn;
    archivedById = actor.actorUserId;
    reason = "Academic year archived; non-active terms archived with it.";
  } else {
    if (current.status !== "ARCHIVED")
      return academicCalendarConflict(actor.messages);
    nextStatus = "DRAFT";
    reason = "Academic year restored as draft; archived terms remain archived.";
  }

  if (previousActiveYear) {
    await tx.academicYear.update({
      where: { id: previousActiveYear.id },
      data: { status: "CLOSED", updatedById: actor.actorUserId },
    });
    await tx.academicTerm.updateMany({
      where: {
        schoolId: actor.schoolId,
        academicYearId: previousActiveYear.id,
        status: { notIn: ["CLOSED", "ARCHIVED"] },
      },
      data: { status: "CLOSED", updatedById: actor.actorUserId },
    });
    for (const term of previousActiveYear.terms.filter(
      (term) => term.status !== "CLOSED",
    )) {
      await auditTermStatusChange(
        tx,
        actor,
        term,
        "CLOSED",
        `Closed automatically when ${current.name} became active.`,
      );
    }
    await audit(tx, actor, {
      action: "academic.year.closed",
      entityType: "AcademicYear",
      entityId: previousActiveYear.id,
      beforeData: yearSnapshot(previousActiveYear),
      afterData: { ...yearSnapshot(previousActiveYear), status: "CLOSED" },
      changedFields: ["status"],
      reason: `Closed automatically when ${current.name} became active.`,
    });
  }

  const result = await tx.academicYear.updateMany({
    where: {
      id: current.id,
      schoolId: actor.schoolId,
      status: current.status,
      updatedAt: new Date(input.revision),
    },
    data: {
      status: nextStatus,
      archivedAt,
      archivedById,
      updatedById: actor.actorUserId,
    },
  });
  if (result.count !== 1) return academicCalendarConflict(actor.messages);

  if (input.transition === "activate") {
    const termsToActivate = current.terms.filter(
      (term) => term.status !== "ACTIVE",
    );
    await tx.academicTerm.updateMany({
      where: {
        schoolId: actor.schoolId,
        academicYearId: current.id,
        status: { not: "ARCHIVED" },
      },
      data: {
        status: "ACTIVE",
        updatedById: actor.actorUserId,
      },
    });
    for (const term of termsToActivate) {
      await auditTermStatusChange(
        tx,
        actor,
        term,
        "ACTIVE",
        `Activated automatically with academic year ${current.name}.`,
      );
    }
  } else if (input.transition === "close") {
    const termsToClose = current.terms.filter(
      (term) => term.status !== "CLOSED",
    );
    await tx.academicTerm.updateMany({
      where: {
        schoolId: actor.schoolId,
        academicYearId: current.id,
        status: { not: "ARCHIVED" },
      },
      data: { status: "CLOSED", updatedById: actor.actorUserId },
    });
    for (const term of termsToClose) {
      await auditTermStatusChange(
        tx,
        actor,
        term,
        "CLOSED",
        `Closed automatically with academic year ${current.name}.`,
      );
    }
  } else if (input.transition === "archive") {
    await tx.academicTerm.updateMany({
      where: {
        schoolId: actor.schoolId,
        academicYearId: current.id,
        status: { not: "ARCHIVED" },
      },
      data: {
        status: "ARCHIVED",
        archivedAt,
        archivedById,
        updatedById: actor.actorUserId,
      },
    });
    for (const term of current.terms) {
      await auditTermStatusChange(
        tx,
        actor,
        term,
        "ARCHIVED",
        `Archived automatically with academic year ${current.name}.`,
      );
    }
  }

  await audit(tx, actor, {
    action: `academic.year.${input.transition}d`,
    entityType: "AcademicYear",
    entityId: current.id,
    beforeData,
    afterData: {
      ...beforeData,
      status: nextStatus,
      archivedAt: archivedAt?.toISOString() ?? null,
      archivedById,
    },
    changedFields:
      input.transition === "archive" || input.transition === "restore"
        ? ["status", "archivedAt", "archivedById"]
        : ["status"],
    reason,
  });
  return {
    status: "success",
    message:
      input.transition === "activate"
        ? actor.messages.yearActivated
        : input.transition === "close"
          ? actor.messages.yearClosed
          : input.transition === "archive"
            ? actor.messages.yearArchived
            : actor.messages.yearRestored,
  };
}

export async function transitionAcademicTerm(
  tx: Prisma.TransactionClient,
  actor: ActorContext,
  input: { id: string; revision: string; transition: AcademicTransition },
): Promise<AcademicCalendarState> {
  const current = await tx.academicTerm.findFirst({
    where: { id: input.id, schoolId: actor.schoolId },
    include: {
      academicYear: { select: { status: true } },
      translations: true,
    },
  });
  if (!current) return unavailable(actor.messages);
  if (current.updatedAt.toISOString() !== input.revision)
    return academicCalendarConflict(actor.messages);
  const beforeData = termSnapshot(current);
  let nextStatus: "DRAFT" | "ARCHIVED";
  let archivedAt: Date | null = null;
  let archivedById: string | null = null;
  let reason: string;

  if (input.transition === "activate" || input.transition === "close") {
    return {
      status: "error",
      message: actor.messages.termLifecycleManagedByYear,
    };
  }

  if (input.transition === "archive") {
    if (
      current.status !== "DRAFT" ||
      current.academicYear.status !== "DRAFT"
    )
      return academicCalendarConflict(actor.messages);
    archivedAt = new Date();
    archivedById = actor.actorUserId;
    nextStatus = "ARCHIVED";
    reason = "Academic term archived by school administrator.";
  } else {
    if (
      current.status !== "ARCHIVED" ||
      current.academicYear.status !== "DRAFT"
    )
      return {
        status: "error",
        message: actor.messages.restoreTermRule,
      };
    nextStatus = "DRAFT";
    reason = "Academic term restored as draft.";
  }

  const result = await tx.academicTerm.updateMany({
    where: {
      id: current.id,
      schoolId: actor.schoolId,
      status: current.status,
      updatedAt: new Date(input.revision),
    },
    data: {
      status: nextStatus,
      archivedAt,
      archivedById,
      updatedById: actor.actorUserId,
    },
  });
  if (result.count !== 1) return academicCalendarConflict(actor.messages);
  await audit(tx, actor, {
    action: `academic.term.${input.transition}d`,
    entityType: "AcademicTerm",
    entityId: current.id,
    beforeData,
    afterData: {
      ...beforeData,
      status: nextStatus,
      archivedAt: archivedAt?.toISOString() ?? null,
      archivedById,
    },
    changedFields:
      input.transition === "archive" || input.transition === "restore"
        ? ["status", "archivedAt", "archivedById"]
        : ["status"],
    reason,
  });
  return {
    status: "success",
    message:
      input.transition === "archive"
        ? actor.messages.termArchived
        : actor.messages.termRestored,
  };
}
