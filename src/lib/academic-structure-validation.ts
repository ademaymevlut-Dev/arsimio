import { SUPPORTED_LOCALES, type LocalizedNames } from "@/i18n/config";
import type { SubjectTrack } from "@/generated/prisma/client";
import { tr } from "@/i18n/dictionaries/tr";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { validRevision, validSchoolId } from "./platform-school-validation";

export type AcademicStructureField =
  | "record"
  | "academicYearId"
  | "code"
  | "nameTr"
  | "nameSq"
  | "nameEn"
  | "sequence"
  | "educationStageId"
  | "gradeLevelId"
  | "classSectionId"
  | "subjectId"
  | "track"
  | "startTime"
  | "endTime";

export type AcademicStructureState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<AcademicStructureField, string>>;
};

export type AcademicStructureServerMessages =
  AppDictionary["academicStructureServer"];

export type RecordIdentity = { id: string | null; revision: string | null };

export type EducationStageInput = RecordIdentity & {
  academicYearId: string;
  code: string;
  names: LocalizedNames;
  sequence: number;
};

export type GradeLevelInput = RecordIdentity & {
  academicYearId: string;
  educationStageId: string;
  code: string;
  sequence: number;
};

export type ClassSectionInput = RecordIdentity & {
  academicYearId: string;
  gradeLevelId: string;
  code: string;
};

export type SubjectInput = RecordIdentity & {
  names: LocalizedNames;
  track: SubjectTrack;
};

export type CourseOfferingInput = {
  academicYearId: string;
  classSectionId: string;
  subjectId: string;
};

export type LessonPeriodInput = RecordIdentity & {
  academicYearId: string;
  names: LocalizedNames;
  sequence: number;
  startTime: Date;
  endTime: Date;
};

export type AcademicStructureEntity =
  | "stage"
  | "grade"
  | "section"
  | "subject"
  | "offering"
  | "period";

export type AcademicStructureTransition = "archive" | "restore";

type Parsed<T> =
  | { success: true; data: T }
  | { success: false; state: AcademicStructureState };

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizedText(value: FormDataEntryValue | null, max: number) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value))
    return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
}

function identity(form: FormData): RecordIdentity | null {
  const id = form.get("id");
  const revision = form.get("revision");
  if (id === "new" && revision === "new") return { id: null, revision: null };
  if (!validSchoolId(id) || !validRevision(revision)) return null;
  return { id, revision };
}

function localizedNames(
  form: FormData,
  max: number,
  messages: AcademicStructureServerMessages,
) {
  const names = {
    tr: normalizedText(form.get("nameTr"), max),
    sq: normalizedText(form.get("nameSq"), max),
    en: normalizedText(form.get("nameEn"), max),
  };
  const fieldErrors: AcademicStructureState["fieldErrors"] = {};
  for (const locale of SUPPORTED_LOCALES) {
    if (!names[locale]) {
      const field = `name${locale[0].toUpperCase()}${locale.slice(1)}` as
        | "nameTr"
        | "nameSq"
        | "nameEn";
      fieldErrors[field] = messages.invalidLocalizedName;
    }
  }
  return {
    names: Object.values(names).every(Boolean)
      ? (names as LocalizedNames)
      : null,
    fieldErrors,
  };
}

function integer(
  value: FormDataEntryValue | null,
  min: number,
  max: number,
) {
  if (typeof value !== "string" || !/^\d{1,3}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

export function parseTimeValue(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return new Date(Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2])));
}

export function timeValue(value: Date) {
  return value.toISOString().slice(11, 16);
}

function invalidState(
  messages: AcademicStructureServerMessages,
  fieldErrors: AcademicStructureState["fieldErrors"],
): Parsed<never> {
  return {
    success: false,
    state: {
      status: "error",
      message: messages.saveInvalid,
      fieldErrors,
    },
  };
}

