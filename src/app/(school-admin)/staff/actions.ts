"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StaffState } from "@/lib/staff-validation";
import {
  manageContractTemplateClauseTransition,
  manageContractTemplateTransition,
  manageCreateEmployment,
  manageEmploymentTransition,
  manageSaveContractTemplate,
  manageSaveContractTemplateClause,
  manageSaveEmploymentCompensation,
  manageSaveEmploymentContract,
  manageSaveEmploymentLeave,
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

export async function saveEmploymentCompensationAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageSaveEmploymentCompensation(form);
  if (result.status === "success") {
    const employmentId = form.get("employmentId");
    revalidatePath("/staff");
    if (typeof employmentId === "string" && employmentId)
      revalidatePath(`/staff/${employmentId}`);
  }
  return result;
}

export async function saveEmploymentLeaveAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageSaveEmploymentLeave(form);
  if (result.status === "success") {
    const employmentId = form.get("employmentId");
    revalidatePath("/staff");
    if (typeof employmentId === "string" && employmentId)
      revalidatePath(`/staff/${employmentId}`);
  }
  return result;
}

function revalidateContractTemplateScreens() {
  revalidatePath("/staff");
  revalidatePath("/contracts/templates");
}

export async function saveContractTemplateAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageSaveContractTemplate(form);
  if (result.status === "success") revalidateContractTemplateScreens();
  return result;
}

export async function transitionContractTemplateAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageContractTemplateTransition(form);
  if (result.status === "success") revalidateContractTemplateScreens();
  return result;
}

export async function saveContractTemplateClauseAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageSaveContractTemplateClause(form);
  if (result.status === "success") revalidateContractTemplateScreens();
  return result;
}

export async function transitionContractTemplateClauseAction(
  _state: StaffState,
  form: FormData,
) {
  const result = await manageContractTemplateClauseTransition(form);
  if (result.status === "success") revalidateContractTemplateScreens();
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
