import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type {
  HomeworkInput,
  LessonTopicInput,
  StudentCommentsInput,
  TeacherCtaState,
} from "@/lib/teacher-cta-validation";

export type TeacherPortalActor = {
  schoolId: string;
  actorUserId: string;
  personId: string;
};

function error(
  message: string,
  fieldErrors?: TeacherCtaState["fieldErrors"],
): TeacherCtaState {
  return { status: "error", message, fieldErrors };
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function persistLessonTopic(
  tx: Prisma.TransactionClient,
  actor: TeacherPortalActor,
  input: LessonTopicInput,
): Promise<TeacherCtaState> {
  const teacher = await tx.teacherProfile.findFirst({
    where: {
      schoolId: actor.schoolId,
      archivedAt: null,
      status: "ACTIVE",
      employment: {
        schoolId: actor.schoolId,
        personId: actor.personId,
        archivedAt: null,
        status: { in: ["ACTIVE", "ON_LEAVE"] },
      },
    },
    select: { id: true },
  });
  if (!teacher)
    return error("Aktif öğretmen profili bulunamadı.", {
      record: "Öğretmen hesabı geçersiz.",
    });

  const [participant, calendarDay] = await Promise.all([
    tx.timetableSessionParticipant.findFirst({
      where: {
        id: input.timetableParticipantId,
        schoolId: actor.schoolId,
        status: "ACTIVE",
        archivedAt: null,
        timetableSession: {
          schoolId: actor.schoolId,
          teacherProfileId: teacher.id,
          status: "ACTIVE",
          archivedAt: null,
        },
      },
      include: {
        timetableSession: {
          select: {
            id: true,
            academicYearId: true,
            teacherProfileId: true,
            weekday: true,
            effectiveTo: true,
          },
        },
      },
    }),
    tx.academicCalendarDay.findFirst({
      where: {
        id: input.academicCalendarDayId,
        schoolId: actor.schoolId,
        academicYear: {
          schoolId: actor.schoolId,
          status: "ACTIVE",
          archivedAt: null,
        },
      },
      select: {
        id: true,
        academicYearId: true,
        date: true,
        weekday: true,
      },
    }),
  ]);

  if (!participant)
    return error("Program kaydı bulunamadı.", {
      timetableParticipantId: "Program kaydı geçersiz.",
    });
  if (!calendarDay)
    return error("Okul günü bulunamadı.", {
      academicCalendarDayId: "Gün kaydı geçersiz.",
    });
  if (participant.academicYearId !== calendarDay.academicYearId)
    return error("Program kaydı ve gün aynı öğretim yılına ait değil.", {
      record: "Kayıt bağlamı geçersiz.",
    });
  if (participant.timetableSession.weekday !== calendarDay.weekday)
    return error("Program günü ile seçilen takvim günü eşleşmiyor.", {
      academicCalendarDayId: "Gün kaydı geçersiz.",
    });
  if (
    participant.effectiveTo &&
    participant.effectiveTo.getTime() < calendarDay.date.getTime()
  )
    return error("Bu sınıf dersi seçilen tarihte pasif görünüyor.", {
      record: "Program kaydı pasif.",
    });
  if (
    participant.timetableSession.effectiveTo &&
    participant.timetableSession.effectiveTo.getTime() < calendarDay.date.getTime()
  )
    return error("Bu ders oturumu seçilen tarihte pasif görünüyor.", {
      record: "Program kaydı pasif.",
    });

  const existing = await tx.lessonTopicEntry.findFirst({
    where: {
      schoolId: actor.schoolId,
      timetableSessionParticipantId: participant.id,
      academicCalendarDayId: calendarDay.id,
    },
    select: { id: true, content: true, updatedAt: true },
  });

  if (existing) {
    const updated = await tx.lessonTopicEntry.update({
      where: { id: existing.id },
      data: {
        content: input.content,
        updatedByUserId: actor.actorUserId,
      },
      select: { id: true },
    });
    return {
      status: "success",
      message: "Ders konusu güncellendi.",
      entityId: updated.id,
    };
  }

  const created = await tx.lessonTopicEntry.create({
    data: {
      schoolId: actor.schoolId,
      academicYearId: participant.academicYearId,
      academicCalendarDayId: calendarDay.id,
      timetableSessionParticipantId: participant.id,
      teacherProfileId: participant.timetableSession.teacherProfileId,
      content: input.content,
      createdByUserId: actor.actorUserId,
      updatedByUserId: actor.actorUserId,
    },
    select: { id: true },
  });

  return {
    status: "success",
    message: `Ders konusu ${dateValue(calendarDay.date)} için kaydedildi.`,
    entityId: created.id,
  };
}

export async function persistHomework(
  tx: Prisma.TransactionClient,
  actor: TeacherPortalActor,
  input: HomeworkInput,
): Promise<TeacherCtaState> {
  const teacher = await tx.teacherProfile.findFirst({
    where: {
      schoolId: actor.schoolId,
      archivedAt: null,
      status: "ACTIVE",
      employment: {
        schoolId: actor.schoolId,
        personId: actor.personId,
        archivedAt: null,
        status: { in: ["ACTIVE", "ON_LEAVE"] },
      },
    },
    select: { id: true },
  });
  if (!teacher)
    return error("Aktif öğretmen profili bulunamadı.", {
      record: "Öğretmen hesabı geçersiz.",
    });

  const [participant, calendarDay] = await Promise.all([
    tx.timetableSessionParticipant.findFirst({
      where: {
        id: input.timetableParticipantId,
        schoolId: actor.schoolId,
        status: "ACTIVE",
        archivedAt: null,
        timetableSession: {
          schoolId: actor.schoolId,
          teacherProfileId: teacher.id,
          status: "ACTIVE",
          archivedAt: null,
        },
      },
      include: {
        timetableSession: {
          select: {
            id: true,
            academicYearId: true,
            teacherProfileId: true,
            weekday: true,
            effectiveTo: true,
          },
        },
      },
    }),
    tx.academicCalendarDay.findFirst({
      where: {
        id: input.academicCalendarDayId,
        schoolId: actor.schoolId,
        academicYear: {
          schoolId: actor.schoolId,
          status: "ACTIVE",
          archivedAt: null,
        },
      },
      select: {
        id: true,
        academicYearId: true,
        date: true,
        weekday: true,
      },
    }),
  ]);

  if (!participant)
    return error("Program kaydı bulunamadı.", {
      timetableParticipantId: "Program kaydı geçersiz.",
    });
  if (!calendarDay)
    return error("Okul günü bulunamadı.", {
      academicCalendarDayId: "Gün kaydı geçersiz.",
    });
  if (participant.academicYearId !== calendarDay.academicYearId)
    return error("Program kaydı ve gün aynı öğretim yılına ait değil.", {
      record: "Kayıt bağlamı geçersiz.",
    });
  if (participant.timetableSession.weekday !== calendarDay.weekday)
    return error("Program günü ile seçilen takvim günü eşleşmiyor.", {
      academicCalendarDayId: "Gün kaydı geçersiz.",
    });
  if (
    participant.effectiveTo &&
    participant.effectiveTo.getTime() < calendarDay.date.getTime()
  )
    return error("Bu sınıf dersi seçilen tarihte pasif görünüyor.", {
      record: "Program kaydı pasif.",
    });
  if (
    participant.timetableSession.effectiveTo &&
    participant.timetableSession.effectiveTo.getTime() <
      calendarDay.date.getTime()
  )
    return error("Bu ders oturumu seçilen tarihte pasif görünüyor.", {
      record: "Program kaydı pasif.",
    });

  const existing = await tx.homeworkEntry.findFirst({
    where: {
      schoolId: actor.schoolId,
      timetableSessionParticipantId: participant.id,
      academicCalendarDayId: calendarDay.id,
    },
    select: { id: true },
  });

  if (existing) {
    const updated = await tx.homeworkEntry.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        content: input.content,
        updatedByUserId: actor.actorUserId,
      },
      select: { id: true },
    });
    return {
      status: "success",
      message: "Ödev güncellendi.",
      entityId: updated.id,
    };
  }

  const created = await tx.homeworkEntry.create({
    data: {
      schoolId: actor.schoolId,
      academicYearId: participant.academicYearId,
      academicCalendarDayId: calendarDay.id,
      timetableSessionParticipantId: participant.id,
      teacherProfileId: participant.timetableSession.teacherProfileId,
      title: input.title,
      content: input.content,
      createdByUserId: actor.actorUserId,
      updatedByUserId: actor.actorUserId,
    },
    select: { id: true },
  });

  return {
    status: "success",
    message: `Ödev ${dateValue(calendarDay.date)} için kaydedildi.`,
    entityId: created.id,
  };
}

