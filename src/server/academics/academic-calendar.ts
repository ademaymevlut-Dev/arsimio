import "server-only";
import { cache } from "react";
import { getPrisma } from "@/lib/db";
import { dateOnlyValue } from "@/lib/academic-calendar-validation";
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

export type AcademicYearRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  revision: string;
  terms: AcademicTermRecord[];
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
    },
  });

  return years.map((year) => ({
    id: year.id,
    name: year.name,
    startDate: dateOnlyValue(year.startDate),
    endDate: dateOnlyValue(year.endDate),
    status: year.status,
    revision: year.updatedAt.toISOString(),
    terms: year.terms.map((term) => {
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
      return {
        id: term.id,
        name:
          translationMap.get(locale) ??
          translationMap.get(defaultLocale) ??
          term.name,
        names,
        sequence: term.sequence,
        startDate: dateOnlyValue(term.startDate),
        endDate: dateOnlyValue(term.endDate),
        status: term.status,
        revision: term.updatedAt.toISOString(),
      };
    }),
  }));
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
  return { yearCount, activeYear };
});
