import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { getPrisma } from "@/lib/db";
import {
  parseAddGuardian,
  parseCreateStudent,
  parseSetPrimaryGuardian,
  parseStudentTransition,
  type StudentServerMessages,
  type StudentState,
} from "@/lib/student-validation";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { isSameOrigin } from "@/server/auth/identifiers";
import {
  persistGuardianRelationship,
  persistPrimaryGuardian,
  persistStudent,
  persistStudentTransition,
  type StudentActor,
} from "./student-service";

async function actorContext(permission: string) {
  const { user, tenant, membership, permissions } =
    await requireSchoolPermission(permission);
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  ) return null;
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const dictionary = await getDictionary(locale);
  return {
    actor: {
      schoolId: tenant.school.id,
      actorUserId: user.id,
      actorMembershipId: membership.id,
      messages: dictionary.studentServer,
    } satisfies StudentActor,
    permissions,
  };
}

async function invalid(): Promise<StudentState> {
  const dictionary = await getDictionary("tr");
  return { status: "error", message: dictionary.studentServer.invalid };
}

function databaseError(
  errorValue: unknown,
  messages: StudentServerMessages,
): StudentState {
  if (!errorValue || typeof errorValue !== "object" || !("code" in errorValue))
    return { status: "error", message: messages.failed };
  const code = String(errorValue.code);
  if (code === "P2034") return { status: "error", message: messages.conflict };
  if (code === "P2002") {
    const target = "meta" in errorValue ? JSON.stringify(errorValue.meta) : "";
    if (target.includes("lookup_hash"))
      return {
        status: "error",
        message: messages.identityDuplicate,
        fieldErrors: { identityValue: messages.identityDuplicate },
      };
    return { status: "error", message: messages.duplicate };
  }
  if (["P2003", "P2004", "P2010"].includes(code))
    return { status: "error", message: messages.invalidRelation };
  return { status: "error", message: messages.failed };
}

async function run<T>(
  permission: string,
  parser: (
    form: FormData,
    messages: StudentServerMessages,
  ) =>
    | { success: true; data: T }
    | { success: false; state: StudentState },
  persist: (
    tx: Prisma.TransactionClient,
    actor: StudentActor,
    data: T,
  ) => Promise<StudentState>,
  form: FormData,
  additionalPermission?: string,
): Promise<StudentState> {
  const context = await actorContext(permission);
  if (!context) return invalid();
  const { actor, permissions } = context;
  if (additionalPermission && !permissions.includes(additionalPermission))
    return { status: "error", message: actor.messages.unavailable };
  const parsed = parser(form, actor.messages);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persist(tx, actor, parsed.data),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
  } catch (errorValue) {
    console.error("STUDENT_RECORD_SAVE_UNAVAILABLE");
    return databaseError(errorValue, actor.messages);
  }
}

export function manageCreateStudent(form: FormData) {
  const identity = form.get("identityValue");
  return run(
    "students.manage",
    parseCreateStudent,
    persistStudent,
    form,
    typeof identity === "string" && identity.trim()
      ? "persons.identity.manage"
      : undefined,
  );
}

export function manageAddGuardian(form: FormData) {
  return run("guardians.manage", parseAddGuardian, persistGuardianRelationship, form);
}

export function manageSetPrimaryGuardian(form: FormData) {
  return run("guardians.manage", parseSetPrimaryGuardian, persistPrimaryGuardian, form);
}

export function manageStudentTransition(form: FormData) {
  return run("students.manage", parseStudentTransition, persistStudentTransition, form);
}
