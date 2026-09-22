import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeLocale } from "@/i18n/config";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { getPrisma } from "@/lib/db";
import {
  parseAcademicStructureTransition,
  parseClassSection,
  parseCourseOffering,
  parseEducationStage,
  parseGradeLevel,
  parseLessonPeriod,
  parseSubject,
  type AcademicStructureServerMessages,
  type AcademicStructureState,
} from "@/lib/academic-structure-validation";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { isSameOrigin } from "@/server/auth/identifiers";
import {
  persistClassSection,
  persistCourseOffering,
  persistEducationStage,
  persistGradeLevel,
  persistLessonPeriod,
  persistSubject,
  transitionAcademicStructure,
  type AcademicStructureActor,
} from "./academic-structure-service";

async function actorContext() {
  const { user, tenant, membership } =
    await requireSchoolPermission("academics.manage");
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  )
    return null;
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const dictionary = await getDictionary(locale);
  return {
    schoolId: tenant.school.id,
    actorUserId: user.id,
    actorMembershipId: membership.id,
    locale,
    defaultLocale: normalizeLocale(tenant.school.defaultLocale),
    messages: dictionary.academicStructureServer,
  };
}

async function invalid(): Promise<AcademicStructureState> {
  const dictionary = await getDictionary("tr");
  return { status: "error", message: dictionary.academicStructureServer.saveInvalid };
}

function databaseError(
  errorValue: unknown,
  messages: AcademicStructureServerMessages,
): AcademicStructureState {
  if (!errorValue || typeof errorValue !== "object" || !("code" in errorValue))
    return { status: "error", message: messages.failed };
  const code = String(errorValue.code);
  if (code === "P2034") return { status: "error", message: messages.conflict };
  if (code === "P2002") return { status: "error", message: messages.duplicate };
  if (["P2003", "P2004", "P2010"].includes(code))
    return { status: "error", message: messages.ruleViolation };
  return { status: "error", message: messages.failed };
}

async function run<T>(
  parser: (form: FormData, messages: AcademicStructureServerMessages) =>
    | { success: true; data: T }
    | { success: false; state: AcademicStructureState },
  persist: (
    tx: Prisma.TransactionClient,
    actor: AcademicStructureActor,
    data: T,
  ) => Promise<AcademicStructureState>,
  form: FormData,
) {
  const actor = await actorContext();
  if (!actor) return invalid();
  const parsed = parser(form, actor.messages);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persist(tx, actor, parsed.data),
      { isolationLevel: "Serializable" },
    );
  } catch (errorValue) {
    console.error("ACADEMIC_STRUCTURE_SAVE_UNAVAILABLE");
    return databaseError(errorValue, actor.messages);
  }
}

export async function manageEducationStage(form: FormData) {
  return run(parseEducationStage, persistEducationStage, form);
}

export async function manageGradeLevel(form: FormData) {
  return run(parseGradeLevel, persistGradeLevel, form);
}

export async function manageClassSection(form: FormData) {
  return run(parseClassSection, persistClassSection, form);
}

export async function manageSubject(form: FormData) {
  return run(parseSubject, persistSubject, form);
}

export async function manageCourseOffering(form: FormData) {
  return run(parseCourseOffering, persistCourseOffering, form);
}

export async function manageLessonPeriod(form: FormData) {
  return run(parseLessonPeriod, persistLessonPeriod, form);
}

export async function manageAcademicStructureTransition(form: FormData) {
  const actor = await actorContext();
  if (!actor) return invalid();
  const parsed = parseAcademicStructureTransition(form);
  if (!parsed)
    return { status: "error" as const, message: actor.messages.saveInvalid };
  try {
    return await getPrisma().$transaction(
      (tx) => transitionAcademicStructure(tx, actor, parsed),
      { isolationLevel: "Serializable" },
    );
  } catch (errorValue) {
    console.error("ACADEMIC_STRUCTURE_TRANSITION_UNAVAILABLE");
    return databaseError(errorValue, actor.messages);
  }
}