export async function persistStudentComments(
  tx: Prisma.TransactionClient,
  actor: TeacherPortalActor,
  input: StudentCommentsInput,
): Promise<TeacherCtaState> {
  const teacher = await tx.teacherProfile.findFirst({
    where: {
      schoolId: actor.schoolId,
      archivedAt: null,
      status: "ACTIVE",
      employment: {
        schoolId: actor.schoolId,
        personId: actor.personId,
        archivedAt: null,
        status: { in: ["ACTIVE", "ON_LEAVE"] },
      },
    },
    select: { id: true },
  });
  if (!teacher)
    return error("Aktif öğretmen profili bulunamadı.", {
      record: "Öğretmen hesabı geçersiz.",
    });

  const [participant, calendarDay] = await Promise.all([
    tx.timetableSessionParticipant.findFirst({
      where: {
        id: input.timetableParticipantId,
        schoolId: actor.schoolId,
        status: "ACTIVE",
        archivedAt: null,
        timetableSession: {
          schoolId: actor.schoolId,
          teacherProfileId: teacher.id,
          status: "ACTIVE",
          archivedAt: null,
        },
      },
      include: {
        timetableSession: {
          select: {
            id: true,
            academicYearId: true,
            teacherProfileId: true,
            weekday: true,
            effectiveTo: true,
          },
        },
      },
    }),
    tx.academicCalendarDay.findFirst({
      where: {
        id: input.academicCalendarDayId,
        schoolId: actor.schoolId,
        academicYear: {
          schoolId: actor.schoolId,
          status: "ACTIVE",
          archivedAt: null,
        },
      },
      select: {
        id: true,
        academicYearId: true,
        date: true,
        weekday: true,
      },
    }),
  ]);

  if (!participant)
    return error("Program kaydı bulunamadı.", {
      timetableParticipantId: "Program kaydı geçersiz.",
    });
  if (!calendarDay)
    return error("Okul günü bulunamadı.", {
      academicCalendarDayId: "Gün kaydı geçersiz.",
    });
  if (participant.academicYearId !== calendarDay.academicYearId)
    return error("Program kaydı ve gün aynı öğretim yılına ait değil.", {
      record: "Kayıt bağlamı geçersiz.",
    });
  if (participant.timetableSession.weekday !== calendarDay.weekday)
    return error("Program günü ile seçilen takvim günü eşleşmiyor.", {
      academicCalendarDayId: "Gün kaydı geçersiz.",
    });
  if (
    participant.effectiveTo &&
    participant.effectiveTo.getTime() < calendarDay.date.getTime()
  )
    return error("Bu sınıf dersi seçilen tarihte pasif görünüyor.", {
      record: "Program kaydı pasif.",
    });
  if (
    participant.timetableSession.effectiveTo &&
    participant.timetableSession.effectiveTo.getTime() <
      calendarDay.date.getTime()
  )
    return error("Bu ders oturumu seçilen tarihte pasif görünüyor.", {
      record: "Program kaydı pasif.",
    });

  const activeStudents = await tx.studentProfile.findMany({
    where: {
      id: { in: input.studentProfileIds },
      schoolId: actor.schoolId,
      status: "ACTIVE",
      person: { schoolId: actor.schoolId, status: "ACTIVE", archivedAt: null },
      enrollments: {
        some: {
          schoolId: actor.schoolId,
          academicYearId: participant.academicYearId,
          status: "ACTIVE",
          placements: {
            some: {
              schoolId: actor.schoolId,
              academicYearId: participant.academicYearId,
              academicYearClassSectionId:
                participant.academicYearClassSectionId,
            },
          },
        },
      },
    },
    select: { id: true },
  });
  if (activeStudents.length !== input.studentProfileIds.length)
    return error("Seçilen öğrenciler bu sınıfın aktif listesiyle eşleşmiyor.", {
      studentProfileIds: "Öğrenci seçimi geçersiz.",
    });

  const saved = await Promise.all(
    input.studentProfileIds.map((studentProfileId) =>
      tx.studentCommentEntry.upsert({
        where: {
          timetableSessionParticipantId_academicCalendarDayId_studentProfileId:
            {
              timetableSessionParticipantId: participant.id,
              academicCalendarDayId: calendarDay.id,
              studentProfileId,
            },
        },
        update: {
          category: input.category,
          point: input.point,
          content: input.content,
          updatedByUserId: actor.actorUserId,
        },
        create: {
          schoolId: actor.schoolId,
          academicYearId: participant.academicYearId,
          academicCalendarDayId: calendarDay.id,
          timetableSessionParticipantId: participant.id,
          teacherProfileId: participant.timetableSession.teacherProfileId,
          studentProfileId,
          category: input.category,
          point: input.point,
          content: input.content,
          createdByUserId: actor.actorUserId,
          updatedByUserId: actor.actorUserId,
        },
        select: { id: true },
      }),
    ),
  );

  return {
    status: "success",
    message: `${saved.length} öğrenci yorumu kaydedildi.`,
    entityId: saved[0]?.id,
  };
}
