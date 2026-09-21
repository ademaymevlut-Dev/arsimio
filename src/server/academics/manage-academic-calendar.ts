import "server-only";
import { headers } from "next/headers";
import { getPrisma } from "@/lib/db";
import {
  parseAcademicTerm,
  parseAcademicTransition,
  parseAcademicYear,
  type AcademicCalendarState,
} from "@/lib/academic-calendar-validation";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { isSameOrigin } from "@/server/auth/identifiers";
import {
  academicCalendarConflict,
  persistAcademicTerm,
  persistAcademicYear,
  transitionAcademicTerm,
  transitionAcademicYear,
} from "./academic-calendar-service";

const invalid: AcademicCalendarState = {
  status: "error",
  message: "Bilgiler doğrulanamadı. Alanları kontrol edip tekrar deneyin.",
};

async function actorContext() {
  const { user, tenant, membership } =
    await requireSchoolPermission("academics.manage");
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  )
    return null;
  return {
    schoolId: tenant.school.id,
    actorUserId: user.id,
    actorMembershipId: membership.id,
  };
}

function databaseError(error: unknown): AcademicCalendarState {
  if (!error || typeof error !== "object" || !("code" in error))
    return {
      status: "error",
      message: "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
    };
  const code = String(error.code);
  if (code === "P2034") return academicCalendarConflict;
  if (code === "P2002")
    return {
      status: "error",
      message:
        "Aynı ad veya sıra numarası bu kapsamda zaten kullanılıyor.",
    };
  if (["P2003", "P2004", "P2010"].includes(code))
    return {
      status: "error",
      message:
        "Tarih, durum veya okul ilişkisi iş kurallarına uymuyor. Sayfayı yenileyip bilgileri kontrol edin.",
    };
  return {
    status: "error",
    message: "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
  };
}

export async function manageAcademicYear(
  form: FormData,
): Promise<AcademicCalendarState> {
  const actor = await actorContext();
  if (!actor) return invalid;
  const parsed = parseAcademicYear(form);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persistAcademicYear(tx, actor, parsed.data),
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    console.error("ACADEMIC_YEAR_SAVE_UNAVAILABLE");
    return databaseError(error);
  }
}

export async function manageAcademicTerm(
  form: FormData,
): Promise<AcademicCalendarState> {
  const actor = await actorContext();
  if (!actor) return invalid;
  const parsed = parseAcademicTerm(form);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persistAcademicTerm(tx, actor, parsed.data),
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    console.error("ACADEMIC_TERM_SAVE_UNAVAILABLE");
    return databaseError(error);
  }
}

export async function manageAcademicTransition(
  form: FormData,
): Promise<AcademicCalendarState> {
  const actor = await actorContext();
  if (!actor) return invalid;
  const parsed = parseAcademicTransition(form);
  if (!parsed) return invalid;
  try {
    return await getPrisma().$transaction(
      (tx) =>
        parsed.entity === "year"
          ? transitionAcademicYear(tx, actor, parsed)
          : transitionAcademicTerm(tx, actor, parsed),
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    console.error("ACADEMIC_CALENDAR_TRANSITION_UNAVAILABLE");
    return databaseError(error);
  }
}
