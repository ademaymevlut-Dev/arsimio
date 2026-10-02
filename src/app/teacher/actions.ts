"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import {
  parseHomework,
  parseLessonTopic,
  parseStudentComments,
  type TeacherCtaState,
} from "@/lib/teacher-cta-validation";
import { requirePortalAccount } from "@/server/accounts/portal-guards";
import { isSameOrigin } from "@/server/auth/identifiers";
import {
  persistHomework,
  persistLessonTopic,
  persistStudentComments,
} from "@/server/teacher-portal/teacher-cta-service";

function invalid(): TeacherCtaState {
  return { status: "error", message: "İstek doğrulanamadı." };
}

function databaseError(errorValue: unknown): TeacherCtaState {
  if (!errorValue || typeof errorValue !== "object" || !("code" in errorValue))
    return { status: "error", message: "İşlem tamamlanamadı." };
  const code = String(errorValue.code);
  if (code === "P2034")
    return {
      status: "error",
      message: "Aynı kayıt aynı anda değişti. Tekrar deneyin.",
    };
  if (code === "P2002")
    return {
      status: "error",
      message: "Bu ders için kayıt zaten mevcut. Sayfayı yenileyin.",
    };
  if (["P2003", "P2004", "P2010"].includes(code))
    return { status: "error", message: "Seçilen kayıt okul kapsamında değil." };
  return { status: "error", message: "İşlem tamamlanamadı." };
}

export async function saveLessonTopicAction(
  _state: TeacherCtaState,
  form: FormData,
): Promise<TeacherCtaState> {
  const { user, tenant, account } = await requirePortalAccount("TEACHER");
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  )
    return invalid();

  const parsed = parseLessonTopic(form);
  if (!parsed.success) return parsed.state;

  try {
    const result = await getPrisma().$transaction(
      (tx: Prisma.TransactionClient) =>
        persistLessonTopic(
          tx,
          {
            schoolId: tenant.school.id,
            actorUserId: user.id,
            personId: account.personId,
          },
          parsed.data,
        ),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
    if (result.status === "success") revalidatePath("/teacher");
    return result;
  } catch (errorValue) {
    console.error("TEACHER_LESSON_TOPIC_SAVE_UNAVAILABLE");
    return databaseError(errorValue);
  }
}

export async function saveHomeworkAction(
  _state: TeacherCtaState,
  form: FormData,
): Promise<TeacherCtaState> {
  const { user, tenant, account } = await requirePortalAccount("TEACHER");
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  )
    return invalid();

  const parsed = parseHomework(form);
  if (!parsed.success) return parsed.state;

  try {
    const result = await getPrisma().$transaction(
      (tx: Prisma.TransactionClient) =>
        persistHomework(
          tx,
          {
            schoolId: tenant.school.id,
            actorUserId: user.id,
            personId: account.personId,
          },
          parsed.data,
        ),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
    if (result.status === "success") revalidatePath("/teacher");
    return result;
  } catch (errorValue) {
    console.error("TEACHER_HOMEWORK_SAVE_UNAVAILABLE");
    return databaseError(errorValue);
  }
}

export async function saveStudentCommentsAction(
  _state: TeacherCtaState,
  form: FormData,
): Promise<TeacherCtaState> {
  const { user, tenant, account } = await requirePortalAccount("TEACHER");
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  )
    return invalid();

  const parsed = parseStudentComments(form);
  if (!parsed.success) return parsed.state;

  try {
    const result = await getPrisma().$transaction(
      (tx: Prisma.TransactionClient) =>
        persistStudentComments(
          tx,
          {
            schoolId: tenant.school.id,
            actorUserId: user.id,
            personId: account.personId,
          },
          parsed.data,
        ),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
    if (result.status === "success") revalidatePath("/teacher");
    return result;
  } catch (errorValue) {
    console.error("TEACHER_STUDENT_COMMENTS_SAVE_UNAVAILABLE");
    return databaseError(errorValue);
  }
}
