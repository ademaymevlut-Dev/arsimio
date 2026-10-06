import "server-only";
import { del } from "@vercel/blob";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { getPrisma } from "@/lib/db";
import {
  parseCreateEmployment,
  parseEmploymentTransition,
  parseSaveEmploymentCompensation,
  parseSaveEmploymentContract,
  parseSaveEmploymentLeave,
  parseStaffCatalogItem,
  parseStaffCatalogTransition,
  parseTeacherProfile,
  parseUpdateStaffHrProfile,
  parseUploadStaffPhoto,
  type StaffState,
} from "@/lib/staff-validation";
import { isSameOrigin } from "@/server/auth/identifiers";
import { requireSchoolPermission } from "@/server/authorization/guards";
import {
  persistEmployment,
  persistEmploymentCompensation,
  persistEmploymentContract,
  persistEmploymentLeave,
  persistEmploymentTransition,
  persistStaffPhotoMetadata,
  persistStaffHrProfile,
  persistStaffCatalogItem,
  persistStaffCatalogTransition,
  persistTeacherProfile,
  type StaffActor,
} from "./staff-service";
import {
  StaffPhotoStorageUnavailableError,
  storeStaffPhoto,
} from "./staff-photo-storage";

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
    } satisfies StaffActor,
    permissions,
    messages: dictionary.staff,
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

export async function manageSaveEmploymentContract(
  form: FormData,
): Promise<StaffState> {
  const context = await actorContext("hr.contracts.manage");
  if (!context) return invalid();
  const { actor, messages } = context;
  const parsed = parseSaveEmploymentContract(form, messages);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persistEmploymentContract(tx, actor, parsed.data, messages),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
  } catch (errorValue) {
    console.error("EMPLOYMENT_CONTRACT_SAVE_UNAVAILABLE");
    return databaseError(errorValue);
  }
}

export async function manageSaveEmploymentCompensation(
  form: FormData,
): Promise<StaffState> {
  const context = await actorContext("hr.compensation.manage");
  if (!context) return invalid();
  const { actor, messages } = context;
  const parsed = parseSaveEmploymentCompensation(form, messages);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persistEmploymentCompensation(tx, actor, parsed.data, messages),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
  } catch (errorValue) {
    console.error("EMPLOYMENT_COMPENSATION_SAVE_UNAVAILABLE");
    return databaseError(errorValue);
  }
}

export async function manageSaveEmploymentLeave(
  form: FormData,
): Promise<StaffState> {
  const context = await actorContext("hr.leave.manage");
  if (!context) return invalid();
  const { actor, messages } = context;
  const parsed = parseSaveEmploymentLeave(form, messages);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persistEmploymentLeave(tx, actor, parsed.data, messages),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
  } catch (errorValue) {
    console.error("EMPLOYMENT_LEAVE_SAVE_UNAVAILABLE");
    return databaseError(errorValue);
  }
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

export async function manageUploadStaffPhoto(form: FormData): Promise<StaffState> {
  const context = await actorContext("hr.staff.manage");
  if (!context) return invalid();
  const { actor, messages } = context;
  const parsed = parseUploadStaffPhoto(form, messages);
  if (!parsed.success) return parsed.state;
  try {
    const stored = await storeStaffPhoto(
      actor.schoolId,
      parsed.data.employmentId,
      parsed.data.photo,
    );
    const result = await getPrisma().$transaction(
      (tx) =>
        persistStaffPhotoMetadata(tx, actor, {
          employmentId: parsed.data.employmentId,
          url: stored.url,
          storageKey: stored.pathname,
          mimeType: stored.contentType,
        }),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
    if (result.status === "success" && result.previousStorageKey) {
      try {
        await del(result.previousStorageKey);
      } catch {
        console.error("STAFF_PHOTO_PREVIOUS_DELETE_FAILED");
      }
    }
    return result.status === "success"
      ? { ...result, message: messages.staffPhotoUpdated }
      : result;
  } catch (errorValue) {
    console.error("STAFF_PHOTO_SAVE_UNAVAILABLE");
    if (errorValue instanceof StaffPhotoStorageUnavailableError) {
      return {
        status: "error",
        message: messages.photoStorageUnavailable,
        fieldErrors: { photo: messages.photoStorageUnavailable },
      };
    }
    return databaseError(errorValue);
  }
}

export async function manageUpdateStaffHrProfile(
  form: FormData,
): Promise<StaffState> {
  const context = await actorContext("hr.staff.manage");
  if (!context) return invalid();
  const { actor, messages, permissions } = context;
  const parsed = parseUpdateStaffHrProfile(form, messages);
  if (!parsed.success) return parsed.state;
  if (
    parsed.data.identity &&
    !permissions.includes("persons.identity.manage")
  )
    return {
      status: "error",
      message: messages.permissionDenied,
      fieldErrors: { identityValue: messages.permissionDenied },
    };
  try {
    return await getPrisma().$transaction(
      (tx) => persistStaffHrProfile(tx, actor, parsed.data, messages),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
  } catch (errorValue) {
    console.error("STAFF_HR_PROFILE_SAVE_UNAVAILABLE");
    return databaseError(errorValue);
  }
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
