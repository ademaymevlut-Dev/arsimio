import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import {
  parseArchiveGuardian,
  parseUpdateGuardian,
  type GuardianMessages,
  type GuardianState,
} from "@/lib/guardian-validation";
import { getPrisma } from "@/lib/db";
import { isSameOrigin } from "@/server/auth/identifiers";
import { requireSchoolPermission } from "@/server/authorization/guards";
import {
  persistGuardianArchive,
  persistGuardianDetails,
} from "./guardian-service";

async function actorContext() {
  const { user, tenant, membership } =
    await requireSchoolPermission("guardians.manage");
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  ) {
    return null;
  }
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
      messages: dictionary.guardians,
    },
  };
}

async function invalid(): Promise<GuardianState> {
  const dictionary = await getDictionary("tr");
  return { status: "error", message: dictionary.guardians.invalid };
}

function databaseError(
  errorValue: unknown,
  messages: GuardianMessages,
): GuardianState {
  if (!errorValue || typeof errorValue !== "object" || !("code" in errorValue))
    return { status: "error", message: messages.failed };
  const code = String(errorValue.code);
  if (code === "P2034")
    return { status: "error", message: messages.conflict };
  if (["P2002", "P2003", "P2004", "P2010"].includes(code))
    return { status: "error", message: messages.invalid };
  return { status: "error", message: messages.failed };
}

async function run<T>(
  parser: (
    form: FormData,
    messages: GuardianMessages,
  ) =>
    | { success: true; data: T }
    | { success: false; state: GuardianState },
  persist: (
    tx: Prisma.TransactionClient,
    actor: NonNullable<Awaited<ReturnType<typeof actorContext>>>["actor"],
    data: T,
  ) => Promise<GuardianState>,
  form: FormData,
) {
  const context = await actorContext();
  if (!context) return invalid();
  const parsed = parser(form, context.actor.messages);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persist(tx, context.actor, parsed.data),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
  } catch (errorValue) {
    console.error("GUARDIAN_RECORD_SAVE_UNAVAILABLE");
    return databaseError(errorValue, context.actor.messages);
  }
}

export function manageUpdateGuardian(form: FormData) {
  return run(parseUpdateGuardian, persistGuardianDetails, form);
}

export function manageArchiveGuardian(form: FormData) {
  return run(parseArchiveGuardian, persistGuardianArchive, form);
}
