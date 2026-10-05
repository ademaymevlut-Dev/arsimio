import "server-only";
import type { TimetableWeekday } from "@/generated/prisma/client";
import {
  dateOnlyInTimeZone,
  dateOnlyValue,
  parseDateOnly,
} from "@/lib/academic-calendar-validation";
import { getPrisma } from "@/lib/db";

const WEEKDAY_ORDER = new Map<TimetableWeekday, number>([
  ["MONDAY", 1],
  ["TUESDAY", 2],
  ["WEDNESDAY", 3],
  ["THURSDAY", 4],
  ["FRIDAY", 5],
]);

function fullName(person: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ");
}

function classLabel(section: {
  classSectionDefinition: {
    code: string;
    displayLabel: string | null;
    gradeLevel: { displayLabel: string };
  };
}) {
  return (
    section.classSectionDefinition.displayLabel ??
    `${section.classSectionDefinition.gradeLevel.displayLabel} / ${section.classSectionDefinition.code}`
  );
}

function translatedName(entity: {
  name?: string;
  defaultName?: string;
  translations: Array<{ name: string }>;
}) {
  return entity.translations[0]?.name ?? entity.name ?? entity.defaultName ?? "—";
}

function dateValue(value: Date | null | undefined) {
  return value ? dateOnlyValue(value) : null;
}

function timeValue(value: Date) {
  return value.toISOString().slice(11, 16);
}

function selectedDateValue(input: string | null | undefined, timeZone: string) {
  const parsed = parseDateOnly(input);
  return dateOnlyValue(parsed ?? dateOnlyInTimeZone(new Date(), timeZone));
}

function commentCategoryLabel(category: string, point: number) {
  if (category === "GREEN_CARD") return `[${point}] Green Card`;
  if (category === "POSITIVE") return `[${point}] Positive Comment`;
  if (category === "INFORMATION") return `[${point}] Information`;
  if (category === "NEGATIVE") return `[${point}] Negative Comment`;
  if (category === "RED_CARD") return `[${point}] Red Card`;
  return `[${point}] ${category}`;
}

type GuardianPortalOptions = {
  selectedStudentId?: string | null;
  reportDate?: string | null;
  timeZone: string;
  locale: string;
};

