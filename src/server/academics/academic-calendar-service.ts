import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import {
  dateOnlyValue,
  type AcademicCalendarState,
  type AcademicTermInput,
  type AcademicTransition,
  type AcademicYearInput,
} from "@/lib/academic-calendar-validation";

type ActorContext = {
  schoolId: string;
  actorUserId: string;
  actorMembershipId: string;
};

export const academicCalendarConflict: AcademicCalendarState = {
  status: "error",
  message:
    "Bu kayıt başka bir işlemle değişti. Sayfayı yenileyip tekrar deneyin.",
};

const unavailable: AcademicCalendarState = {
  status: "error",
  message: "Bu kayıt bulunamadı veya okulunuzun kapsamında değil.",
};

const editableDraftOnly: AcademicCalendarState = {
  status: "error",
  message:
    "Yalnız taslak kayıtların adı ve tarihleri değiştirilebilir. Önce yaşam döngüsü durumunu kontrol edin.",
};

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
  nextStatus: "CLOSED" | "ARCHIVED",
  reason: string,
) {
  const beforeData = termSnapshot(term);
  await audit(tx, actor, {
    action: `academic.term.${nextStatus === "CLOSED" ? "closed" : "archived"}`,
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
    return { status: "success", message: "Öğretim yılı oluşturuldu." };
  }

  const current = await tx.academicYear.findFirst({
    where: { id: input.id, schoolId: actor.schoolId },
  });
  if (!current) return unavailable;
  if (current.status !== "DRAFT") return editableDraftOnly;
  if (current.updatedAt.toISOString() !== input.revision)
    return academicCalendarConflict;
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
    return { status: "success", message: "Değişiklik bulunmadı." };

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
  if (result.count !== 1) return academicCalendarConflict;
  await audit(tx, actor, {
    action: "academic.year.updated",
    entityType: "AcademicYear",
    entityId: current.id,
    beforeData,
    afterData,
    changedFields,
  });
  return { status: "success", message: "Öğretim yılı güncellendi." };
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
  if (!year) return unavailable;
  if (year.status !== "DRAFT")
    return {
      status: "error",
      message: "Dönemler yalnız öğretim yılı taslaktayken düzenlenebilir.",
    };
  if (input.startDate < year.startDate || input.endDate > year.endDate)
    return {
      status: "error",
      message: "Dönem tarihleri öğretim yılının tarih aralığında olmalı.",
      fieldErrors: { startDate: "Yıl aralığını kontrol edin.", endDate: "Yıl aralığını kontrol edin." },
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
    select: { id: true, name: true },
  });
  if (overlap)
    return {
      status: "error",
      message: `Tarih aralığı “${overlap.name}” ile çakışıyor.`,
      fieldErrors: { startDate: "Dönemler çakışamaz.", endDate: "Dönemler çakışamaz." },
    };

  if (!input.id) {
    const created = await tx.academicTerm.create({
      data: {
        schoolId: actor.schoolId,
        academicYearId: year.id,
        name: input.name,
        sequence: input.sequence,
        startDate: input.startDate,
        endDate: input.endDate,
        createdById: actor.actorUserId,
        updatedById: actor.actorUserId,
      },
    });
    await audit(tx, actor, {
      action: "academic.term.created",
      entityType: "AcademicTerm",
      entityId: created.id,
      afterData: termSnapshot(created),
      changedFields: [
        "academicYearId",
        "name",
        "sequence",
        "startDate",
        "endDate",
        "status",
      ],
    });
    return { status: "success", message: "Dönem oluşturuldu." };
  }

  const current = await tx.academicTerm.findFirst({
    where: {
      id: input.id,
      schoolId: actor.schoolId,
      academicYearId: year.id,
    },
  });
  if (!current) return unavailable;
  if (current.status !== "DRAFT") return editableDraftOnly;
  if (current.updatedAt.toISOString() !== input.revision)
    return academicCalendarConflict;
  const beforeData = termSnapshot(current);
  const afterData = {
    ...beforeData,
    name: input.name,
    sequence: input.sequence,
    startDate: dateOnlyValue(input.startDate),
    endDate: dateOnlyValue(input.endDate),
  };
  const changedFields = Object.keys(afterData).filter(
    (key) =>
      beforeData[key as keyof typeof beforeData] !==
      afterData[key as keyof typeof afterData],
  );
  if (!changedFields.length)
    return { status: "success", message: "Değişiklik bulunmadı." };

  const result = await tx.academicTerm.updateMany({
    where: {
      id: current.id,
      schoolId: actor.schoolId,
      academicYearId: year.id,
      status: "DRAFT",
      updatedAt: new Date(input.revision as string),
    },
    data: {
      name: input.name,
      sequence: input.sequence,
      startDate: input.startDate,
      endDate: input.endDate,
      updatedById: actor.actorUserId,
    },
  });
  if (result.count !== 1) return academicCalendarConflict;
  await audit(tx, actor, {
    action: "academic.term.updated",
    entityType: "AcademicTerm",
    entityId: current.id,
    beforeData,
    afterData,
    changedFields,
  });
  return { status: "success", message: "Dönem güncellendi." };
}

