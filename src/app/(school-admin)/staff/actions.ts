"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StaffState } from "@/lib/staff-validation";
import {
  manageCreateEmployment,
  manageEmploymentTransition,
  manageTeacherProfile,
} from "@/server/staff/manage-staff";

export async function createEmploymentAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageCreateEmployment(form);
  if (result.status === "success" && result.entityId) {
    revalidatePath("/staff");
    redirect(`/staff/${result.entityId}`);
  }
  return result;
}

export async function transitionEmploymentAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageEmploymentTransition(form);
  if (result.status === "success") {
    const employmentId = form.get("employmentId");
    revalidatePath("/staff");
    revalidatePath("/teachers");
    if (typeof employmentId === "string" && employmentId)
      revalidatePath(`/staff/${employmentId}`);
  }
  return result;
}

export async function saveTeacherProfileAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageTeacherProfile(form);
  if (result.status === "success") {
    const employmentId = form.get("employmentId");
    revalidatePath("/staff");
    revalidatePath("/teachers");
    if (typeof employmentId === "string" && employmentId)
      revalidatePath(`/staff/${employmentId}`);
  }
  return result;
}
