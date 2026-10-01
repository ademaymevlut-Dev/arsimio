import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type {
  CourseTeacherAssignmentInput,
  HomeroomTeacherAssignmentInput,
  TeachingAssignmentTransitionInput,
  TeachingState,
} from "@/lib/teaching-validation";

export type TeachingActor = {
  schoolId: string;
  actorUserId: string;
  actorMembershipId: string;
};

function error(
  message: string,
  fieldErrors?: TeachingState["fieldErrors"],
): TeachingState {
  return { status: "error", message, fieldErrors };
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function withinDateRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

async function audit(
  tx: Prisma.TransactionClient,
  actor: TeachingActor,
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

async function validateActiveTeacher(
  tx: Prisma.TransactionClient,
  actor: TeachingActor,
  teacherProfileId: string,
) {
  return tx.teacherProfile.findFirst({
    where: {
      id: teacherProfileId,
      schoolId: actor.schoolId,
      archivedAt: null,
      status: "ACTIVE",
      employment: {
        schoolId: actor.schoolId,
        archivedAt: null,
        status: "ACTIVE",
      },
    },
    select: { id: true, employmentId: true, title: true },
  });
}

export async function persistHomeroomTeacherAssignment(
  tx: Prisma.TransactionClient,
  actor: TeachingActor,
  input: HomeroomTeacherAssignmentInput,
): Promise<TeachingState> {
  const [teacher, section] = await Promise.all([
    validateActiveTeacher(tx, actor, input.teacherProfileId),
    tx.academicYearClassSection.findFirst({
      where: {
        id: input.academicYearClassSectionId,
        schoolId: actor.schoolId,
        status: "ACTIVE",
        academicYear: {
          schoolId: actor.schoolId,
          status: "ACTIVE",
          archivedAt: null,
        },
      },
      include: {
        academicYear: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
      },
    }),
  ]);
  if (!teacher)
    return error("Aktif ogretmen profili bulunamadi.", {
      teacherProfileId: "Aktif ogretmen secin.",
    });
  if (!section)
    return error("Aktif ogretim yilina ait sinif bulunamadi.", {
      academicYearClassSectionId: "Aktif sinif secin.",
    });
  if (
    !withinDateRange(
      input.effectiveFrom,
      section.academicYear.startDate,
      section.academicYear.endDate,
    )
  )
    return error("Atama tarihi aktif ogretim yilinin icinde olmali.", {
      effectiveFrom: "Ogretim yili araliginda tarih secin.",
    });

  const existingActive = await tx.homeroomTeacherAssignment.findFirst({
    where: {
      schoolId: actor.schoolId,
      academicYearClassSectionId: section.id,
      status: "ACTIVE",
      archivedAt: null,
    },
    select: {
      id: true,
      teacherProfileId: true,
      effectiveFrom: true,
      updatedAt: true,
    },
  });
  if (existingActive?.teacherProfileId === teacher.id)
    return {
      status: "success",
      message: "Bu sinif icin ogretmen atamasi zaten aktif.",
      entityId: existingActive.id,
    };
  if (
    existingActive &&
    input.effectiveFrom.getTime() < existingActive.effectiveFrom.getTime()
  )
    return error("Yeni atama tarihi mevcut aktif atamadan once olamaz.", {
      effectiveFrom: "Mevcut aktif atamadan sonraki bir tarih secin.",
    });

  if (existingActive) {
    await tx.homeroomTeacherAssignment.update({
      where: { id: existingActive.id },
      data: { status: "PASSIVE", effectiveTo: input.effectiveFrom },
    });
    await audit(tx, actor, {
      action: "homeroom_teacher_assignment.replaced",
      entityType: "HomeroomTeacherAssignment",
      entityId: existingActive.id,
      beforeData: {
        teacherProfileId: existingActive.teacherProfileId,
        status: "ACTIVE",
        effectiveFrom: dateValue(existingActive.effectiveFrom),
      },
      afterData: {
        teacherProfileId: existingActive.teacherProfileId,
        status: "PASSIVE",
        effectiveTo: dateValue(input.effectiveFrom),
      },
      changedFields: ["status", "effectiveTo"],
    });
  }

  const assignment = await tx.homeroomTeacherAssignment.create({
    data: {
      schoolId: actor.schoolId,
      academicYearId: section.academicYearId,
      academicYearClassSectionId: section.id,
      teacherProfileId: teacher.id,
      effectiveFrom: input.effectiveFrom,
      note: input.note,
    },
    select: { id: true },
  });
  await audit(tx, actor, {
    action: "homeroom_teacher_assignment.created",
    entityType: "HomeroomTeacherAssignment",
    entityId: assignment.id,
    afterData: {
      academicYearId: section.academicYearId,
      academicYearClassSectionId: section.id,
      teacherProfileId: teacher.id,
      effectiveFrom: dateValue(input.effectiveFrom),
      note: input.note,
      replacedAssignmentId: existingActive?.id ?? null,
    },
    changedFields: ["homeroomTeacherAssignment"],
  });
  return {
    status: "success",
    message: "Sinif sorumlusu atamasi kaydedildi.",
    entityId: assignment.id,
  };
}

export async function persistCourseTeacherAssignment(
  tx: Prisma.TransactionClient,
  actor: TeachingActor,
  input: CourseTeacherAssignmentInput,
): Promise<TeachingState> {
  const [teacher, course] = await Promise.all([
    validateActiveTeacher(tx, actor, input.teacherProfileId),
    tx.courseOffering.findFirst({
      where: {
        id: input.courseOfferingId,
        schoolId: actor.schoolId,
        archivedAt: null,
        academicYear: {
          schoolId: actor.schoolId,
          status: "ACTIVE",
          archivedAt: null,
        },
        academicYearClassSection: { status: "ACTIVE" },
      },
      include: {
        academicYear: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
      },
    }),
  ]);
  if (!teacher)
    return error("Aktif ogretmen profili bulunamadi.", {
      teacherProfileId: "Aktif ogretmen secin.",
    });
  if (!course)
    return error("Aktif ogretim yilina ait ders acilimi bulunamadi.", {
      courseOfferingId: "Aktif ders acilimi secin.",
    });
  if (!withinDateRange(input.effectiveFrom, course.validFrom, course.validTo))
    return error("Atama tarihi ders aciliminin gecerlilik araliginda olmali.", {
      effectiveFrom: "Ders acilimi araliginda tarih secin.",
    });

  const existingActive = await tx.courseTeacherAssignment.findFirst({
    where: {
      schoolId: actor.schoolId,
      courseOfferingId: course.id,
      status: "ACTIVE",
      archivedAt: null,
    },
    select: {
      id: true,
      teacherProfileId: true,
      effectiveFrom: true,
      updatedAt: true,
    },
  });
  if (existingActive?.teacherProfileId === teacher.id)
    return {
      status: "success",
      message: "Bu ders icin ogretmen atamasi zaten aktif.",
      entityId: existingActive.id,
    };
  if (
    existingActive &&
    input.effectiveFrom.getTime() < existingActive.effectiveFrom.getTime()
  )
    return error("Yeni atama tarihi mevcut aktif atamadan once olamaz.", {
      effectiveFrom: "Mevcut aktif atamadan sonraki bir tarih secin.",
    });

  if (existingActive) {
    await tx.courseTeacherAssignment.update({
      where: { id: existingActive.id },
      data: { status: "PASSIVE", effectiveTo: input.effectiveFrom },
    });
    await audit(tx, actor, {
      action: "course_teacher_assignment.replaced",
      entityType: "CourseTeacherAssignment",
      entityId: existingActive.id,
      beforeData: {
        teacherProfileId: existingActive.teacherProfileId,
        status: "ACTIVE",
        effectiveFrom: dateValue(existingActive.effectiveFrom),
      },
      afterData: {
        teacherProfileId: existingActive.teacherProfileId,
        status: "PASSIVE",
        effectiveTo: dateValue(input.effectiveFrom),
      },
      changedFields: ["status", "effectiveTo"],
    });
  }

  const assignment = await tx.courseTeacherAssignment.create({
    data: {
      schoolId: actor.schoolId,
      academicYearId: course.academicYearId,
      courseOfferingId: course.id,
      teacherProfileId: teacher.id,
      effectiveFrom: input.effectiveFrom,
      note: input.note,
    },
    select: { id: true },
  });
  await audit(tx, actor, {
    action: "course_teacher_assignment.created",
    entityType: "CourseTeacherAssignment",
    entityId: assignment.id,
    afterData: {
      academicYearId: course.academicYearId,
      courseOfferingId: course.id,
      teacherProfileId: teacher.id,
      effectiveFrom: dateValue(input.effectiveFrom),
      note: input.note,
      replacedAssignmentId: existingActive?.id ?? null,
    },
    changedFields: ["courseTeacherAssignment"],
  });
  return {
    status: "success",
    message: "Ders ogretmeni atamasi kaydedildi.",
    entityId: assignment.id,
  };
}

async function passivateHomeroomAssignment(
  tx: Prisma.TransactionClient,
  actor: TeachingActor,
  input: TeachingAssignmentTransitionInput,
): Promise<TeachingState> {
  const assignment = await tx.homeroomTeacherAssignment.findFirst({
    where: { id: input.assignmentId, schoolId: actor.schoolId, archivedAt: null },
    select: {
      id: true,
      teacherProfileId: true,
      status: true,
      effectiveFrom: true,
      effectiveTo: true,
      note: true,
      updatedAt: true,
    },
  });
  if (!assignment) return error("Sinif sorumlusu atamasi bulunamadi.");
  if (assignment.updatedAt.toISOString() !== input.revision)
    return error("Kayit bu arada degismis. Sayfayi yenileyip tekrar deneyin.");
  if (input.effectiveOn.getTime() < assignment.effectiveFrom.getTime())
    return error("Pasif tarihi atama baslangicindan once olamaz.", {
      effectiveOn: "Daha ileri bir tarih secin.",
    });
  if (assignment.status === "PASSIVE")
    return { status: "success", message: "Atama zaten pasif." };

  await tx.homeroomTeacherAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "PASSIVE",
      effectiveTo: input.effectiveOn,
      note: input.note ?? assignment.note,
    },
  });
  await audit(tx, actor, {
    action: "homeroom_teacher_assignment.passivized",
    entityType: "HomeroomTeacherAssignment",
    entityId: assignment.id,
    beforeData: {
      teacherProfileId: assignment.teacherProfileId,
      status: assignment.status,
      effectiveTo: assignment.effectiveTo
        ? dateValue(assignment.effectiveTo)
        : null,
      note: assignment.note,
    },
    afterData: {
      teacherProfileId: assignment.teacherProfileId,
      status: "PASSIVE",
      effectiveTo: dateValue(input.effectiveOn),
      note: input.note ?? assignment.note,
    },
    changedFields: ["status", "effectiveTo", "note"],
  });
  return { status: "success", message: "Sinif sorumlusu atamasi pasife alindi." };
}