export async function transitionAcademicYear(
  tx: Prisma.TransactionClient,
  actor: ActorContext,
  input: { id: string; revision: string; transition: AcademicTransition },
): Promise<AcademicCalendarState> {
  const current = await tx.academicYear.findFirst({
    where: { id: input.id, schoolId: actor.schoolId },
    include: { terms: { where: { status: { not: "ARCHIVED" } } } },
  });
  if (!current) return unavailable;
  if (current.updatedAt.toISOString() !== input.revision)
    return academicCalendarConflict;

  const beforeData = yearSnapshot(current);
  let nextStatus: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  let archivedAt: Date | null = null;
  let archivedById: string | null = null;
  let reason: string;

  if (input.transition === "activate") {
    if (current.status !== "DRAFT") return academicCalendarConflict;
    if (!current.terms.length)
      return {
        status: "error",
        message: "Öğretim yılını etkinleştirmeden önce en az bir dönem ekleyin.",
      };
    const previous = await tx.academicYear.findFirst({
      where: {
        schoolId: actor.schoolId,
        status: "ACTIVE",
        archivedAt: null,
        id: { not: current.id },
      },
      include: { terms: { where: { status: "ACTIVE" } } },
    });
    if (previous) {
      await tx.academicTerm.updateMany({
        where: {
          schoolId: actor.schoolId,
          academicYearId: previous.id,
          status: "ACTIVE",
        },
        data: { status: "CLOSED", updatedById: actor.actorUserId },
      });
      await tx.academicYear.update({
        where: { id: previous.id },
        data: { status: "CLOSED", updatedById: actor.actorUserId },
      });
      for (const term of previous.terms) {
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
        entityId: previous.id,
        beforeData: yearSnapshot(previous),
        afterData: { ...yearSnapshot(previous), status: "CLOSED" },
        changedFields: ["status"],
        reason: `Closed automatically when ${current.name} became active.`,
      });
    }
    nextStatus = "ACTIVE";
    reason = "Academic year activated by school administrator.";
  } else if (input.transition === "close") {
    if (current.status !== "ACTIVE") return academicCalendarConflict;
    await tx.academicTerm.updateMany({
      where: {
        schoolId: actor.schoolId,
        academicYearId: current.id,
        status: "ACTIVE",
      },
      data: { status: "CLOSED", updatedById: actor.actorUserId },
    });
    for (const term of current.terms.filter(
      (term) => term.status === "ACTIVE",
    )) {
      await auditTermStatusChange(
        tx,
        actor,
        term,
        "CLOSED",
        `Closed automatically with academic year ${current.name}.`,
      );
    }
    nextStatus = "CLOSED";
    reason = "Academic year closed by school administrator.";
  } else if (input.transition === "archive") {
    if (!(["DRAFT", "CLOSED"] as string[]).includes(current.status))
      return academicCalendarConflict;
    const archivedOn = new Date();
    await tx.academicTerm.updateMany({
      where: {
        schoolId: actor.schoolId,
        academicYearId: current.id,
        status: { in: ["DRAFT", "CLOSED"] },
      },
      data: {
        status: "ARCHIVED",
        archivedAt: archivedOn,
        archivedById: actor.actorUserId,
        updatedById: actor.actorUserId,
      },
    });
    for (const term of current.terms.filter((term) =>
      (["DRAFT", "CLOSED"] as string[]).includes(term.status),
    )) {
      await auditTermStatusChange(
        tx,
        actor,
        term,
        "ARCHIVED",
        `Archived automatically with academic year ${current.name}.`,
      );
    }
    nextStatus = "ARCHIVED";
    archivedAt = archivedOn;
    archivedById = actor.actorUserId;
    reason = "Academic year archived; non-active terms archived with it.";
  } else {
    if (current.status !== "ARCHIVED") return academicCalendarConflict;
    nextStatus = "DRAFT";
    reason = "Academic year restored as draft; archived terms remain archived.";
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
  if (result.count !== 1) return academicCalendarConflict;
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
        ? "Öğretim yılı etkinleştirildi."
        : input.transition === "close"
          ? "Öğretim yılı kapatıldı."
          : input.transition === "archive"
            ? "Öğretim yılı arşivlendi."
            : "Öğretim yılı taslak olarak geri alındı.",
  };
}

