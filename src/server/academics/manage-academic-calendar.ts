import "server-only";
import { headers } from "next/headers";
import { getPrisma } from "@/lib/db";
import {
  parseAcademicTerm,
  parseAcademicTransition,
  parseAcademicYear,
  type AcademicCalendarState,
} from "@/lib/academic-calendar-validation";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { isSameOrigin } from "@/server/auth/identifiers";
import {
  academicCalendarConflict,
  persistAcademicTerm,
  persistAcademicYear,
  transitionAcademicTerm,
  transitionAcademicYear,
} from "./academic-calendar-service";
import { normalizeLocale } from "@/i18n/config";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import type { AcademicServerMessages } from "@/lib/academic-calendar-validation";

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
    messages: dictionary.academicServer,
  };
}

function invalid(messages: AcademicServerMessages): AcademicCalendarState {
  return { status: "error", message: messages.invalid };
}

function databaseError(
  error: unknown,
  messages: AcademicServerMessages,
): AcademicCalendarState {
  if (!error || typeof error !== "object" || !("code" in error))
    return {
      status: "error",
      message: messages.failed,
    };
  const code = String(error.code);
  if (code === "P2034") return academicCalendarConflict(messages);
  if (code === "P2002")
    return {
      status: "error",
      message: messages.duplicate,
    };
  if (["P2003", "P2004", "P2010"].includes(code))
    return {
      status: "error",
      message: messages.ruleViolation,
    };
  return {
    status: "error",
    message: messages.failed,
  };
}

export async function manageAcademicYear(
  form: FormData,
): Promise<AcademicCalendarState> {
  const actor = await actorContext();
  if (!actor) {
    const { academicServer } = await getDictionary("tr");
    return invalid(academicServer);
  }
  const parsed = parseAcademicYear(form, actor.messages);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persistAcademicYear(tx, actor, parsed.data),
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    console.error("ACADEMIC_YEAR_SAVE_UNAVAILABLE");
    return databaseError(error, actor.messages);
  }
}

export async function manageAcademicTerm(
  form: FormData,
): Promise<AcademicCalendarState> {
  const actor = await actorContext();
  if (!actor) {
    const { academicServer } = await getDictionary("tr");
    return invalid(academicServer);
  }
  const parsed = parseAcademicTerm(form, actor.messages);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persistAcademicTerm(tx, actor, parsed.data),
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    console.error("ACADEMIC_TERM_SAVE_UNAVAILABLE");
    return databaseError(error, actor.messages);
  }
}

export async function manageAcademicTransition(
  form: FormData,
): Promise<AcademicCalendarState> {
  const actor = await actorContext();
  if (!actor) {
    const { academicServer } = await getDictionary("tr");
    return invalid(academicServer);
  }
  const parsed = parseAcademicTransition(form);
  if (!parsed) return invalid(actor.messages);
  try {
    return await getPrisma().$transaction(
      (tx) =>
        parsed.entity === "year"
          ? transitionAcademicYear(tx, actor, parsed)
          : transitionAcademicTerm(tx, actor, parsed),
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    console.error("ACADEMIC_CALENDAR_TRANSITION_UNAVAILABLE");
    return databaseError(error, actor.messages);
  }
}
