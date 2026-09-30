import type { ScheduleProfileKind, SubjectTrack } from "@/generated/prisma/client";
import { SUPPORTED_LOCALES, type LocalizedNames } from "@/i18n/config";
import { tr } from "@/i18n/dictionaries/tr";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { validRevision, validSchoolId } from "./platform-school-validation";

export type AcademicStructureField =
  | "record"
  | "academicYearId"
  | "code"
  | "displayLabel"
  | "nameTr"
  | "nameSq"
  | "nameEn"
  | "sequence"
  | "educationStageId"
  | "gradeLevelId"
  | "subjectId"
  | "subjectIds"
  | "track"
  | "profileId"
  | "profileKind"
  | "startTime"
  | "endTime";

export type AcademicStructureState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<AcademicStructureField, string>>;
};

export type AcademicStructureServerMessages = AppDictionary["academicStructureServer"];
export type RecordIdentity = { id: string | null; revision: string | null };

export type EducationStageInput = RecordIdentity & {
  code: string;
  names: LocalizedNames;
  sequence: number;
};
export type GradeLevelInput = RecordIdentity & {
  educationStageId: string;
  code: string;
  displayLabel: string;
  sequence: number;
};
export type ClassSectionInput = RecordIdentity & {
  gradeLevelId: string;
  code: string;
  displayLabel: string | null;
  sequence: number;
};
export type SubjectInput = RecordIdentity & {
  names: LocalizedNames;
  track: SubjectTrack;
};
export type CourseOfferingInput = {
  gradeLevelId: string;
  items: Array<{
    subjectId: string;
    track: SubjectTrack;
  }>;
};
export type ScheduleProfileInput = RecordIdentity & {
  code: string;
  name: string;
  kind: ScheduleProfileKind;
};
export type LessonPeriodInput = RecordIdentity & {
  profileId: string;
  code: string;
  names: LocalizedNames;
  sequence: number;
  startTime: Date;
  endTime: Date;
};
export type AcademicYearSetupInput = {
  academicYearId: string;
  profileId: string | null;
};

export type AcademicStructureEntity =
  | "stage"
  | "grade"
  | "section"
  | "subject"
  | "offering"
  | "profile"
  | "period";

type Parsed<T> =
  | { success: true; data: T }
  | { success: false; state: AcademicStructureState };

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TRACKS = new Set<SubjectTrack>(["GENERAL", "ELECTIVE", "IGCSE"]);
const PROFILE_KINDS = new Set<ScheduleProfileKind>([
  "FULL_DAY",
  "MORNING",
  "AFTERNOON",
]);

function normalizedText(value: FormDataEntryValue | null, max: number) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
}

function optionalText(value: FormDataEntryValue | null, max: number) {
  if (value === null || value === "") return null;
  return normalizedText(value, max);
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
    names: Object.values(names).every(Boolean) ? (names as LocalizedNames) : null,
    fieldErrors,
  };
}

