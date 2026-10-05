"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StaffState } from "@/lib/staff-validation";
import {
  manageCreateEmployment,
  manageEmploymentTransition,
  manageSaveEmploymentContract,
  manageSaveStaffCatalogItem,
  manageStaffCatalogTransition,
  manageTeacherProfile,
  manageUpdateStaffHrProfile,
  manageUploadStaffPhoto,
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

export async function saveEmploymentContractAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageSaveEmploymentContract(form);
  if (result.status === "success") {
    const employmentId = form.get("employmentId");
    revalidatePath("/staff");
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

export async function uploadStaffPhotoAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageUploadStaffPhoto(form);
  if (result.status === "success") {
    const employmentId = form.get("employmentId");
    revalidatePath("/staff");
    revalidatePath("/teachers");
    if (typeof employmentId === "string" && employmentId)
      revalidatePath(`/staff/${employmentId}`);
  }
  return result;
}

export async function saveStaffHrProfileAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageUpdateStaffHrProfile(form);
  if (result.status === "success") {
    const employmentId = form.get("employmentId");
    revalidatePath("/staff");
    if (typeof employmentId === "string" && employmentId)
      revalidatePath(`/staff/${employmentId}`);
  }
  return result;
}

function revalidateStaffCatalogScreens() {
  revalidatePath("/staff");
  revalidatePath("/staff/new");
  revalidatePath("/staff/settings");
}

export async function saveStaffCatalogItemAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageSaveStaffCatalogItem(form);
  if (result.status === "success") revalidateStaffCatalogScreens();
  return result;
}

export async function transitionStaffCatalogItemAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageStaffCatalogTransition(form);
  if (result.status === "success") revalidateStaffCatalogScreens();
  return result;
}
