import type {
  EmploymentExitReason,
  EmploymentType,
  TeacherCategory,
  TeacherStatus,
} from "@/generated/prisma/client";
import { validRevision, validSchoolId } from "./platform-school-validation";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

const EMPLOYMENT_TYPES = new Set<EmploymentType>([
  "FULL_TIME",
  "PART_TIME",
  "FIXED_TERM",
  "CONTRACTOR",
  "INTERN",
]);

const EXIT_REASONS = new Set<EmploymentExitReason>([
  "RESIGNED",
  "TERMINATED",
  "CONTRACT_ENDED",
  "MATERNITY_LEAVE",
  "HEALTH",
  "RELOCATION",
  "OTHER",
  "UNKNOWN",
]);

const TEACHER_CATEGORIES = new Set<TeacherCategory>(["CLASSROOM", "BRANCH"]);
const TEACHER_STATUSES = new Set<TeacherStatus>(["ACTIVE", "INACTIVE"]);

export type StaffField =
  | "record"
  | "mode"
  | "personId"
  | "firstName"
  | "middleName"
  | "lastName"
  | "phone"
  | "email"
  | "hiredOn"
  | "employmentType"
  | "departmentId"
  | "positionId"
  | "effectiveOn"
  | "transition"
  | "exitReason"
  | "note"
  | "category"
  | "title"
  | "teacherStatus"
  | "subjectIds";

export type StaffState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<StaffField, string>>;
  entityId?: string;
};

export type CreateEmploymentInput = {
  mode: "existing" | "new";
  personId: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  hiredOn: Date;
  employmentType: EmploymentType;
  departmentId: string;
  positionId: string;
  note: string | null;
};

export type EmploymentTransitionInput = {
  employmentId: string;
  revision: string;
  transition: "on_leave" | "reactivate" | "end";
  effectiveOn: Date;
  exitReason: EmploymentExitReason | null;
  note: string | null;
};

export type TeacherProfileInput = {
  employmentId: string;
  category: TeacherCategory;
  title: string;
  teacherStatus: TeacherStatus;
  note: string | null;
  subjectIds: string[];
};

type Parsed<T> =
  | { success: true; data: T }
  | { success: false; state: StaffState };

function text(value: FormDataEntryValue | null, max: number) {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
}

function optionalText(value: FormDataEntryValue | null, max: number) {
  if (value === null || value === "") return null;
  return text(value, max);
}

function provided(value: FormDataEntryValue | null) {
  return typeof value === "string" && value !== "";
}

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

function invalid(fieldErrors: StaffState["fieldErrors"]): Parsed<never> {
  return {
    success: false,
    state: {
      status: "error",
      message: "Form kaydedilemedi. Isaretli alanlari kontrol edin.",
      fieldErrors,
    },
  };
}

export function parseCreateEmployment(
  form: FormData,
): Parsed<CreateEmploymentInput> {
  const modeRaw = form.get("mode");
  const mode = modeRaw === "existing" || modeRaw === "new" ? modeRaw : null;
  const personId = form.get("personId");
  const firstName = optionalText(form.get("firstName"), 100);
  const middleNameRaw = form.get("middleName");
  const middleName = optionalText(middleNameRaw, 100);
  const lastName = optionalText(form.get("lastName"), 100);
  const phoneRaw = form.get("phone");
  const phone = optionalText(phoneRaw, 50);
  const emailRaw = form.get("email");
  const email = optionalText(emailRaw, 320)?.toLowerCase() ?? null;
  const hiredOn = parseDateOnly(form.get("hiredOn"));
  const typeRaw = form.get("employmentType");
  const employmentType =
    typeof typeRaw === "string" && EMPLOYMENT_TYPES.has(typeRaw as EmploymentType)
      ? (typeRaw as EmploymentType)
      : null;
  const departmentId = form.get("departmentId");
  const positionId = form.get("positionId");
  const noteRaw = form.get("note");
  const note = optionalText(noteRaw, 500);
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!mode) fieldErrors.mode = "Kayit turu gecersiz.";
  if (mode === "existing" && !validSchoolId(personId))
    fieldErrors.personId = "Kisi secimi gecersiz.";
  if (mode === "new" && !firstName) fieldErrors.firstName = "Ad zorunlu.";
  if (mode === "new" && provided(middleNameRaw) && !middleName)
    fieldErrors.middleName = "Ikinci ad gecersiz.";
  if (mode === "new" && !lastName) fieldErrors.lastName = "Soyad zorunlu.";
  if (provided(phoneRaw) && !phone) fieldErrors.phone = "Telefon gecersiz.";
  if (provided(emailRaw) && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    fieldErrors.email = "E-posta gecersiz.";
  if (!hiredOn) fieldErrors.hiredOn = "Ise giris tarihi gecersiz.";
  if (!employmentType) fieldErrors.employmentType = "Calisma turu gecersiz.";
  if (!validSchoolId(departmentId)) fieldErrors.departmentId = "Departman secin.";
  if (!validSchoolId(positionId)) fieldErrors.positionId = "Pozisyon secin.";
  if (provided(noteRaw) && !note) fieldErrors.note = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !mode ||
    !hiredOn ||
    !employmentType ||
    !validSchoolId(departmentId) ||
    !validSchoolId(positionId)
  ) return invalid(fieldErrors);

  return {
    success: true,
    data: {
      mode,
      personId: mode === "existing" ? (personId as string) : null,
      firstName,
      middleName,
      lastName,
      phone,
      email,
      hiredOn,
      employmentType,
      departmentId,
      positionId,
      note,
    },
  };
}

