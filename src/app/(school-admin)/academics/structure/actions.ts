"use server";

import { revalidatePath } from "next/cache";
import type { AcademicStructureState } from "@/lib/academic-structure-validation";
import {
  manageAcademicStructureTransition,
  manageClassSection,
  manageCourseOffering,
  manageEducationStage,
  manageGradeLevel,
  manageLessonPeriod,
  manageSubject,
} from "@/server/academics/manage-academic-structure";

function refresh(result: AcademicStructureState) {
  if (result.status === "success") {
    revalidatePath("/academics/structure");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function saveEducationStage(
  _state: AcademicStructureState,
  form: FormData,
) {
  return refresh(await manageEducationStage(form));
}

export async function saveGradeLevel(
  _state: AcademicStructureState,
  form: FormData,
) {
  return refresh(await manageGradeLevel(form));
}

export async function saveClassSection(
  _state: AcademicStructureState,
  form: FormData,
) {
  return refresh(await manageClassSection(form));
}

export async function saveSubject(
  _state: AcademicStructureState,
  form: FormData,
) {
  return refresh(await manageSubject(form));
}

export async function saveCourseOffering(
  _state: AcademicStructureState,
  form: FormData,
) {
  return refresh(await manageCourseOffering(form));
}

export async function saveLessonPeriod(
  _state: AcademicStructureState,
  form: FormData,
) {
  return refresh(await manageLessonPeriod(form));
}

export async function changeAcademicStructureStatus(
  _state: AcademicStructureState,
  form: FormData,
) {
  return refresh(await manageAcademicStructureTransition(form));
}
