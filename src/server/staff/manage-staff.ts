import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import {
  parseCreateEmployment,
  parseEmploymentTransition,
  parseStaffCatalogItem,
  parseStaffCatalogTransition,
  parseTeacherProfile,
  type StaffState,
} from "@/lib/staff-validation";
import { isSameOrigin } from "@/server/auth/identifiers";
import { requireSchoolPermission } from "@/server/authorization/guards";
import {
  persistEmployment,
  persistEmploymentTransition,
  persistStaffCatalogItem,
  persistStaffCatalogTransition,
  persistTeacherProfile,
  type StaffActor,
} from "./staff-service";

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
  )
    return null;
  return {
    actor: {
      schoolId: tenant.school.id,
      actorUserId: user.id,
      actorMembershipId: membership.id,
    } satisfies StaffActor,
    permissions,
  };
}

function invalid(): StaffState {
  return { status: "error", message: "Istek dogrulanamadi." };
}

function databaseError(errorValue: unknown): StaffState {
  if (!errorValue || typeof errorValue !== "object" || !("code" in errorValue))
    return { status: "error", message: "Islem tamamlanamadi." };
  const code = String(errorValue.code);
  if (code === "P2034")
    return {
      status: "error",
      message: "Ayni kayit ayni anda degisti. Tekrar deneyin.",
    };
  if (code === "P2002")
    return { status: "error", message: "Ayni kayit zaten var." };
  if (["P2003", "P2004", "P2010"].includes(code))
    return { status: "error", message: "Secilen kayit okul kapsaminda degil." };
  return { status: "error", message: "Islem tamamlanamadi." };
}

async function run<T>(
  permission: string,
  parser: (
    form: FormData,
  ) => { success: true; data: T } | { success: false; state: StaffState },
  persist: (
    tx: Prisma.TransactionClient,
    actor: StaffActor,
    data: T,
  ) => Promise<StaffState>,
  form: FormData,
  additionalPermission?: string,
): Promise<StaffState> {
  const context = await actorContext(permission);
  if (!context) return invalid();
  if (
    additionalPermission &&
    !context.permissions.includes(additionalPermission)
  )
    return { status: "error", message: "Bu islem icin yetkiniz yok." };
  const parsed = parser(form);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persist(tx, context.actor, parsed.data),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
  } catch (errorValue) {
    console.error("STAFF_RECORD_SAVE_UNAVAILABLE");
    return databaseError(errorValue);
  }
}

export function manageCreateEmployment(form: FormData) {
  return run("hr.staff.manage", parseCreateEmployment, persistEmployment, form);
}

export function manageEmploymentTransition(form: FormData) {
  return run(
    "hr.staff.manage",
    parseEmploymentTransition,
    persistEmploymentTransition,
    form,
  );
}

export function manageTeacherProfile(form: FormData) {
  return run(
    "teachers.manage",
    parseTeacherProfile,
    persistTeacherProfile,
    form,
    "hr.staff.read",
  );
}

export function manageSaveStaffCatalogItem(form: FormData) {
  return run(
    "hr.catalog.manage",
    parseStaffCatalogItem,
    persistStaffCatalogItem,
    form,
  );
}

export function manageStaffCatalogTransition(form: FormData) {
  return run(
    "hr.catalog.manage",
    parseStaffCatalogTransition,
    persistStaffCatalogTransition,
    form,
  );
}
