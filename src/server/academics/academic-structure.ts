import "server-only";
import type { ScheduleProfileKind, SubjectTrack } from "@/generated/prisma/client";
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
  const map = new Map(translations.map((translation) => [translation.locale, translation.name]));
  return {
    name: map.get(locale) ?? map.get(defaultLocale) ?? fallback,
    names: Object.fromEntries(
      SUPPORTED_LOCALES.map((code) => [code, map.get(code) ?? fallback]),
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
  displayLabel: string;
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
  displayLabel: string | null;
  sequence: number;
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
  gradeLevelId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  track: SubjectTrack;
  archived: boolean;
  revision: string;
};

export type ScheduleProfileRecord = {
  id: string;
  code: string;
  name: string;
  kind: ScheduleProfileKind;
  versionId: string | null;
  version: number | null;
  versionStatus: "DRAFT" | "PUBLISHED" | "RETIRED" | null;
  archived: boolean;
  revision: string;
};

export type LessonPeriodRecord = {
  id: string;
  profileId: string;
  profileName: string;
  code: string;
  name: string;
  names: LocalizedNames;
  sequence: number;
  startTime: string;
  endTime: string;
  archived: boolean;
  revision: string;
};

export type AcademicStructureRecord = {
  structureVersion: { id: string; name: string; status: string } | null;
  curriculumVersion: { id: string; name: string; revision: number; status: string } | null;
  stages: EducationStageRecord[];
  gradeLevels: GradeLevelRecord[];
  classSections: ClassSectionRecord[];
  subjects: SubjectRecord[];
  courseOfferings: CourseOfferingRecord[];
  scheduleProfiles: ScheduleProfileRecord[];
  lessonPeriods: LessonPeriodRecord[];
  annualSetup: {
    academicYearId: string | null;
    status: string | null;
    sectionCount: number;
    offeringCount: number;
  };
};

export async function getAcademicStructure(
  schoolId: string,
  academicYearId: string | null,
  locale: Locale,
  schoolDefaultLocale: string,
): Promise<AcademicStructureRecord> {
  const prisma = getPrisma();
  const defaultLocale = normalizeLocale(schoolDefaultLocale);
  const year = academicYearId
    ? await prisma.academicYear.findFirst({
        where: { id: academicYearId, schoolId },
        select: { id: true, setupStatus: true, academicStructureVersionId: true },
      })
    : null;

  const [draftStructure, draftCurriculum] = await Promise.all([
    prisma.academicStructureVersion.findFirst({
      where: { schoolId, status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, status: true },
    }),
    prisma.curriculumVersion.findFirst({
      where: { schoolId, status: "DRAFT" },
      orderBy: [{ revision: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, revision: true, status: true },
    }),
  ]);
  const structureVersion =
    draftStructure ??
    (year?.academicStructureVersionId
      ? await prisma.academicStructureVersion.findFirst({
          where: { id: year.academicStructureVersionId, schoolId },
          select: { id: true, name: true, status: true },
        })
      : await prisma.academicStructureVersion.findFirst({
          where: { schoolId, status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          select: { id: true, name: true, status: true },
        }));
  const curriculumVersion =
    draftCurriculum ??
    (year
      ? await prisma.curriculumVersion.findFirst({
          where: { schoolId, yearCurricula: { some: { academicYearId: year.id } } },
          orderBy: [{ revision: "desc" }, { publishedAt: "desc" }],
          select: { id: true, name: true, revision: true, status: true },
        })
      : null) ??
    (await prisma.curriculumVersion.findFirst({
      where: { schoolId, status: "PUBLISHED" },
      orderBy: [{ revision: "desc" }, { publishedAt: "desc" }],
      select: { id: true, name: true, revision: true, status: true },
    }));

  const [stages, levels, sections, subjects, items, profiles, sectionCount, offeringCount] =
    await Promise.all([
      prisma.educationStageDefinition.findMany({
        where: { schoolId },
        orderBy: [{ archivedAt: "asc" }, { sequence: "asc" }],
        include: { translations: { select: { locale: true, name: true } } },
      }),
      structureVersion
        ? prisma.academicStructureLevel.findMany({
            where: { schoolId, academicStructureVersionId: structureVersion.id },
            orderBy: { sequence: "asc" },
            include: {
              gradeLevelDefinition: true,
              educationStageDefinition: {
                include: { translations: { select: { locale: true, name: true } } },
              },
            },
          })
        : Promise.resolve([]),
      prisma.classSectionDefinition.findMany({
        where: { schoolId },
        orderBy: [
          { archivedAt: "asc" },
          { gradeLevel: { sequence: "asc" } },
          { sequence: "asc" },
          { code: "asc" },
        ],
        include: { gradeLevel: true },
      }),
      prisma.subject.findMany({
        where: { schoolId },
        orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
        include: { translations: { select: { locale: true, name: true } } },
      }),
      curriculumVersion
        ? prisma.curriculumItem.findMany({
            where: { schoolId, curriculumVersionId: curriculumVersion.id },
            orderBy: [
              { gradeLevel: { sequence: "asc" } },
              { subject: { name: "asc" } },
            ],
            include: {
              gradeLevel: true,
              subject: { include: { translations: { select: { locale: true, name: true } } } },
            },
          })
        : Promise.resolve([]),
      prisma.scheduleProfile.findMany({
        where: { schoolId },
        orderBy: [{ archivedAt: "asc" }, { kind: "asc" }, { name: "asc" }],
        include: {
          versions: {
            where: { status: { in: ["DRAFT", "PUBLISHED"] } },
            orderBy: [{ status: "asc" }, { version: "desc" }],
            take: 1,
            include: {
              periods: {
                orderBy: { sequence: "asc" },
                include: { translations: { select: { locale: true, name: true } } },
              },
            },
          },
        },
      }),
      year
        ? prisma.academicYearClassSection.count({ where: { schoolId, academicYearId: year.id } })
        : Promise.resolve(0),
      year
        ? prisma.courseOffering.count({ where: { schoolId, academicYearId: year.id, archivedAt: null } })
        : Promise.resolve(0),
    ]);

  const levelStage = new Map(
    levels.map((level) => [
      level.gradeLevelDefinitionId,
      localized(
        level.educationStageDefinition.translations,
        locale,
        defaultLocale,
        level.educationStageDefinition.defaultName,
      ).name,
    ]),
  );

  return {
    structureVersion,
    curriculumVersion,
    stages: stages.map((stage) => ({
      id: stage.id,
      code: stage.code,
      ...localized(stage.translations, locale, defaultLocale, stage.defaultName),
      sequence: stage.sequence,
      archived: Boolean(stage.archivedAt),
      revision: stage.updatedAt.toISOString(),
    })),
    gradeLevels: levels.map((level) => ({
      id: level.gradeLevelDefinition.id,
      educationStageId: level.educationStageDefinitionId,
      code: level.gradeLevelDefinition.code,
      displayLabel: level.gradeLevelDefinition.displayLabel,
      sequence: level.sequence,
      stageName: levelStage.get(level.gradeLevelDefinitionId) ?? "—",
      archived: Boolean(level.gradeLevelDefinition.archivedAt),
      revision: level.gradeLevelDefinition.updatedAt.toISOString(),
    })),
    classSections: sections.map((section) => ({
      id: section.id,
      gradeLevelId: section.gradeLevelDefinitionId,
      gradeCode: section.gradeLevel.code,
      stageName: levelStage.get(section.gradeLevelDefinitionId) ?? "—",
      code: section.code,
      displayLabel: section.displayLabel,
      sequence: section.sequence,
      displayName: section.displayLabel ?? `${section.gradeLevel.displayLabel} / ${section.code}`,
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
    courseOfferings: items.map((item) => ({
      id: item.id,
      gradeLevelId: item.gradeLevelDefinitionId,
      className: item.gradeLevel.displayLabel,
      subjectId: item.subjectId,
      subjectName: localized(item.subject.translations, locale, defaultLocale, item.subject.name).name,
      track: item.deliveryType,
      archived: false,
      revision: item.updatedAt.toISOString(),
    })),
    scheduleProfiles: profiles.map((profile) => ({
      id: profile.id,
      code: profile.code,
      name: profile.name,
      kind: profile.kind,
      versionId: profile.versions[0]?.id ?? null,
      version: profile.versions[0]?.version ?? null,
      versionStatus: profile.versions[0]?.status ?? null,
      archived: Boolean(profile.archivedAt),
      revision: profile.updatedAt.toISOString(),
    })),
    lessonPeriods: profiles.flatMap((profile) =>
      (profile.versions[0]?.periods ?? []).map((period) => ({
        id: period.id,
        profileId: profile.id,
        profileName: profile.name,
        code: period.code,
        ...localized(period.translations, locale, defaultLocale, period.defaultName),
        sequence: period.sequence,
        startTime: timeValue(period.startTime),
        endTime: timeValue(period.endTime),
        archived: false,
        revision: period.updatedAt.toISOString(),
      })),
    ),
    annualSetup: {
      academicYearId: year?.id ?? null,
      status: year?.setupStatus ?? null,
      sectionCount,
      offeringCount,
    },
  };
}
