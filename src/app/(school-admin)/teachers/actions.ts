"use server";

import { revalidatePath } from "next/cache";
import type { TeachingState } from "@/lib/teaching-validation";
import {
  manageCourseTeacherAssignment,
  manageHomeroomTeacherAssignment,
  manageTeachingAssignmentTransition,
} from "@/server/teaching/manage-teaching";

function revalidateTeacherScreens(form: FormData) {
  const teacherProfileId = form.get("teacherProfileId");
  const detailTeacherProfileId = form.get("detailTeacherProfileId");
  revalidatePath("/teachers");
  const current =
    typeof teacherProfileId === "string" && teacherProfileId
      ? teacherProfileId
      : typeof detailTeacherProfileId === "string" && detailTeacherProfileId
        ? detailTeacherProfileId
        : null;
  if (current) revalidatePath(`/teachers/${current}`);
}

export async function saveHomeroomTeacherAssignmentAction(
  _state: TeachingState,
  form: FormData,
) {
  const result = await manageHomeroomTeacherAssignment(form);
  if (result.status === "success") revalidateTeacherScreens(form);
  return result;
}

export async function saveCourseTeacherAssignmentAction(
  _state: TeachingState,
  form: FormData,
) {
  const result = await manageCourseTeacherAssignment(form);
  if (result.status === "success") revalidateTeacherScreens(form);
  return result;
}

export async function passivateTeachingAssignmentAction(
  _state: TeachingState,
  form: FormData,
) {
  const result = await manageTeachingAssignmentTransition(form);
  if (result.status === "success") revalidateTeacherScreens(form);
  return result;
}
