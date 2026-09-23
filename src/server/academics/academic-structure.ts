import "server-only";
import type { SubjectTrack } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import {
  SUPPORTED_LOCALES,
  normalizeLocale,
  type Locale,
  type LocalizedNames,
} from "@/i18n/config";
import { timeValue } from "@/lib/academic-structure-validation";

type Translation = { locale: string; name: string };

function localized(
  translations: Translation[],
  locale: Locale,
  defaultLocale: Locale,
  fallback: string,
) {
  const map = new Map(
    translations.map((translation) => [translation.locale, translation.name]),
  );
  return {
    name: map.get(locale) ?? map.get(defaultLocale) ?? fallback,
    names: Object.fromEntries(
      SUPPORTED_LOCALES.map((code) => [code, map.get(code) ?? ""]),
    ) as LocalizedNames,
  };
}

export type EducationStageRecord = {
  id: string;
  code: string;
  name: string;
  names: LocalizedNames;
  sequence: number;
  archived: boolean;
  revision: string;
};

export type GradeLevelRecord = {
  id: string;
  educationStageId: string;
  code: string;
  sequence: number;
  stageName: string;
  archived: boolean;
  revision: string;
};

export type ClassSectionRecord = {
  id: string;
  gradeLevelId: string;
  gradeCode: string;
  stageName: string;
  code: string;
  displayName: string;
  archived: boolean;
  revision: string;
};

export type SubjectRecord = {
  id: string;
  name: string;
  names: LocalizedNames;
  track: SubjectTrack;
  archived: boolean;
  revision: string;
};

export type CourseOfferingRecord = {
  id: string;
  classSectionId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  archived: boolean;
  revision: string;
};

export type LessonPeriodRecord = {
  id: string;
  name: string;
  names: LocalizedNames;
  sequence: number;
  startTime: string;
  endTime: string;
  archived: boolean;
  revision: string;
};

export type AcademicStructureRecord = {
  stages: EducationStageRecord[];
  gradeLevels: GradeLevelRecord[];
  classSections: ClassSectionRecord[];
  subjects: SubjectRecord[];
  courseOfferings: CourseOfferingRecord[];
  lessonPeriods: LessonPeriodRecord[];
};

export async function getAcademicStructure(
  schoolId: string,
  academicYearId: string,
  locale: Locale,
  schoolDefaultLocale: string,
): Promise<AcademicStructureRecord | null> {
  const prisma = getPrisma();
  const year = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId },
    select: { id: true },
  });
  if (!year) return null;

  const defaultLocale = normalizeLocale(schoolDefaultLocale);
  const [stages, gradeLevels, classSections, subjects, courseOfferings, periods] =
    await Promise.all([
      prisma.educationStage.findMany({
        where: { schoolId, academicYearId },
        orderBy: [{ archivedAt: "asc" }, { sequence: "asc" }],
        include: { translations: { select: { locale: true, name: true } } },
      }),
      prisma.gradeLevel.findMany({
        where: { schoolId, academicYearId },
        orderBy: [{ archivedAt: "asc" }, { sequence: "asc" }],
        include: {
          educationStage: {
            include: {
              translations: { select: { locale: true, name: true } },
            },
          },
        },
      }),
      prisma.classSection.findMany({
        where: { schoolId, academicYearId },
        orderBy: [
          { archivedAt: "asc" },
          { gradeLevel: { sequence: "asc" } },
          { code: "asc" },
        ],
        include: {
          gradeLevel: {
            include: {
              educationStage: {
                include: {
                  translations: { select: { locale: true, name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.subject.findMany({
        where: { schoolId },
        orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
        include: { translations: { select: { locale: true, name: true } } },
      }),
      prisma.courseOffering.findMany({
        where: { schoolId, academicYearId },
        orderBy: [
          { archivedAt: "asc" },
          { classSection: { gradeLevel: { sequence: "asc" } } },
          { subject: { name: "asc" } },
        ],
        include: {
          classSection: { include: { gradeLevel: true } },
          subject: {
            include: {
              translations: { select: { locale: true, name: true } },
            },
          },
        },
      }),
      prisma.lessonPeriod.findMany({
        where: { schoolId, academicYearId },
        orderBy: [{ archivedAt: "asc" }, { sequence: "asc" }],
        include: { translations: { select: { locale: true, name: true } } },
      }),
    ]);

  return {
    stages: stages.map((stage) => ({
      id: stage.id,
      code: stage.code,
      ...localized(stage.translations, locale, defaultLocale, stage.name),
      sequence: stage.sequence,
      archived: Boolean(stage.archivedAt),
      revision: stage.updatedAt.toISOString(),
    })),
    gradeLevels: gradeLevels.map((grade) => ({
      id: grade.id,
      educationStageId: grade.educationStageId,
      code: grade.code,
      sequence: grade.sequence,
      stageName: localized(
        grade.educationStage.translations,
        locale,
        defaultLocale,
        grade.educationStage.name,
      ).name,
      archived: Boolean(grade.archivedAt),
      revision: grade.updatedAt.toISOString(),
    })),
    classSections: classSections.map((section) => ({
      id: section.id,
      gradeLevelId: section.gradeLevelId,
      gradeCode: section.gradeLevel.code,
      stageName: localized(
        section.gradeLevel.educationStage.translations,
        locale,
        defaultLocale,
        section.gradeLevel.educationStage.name,
      ).name,
      code: section.code,
      displayName: `${section.gradeLevel.code} / ${section.code}`,
      archived: Boolean(section.archivedAt),
      revision: section.updatedAt.toISOString(),
    })),
    subjects: subjects.map((subject) => ({
      id: subject.id,
      ...localized(subject.translations, locale, defaultLocale, subject.name),
      track: subject.track,
      archived: Boolean(subject.archivedAt),
      revision: subject.updatedAt.toISOString(),
    })),
    courseOfferings: courseOfferings.map((offering) => ({
      id: offering.id,
      classSectionId: offering.classSectionId,
      className: `${offering.classSection.gradeLevel.code} / ${offering.classSection.code}`,
      subjectId: offering.subjectId,
      subjectName: localized(
        offering.subject.translations,
        locale,
        defaultLocale,
        offering.subject.name,
      ).name,
      archived: Boolean(offering.archivedAt),
      revision: offering.updatedAt.toISOString(),
    })),
    lessonPeriods: periods.map((period) => ({
      id: period.id,
      ...localized(period.translations, locale, defaultLocale, period.name),
      sequence: period.sequence,
      startTime: timeValue(period.startTime),
      endTime: timeValue(period.endTime),
      archived: Boolean(period.archivedAt),
      revision: period.updatedAt.toISOString(),
    })),
  };
}
