import "server-only";
import { cache } from "react";
import { getPrisma } from "@/lib/db";
import {
  dateOnlyInTimeZone,
  dateOnlyValue,
} from "@/lib/academic-calendar-validation";
import {
  SUPPORTED_LOCALES,
  normalizeLocale,
  type Locale,
  type LocalizedNames,
} from "@/i18n/config";

export type AcademicTermRecord = {
  id: string;
  name: string;
  names: LocalizedNames;
  sequence: number;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  revision: string;
};

export type AcademicCalendarDayRecord = {
  id: string;
  date: string;
  weekday: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";
  dayType:
    | "INSTRUCTIONAL"
    | "HOLIDAY"
    | "BREAK"
    | "ADMIN_CLOSED"
    | "EXAM"
    | "EVENT";
  isInstructionalDay: boolean;
};

export type AcademicWeekRecord = {
  id: string;
  sequence: number;
  academicTermId: string | null;
  termName: string | null;
  startDate: string;
  endDate: string;
  instructionalDayCount: number;
  days: AcademicCalendarDayRecord[];
};

export type AcademicYearRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  revision: string;
  terms: AcademicTermRecord[];
  weeks: AcademicWeekRecord[];
};

export async function getAcademicCalendar(
  schoolId: string,
  locale: Locale,
  schoolDefaultLocale: string,
): Promise<AcademicYearRecord[]> {
  const defaultLocale = normalizeLocale(schoolDefaultLocale);
  const years = await getPrisma().academicYear.findMany({
    where: { schoolId },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
      updatedAt: true,
      terms: {
        orderBy: [{ sequence: "asc" }, { startDate: "asc" }],
        select: {
          id: true,
          name: true,
          sequence: true,
          startDate: true,
          endDate: true,
          status: true,
          updatedAt: true,
          translations: {
            select: { locale: true, name: true },
          },
        },
      },
      academicWeeks: {
        orderBy: [{ sequence: "asc" }, { startDate: "asc" }],
        select: {
          id: true,
          sequence: true,
          academicTermId: true,
          startDate: true,
          endDate: true,
          instructionalDayCount: true,
          academicTerm: {
            select: {
              name: true,
              translations: {
                select: { locale: true, name: true },
              },
            },
          },
          calendarDays: {
            orderBy: { date: "asc" },
            select: {
              id: true,
              date: true,
              weekday: true,
              dayType: true,
              isInstructionalDay: true,
            },
          },
        },
      },
    },
  });

  return years.map((year) => {
    const termNamesById = new Map<string, string>();
    const terms = year.terms.map((term) => {
      const translationMap = new Map(
        term.translations.map((translation) => [
          translation.locale,
          translation.name,
        ]),
      );
      const names = Object.fromEntries(
        SUPPORTED_LOCALES.map((code) => [
          code,
          translationMap.get(code) ?? "",
        ]),
      ) as LocalizedNames;
      const name =
        translationMap.get(locale) ??
        translationMap.get(defaultLocale) ??
        term.name;
      termNamesById.set(term.id, name);
      return {
        id: term.id,
        name,
        names,
        sequence: term.sequence,
        startDate: dateOnlyValue(term.startDate),
        endDate: dateOnlyValue(term.endDate),
        status: term.status,
        revision: term.updatedAt.toISOString(),
      };
    });
    return {
      id: year.id,
      name: year.name,
      startDate: dateOnlyValue(year.startDate),
      endDate: dateOnlyValue(year.endDate),
      status: year.status,
      revision: year.updatedAt.toISOString(),
      terms,
      weeks: year.academicWeeks.map((week) => {
        const termName = week.academicTermId
          ? termNamesById.get(week.academicTermId)
          : null;
        return {
          id: week.id,
          sequence: week.sequence,
          academicTermId: week.academicTermId,
          termName:
            termName ??
            week.academicTerm?.translations.find(
              (translation) => translation.locale === locale,
            )?.name ??
            week.academicTerm?.translations.find(
              (translation) => translation.locale === defaultLocale,
            )?.name ??
            week.academicTerm?.name ??
            null,
          startDate: dateOnlyValue(week.startDate),
          endDate: dateOnlyValue(week.endDate),
          instructionalDayCount: week.instructionalDayCount,
          days: week.calendarDays.map((day) => ({
            id: day.id,
            date: dateOnlyValue(day.date),
            weekday: day.weekday,
            dayType: day.dayType,
            isInstructionalDay: day.isInstructionalDay,
          })),
        };
      }),
    };
  });
}

export const getAcademicCalendarSummary = cache(async (schoolId: string) => {
  const [yearCount, activeYear] = await Promise.all([
    getPrisma().academicYear.count({
      where: { schoolId, status: { not: "ARCHIVED" } },
    }),
    getPrisma().academicYear.findFirst({
      where: { schoolId, status: "ACTIVE", archivedAt: null },
      select: { id: true, name: true },
    }),
  ]);
  if (!activeYear)
    return { yearCount, activeYear, academicStructureReady: false };
  const [stageCount, levelCount, sectionCount, subjectCount] = await Promise.all([
    getPrisma().educationStageDefinition.count({
      where: { schoolId, archivedAt: null },
    }),
    getPrisma().gradeLevelDefinition.count({
      where: { schoolId, archivedAt: null },
    }),
    getPrisma().academicYearClassSection.count({
      where: { schoolId, academicYearId: activeYear.id, status: "ACTIVE" },
    }),
    getPrisma().subject.count({ where: { schoolId, archivedAt: null } }),
  ]);
  return {
    yearCount,
    activeYear,
    academicStructureReady:
      stageCount > 0 && levelCount > 0 && sectionCount > 0 && subjectCount > 0,
  };
});

export type AcademicDateContext = {
  calendarDate: string;
  timeZone: string;
  academicYearId: string;
  academicTermId: string | null;
  academicWeekId: string | null;
  academicCalendarDayId: string | null;
  isInstructionalDay: boolean | null;
};

/**
 * Resolves the academic owner of a timestamp from the school's local calendar
 * date. Grades, comments, attendance and future dated records should use this
 * function instead of storing or selecting a global "current term".
 */
export async function getAcademicDateContext(
  schoolId: string,
  occurredAt: Date = new Date(),
): Promise<AcademicDateContext | null> {
  const prisma = getPrisma();
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { timezone: true },
  });
  if (!school) return null;

  const calendarDate = dateOnlyInTimeZone(occurredAt, school.timezone);
  const year = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      status: "ACTIVE",
      archivedAt: null,
      startDate: { lte: calendarDate },
      endDate: { gte: calendarDate },
    },
    select: {
      id: true,
      terms: {
        where: {
          status: "ACTIVE",
          archivedAt: null,
          startDate: { lte: calendarDate },
          endDate: { gte: calendarDate },
        },
        orderBy: { sequence: "asc" },
        take: 1,
        select: { id: true },
      },
    },
  });
  if (!year) return null;
  const calendarDay = await prisma.academicCalendarDay.findFirst({
    where: {
      schoolId,
      academicYearId: year.id,
      date: calendarDate,
    },
    select: {
      id: true,
      academicWeekId: true,
      academicTermId: true,
      isInstructionalDay: true,
    },
  });

  return {
    calendarDate: dateOnlyValue(calendarDate),
    timeZone: school.timezone,
    academicYearId: year.id,
    academicTermId: calendarDay?.academicTermId ?? year.terms[0]?.id ?? null,
    academicWeekId: calendarDay?.academicWeekId ?? null,
    academicCalendarDayId: calendarDay?.id ?? null,
    isInstructionalDay: calendarDay?.isInstructionalDay ?? null,
  };
}
