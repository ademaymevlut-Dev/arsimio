import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type {
  CourseTeacherAssignmentInput,
  HomeroomTeacherAssignmentInput,
  TimetableParticipantTransitionInput,
  TeachingAssignmentTransitionInput,
  TeachingState,
  WeeklySchedulePlacementInput,
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

export async function persistWeeklySchedulePlacement(
  tx: Prisma.TransactionClient,
  actor: TeachingActor,
  input: WeeklySchedulePlacementInput,
): Promise<TeachingState> {
  const [teacher, assignment, schedulePeriod] = await Promise.all([
    validateActiveTeacher(tx, actor, input.teacherProfileId),
    tx.courseTeacherAssignment.findFirst({
      where: {
        id: input.courseTeacherAssignmentId,
        schoolId: actor.schoolId,
        teacherProfileId: input.teacherProfileId,
        status: "ACTIVE",
        archivedAt: null,
        courseOffering: {
          schoolId: actor.schoolId,
          archivedAt: null,
          academicYear: {
            schoolId: actor.schoolId,
            status: "ACTIVE",
            archivedAt: null,
          },
          academicYearClassSection: { status: "ACTIVE" },
        },
      },
      include: {
        courseOffering: {
          include: {
            academicYear: {
              select: { id: true, startDate: true, endDate: true },
            },
            academicYearClassSection: {
              select: { id: true, scheduleProfileVersionId: true },
            },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    }),
    tx.schedulePeriod.findFirst({
      where: { id: input.schedulePeriodId, schoolId: actor.schoolId },
      select: { id: true, scheduleProfileVersionId: true },
    }),
  ]);
  if (!teacher)
    return error("Aktif ogretmen profili bulunamadi.", {
      teacherProfileId: "Aktif ogretmen secin.",
    });
  if (!assignment)
    return error("Aktif ders ogretmeni atamasi bulunamadi.", {
      courseTeacherAssignmentId: "Aktif ders atamasi secin.",
    });
  if (!schedulePeriod)
    return error("Ders saati bulunamadi.", {
      schedulePeriodId: "Ders saati secin.",
    });

  const classScheduleProfileVersionId =
    assignment.courseOffering.academicYearClassSection.scheduleProfileVersionId;
  if (!classScheduleProfileVersionId)
    return error("Bu sinif icin ders saati profili atanmamis.", {
      schedulePeriodId: "Once yil kurulumunda saat profili atayin.",
    });
  if (schedulePeriod.scheduleProfileVersionId !== classScheduleProfileVersionId)
    return error("Secilen ders saati bu sinifin saat profiline ait degil.", {
      schedulePeriodId: "Sinifin saat profilindeki bir ders saatini secin.",
    });
  if (
    !withinDateRange(
      input.effectiveFrom,
      assignment.courseOffering.validFrom,
      assignment.courseOffering.validTo,
    )
  )
    return error("Program baslangici ders aciliminin tarih araliginda olmali.", {
      effectiveFrom: "Gecerli tarih secin.",
    });

  const existingParticipant = await tx.timetableSessionParticipant.findFirst({
    where: {
      schoolId: actor.schoolId,
      academicYearId: assignment.academicYearId,
      courseTeacherAssignmentId: assignment.id,
      status: "ACTIVE",
      archivedAt: null,
      timetableSession: {
        weekday: input.weekday,
        schedulePeriodId: schedulePeriod.id,
        status: "ACTIVE",
        archivedAt: null,
      },
    },
    select: { id: true },
  });
  if (existingParticipant)
    return {
      status: "success",
      message: "Bu ders programda zaten ayni gun ve saate ekli.",
      entityId: existingParticipant.id,
    };

  const [teacherSession, classConflict] = await Promise.all([
    tx.timetableSession.findFirst({
      where: {
        schoolId: actor.schoolId,
        academicYearId: assignment.academicYearId,
        teacherProfileId: teacher.id,
        weekday: input.weekday,
        schedulePeriodId: schedulePeriod.id,
        status: "ACTIVE",
        archivedAt: null,
      },
      include: {
        participants: {
          where: { status: "ACTIVE", archivedAt: null },
          include: {
            courseOffering: { select: { subjectId: true, subject: { select: { name: true } } } },
          },
        },
      },
    }),
    tx.timetableSessionParticipant.findFirst({
      where: {
        schoolId: actor.schoolId,
        academicYearId: assignment.academicYearId,
        academicYearClassSectionId:
          assignment.courseOffering.academicYearClassSectionId,
        status: "ACTIVE",
        archivedAt: null,
        timetableSession: {
          weekday: input.weekday,
          schedulePeriodId: schedulePeriod.id,
          status: "ACTIVE",
          archivedAt: null,
        },
      },
      select: { id: true },
    }),
  ]);

  if (teacherSession && !input.mergeWithTeacherSession)
    return error(
      "Bu ogretmenin ayni gun ve saatte dersi var. Ortak ders olarak birlestirmek icin onay kutusunu isaretleyin.",
      { record: "Ogretmen saat cakismasi var." },
    );
  if (
    teacherSession &&
    teacherSession.participants.some(
      (participant) =>
        participant.courseOffering.subjectId !== assignment.courseOffering.subjectId,
    )
  )
    return error(
      "Ortak ders icin mevcut oturumdaki ders ile eklenecek ders ayni olmali.",
      { courseTeacherAssignmentId: "Ayni ders icin birlestirme yapin." },
    );
  if (classConflict && !input.allowClassConflict)
    return error(
      "Bu sinif ayni gun ve saatte baska bir programa ekli. Devam etmek icin sinif cakismasini onaylayin.",
      { record: "Sinif saat cakismasi var." },
    );

  const session =
    teacherSession ??
    (await tx.timetableSession.create({
      data: {
        schoolId: actor.schoolId,
        academicYearId: assignment.academicYearId,
        teacherProfileId: teacher.id,
        schedulePeriodId: schedulePeriod.id,
        weekday: input.weekday,
        effectiveFrom: input.effectiveFrom,
        note: input.note,
      },
      select: { id: true },
    }));

  const participant = await tx.timetableSessionParticipant.create({
    data: {
      schoolId: actor.schoolId,
      academicYearId: assignment.academicYearId,
      timetableSessionId: session.id,
      courseTeacherAssignmentId: assignment.id,
      courseOfferingId: assignment.courseOfferingId,
      academicYearClassSectionId:
        assignment.courseOffering.academicYearClassSectionId,
      effectiveFrom: input.effectiveFrom,
      note: input.note,
    },
    select: { id: true },
  });
  await audit(tx, actor, {
    action: "timetable.participant.created",
    entityType: "TimetableSessionParticipant",
    entityId: participant.id,
    afterData: {
      timetableSessionId: session.id,
      reusedSession: Boolean(teacherSession),
      courseTeacherAssignmentId: assignment.id,
      courseOfferingId: assignment.courseOfferingId,
      academicYearClassSectionId:
        assignment.courseOffering.academicYearClassSectionId,
      teacherProfileId: teacher.id,
      weekday: input.weekday,
      schedulePeriodId: schedulePeriod.id,
      effectiveFrom: dateValue(input.effectiveFrom),
      mergeWithTeacherSession: input.mergeWithTeacherSession,
      allowClassConflict: input.allowClassConflict,
    },
    changedFields: ["timetableSession", "timetableSessionParticipant"],
  });
  return {
    status: "success",
    message: teacherSession
      ? "Ders mevcut ortak programa eklendi."
      : "Ders haftalik programa eklendi.",
    entityId: participant.id,
  };
}

export async function persistTimetableParticipantTransition(
  tx: Prisma.TransactionClient,
  actor: TeachingActor,
  input: TimetableParticipantTransitionInput,
): Promise<TeachingState> {
  const participant = await tx.timetableSessionParticipant.findFirst({
    where: {
      id: input.timetableParticipantId,
      schoolId: actor.schoolId,
      archivedAt: null,
    },
    include: { timetableSession: { select: { id: true } } },
  });
  if (!participant) return error("Program kaydi bulunamadi.");
  if (participant.updatedAt.toISOString() !== input.revision)
    return error("Kayit bu arada degismis. Sayfayi yenileyip tekrar deneyin.");
  if (input.effectiveOn.getTime() < participant.effectiveFrom.getTime())
    return error("Pasif tarihi program baslangicindan once olamaz.", {
      effectiveOn: "Daha ileri bir tarih secin.",
    });
  if (participant.status === "PASSIVE")
    return { status: "success", message: "Program kaydi zaten pasif." };

  await tx.timetableSessionParticipant.update({
    where: { id: participant.id },
    data: {
      status: "PASSIVE",
      effectiveTo: input.effectiveOn,
      note: input.note ?? participant.note,
    },
  });
  const activeParticipantCount = await tx.timetableSessionParticipant.count({
    where: {
      schoolId: actor.schoolId,
      timetableSessionId: participant.timetableSessionId,
      status: "ACTIVE",
      archivedAt: null,
    },
  });
  if (activeParticipantCount === 0) {
    await tx.timetableSession.update({
      where: { id: participant.timetableSessionId },
      data: { status: "PASSIVE", effectiveTo: input.effectiveOn },
    });
  }
  await audit(tx, actor, {
    action: "timetable.participant.passivized",
    entityType: "TimetableSessionParticipant",
    entityId: participant.id,
    beforeData: {
      status: participant.status,
      effectiveTo: participant.effectiveTo
        ? dateValue(participant.effectiveTo)
        : null,
      note: participant.note,
    },
    afterData: {
      status: "PASSIVE",
      effectiveTo: dateValue(input.effectiveOn),
      note: input.note ?? participant.note,
      sessionPassivized: activeParticipantCount === 0,
    },
    changedFields: ["status", "effectiveTo", "note", "timetableSession.status"],
  });
  return { status: "success", message: "Ders programdan pasife alindi." };
}