function integer(value: FormDataEntryValue | null, min: number, max: number) {
  if (typeof value !== "string" || !/^\d{1,3}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function invalidState(
  messages: AcademicStructureServerMessages,
  fieldErrors: AcademicStructureState["fieldErrors"],
): Parsed<never> {
  return { success: false, state: { status: "error", message: messages.saveInvalid, fieldErrors } };
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

export function parseEducationStage(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<EducationStageInput> {
  const record = identity(form);
  const code = normalizedText(form.get("code"), 30);
  const sequence = integer(form.get("sequence"), 1, 100);
  const localized = localizedNames(form, 100, messages);
  const fieldErrors = { ...localized.fieldErrors };
  if (!record) fieldErrors.record = messages.invalidRecord;
  if (!code) fieldErrors.code = messages.invalidCode;
  if (!sequence) fieldErrors.sequence = messages.invalidSequence;
  if (!record || !code || !sequence || !localized.names) return invalidState(messages, fieldErrors);
  return { success: true, data: { ...record, code, sequence, names: localized.names } };
}

export function parseGradeLevel(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<GradeLevelInput> {
  const record = identity(form);
  const educationStageId = form.get("educationStageId");
  const code = normalizedText(form.get("code"), 30);
  const displayLabel = normalizedText(form.get("displayLabel"), 100) ?? code;
  const sequence = integer(form.get("sequence"), 1, 200);
  const fieldErrors: AcademicStructureState["fieldErrors"] = {};
  if (!record) fieldErrors.record = messages.invalidRecord;
  if (!validSchoolId(educationStageId)) fieldErrors.educationStageId = messages.invalidRelation;
  if (!code) fieldErrors.code = messages.invalidCode;
  if (!displayLabel) fieldErrors.displayLabel = messages.invalidCode;
  if (!sequence) fieldErrors.sequence = messages.invalidSequence;
  if (!record || !validSchoolId(educationStageId) || !code || !displayLabel || !sequence)
    return invalidState(messages, fieldErrors);
  return { success: true, data: { ...record, educationStageId, code, displayLabel, sequence } };
}

export function parseClassSection(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<ClassSectionInput> {
  const record = identity(form);
  const gradeLevelId = form.get("gradeLevelId");
  const code = normalizedText(form.get("code"), 30);
  const displayLabel = optionalText(form.get("displayLabel"), 100);
  const sequence = integer(form.get("sequence"), 1, 100) ?? 1;
  const fieldErrors: AcademicStructureState["fieldErrors"] = {};
  if (!record) fieldErrors.record = messages.invalidRecord;
  if (!validSchoolId(gradeLevelId)) fieldErrors.gradeLevelId = messages.invalidRelation;
  if (!code) fieldErrors.code = messages.invalidCode;
  if (!record || !validSchoolId(gradeLevelId) || !code) return invalidState(messages, fieldErrors);
  return { success: true, data: { ...record, gradeLevelId, code, displayLabel, sequence } };
}

export function parseSubject(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<SubjectInput> {
  const record = identity(form);
  const localized = localizedNames(form, 150, messages);
  const trackValue = form.get("track");
  const track = typeof trackValue === "string" && TRACKS.has(trackValue as SubjectTrack)
    ? (trackValue as SubjectTrack)
    : null;
  const fieldErrors = { ...localized.fieldErrors };
  if (!record) fieldErrors.record = messages.invalidRecord;
  if (!track) fieldErrors.track = messages.invalidRelation;
  if (!record || !localized.names || !track) return invalidState(messages, fieldErrors);
  return { success: true, data: { ...record, names: localized.names, track } };
}

export function parseCourseOffering(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<CourseOfferingInput> {
  const gradeLevelId = form.get("gradeLevelId");
  const subjectIds = [...new Set(form.getAll("subjectIds"))];
  const fieldErrors: AcademicStructureState["fieldErrors"] = {};
  if (!validSchoolId(gradeLevelId)) fieldErrors.gradeLevelId = messages.invalidRelation;
  if (
    subjectIds.length < 1 ||
    subjectIds.length > 200 ||
    !subjectIds.every(validSchoolId)
  ) {
    fieldErrors.subjectIds = messages.invalidRelation;
  }
  const items = subjectIds.flatMap((subjectId) => {
    if (!validSchoolId(subjectId)) return [];
    const trackValue = form.get(`track:${subjectId}`);
    if (typeof trackValue !== "string" || !TRACKS.has(trackValue as SubjectTrack)) {
      return [];
    }
    return [{ subjectId, track: trackValue as SubjectTrack }];
  });
  if (items.length !== subjectIds.length) fieldErrors.track = messages.invalidTrack;
  if (!validSchoolId(gradeLevelId) || fieldErrors.subjectIds || fieldErrors.track)
    return invalidState(messages, fieldErrors);
  return { success: true, data: { gradeLevelId, items } };
}

export function parseScheduleProfile(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<ScheduleProfileInput> {
  const record = identity(form);
  const code = normalizedText(form.get("code"), 30);
  const name = normalizedText(form.get("name"), 100);
  const kindValue = form.get("profileKind");
  const kind = typeof kindValue === "string" && PROFILE_KINDS.has(kindValue as ScheduleProfileKind)
    ? (kindValue as ScheduleProfileKind)
    : null;
  const fieldErrors: AcademicStructureState["fieldErrors"] = {};
  if (!record) fieldErrors.record = messages.invalidRecord;
  if (!code) fieldErrors.code = messages.invalidCode;
  if (!name) fieldErrors.displayLabel = messages.invalidLocalizedName;
  if (!kind) fieldErrors.profileKind = messages.invalidRelation;
  if (!record || !code || !name || !kind) return invalidState(messages, fieldErrors);
  return { success: true, data: { ...record, code, name, kind } };
}

export function parseLessonPeriod(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<LessonPeriodInput> {
  const record = identity(form);
  const profileId = form.get("profileId");
  const code = normalizedText(form.get("code"), 30);
  const sequence = integer(form.get("sequence"), 1, 100);
  const startTime = parseTimeValue(form.get("startTime"));
  const endTime = parseTimeValue(form.get("endTime"));
  const localized = localizedNames(form, 100, messages);
  const fieldErrors = { ...localized.fieldErrors };
  if (!record) fieldErrors.record = messages.invalidRecord;
  if (!validSchoolId(profileId)) fieldErrors.profileId = messages.invalidRelation;
  if (!code) fieldErrors.code = messages.invalidCode;
  if (!sequence) fieldErrors.sequence = messages.invalidSequence;
  if (!startTime) fieldErrors.startTime = messages.invalidTime;
  if (!endTime) fieldErrors.endTime = messages.invalidTime;
  if (startTime && endTime && endTime <= startTime) fieldErrors.endTime = messages.invalidTimeRange;
  if (!record || !validSchoolId(profileId) || !code || !sequence || !startTime || !endTime || endTime <= startTime || !localized.names)
    return invalidState(messages, fieldErrors);
  return { success: true, data: { ...record, profileId, code, names: localized.names, sequence, startTime, endTime } };
}

export function parseAcademicYearSetup(
  form: FormData,
  messages: AcademicStructureServerMessages = tr.academicStructureServer,
): Parsed<AcademicYearSetupInput> {
  const academicYearId = form.get("academicYearId");
  const profileValue = form.get("profileId");
  const profileId = profileValue === "" || profileValue === null ? null : profileValue;
  const fieldErrors: AcademicStructureState["fieldErrors"] = {};
  if (!validSchoolId(academicYearId)) fieldErrors.academicYearId = messages.invalidRelation;
  if (profileId !== null && !validSchoolId(profileId)) fieldErrors.profileId = messages.invalidRelation;
  if (!validSchoolId(academicYearId) || (profileId !== null && !validSchoolId(profileId)))
    return invalidState(messages, fieldErrors);
  return { success: true, data: { academicYearId, profileId } };
}

export function parseAcademicStructureTransition(form: FormData) {
  const entity = form.get("entity");
  const transition = form.get("transition");
  const id = form.get("id");
  const revision = form.get("revision");
  const entities = new Set<AcademicStructureEntity>([
    "stage", "grade", "section", "subject", "offering", "profile", "period",
  ]);
  if (typeof entity !== "string" || !entities.has(entity as AcademicStructureEntity)) return null;
  if (transition !== "archive" && transition !== "restore") return null;
  if (!validSchoolId(id) || !validRevision(revision)) return null;
  return {
    entity: entity as AcademicStructureEntity,
    transition: transition as "archive" | "restore",
    id,
    revision,
  };
}
