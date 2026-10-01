import "server-only";
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

function translatedName(item: {
  defaultName?: string;
  name?: string;
  translations?: { name: string }[];
}) {
  return item.translations?.[0]?.name ?? item.defaultName ?? item.name ?? "—";
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
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

const WEEKDAY_VALUES = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const;

export async function getClassWeeklySchedule(
  schoolId: string,
  requestedClassSectionId: string | undefined,
  locale: string,
) {
  const db = getPrisma();
  const activeYear = await db.academicYear.findFirst({
    where: { schoolId, status: "ACTIVE", archivedAt: null },
    orderBy: [{ startDate: "desc" }],
    select: { id: true, name: true, startDate: true, endDate: true },
  });
  if (!activeYear) {
    return {
      activeYear: null,
      classSections: [],
      selectedClassId: null,
      selectedClassLabel: null,
      schedulePeriods: [],
      courseAssignments: [],
      participants: [],
      weekdays: [...WEEKDAY_VALUES],
    };
  }

  const classSections = await db.academicYearClassSection.findMany({
    where: {
      schoolId,
      academicYearId: activeYear.id,
      status: "ACTIVE",
    },
    include: {
      classSectionDefinition: { include: { gradeLevel: true } },
      scheduleProfileVersion: {
        include: {
          periods: {
            include: { translations: { where: { locale }, take: 1 } },
            orderBy: [{ sequence: "asc" }],
          },
        },
      },
    },
  });
  const sortedClassSections = [...classSections].sort((first, second) => {
    const firstGrade =
      first.classSectionDefinition.gradeLevel.sequence -
      second.classSectionDefinition.gradeLevel.sequence;
    if (firstGrade !== 0) return firstGrade;
    return classSectionLabel(first).localeCompare(
      classSectionLabel(second),
      locale,
    );
  });
  const selectedClass =
    sortedClassSections.find((section) => section.id === requestedClassSectionId) ??
    sortedClassSections[0] ??
    null;

  const [courseAssignments, participants] = selectedClass
    ? await Promise.all([
        db.courseTeacherAssignment.findMany({
          where: {
            schoolId,
            academicYearId: activeYear.id,
            status: "ACTIVE",
            archivedAt: null,
            courseOffering: {
              schoolId,
              academicYearClassSectionId: selectedClass.id,
              archivedAt: null,
            },
          },
          include: {
            teacherProfile: {
              include: { employment: { include: { person: true } } },
            },
            courseOffering: {
              include: {
                subject: {
                  include: { translations: { where: { locale }, take: 1 } },
                },
              },
            },
          },
        }),
        db.timetableSessionParticipant.findMany({
          where: {
            schoolId,
            academicYearId: activeYear.id,
            academicYearClassSectionId: selectedClass.id,
            status: "ACTIVE",
            archivedAt: null,
            timetableSession: { status: "ACTIVE", archivedAt: null },
          },
          include: {
            timetableSession: {
              include: {
                schedulePeriod: {
                  include: { translations: { where: { locale }, take: 1 } },
                },
                teacherProfile: {
                  include: { employment: { include: { person: true } } },
                },
              },
            },
            courseOffering: {
              include: {
                subject: {
                  include: { translations: { where: { locale }, take: 1 } },
                },
              },
            },
          },
        }),
      ])
    : [[], []] as const;

  const schedulePeriodsById = new Map<
    string,
    {
      id: string;
      label: string;
      sequence: number;
      startTime: string;
      endTime: string;
    }
  >();
  for (const period of selectedClass?.scheduleProfileVersion?.periods ?? []) {
    schedulePeriodsById.set(period.id, {
      id: period.id,
      label: schedulePeriodLabel(period),
      sequence: period.sequence,
      startTime: timeValue(period.startTime),
      endTime: timeValue(period.endTime),
    });
  }
  for (const participant of participants) {
    const period = participant.timetableSession.schedulePeriod;
    schedulePeriodsById.set(period.id, {
      id: period.id,
      label: schedulePeriodLabel(period),
      sequence: period.sequence,
      startTime: timeValue(period.startTime),
      endTime: timeValue(period.endTime),
    });
  }

  return {
    activeYear: {
      id: activeYear.id,
      name: activeYear.name,
      startDate: dateValue(activeYear.startDate),
      endDate: dateValue(activeYear.endDate),
    },
    classSections: sortedClassSections.map((section) => ({
      id: section.id,
      label: classSectionLabel(section),
      hasScheduleProfile: Boolean(section.scheduleProfileVersionId),
    })),
    selectedClassId: selectedClass?.id ?? null,
    selectedClassLabel: selectedClass ? classSectionLabel(selectedClass) : null,
    schedulePeriods: [...schedulePeriodsById.values()].sort(
      (first, second) =>
        first.sequence - second.sequence ||
        first.startTime.localeCompare(second.startTime) ||
        first.label.localeCompare(second.label, locale),
    ),
    courseAssignments: courseAssignments
      .map((assignment) => ({
        id: assignment.id,
        teacherProfileId: assignment.teacherProfileId,
        teacherName: fullName(assignment.teacherProfile.employment.person),
        courseOfferingId: assignment.courseOfferingId,
        subjectName: translatedName(assignment.courseOffering.subject),
        track: assignment.courseOffering.subject.track,
      }))
      .sort(
        (first, second) =>
          first.subjectName.localeCompare(second.subjectName, locale) ||
          first.teacherName.localeCompare(second.teacherName, locale),
      ),
    participants: participants
      .map((participant) => ({
        id: participant.id,
        revision: participant.updatedAt.toISOString(),
        timetableSessionId: participant.timetableSessionId,
        courseTeacherAssignmentId: participant.courseTeacherAssignmentId,
        teacherProfileId: participant.timetableSession.teacherProfileId,
        teacherName: fullName(
          participant.timetableSession.teacherProfile.employment.person,
        ),
        weekday: participant.timetableSession.weekday,
        schedulePeriodId: participant.timetableSession.schedulePeriodId,
        classLabel: selectedClass ? classSectionLabel(selectedClass) : "—",
        subjectName: translatedName(participant.courseOffering.subject),
        track: participant.courseOffering.subject.track,
        effectiveFrom: dateValue(participant.effectiveFrom),
        effectiveTo: participant.effectiveTo
          ? dateValue(participant.effectiveTo)
          : null,
        note: participant.note,
      }))
      .sort(
        (first, second) =>
          first.weekday.localeCompare(second.weekday) ||
          first.schedulePeriodId.localeCompare(second.schedulePeriodId) ||
          first.subjectName.localeCompare(second.subjectName, locale),
      ),
    weekdays: [...WEEKDAY_VALUES],
  };
}
