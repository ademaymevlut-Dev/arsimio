import { validSchoolId } from "./platform-school-validation";

const UNSAFE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export type TeacherCtaField =
  | "record"
  | "timetableParticipantId"
  | "academicCalendarDayId"
  | "studentProfileIds"
  | "category"
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

export const STUDENT_COMMENT_CATEGORY_POINTS = {
  GREEN_CARD: 3,
  POSITIVE: 1,
  INFORMATION: 0,
  NEGATIVE: -1,
  RED_CARD: -3,
} as const;

export type StudentCommentCategoryInput =
  keyof typeof STUDENT_COMMENT_CATEGORY_POINTS;

export type StudentCommentsInput = {
  timetableParticipantId: string;
  academicCalendarDayId: string;
  studentProfileIds: string[];
  category: StudentCommentCategoryInput;
  point: number;
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

function validCommentCategory(
  value: FormDataEntryValue | null,
): value is StudentCommentCategoryInput {
  return (
    typeof value === "string" &&
    value in STUDENT_COMMENT_CATEGORY_POINTS
  );
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

export function parseStudentComments(
  form: FormData,
): Parsed<StudentCommentsInput> {
  const timetableParticipantId = form.get("timetableParticipantId");
  const academicCalendarDayId = form.get("academicCalendarDayId");
  const rawStudentProfileIds = form.getAll("studentProfileIds");
  const category = form.get("category");
  const content = normalizeContent(form.get("content"));
  const studentProfileIds = [
    ...new Set(
      rawStudentProfileIds.filter(
        (value): value is string =>
          typeof value === "string" && validSchoolId(value),
      ),
    ),
  ];
  const fieldErrors: TeacherCtaState["fieldErrors"] = {};

  if (!validSchoolId(timetableParticipantId))
    fieldErrors.timetableParticipantId = "Program kaydı geçersiz.";
  if (!validSchoolId(academicCalendarDayId))
    fieldErrors.academicCalendarDayId = "Gün kaydı geçersiz.";
  if (studentProfileIds.length < 1)
    fieldErrors.studentProfileIds = "En az bir öğrenci seçin.";
  if (rawStudentProfileIds.length !== studentProfileIds.length)
    fieldErrors.studentProfileIds = "Öğrenci seçimi geçersiz.";
  if (studentProfileIds.length > 80)
    fieldErrors.studentProfileIds = "Bir işlemde en fazla 80 öğrenci seçilebilir.";
  if (!validCommentCategory(category))
    fieldErrors.category = "Yorum kategorisi seçin.";
  if (!content) fieldErrors.content = "Yorum notu 1-5000 karakter olmalı.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(timetableParticipantId) ||
    !validSchoolId(academicCalendarDayId) ||
    studentProfileIds.length < 1 ||
    studentProfileIds.length > 80 ||
    !validCommentCategory(category) ||
    !content
  )
    return invalid(fieldErrors);

  return {
    success: true,
    data: {
      timetableParticipantId,
      academicCalendarDayId,
      studentProfileIds,
      category,
      point: STUDENT_COMMENT_CATEGORY_POINTS[category],
      content,
    },
  };
}