async function passivateCourseAssignment(
  tx: Prisma.TransactionClient,
  actor: TeachingActor,
  input: TeachingAssignmentTransitionInput,
): Promise<TeachingState> {
  const assignment = await tx.courseTeacherAssignment.findFirst({
    where: { id: input.assignmentId, schoolId: actor.schoolId, archivedAt: null },
    select: {
      id: true,
      teacherProfileId: true,
      status: true,
      effectiveFrom: true,
      effectiveTo: true,
      note: true,
      updatedAt: true,
    },
  });
  if (!assignment) return error("Ders ogretmeni atamasi bulunamadi.");
  if (assignment.updatedAt.toISOString() !== input.revision)
    return error("Kayit bu arada degismis. Sayfayi yenileyip tekrar deneyin.");
  if (input.effectiveOn.getTime() < assignment.effectiveFrom.getTime())
    return error("Pasif tarihi atama baslangicindan once olamaz.", {
      effectiveOn: "Daha ileri bir tarih secin.",
    });
  if (assignment.status === "PASSIVE")
    return { status: "success", message: "Atama zaten pasif." };

  await tx.courseTeacherAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "PASSIVE",
      effectiveTo: input.effectiveOn,
      note: input.note ?? assignment.note,
    },
  });
  await audit(tx, actor, {
    action: "course_teacher_assignment.passivized",
    entityType: "CourseTeacherAssignment",
    entityId: assignment.id,
    beforeData: {
      teacherProfileId: assignment.teacherProfileId,
      status: assignment.status,
      effectiveTo: assignment.effectiveTo
        ? dateValue(assignment.effectiveTo)
        : null,
      note: assignment.note,
    },
    afterData: {
      teacherProfileId: assignment.teacherProfileId,
      status: "PASSIVE",
      effectiveTo: dateValue(input.effectiveOn),
      note: input.note ?? assignment.note,
    },
    changedFields: ["status", "effectiveTo", "note"],
  });
  return { status: "success", message: "Ders ogretmeni atamasi pasife alindi." };
}

export function persistTeachingAssignmentTransition(
  tx: Prisma.TransactionClient,
  actor: TeachingActor,
  input: TeachingAssignmentTransitionInput,
): Promise<TeachingState> {
  return input.assignmentKind === "homeroom"
    ? passivateHomeroomAssignment(tx, actor, input)
    : passivateCourseAssignment(tx, actor, input);
}
