"use server";

import { revalidatePath } from "next/cache";
import type { AccountState } from "@/lib/account-validation";
import {
  manageCreatePersonAccount,
  manageLinkExistingSchoolAdmins,
  manageResetPersonAccountPassword,
  manageSuspendPersonAccount,
} from "@/server/accounts/manage-accounts";

export async function createPersonAccountAction(
  _state: AccountState,
  form: FormData,
) {
  const result = await manageCreatePersonAccount(form);
  if (result.status === "success") {
    const studentId = form.get("studentProfileId");
    revalidatePath("/accounts");
    revalidatePath("/guardians");
    if (typeof studentId === "string" && studentId)
      revalidatePath(`/students/${studentId}`);
  }
  return result;
}

export async function resetPersonAccountPasswordAction(
  _state: AccountState,
  form: FormData,
) {
  const result = await manageResetPersonAccountPassword(form);
  if (result.status === "success") {
    revalidatePath("/accounts");
    revalidatePath("/guardians");
  }
  return result;
}

export async function suspendPersonAccountAction(
  _state: AccountState,
  form: FormData,
) {
  const result = await manageSuspendPersonAccount(form);
  if (result.status === "success") {
    revalidatePath("/accounts");
    revalidatePath("/guardians");
  }
  return result;
}

export async function linkExistingSchoolAdminsAction(
  _state: AccountState,
  form: FormData,
) {
  const result = await manageLinkExistingSchoolAdmins(form);
  if (result.status === "success") revalidatePath("/accounts");
  return result;
}
