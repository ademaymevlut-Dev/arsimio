import { validSchoolId } from "./platform-school-validation";

const UNSAFE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export type TeacherCtaField =
  | "record"
  | "timetableParticipantId"
  | "academicCalendarDayId"
  | "title"
  | "content";

export type TeacherCtaState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<TeacherCtaField, string>>;
  entityId?: string;
};

export type LessonTopicInput = {
  timetableParticipantId: string;
  academicCalendarDayId: string;
  content: string;
};

export type HomeworkInput = {
  timetableParticipantId: string;
  academicCalendarDayId: string;
  title: string;
  content: string;
};

type Parsed<T> =
  | { success: true; data: T }
  | { success: false; state: TeacherCtaState };

function invalid(fieldErrors: TeacherCtaState["fieldErrors"]): Parsed<never> {
  return {
    success: false,
    state: {
      status: "error",
      message: "Kayıt kaydedilemedi. İşaretli alanları kontrol edin.",
      fieldErrors,
    },
  };
}

function normalizeContent(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (
    normalized.length < 1 ||
    normalized.length > 5000 ||
    UNSAFE_CONTROL_CHARACTERS.test(normalized)
  )
    return null;
  return normalized;
}

function normalizeTitle(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (
    normalized.length < 1 ||
    normalized.length > 200 ||
    UNSAFE_CONTROL_CHARACTERS.test(normalized)
  )
    return null;
  return normalized;
}

export function parseLessonTopic(
  form: FormData,
): Parsed<LessonTopicInput> {
  const timetableParticipantId = form.get("timetableParticipantId");
  const academicCalendarDayId = form.get("academicCalendarDayId");
  const content = normalizeContent(form.get("content"));
  const fieldErrors: TeacherCtaState["fieldErrors"] = {};

  if (!validSchoolId(timetableParticipantId))
    fieldErrors.timetableParticipantId = "Program kaydı geçersiz.";
  if (!validSchoolId(academicCalendarDayId))
    fieldErrors.academicCalendarDayId = "Gün kaydı geçersiz.";
  if (!content)
    fieldErrors.content = "Ders konusu notu 1-5000 karakter olmalı.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(timetableParticipantId) ||
    !validSchoolId(academicCalendarDayId) ||
    !content
  )
    return invalid(fieldErrors);

  return {
    success: true,
    data: {
      timetableParticipantId,
      academicCalendarDayId,
      content,
    },
  };
}

export function parseHomework(form: FormData): Parsed<HomeworkInput> {
  const timetableParticipantId = form.get("timetableParticipantId");
  const academicCalendarDayId = form.get("academicCalendarDayId");
  const title = normalizeTitle(form.get("title"));
  const content = normalizeContent(form.get("content"));
  const fieldErrors: TeacherCtaState["fieldErrors"] = {};

  if (!validSchoolId(timetableParticipantId))
    fieldErrors.timetableParticipantId = "Program kaydı geçersiz.";
  if (!validSchoolId(academicCalendarDayId))
    fieldErrors.academicCalendarDayId = "Gün kaydı geçersiz.";
  if (!title) fieldErrors.title = "Ödev başlığı 1-200 karakter olmalı.";
  if (!content) fieldErrors.content = "Ödev notu 1-5000 karakter olmalı.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(timetableParticipantId) ||
    !validSchoolId(academicCalendarDayId) ||
    !title ||
    !content
  )
    return invalid(fieldErrors);

  return {
    success: true,
    data: {
      timetableParticipantId,
      academicCalendarDayId,
      title,
      content,
    },
  };
}