export async function transitionAcademicTerm(
  tx: Prisma.TransactionClient,
  actor: ActorContext,
  input: { id: string; revision: string; transition: AcademicTransition },
): Promise<AcademicCalendarState> {
  const current = await tx.academicTerm.findFirst({
    where: { id: input.id, schoolId: actor.schoolId },
    include: { academicYear: { select: { status: true } } },
  });
  if (!current) return unavailable;
  if (current.updatedAt.toISOString() !== input.revision)
    return academicCalendarConflict;
  const beforeData = termSnapshot(current);
  let nextStatus: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  let archivedAt: Date | null = null;
  let archivedById: string | null = null;
  let reason: string;

  if (input.transition === "activate") {
    if (current.status !== "DRAFT" || current.academicYear.status !== "ACTIVE")
      return {
        status: "error",
        message: "Yalnız aktif öğretim yılındaki taslak dönem etkinleştirilebilir.",
      };
    const previous = await tx.academicTerm.findFirst({
      where: {
        schoolId: actor.schoolId,
        academicYearId: current.academicYearId,
        status: "ACTIVE",
        id: { not: current.id },
      },
    });
    if (previous) {
      await tx.academicTerm.update({
        where: { id: previous.id },
        data: { status: "CLOSED", updatedById: actor.actorUserId },
      });
      await audit(tx, actor, {
        action: "academic.term.closed",
        entityType: "AcademicTerm",
        entityId: previous.id,
        beforeData: termSnapshot(previous),
        afterData: { ...termSnapshot(previous), status: "CLOSED" },
        changedFields: ["status"],
        reason: `Closed automatically when ${current.name} became active.`,
      });
    }
    nextStatus = "ACTIVE";
    reason = "Academic term activated by school administrator.";
  } else if (input.transition === "close") {
    if (current.status !== "ACTIVE") return academicCalendarConflict;
    nextStatus = "CLOSED";
    reason = "Academic term closed by school administrator.";
  } else if (input.transition === "archive") {
    if (!(["DRAFT", "CLOSED"] as string[]).includes(current.status))
      return academicCalendarConflict;
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
        message:
          "Dönem yalnız öğretim yılı taslak durumundayken geri alınabilir.",
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
  if (result.count !== 1) return academicCalendarConflict;
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
      input.transition === "activate"
        ? "Dönem etkinleştirildi."
        : input.transition === "close"
          ? "Dönem kapatıldı."
          : input.transition === "archive"
            ? "Dönem arşivlendi."
            : "Dönem taslak olarak geri alındı.",
  };
}
