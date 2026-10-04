import "server-only";
import { HTML_LOCALES } from "@/i18n/config";
import { dateOnlyInTimeZone } from "@/lib/academic-calendar-validation";
import { getPrisma } from "@/lib/db";

function fullName(person: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ");
}

function translatedName(
  item: { defaultName?: string; name?: string; translations?: { name: string }[] },
) {
  return item.translations?.[0]?.name ?? item.defaultName ?? item.name ?? "—";
}

function timeValue(date: Date) {
  return date.toISOString().slice(11, 16);
}

function classSectionLabel(section: {
  classSectionDefinition: {
    code: string;
    displayLabel: string | null;
    gradeLevel: { displayLabel: string; sequence: number };
  };
}) {
  return (
    section.classSectionDefinition.displayLabel ??
    `${section.classSectionDefinition.gradeLevel.displayLabel}/${section.classSectionDefinition.code}`
  );
}

function schedulePeriodLabel(period: {
  defaultName: string;
  translations?: { name: string }[];
  startTime: Date;
  endTime: Date;
}) {
  const name = period.translations?.[0]?.name ?? period.defaultName;
  return `${name} (${timeValue(period.startTime)}–${timeValue(period.endTime)})`;
}

function contact(
  points: { kind: string; value: string; isPrimaryForPerson: boolean }[],
  kind: "PHONE" | "EMAIL",
) {
  return (
    points.find((point) => point.kind === kind && point.isPrimaryForPerson)
      ?.value ??
    points.find((point) => point.kind === kind)?.value ??
    null
  );
}

function formatDateTime(
  value: Date,
  locale: string,
  timeZone: string,
) {
  return new Intl.DateTimeFormat(
    HTML_LOCALES[locale as keyof typeof HTML_LOCALES] ?? HTML_LOCALES.tr,
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    },
  ).format(value);
}

export async function getTodayAttendanceRecords(
  schoolId: string,
  locale: string,
) {
  const db = getPrisma();
  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { timezone: true },
  });
  if (!school) return [];

  const today = dateOnlyInTimeZone(new Date(), school.timezone);
  const records = await db.studentAttendanceRecord.findMany({
    where: {
      schoolId,
      academicCalendarDay: {
        date: today,
        academicYear: { status: "ACTIVE", archivedAt: null },
      },
    },
    orderBy: [{ openedAt: "asc" }, { createdAt: "asc" }],
    include: {
      academicYearClassSection: {
        include: {
          classSectionDefinition: {
            include: { gradeLevel: true },
          },
        },
      },
      studentProfile: {
        include: {
          person: true,
          guardianRelationships: {
            where: {
              isPrimaryContact: true,
              archivedAt: null,
            },
            take: 1,
            include: {
              guardianPerson: {
                include: {
                  contactPoints: { where: { archivedAt: null } },
                },
              },
            },
          },
        },
      },
      openedTeacherProfile: {
        include: { employment: { include: { person: true } } },
      },
      lateTeacherProfile: {
        include: { employment: { include: { person: true } } },
      },
      openedTimetableSessionParticipant: {
        include: {
          courseOffering: {
            include: {
              subject: {
                include: { translations: { where: { locale }, take: 1 } },
              },
            },
          },
          timetableSession: {
            include: {
              schedulePeriod: {
                include: { translations: { where: { locale }, take: 1 } },
              },
            },
          },
        },
      },
    },
  });

  return records.map((record) => {
    const guardian =
      record.studentProfile.guardianRelationships[0]?.guardianPerson ?? null;
    const subject = translatedName(
      record.openedTimetableSessionParticipant.courseOffering.subject,
    );
    const period = schedulePeriodLabel(
      record.openedTimetableSessionParticipant.timetableSession.schedulePeriod,
    );

    return {
      id: record.id,
      status: record.status,
      classLabel: classSectionLabel(record.academicYearClassSection),
      studentName: fullName(record.studentProfile.person),
      studentNumber: record.studentProfile.studentNumber,
      lessonLabel: `${subject} · ${period}`,
      openedTeacherName: fullName(
        record.openedTeacherProfile.employment.person,
      ),
      lateInfo:
        record.lateAt && record.lateTeacherProfile
          ? `${fullName(record.lateTeacherProfile.employment.person)} · ${formatDateTime(
              record.lateAt,
              locale,
              school.timezone,
            )}`
          : null,
      guardianName: guardian ? fullName(guardian) : null,
      guardianPhone: guardian ? contact(guardian.contactPoints, "PHONE") : null,
    };
  });
}