export function parseEmploymentTransition(
  form: FormData,
): Parsed<EmploymentTransitionInput> {
  const employmentId = form.get("employmentId");
  const revision = form.get("revision");
  const transitionRaw = form.get("transition");
  const transition =
    transitionRaw === "on_leave" ||
    transitionRaw === "reactivate" ||
    transitionRaw === "end"
      ? transitionRaw
      : null;
  const effectiveOn = parseDateOnly(form.get("effectiveOn"));
  const exitReasonRaw = form.get("exitReason");
  const exitReason =
    typeof exitReasonRaw === "string" && EXIT_REASONS.has(exitReasonRaw as EmploymentExitReason)
      ? (exitReasonRaw as EmploymentExitReason)
      : null;
  const noteRaw = form.get("note");
  const note = optionalText(noteRaw, 500);
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!validSchoolId(employmentId)) fieldErrors.record = "Personel kaydi gecersiz.";
  if (!validRevision(revision)) fieldErrors.record = "Kayit surumu gecersiz.";
  if (!transition) fieldErrors.transition = "Islem gecersiz.";
  if (!effectiveOn) fieldErrors.effectiveOn = "Tarih gecersiz.";
  if (transition === "end" && !exitReason) fieldErrors.exitReason = "Ayrilis sebebi secin.";
  if (provided(exitReasonRaw) && !exitReason) fieldErrors.exitReason = "Sebep gecersiz.";
  if (provided(noteRaw) && !note) fieldErrors.note = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(employmentId) ||
    !validRevision(revision) ||
    !transition ||
    !effectiveOn
  ) return invalid(fieldErrors);

  return {
    success: true,
    data: {
      employmentId,
      revision,
      transition,
      effectiveOn,
      exitReason,
      note,
    },
  };
}

export function parseTeacherProfile(form: FormData): Parsed<TeacherProfileInput> {
  const employmentId = form.get("employmentId");
  const categoryRaw = form.get("category");
  const category =
    typeof categoryRaw === "string" && TEACHER_CATEGORIES.has(categoryRaw as TeacherCategory)
      ? (categoryRaw as TeacherCategory)
      : null;
  const title = text(form.get("title"), 120);
  const statusRaw = form.get("teacherStatus");
  const teacherStatus =
    typeof statusRaw === "string" && TEACHER_STATUSES.has(statusRaw as TeacherStatus)
      ? (statusRaw as TeacherStatus)
      : null;
  const noteRaw = form.get("note");
  const note = optionalText(noteRaw, 500);
  const subjectIds = form
    .getAll("subjectIds")
    .filter((value): value is string => validSchoolId(value));
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!validSchoolId(employmentId)) fieldErrors.record = "Personel kaydi gecersiz.";
  if (!category) fieldErrors.category = "Ogretmen turu secin.";
  if (!title) fieldErrors.title = "Unvan zorunlu.";
  if (!teacherStatus) fieldErrors.teacherStatus = "Durum gecersiz.";
  if (provided(noteRaw) && !note) fieldErrors.note = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(employmentId) ||
    !category ||
    !title ||
    !teacherStatus
  ) return invalid(fieldErrors);

  return {
    success: true,
    data: {
      employmentId,
      category,
      title,
      teacherStatus,
      note,
      subjectIds: [...new Set(subjectIds)],
    },
  };
}
