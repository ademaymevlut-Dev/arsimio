"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StudentState } from "@/lib/student-validation";
import {
  manageAddPreviousEducation,
  manageArchivePreviousEducation,
  manageAddGuardian,
  manageCreateStudent,
  manageSetFinancialGuardian,
  manageSetPrimaryGuardian,
  manageStudentTransition,
  manageUpdateStudentDetails,
  manageUploadStudentPhoto,
} from "@/server/students/manage-students";

export async function createStudent(
  _state: StudentState,
  form: FormData,
) {
  const result = await manageCreateStudent(form);
  if (result.status !== "success" || !result.entityId) return result;
  revalidatePath("/students");
  revalidatePath("/dashboard");
  redirect(`/students/${result.entityId}`);
}

export async function addGuardian(
  _state: StudentState,
  form: FormData,
) {
  const result = await manageAddGuardian(form);
  const studentId = form.get("studentProfileId");
  if (result.status === "success" && typeof studentId === "string") {
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
  }
  return result;
}

export async function setPrimaryGuardian(
  _state: StudentState,
  form: FormData,
) {
  const result = await manageSetPrimaryGuardian(form);
  const studentId = form.get("studentProfileId");
  if (result.status === "success" && typeof studentId === "string") {
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
  }
  return result;
}

export async function setFinancialGuardian(
  _state: StudentState,
  form: FormData,
) {
  const result = await manageSetFinancialGuardian(form);
  const studentId = form.get("studentProfileId");
  if (result.status === "success" && typeof studentId === "string") {
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
  }
  return result;
}

export async function updateStudentDetails(
  _state: StudentState,
  form: FormData,
) {
  const result = await manageUpdateStudentDetails(form);
  const studentId = form.get("studentProfileId");
  if (result.status === "success" && typeof studentId === "string") {
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
  }
  return result;
}

export async function addPreviousEducation(
  _state: StudentState,
  form: FormData,
) {
  const result = await manageAddPreviousEducation(form);
  const studentId = form.get("studentProfileId");
  if (result.status === "success" && typeof studentId === "string") {
    revalidatePath(`/students/${studentId}`);
  }
  return result;
}

export async function archivePreviousEducation(
  _state: StudentState,
  form: FormData,
) {
  const result = await manageArchivePreviousEducation(form);
  const studentId = form.get("studentProfileId");
  if (result.status === "success" && typeof studentId === "string") {
    revalidatePath(`/students/${studentId}`);
  }
  return result;
}

export async function uploadStudentPhoto(
  _state: StudentState,
  form: FormData,
) {
  const result = await manageUploadStudentPhoto(form);
  const studentId = form.get("studentProfileId");
  if (result.status === "success" && typeof studentId === "string") {
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
  }
  return result;
}

export async function changeStudentStatus(
  _state: StudentState,
  form: FormData,
) {
  const result = await manageStudentTransition(form);
  const studentId = form.get("studentProfileId");
  if (result.status === "success" && typeof studentId === "string") {
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
    revalidatePath("/dashboard");
  }
  return result;
}
