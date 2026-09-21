"use server";

import { revalidatePath } from "next/cache";
import { updateSchoolSettings } from "@/server/platform/update-school";
import type { SettingsState } from "@/lib/platform-school-validation";
import { createInitialSchoolAdmin as createInitialSchoolAdminRecord } from "@/server/platform/create-initial-school-admin";
import type { InitialSchoolAdminState } from "@/lib/initial-school-admin-validation";

async function save(kind: "profile" | "branding", form: FormData) {
  const result = await updateSchoolSettings(kind, form);
  if (result.status === "success") {
    revalidatePath("/platform", "layout");
    revalidatePath("/login");
  }
  return result;
}

export async function saveSchoolProfile(
  _state: SettingsState,
  form: FormData,
): Promise<SettingsState> {
  return save("profile", form);
}

export async function saveSchoolBranding(
  _state: SettingsState,
  form: FormData,
): Promise<SettingsState> {
  return save("branding", form);
}

export async function createInitialSchoolAdmin(
  _state: InitialSchoolAdminState,
  form: FormData,
): Promise<InitialSchoolAdminState> {
  const result = await createInitialSchoolAdminRecord(form);
  if (result.status === "success") revalidatePath("/platform", "layout");
  return result;
}