export function parseEducationStage(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<EducationStageInput> {
  const record = identity(form);
  const academicYearId = form.get("academicYearId");
  const code = normalizedText(form.get("code"), 30);
  const sequence = integer(form.get("sequence"), 1, 100);
  const localized = localizedNames(form, 100, messages);
  const fieldErrors = { ...localized.fieldErrors };
  if (!record) fieldErrors.record = messages.invalidRecord;
  if (!validSchoolId(academicYearId))
    fieldErrors.academicYearId = messages.invalidRelation;
  if (!code) fieldErrors.code = messages.invalidCode;
  if (!sequence) fieldErrors.sequence = messages.invalidSequence;
  if (
    !record ||
    !validSchoolId(academicYearId) ||
    !code ||
    !sequence ||
    !localized.names
  )
    return invalidState(messages, fieldErrors);
  return {
    success: true,
    data: { ...record, academicYearId, code, sequence, names: localized.names },
  };
}

export function parseGradeLevel(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<GradeLevelInput> {
  const record = identity(form);
  const academicYearId = form.get("academicYearId");
  const educationStageId = form.get("educationStageId");
  const code = normalizedText(form.get("code"), 30);
  const sequence = integer(form.get("sequence"), 1, 200);
  const fieldErrors: AcademicStructureState["fieldErrors"] = {};
  if (!record) fieldErrors.record = messages.invalidRecord;
  if (!validSchoolId(academicYearId))
    fieldErrors.academicYearId = messages.invalidRelation;
  if (!validSchoolId(educationStageId))
    fieldErrors.educationStageId = messages.invalidRelation;
  if (!code) fieldErrors.code = messages.invalidCode;
  if (!sequence) fieldErrors.sequence = messages.invalidSequence;
  if (
    !record ||
    !validSchoolId(academicYearId) ||
    !validSchoolId(educationStageId) ||
    !code ||
    !sequence
  )
    return invalidState(messages, fieldErrors);
  return {
    success: true,
    data: { ...record, academicYearId, educationStageId, code, sequence },
  };
}

export function parseClassSection(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<ClassSectionInput> {
  const record = identity(form);
  const academicYearId = form.get("academicYearId");
  const gradeLevelId = form.get("gradeLevelId");
  const code = normalizedText(form.get("code"), 30);
  const fieldErrors: AcademicStructureState["fieldErrors"] = {};
  if (!record) fieldErrors.record = messages.invalidRecord;
  if (!validSchoolId(academicYearId))
    fieldErrors.academicYearId = messages.invalidRelation;
  if (!validSchoolId(gradeLevelId))
    fieldErrors.gradeLevelId = messages.invalidRelation;
  if (!code) fieldErrors.code = messages.invalidCode;
  if (!record || !validSchoolId(academicYearId) || !validSchoolId(gradeLevelId) || !code)
    return invalidState(messages, fieldErrors);
  return { success: true, data: { ...record, academicYearId, gradeLevelId, code } };
}

export function parseSubject(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<SubjectInput> {
  const record = identity(form);
  const localized = localizedNames(form, 150, messages);
  const track = form.get("track");
  const fieldErrors = { ...localized.fieldErrors };
  if (!record) fieldErrors.record = messages.invalidRecord;
  if (track !== "GENERAL" && track !== "ELECTIVE" && track !== "IGCSE")
    fieldErrors.track = messages.invalidTrack;
  if (!record || !localized.names || fieldErrors.track)
    return invalidState(messages, fieldErrors);
  return { success: true, data: { ...record, names: localized.names, track: track as SubjectTrack } };
}

export function parseCourseOffering(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<CourseOfferingInput> {
  const academicYearId = form.get("academicYearId");
  const classSectionId = form.get("classSectionId");
  const subjectId = form.get("subjectId");
  const fieldErrors: AcademicStructureState["fieldErrors"] = {};
  if (!validSchoolId(academicYearId))
    fieldErrors.academicYearId = messages.invalidRelation;
  if (!validSchoolId(classSectionId))
    fieldErrors.classSectionId = messages.invalidRelation;
  if (!validSchoolId(subjectId))
    fieldErrors.subjectId = messages.invalidRelation;
  if (
    !validSchoolId(academicYearId) ||
    !validSchoolId(classSectionId) ||
    !validSchoolId(subjectId)
  )
    return invalidState(messages, fieldErrors);
  return { success: true, data: { academicYearId, classSectionId, subjectId } };
}

export function parseLessonPeriod(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<LessonPeriodInput> {
  const record = identity(form);
  const academicYearId = form.get("academicYearId");
  const localized = localizedNames(form, 100, messages);
  const sequence = integer(form.get("sequence"), 1, 100);
  const startTime = parseTimeValue(form.get("startTime"));
  const endTime = parseTimeValue(form.get("endTime"));
  const fieldErrors = { ...localized.fieldErrors };
  if (!record) fieldErrors.record = messages.invalidRecord;
  if (!validSchoolId(academicYearId))
    fieldErrors.academicYearId = messages.invalidRelation;
  if (!sequence) fieldErrors.sequence = messages.invalidSequence;
  if (!startTime) fieldErrors.startTime = messages.invalidTime;
  if (!endTime) fieldErrors.endTime = messages.invalidTime;
  if (startTime && endTime && endTime <= startTime)
    fieldErrors.endTime = messages.invalidTimeRange;
  if (
    !record ||
    !validSchoolId(academicYearId) ||
    !localized.names ||
    !sequence ||
    !startTime ||
    !endTime ||
    endTime <= startTime
  )
    return invalidState(messages, fieldErrors);
  return {
    success: true,
    data: {
      ...record,
      academicYearId,
      names: localized.names,
      sequence,
      startTime,
      endTime,
    },
  };
}

export function parseAcademicStructureTransition(form: FormData): {
  entity: AcademicStructureEntity;
  transition: AcademicStructureTransition;
  id: string;
  revision: string;
} | null {
  const entity = form.get("entity");
  const transition = form.get("transition");
  const id = form.get("id");
  const revision = form.get("revision");
  if (
    !["stage", "grade", "section", "subject", "offering", "period"].includes(
      String(entity),
    ) ||
    (transition !== "archive" && transition !== "restore") ||
    !validSchoolId(id) ||
    !validRevision(revision)
  )
    return null;
  return {
    entity: entity as AcademicStructureEntity,
    transition,
    id,
    revision,
  };
}
