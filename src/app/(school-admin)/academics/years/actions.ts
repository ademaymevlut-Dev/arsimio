"use server";

import { revalidatePath } from "next/cache";
import type { AcademicCalendarState } from "@/lib/academic-calendar-validation";
import {
  manageAcademicCalendarSync,
  manageAcademicTerm,
  manageAcademicTransition,
  manageAcademicYear,
} from "@/server/academics/manage-academic-calendar";

function refreshCalendar(result: AcademicCalendarState) {
  if (result.status === "success") {
    revalidatePath("/academics/years");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function saveAcademicYear(
  _state: AcademicCalendarState,
  form: FormData,
) {
  return refreshCalendar(await manageAcademicYear(form));
}

export async function saveAcademicTerm(
  _state: AcademicCalendarState,
  form: FormData,
) {
  return refreshCalendar(await manageAcademicTerm(form));
}

export async function changeAcademicCalendarStatus(
  _state: AcademicCalendarState,
  form: FormData,
) {
  return refreshCalendar(await manageAcademicTransition(form));
}

export async function syncAcademicCalendar(
  _state: AcademicCalendarState,
  form: FormData,
) {
  return refreshCalendar(await manageAcademicCalendarSync(form));
}
