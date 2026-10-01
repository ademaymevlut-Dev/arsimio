import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import {
  parseCourseTeacherAssignment,
  parseHomeroomTeacherAssignment,
  parseTimetableParticipantTransition,
  parseTeachingAssignmentTransition,
  parseWeeklySchedulePlacement,
  type TeachingState,
} from "@/lib/teaching-validation";
import { isSameOrigin } from "@/server/auth/identifiers";
import { requireSchoolPermission } from "@/server/authorization/guards";
import {
  persistCourseTeacherAssignment,
  persistHomeroomTeacherAssignment,
  persistTimetableParticipantTransition,
  persistTeachingAssignmentTransition,
  persistWeeklySchedulePlacement,
  type TeachingActor,
} from "./teaching-service";

async function actorContext(permission: string) {
  const { user, tenant, membership } = await requireSchoolPermission(permission);
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  )
    return null;
  return {
    actor: {
      schoolId: tenant.school.id,
      actorUserId: user.id,
      actorMembershipId: membership.id,
    } satisfies TeachingActor,
  };
}

function invalid(): TeachingState {
  return { status: "error", message: "Istek dogrulanamadi." };
}

function databaseError(errorValue: unknown): TeachingState {
  if (!errorValue || typeof errorValue !== "object" || !("code" in errorValue))
    return { status: "error", message: "Islem tamamlanamadi." };
  const code = String(errorValue.code);
  if (code === "P2034")
    return {
      status: "error",
      message: "Ayni kayit ayni anda degisti. Tekrar deneyin.",
    };
  if (code === "P2002")
    return { status: "error", message: "Bu atama zaten mevcut." };
  if (["P2003", "P2004", "P2010"].includes(code))
    return { status: "error", message: "Secilen kayit okul kapsaminda degil." };
  return { status: "error", message: "Islem tamamlanamadi." };
}

async function run<T>(
  permission: string,
  parser: (
    form: FormData,
  ) => { success: true; data: T } | { success: false; state: TeachingState },
  persist: (
    tx: Prisma.TransactionClient,
    actor: TeachingActor,
    data: T,
  ) => Promise<TeachingState>,
  form: FormData,
): Promise<TeachingState> {
  const context = await actorContext(permission);
  if (!context) return invalid();
  const parsed = parser(form);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persist(tx, context.actor, parsed.data),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
  } catch (errorValue) {
    console.error("TEACHING_ASSIGNMENT_SAVE_UNAVAILABLE");
    return databaseError(errorValue);
  }
}

export function manageHomeroomTeacherAssignment(form: FormData) {
  return run(
    "teaching.assignments.manage",
    parseHomeroomTeacherAssignment,
    persistHomeroomTeacherAssignment,
    form,
  );
}

export function manageCourseTeacherAssignment(form: FormData) {
  return run(
    "teaching.assignments.manage",
    parseCourseTeacherAssignment,
    persistCourseTeacherAssignment,
    form,
  );
}

export function manageTeachingAssignmentTransition(form: FormData) {
  return run(
    "teaching.assignments.manage",
    parseTeachingAssignmentTransition,
    persistTeachingAssignmentTransition,
    form,
  );
}

export function manageWeeklySchedulePlacement(form: FormData) {
  return run(
    "teaching.schedule.manage",
    parseWeeklySchedulePlacement,
    persistWeeklySchedulePlacement,
    form,
  );
}

export function manageTimetableParticipantTransition(form: FormData) {
  return run(
    "teaching.schedule.manage",
    parseTimetableParticipantTransition,
    persistTimetableParticipantTransition,
    form,
  );
}
