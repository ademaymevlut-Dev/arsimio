"use server";

import { revalidatePath } from "next/cache";
import type { TeachingState } from "@/lib/teaching-validation";
import {
  manageTimetableParticipantTransition,
  manageWeeklySchedulePlacement,
} from "@/server/teaching/manage-teaching";

function revalidateTimetableScreens(form: FormData) {
  revalidatePath("/academics/timetable");
  revalidatePath("/teachers");
  const teacherProfileId = form.get("teacherProfileId");
  const detailTeacherProfileId = form.get("detailTeacherProfileId");
  const current =
    typeof teacherProfileId === "string" && teacherProfileId
      ? teacherProfileId
      : typeof detailTeacherProfileId === "string" && detailTeacherProfileId
        ? detailTeacherProfileId
        : null;
  if (current) revalidatePath(`/teachers/${current}`);
}

export async function saveClassWeeklySchedulePlacementAction(
  _state: TeachingState,
  form: FormData,
) {
  const result = await manageWeeklySchedulePlacement(form);
  if (result.status === "success") revalidateTimetableScreens(form);
  return result;
}

export async function passivateClassTimetableParticipantAction(
  _state: TeachingState,
  form: FormData,
) {
  const result = await manageTimetableParticipantTransition(form);
  if (result.status === "success") revalidateTimetableScreens(form);
  return result;
}
