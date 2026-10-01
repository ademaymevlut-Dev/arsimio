import { validRevision, validSchoolId } from "./platform-school-validation";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export type TeachingField =
  | "record"
  | "assignmentKind"
  | "assignmentId"
  | "teacherProfileId"
  | "academicYearClassSectionId"
  | "courseOfferingId"
  | "effectiveFrom"
  | "effectiveOn"
  | "note";

export type TeachingState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<TeachingField, string>>;
  entityId?: string;
};

export type HomeroomTeacherAssignmentInput = {
  teacherProfileId: string;
  academicYearClassSectionId: string;
  effectiveFrom: Date;
  note: string | null;
};

export type CourseTeacherAssignmentInput = {
  teacherProfileId: string;
  courseOfferingId: string;
  effectiveFrom: Date;
  note: string | null;
};

export type TeachingAssignmentTransitionInput = {
  assignmentKind: "homeroom" | "course";
  assignmentId: string;
  revision: string;
  effectiveOn: Date;
  note: string | null;
};

type Parsed<T> =
  | { success: true; data: T }
  | { success: false; state: TeachingState };

function optionalText(value: FormDataEntryValue | null, max: number) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
}

function provided(value: FormDataEntryValue | null) {
  return typeof value === "string" && value !== "";
}

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

function invalid(fieldErrors: TeachingState["fieldErrors"]): Parsed<never> {
  return {
    success: false,
    state: {
      status: "error",
      message: "Form kaydedilemedi. Isaretli alanlari kontrol edin.",
      fieldErrors,
    },
  };
}

export function parseHomeroomTeacherAssignment(
  form: FormData,
): Parsed<HomeroomTeacherAssignmentInput> {
  const teacherProfileId = form.get("teacherProfileId");
  const academicYearClassSectionId = form.get("academicYearClassSectionId");
  const effectiveFrom = parseDateOnly(form.get("effectiveFrom"));
  const noteRaw = form.get("note");
  const note = optionalText(noteRaw, 500);
  const fieldErrors: TeachingState["fieldErrors"] = {};

  if (!validSchoolId(teacherProfileId))
    fieldErrors.teacherProfileId = "Ogretmen kaydi gecersiz.";
  if (!validSchoolId(academicYearClassSectionId))
    fieldErrors.academicYearClassSectionId = "Sinif secimi gecersiz.";
  if (!effectiveFrom) fieldErrors.effectiveFrom = "Tarih gecersiz.";
  if (provided(noteRaw) && !note) fieldErrors.note = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(teacherProfileId) ||
    !validSchoolId(academicYearClassSectionId) ||
    !effectiveFrom
  )
    return invalid(fieldErrors);

  return {
    success: true,
    data: {
      teacherProfileId,
      academicYearClassSectionId,
      effectiveFrom,
      note,
    },
  };
}

export function parseCourseTeacherAssignment(
  form: FormData,
): Parsed<CourseTeacherAssignmentInput> {
  const teacherProfileId = form.get("teacherProfileId");
  const courseOfferingId = form.get("courseOfferingId");
  const effectiveFrom = parseDateOnly(form.get("effectiveFrom"));
  const noteRaw = form.get("note");
  const note = optionalText(noteRaw, 500);
  const fieldErrors: TeachingState["fieldErrors"] = {};

  if (!validSchoolId(teacherProfileId))
    fieldErrors.teacherProfileId = "Ogretmen kaydi gecersiz.";
  if (!validSchoolId(courseOfferingId))
    fieldErrors.courseOfferingId = "Ders acilimi gecersiz.";
  if (!effectiveFrom) fieldErrors.effectiveFrom = "Tarih gecersiz.";
  if (provided(noteRaw) && !note) fieldErrors.note = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(teacherProfileId) ||
    !validSchoolId(courseOfferingId) ||
    !effectiveFrom
  )
    return invalid(fieldErrors);

  return {
    success: true,
    data: {
      teacherProfileId,
      courseOfferingId,
      effectiveFrom,
      note,
    },
  };
}

export function parseTeachingAssignmentTransition(
  form: FormData,
): Parsed<TeachingAssignmentTransitionInput> {
  const kindRaw = form.get("assignmentKind");
  const assignmentKind =
    kindRaw === "homeroom" || kindRaw === "course" ? kindRaw : null;
  const assignmentId = form.get("assignmentId");
  const revision = form.get("revision");
  const effectiveOn = parseDateOnly(form.get("effectiveOn"));
  const noteRaw = form.get("note");
  const note = optionalText(noteRaw, 500);
  const fieldErrors: TeachingState["fieldErrors"] = {};

  if (!assignmentKind) fieldErrors.assignmentKind = "Atama turu gecersiz.";
  if (!validSchoolId(assignmentId))
    fieldErrors.assignmentId = "Atama kaydi gecersiz.";
  if (!validRevision(revision)) fieldErrors.record = "Kayit surumu gecersiz.";
  if (!effectiveOn) fieldErrors.effectiveOn = "Tarih gecersiz.";
  if (provided(noteRaw) && !note) fieldErrors.note = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !assignmentKind ||
    !validSchoolId(assignmentId) ||
    !validRevision(revision) ||
    !effectiveOn
  )
    return invalid(fieldErrors);

  return {
    success: true,
    data: {
      assignmentKind,
      assignmentId,
      revision,
      effectiveOn,
      note,
    },
  };
}
