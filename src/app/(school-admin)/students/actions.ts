"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StudentState } from "@/lib/student-validation";
import {
  manageAddGuardian,
  manageCreateStudent,
  manageSetPrimaryGuardian,
  manageStudentTransition,
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
