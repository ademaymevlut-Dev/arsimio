"use server";

import { revalidatePath } from "next/cache";
import type { GuardianState } from "@/lib/guardian-validation";
import {
  manageArchiveGuardian,
  manageUpdateGuardian,
} from "@/server/guardians/manage-guardians";

export async function updateGuardian(
  _state: GuardianState,
  form: FormData,
) {
  const result = await manageUpdateGuardian(form);
  const personId = form.get("personId");
  if (result.status === "success" && typeof personId === "string") {
    revalidatePath("/guardians");
    revalidatePath(`/guardians/${personId}`);
    revalidatePath("/students");
  }
  return result;
}

export async function archiveGuardian(
  _state: GuardianState,
  form: FormData,
) {
  const result = await manageArchiveGuardian(form);
  if (result.status === "success") {
    revalidatePath("/guardians");
    revalidatePath("/students");
  }
  return result;
}
