import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import type { AccountState } from "@/lib/account-validation";
import {
  parseAccountById,
  parseCreatePersonAccount,
} from "@/lib/account-validation";
import { getPrisma } from "@/lib/db";
import { isSameOrigin } from "@/server/auth/identifiers";
import { requireSchoolPermission } from "@/server/authorization/guards";
import {
  createPersonAccount,
  linkExistingSchoolAdminAccounts,
  resetPersonAccountPassword,
  suspendPersonAccount,
  type AccountServiceResult,
} from "./accounts-service";

async function actionContext(permission: string) {
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
  await getSchoolLocale(membership.preferredLocale, tenant.school.defaultLocale);
  return {
    schoolId: tenant.school.id,
    actorUserId: user.id,
    actorMembershipId: membership.id,
    defaultLocale: tenant.school.defaultLocale,
  };
}

async function invalid(): Promise<AccountState> {
  await getDictionary("tr");
  return { status: "error", message: "Istek dogrulanamadi." };
}

function toState(result: AccountServiceResult): AccountState {
  return result.status === "success"
    ? {
        status: "success",
        message: result.message,
        temporaryPassword: result.temporaryPassword,
      }
    : {
        status: "error",
        message: result.message,
        fieldErrors: result.fieldErrors,
      };
}

function databaseError(errorValue: unknown): AccountState {
  if (!errorValue || typeof errorValue !== "object" || !("code" in errorValue))
    return { status: "error", message: "Islem tamamlanamadi." };
  const code = String(errorValue.code);
  if (code === "P2002")
    return { status: "error", message: "Ayni hesap veya kullanici adi zaten var." };
  if (["P2003", "P2004", "P2010"].includes(code))
    return { status: "error", message: "Secilen kayit okul kapsaminda degil." };
  return { status: "error", message: "Islem tamamlanamadi." };
}

async function run(
  persist: (
    tx: Prisma.TransactionClient,
    context: NonNullable<Awaited<ReturnType<typeof actionContext>>>,
    form: FormData,
  ) => Promise<AccountServiceResult>,
  form: FormData,
): Promise<AccountState> {
  const context = await actionContext("accounts.manage");
  if (!context) return invalid();
  try {
    const result = await getPrisma().$transaction(
      (tx) => persist(tx, context, form),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
    return toState(result);
  } catch (errorValue) {
    console.error("ACCOUNT_SAVE_UNAVAILABLE");
    return databaseError(errorValue);
  }
}

export function manageCreatePersonAccount(form: FormData) {
  return run(async (tx, context, currentForm) => {
    const parsed = parseCreatePersonAccount(currentForm);
    if (!parsed.success) return { status: "error", message: parsed.state.message ?? "Gecersiz form.", fieldErrors: parsed.state.fieldErrors };
    return createPersonAccount(tx, {
      ...context,
      personId: parsed.data.personId,
      studentProfileId: parsed.data.studentProfileId,
      portal: parsed.data.portal,
      username: parsed.data.username,
    });
  }, form);
}

export function manageResetPersonAccountPassword(form: FormData) {
  return run(async (tx, context, currentForm) => {
    const parsed = parseAccountById(currentForm);
    if (!parsed.success)
      return { status: "error", message: parsed.state.message ?? "Gecersiz hesap." };
    return resetPersonAccountPassword(tx, {
      ...context,
      personAccountId: parsed.data.personAccountId,
    });
  }, form);
}

export function manageSuspendPersonAccount(form: FormData) {
  return run(async (tx, context, currentForm) => {
    const parsed = parseAccountById(currentForm);
    if (!parsed.success)
      return { status: "error", message: parsed.state.message ?? "Gecersiz hesap." };
    return suspendPersonAccount(tx, {
      ...context,
      personAccountId: parsed.data.personAccountId,
    });
  }, form);
}

export function manageLinkExistingSchoolAdmins(form: FormData) {
  return run(async (tx, context) => {
    return linkExistingSchoolAdminAccounts(tx, context);
  }, form);
}