export async function getGuardianPortalHome(
  schoolId: string,
  guardianPersonId: string,
  options: GuardianPortalOptions,
) {
  const db = getPrisma();
  const reportDate = selectedDateValue(options.reportDate, options.timeZone);
  const reportDateObject = parseDateOnly(reportDate)!;
  const today = dateOnlyValue(dateOnlyInTimeZone(new Date(), options.timeZone));
  const todayObject = parseDateOnly(today)!;

  const guardian = await db.person.findFirst({
    where: { id: guardianPersonId, schoolId, status: "ACTIVE", archivedAt: null },
    include: {
      contactPoints: { where: { archivedAt: null } },
      guardianRelationships: {
        where: { schoolId, archivedAt: null },
        orderBy: [
          { isPrimaryContact: "desc" },
          { student: { studentNumber: "asc" } },
        ],
        include: {
          student: {
            include: {
              person: true,
              enrollments: {
                where: { schoolId, status: "ACTIVE" },
                orderBy: { academicYear: { startDate: "desc" } },
                take: 1,
                include: {
                  academicYear: true,
                  placements: {
                    where: { schoolId },
                    orderBy: { validFrom: "desc" },
                    take: 1,
                    include: {
                      academicYearClassSection: {
                        include: {
                          classSectionDefinition: {
                            include: { gradeLevel: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!guardian || guardian.guardianRelationships.length === 0) return null;

  const children = guardian.guardianRelationships.map((relationship) => {
    const enrollment = relationship.student.enrollments[0] ?? null;
    const placement = enrollment?.placements[0] ?? null;
    return {
      relationshipId: relationship.id,
      studentProfileId: relationship.student.id,
      studentNumber: relationship.student.studentNumber,
      fullName: fullName(relationship.student.person),
      birthDate: dateValue(relationship.student.person.birthDate),
      status: relationship.student.status,
      relationshipType: relationship.relationshipType,
      isPrimaryContact: relationship.isPrimaryContact,
      academicYearId: enrollment?.academicYearId ?? null,
      academicYear: enrollment?.academicYear.name ?? null,
      enrollmentStart: dateValue(enrollment?.enrolledOn),
      classSectionId: placement?.academicYearClassSectionId ?? null,
      classSection: placement
        ? classLabel(placement.academicYearClassSection)
        : null,
    };
  });
  const selectedChild =
    children.find(
      (child) => child.studentProfileId === options.selectedStudentId,
    ) ?? children[0];

  if (!selectedChild.academicYearId || !selectedChild.classSectionId) {
    return {
      fullName: fullName(guardian),
      phone:
        guardian.contactPoints.find((point) => point.kind === "PHONE")?.value ??
        null,
      email:
        guardian.contactPoints.find((point) => point.kind === "EMAIL")?.value ??
        null,
      children,
      selectedChild,
      reportDate,
      attendanceSummary: { absent: 0, late: 0 },
      daily: { lessonTopics: [], comments: [], homework: [], attendance: [] },
      upcomingExams: [],
      commentHistory: [],
      homeworkHistory: [],
      weeklySchedule: [],
    };
  }

  const [
    attendanceRecords,
    dailyLessonTopics,
    dailyComments,
    dailyHomework,
    upcomingExams,
    commentHistory,
    homeworkHistory,
    weeklySchedule,
  ] = await Promise.all([
    db.studentAttendanceRecord.findMany({
      where: {
        schoolId,
        academicYearId: selectedChild.academicYearId,
        studentProfileId: selectedChild.studentProfileId,
      },
      include: {
        academicCalendarDay: true,
        openedTimetableSessionParticipant: {
          include: {
            timetableSession: {
              include: {
                schedulePeriod: {
                  include: {
                    translations: {
                      where: { locale: options.locale },
                      take: 1,
                    },
                  },
                },
              },
            },
            courseOffering: {
              include: {
                subject: {
                  include: {
                    translations: {
                      where: { locale: options.locale },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        openedTeacherProfile: {
          include: { employment: { include: { person: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.lessonTopicEntry.findMany({
      where: {
        schoolId,
        academicYearId: selectedChild.academicYearId,
        academicCalendarDay: { date: reportDateObject },
        timetableSessionParticipant: {
          academicYearClassSectionId: selectedChild.classSectionId,
        },
      },
      include: {
        academicCalendarDay: true,
        timetableSessionParticipant: {
          include: {
            timetableSession: {
              include: {
                schedulePeriod: {
                  include: {
                    translations: {
                      where: { locale: options.locale },
                      take: 1,
                    },
                  },
                },
              },
            },
            courseOffering: {
              include: {
                subject: {
                  include: {
                    translations: {
                      where: { locale: options.locale },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        teacherProfile: {
          include: { employment: { include: { person: true } } },
        },
      },
    }),
    db.studentCommentEntry.findMany({
      where: {
        schoolId,
        academicYearId: selectedChild.academicYearId,
        studentProfileId: selectedChild.studentProfileId,
        academicCalendarDay: { date: reportDateObject },
      },
      include: {
        academicCalendarDay: true,
        timetableSessionParticipant: {
          include: {
            courseOffering: {
              include: {
                subject: {
                  include: {
                    translations: {
                      where: { locale: options.locale },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        teacherProfile: {
          include: { employment: { include: { person: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.homeworkEntry.findMany({
      where: {
        schoolId,
        academicYearId: selectedChild.academicYearId,
        academicCalendarDay: { date: reportDateObject },
        timetableSessionParticipant: {
          academicYearClassSectionId: selectedChild.classSectionId,
        },
      },
      include: {
        academicCalendarDay: true,
        timetableSessionParticipant: {
          include: {
            courseOffering: {
              include: {
                subject: {
                  include: {
                    translations: {
                      where: { locale: options.locale },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        teacherProfile: {
          include: { employment: { include: { person: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.examNotificationEntry.findMany({
      where: {
        schoolId,
        academicYearId: selectedChild.academicYearId,
        academicYearClassSectionId: selectedChild.classSectionId,
        academicCalendarDay: { date: { gte: todayObject } },
      },
      include: {
        academicCalendarDay: true,
        timetableSessionParticipant: {
          include: {
            timetableSession: {
              include: {
                schedulePeriod: {
                  include: {
                    translations: {
                      where: { locale: options.locale },
                      take: 1,
                    },
                  },
                },
              },
            },
            courseOffering: {
              include: {
                subject: {
                  include: {
                    translations: {
                      where: { locale: options.locale },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ academicCalendarDay: { date: "asc" } }, { updatedAt: "desc" }],
      take: 12,
    }),
    db.studentCommentEntry.findMany({
      where: {
        schoolId,
        academicYearId: selectedChild.academicYearId,
        studentProfileId: selectedChild.studentProfileId,
      },
      include: {
        academicCalendarDay: true,
        timetableSessionParticipant: {
          include: {
            courseOffering: {
              include: {
                subject: {
                  include: {
                    translations: {
                      where: { locale: options.locale },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        teacherProfile: {
          include: { employment: { include: { person: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    db.homeworkEntry.findMany({
      where: {
        schoolId,
        academicYearId: selectedChild.academicYearId,
        timetableSessionParticipant: {
          academicYearClassSectionId: selectedChild.classSectionId,
        },
      },
      include: {
        academicCalendarDay: true,
        timetableSessionParticipant: {
          include: {
            courseOffering: {
              include: {
                subject: {
                  include: {
                    translations: {
                      where: { locale: options.locale },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        teacherProfile: {
          include: { employment: { include: { person: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    db.timetableSessionParticipant.findMany({
      where: {
        schoolId,
        academicYearId: selectedChild.academicYearId,
        academicYearClassSectionId: selectedChild.classSectionId,
        status: "ACTIVE",
        archivedAt: null,
        timetableSession: {
          status: "ACTIVE",
          archivedAt: null,
        },
      },
      include: {
        timetableSession: {
          include: {
            schedulePeriod: {
              include: {
                translations: {
                  where: { locale: options.locale },
                  take: 1,
                },
              },
            },
            teacherProfile: {
              include: { employment: { include: { person: true } } },
            },
          },
        },
        courseOffering: {
          include: {
            subject: {
              include: {
                translations: {
                  where: { locale: options.locale },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const attendanceSummary = attendanceRecords.reduce(
    (summary, record) => {
      if (record.status === "ABSENT") summary.absent += 1;
      if (record.status === "LATE") summary.late += 1;
      return summary;
    },
    { absent: 0, late: 0 },
  );
  const dailyAttendance = attendanceRecords.filter(
    (record) => dateOnlyValue(record.academicCalendarDay.date) === reportDate,
  );

  const mapTopic = (entry: (typeof dailyLessonTopics)[number]) => ({
    id: entry.id,
    date: dateOnlyValue(entry.academicCalendarDay.date),
    subject: translatedName(
      entry.timetableSessionParticipant.courseOffering.subject,
    ),
    period: translatedName(
      entry.timetableSessionParticipant.timetableSession.schedulePeriod,
    ),
    teacher: fullName(entry.teacherProfile.employment.person),
    content: entry.content,
  });
  const mapComment = (entry: (typeof commentHistory)[number]) => ({
    id: entry.id,
    date: dateOnlyValue(entry.academicCalendarDay.date),
    subject: translatedName(
      entry.timetableSessionParticipant.courseOffering.subject,
    ),
    teacher: fullName(entry.teacherProfile.employment.person),
    category: commentCategoryLabel(entry.category, entry.point),
    content: entry.content,
  });
  const mapHomework = (entry: (typeof homeworkHistory)[number]) => ({
    id: entry.id,
    date: dateOnlyValue(entry.academicCalendarDay.date),
    subject: translatedName(
      entry.timetableSessionParticipant.courseOffering.subject,
    ),
    teacher: fullName(entry.teacherProfile.employment.person),
    title: entry.title,
    content: entry.content,
  });

  return {
    fullName: fullName(guardian),
    phone:
      guardian.contactPoints.find((point) => point.kind === "PHONE")?.value ??
      null,
    email:
      guardian.contactPoints.find((point) => point.kind === "EMAIL")?.value ??
      null,
    children,
    selectedChild,
    reportDate,
    attendanceSummary,
    daily: {
      lessonTopics: dailyLessonTopics.map(mapTopic),
      comments: dailyComments.map(mapComment),
      homework: dailyHomework.map(mapHomework),
      attendance: dailyAttendance.map((entry) => ({
        id: entry.id,
        date: dateOnlyValue(entry.academicCalendarDay.date),
        status: entry.status,
        subject: translatedName(
          entry.openedTimetableSessionParticipant.courseOffering.subject,
        ),
        period: translatedName(
          entry.openedTimetableSessionParticipant.timetableSession
            .schedulePeriod,
        ),
        teacher: fullName(entry.openedTeacherProfile.employment.person),
      })),
    },
    upcomingExams: upcomingExams.map((entry) => ({
      id: entry.id,
      date: dateOnlyValue(entry.academicCalendarDay.date),
      subject: translatedName(
        entry.timetableSessionParticipant.courseOffering.subject,
      ),
      period: translatedName(
        entry.timetableSessionParticipant.timetableSession.schedulePeriod,
      ),
      content: entry.content,
    })),
    commentHistory: commentHistory.map(mapComment),
    homeworkHistory: homeworkHistory.map(mapHomework),
    weeklySchedule: weeklySchedule
      .map((entry) => ({
        id: entry.id,
        weekday: entry.timetableSession.weekday,
        weekdayOrder: WEEKDAY_ORDER.get(entry.timetableSession.weekday) ?? 99,
        period: translatedName(entry.timetableSession.schedulePeriod),
        periodSequence: entry.timetableSession.schedulePeriod.sequence,
        startTime: timeValue(entry.timetableSession.schedulePeriod.startTime),
        endTime: timeValue(entry.timetableSession.schedulePeriod.endTime),
        subject: translatedName(entry.courseOffering.subject),
        teacher: fullName(
          entry.timetableSession.teacherProfile.employment.person,
        ),
      }))
      .sort(
        (first, second) =>
          first.weekdayOrder - second.weekdayOrder ||
          first.periodSequence - second.periodSequence ||
          first.startTime.localeCompare(second.startTime),
      ),
  };
}
