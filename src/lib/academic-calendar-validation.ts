import { validRevision, validSchoolId } from "./platform-school-validation";
import { SUPPORTED_LOCALES, type LocalizedNames } from "@/i18n/config";
import { tr } from "@/i18n/dictionaries/tr";
import type { AppDictionary } from "@/i18n/dictionaries/types";

export type AcademicCalendarField =
  | "name"
  | "nameTr"
  | "nameSq"
  | "nameEn"
  | "startDate"
  | "endDate"
  | "sequence"
  | "record";

export type AcademicCalendarState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<AcademicCalendarField, string>>;
};

export type AcademicYearInput = {
  id: string | null;
  revision: string | null;
  name: string;
  startDate: Date;
  endDate: Date;
};

export type AcademicTermInput = {
  id: string | null;
  revision: string | null;
  academicYearId: string;
  names: LocalizedNames;
  sequence: number;
  startDate: Date;
  endDate: Date;
};

export type AcademicEntity = "year" | "term";
export type AcademicTransition = "activate" | "close" | "archive" | "restore";
export type AcademicServerMessages = AppDictionary["academicServer"];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function normalizedText(value: FormDataEntryValue | null, max: number) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value))
    return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 2 && normalized.length <= max ? normalized : null;
}

export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  )
    return null;
  return parsed;
}

export function dateOnlyValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function dateOnlyInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type === "year" || type === "month" || type === "day")
      .map(({ type, value: partValue }) => [type, Number(partValue)]),
  );
  return new Date(Date.UTC(values.year, values.month - 1, values.day));
}

function boundedDateRange(
  startDate: Date | null,
  endDate: Date | null,
  maxDays: number,
  allowSameDay: boolean,
) {
  if (!startDate || !endDate) return false;
  const duration = (endDate.getTime() - startDate.getTime()) / DAY_MS;
  return duration >= (allowSameDay ? 0 : 1) && duration <= maxDays;
}

function recordIdentity(form: FormData) {
  const rawId = form.get("id");
  const rawRevision = form.get("revision");
  if (rawId === "new" && rawRevision === "new")
    return { id: null, revision: null };
  if (!validSchoolId(rawId) || !validRevision(rawRevision)) return null;
  return { id: rawId, revision: rawRevision };
}

export function parseAcademicYear(
  form: FormData,
  messages: AcademicServerMessages = tr.academicServer,
):
  | { success: true; data: AcademicYearInput }
  | { success: false; state: AcademicCalendarState } {
  const identity = recordIdentity(form);
  const name = normalizedText(form.get("name"), 40);
  const startDate = parseDateOnly(form.get("startDate"));
  const endDate = parseDateOnly(form.get("endDate"));
  const fieldErrors: AcademicCalendarState["fieldErrors"] = {};

  if (!identity) fieldErrors.record = messages.invalidRecord;
  if (!name) fieldErrors.name = messages.invalidYearName;
  if (!startDate) fieldErrors.startDate = messages.invalidStartDate;
  if (!endDate) fieldErrors.endDate = messages.invalidEndDate;
  if (
    startDate &&
    endDate &&
    !boundedDateRange(startDate, endDate, 730, false)
  )
    fieldErrors.endDate = messages.invalidYearRange;

  if (!identity || !name || !startDate || !endDate || Object.keys(fieldErrors).length)
    return {
      success: false,
      state: {
        status: "error",
        message: messages.yearSaveInvalid,
        fieldErrors,
      },
    };

  return {
    success: true,
    data: { ...identity, name, startDate, endDate },
  };
}

export function parseAcademicTerm(
  form: FormData,
  messages: AcademicServerMessages = tr.academicServer,
):
  | { success: true; data: AcademicTermInput }
  | { success: false; state: AcademicCalendarState } {
  const identity = recordIdentity(form);
  const academicYearId = form.get("academicYearId");
  const names = {
    tr: normalizedText(form.get("nameTr"), 100),
    sq: normalizedText(form.get("nameSq"), 100),
    en: normalizedText(form.get("nameEn"), 100),
  };
  const rawSequence = form.get("sequence");
  const sequence =
    typeof rawSequence === "string" && /^\d{1,2}$/.test(rawSequence)
      ? Number(rawSequence)
      : Number.NaN;
  const startDate = parseDateOnly(form.get("startDate"));
  const endDate = parseDateOnly(form.get("endDate"));
  const fieldErrors: AcademicCalendarState["fieldErrors"] = {};

  if (!identity || !validSchoolId(academicYearId))
    fieldErrors.record = messages.invalidRecord;
  for (const locale of SUPPORTED_LOCALES) {
    if (!names[locale]) {
      const field = `name${locale[0].toUpperCase()}${locale.slice(1)}` as
        | "nameTr"
        | "nameSq"
        | "nameEn";
      fieldErrors[field] = messages.invalidTermName;
    }
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 20)
    fieldErrors.sequence = messages.invalidSequence;
  if (!startDate) fieldErrors.startDate = messages.invalidStartDate;
  if (!endDate) fieldErrors.endDate = messages.invalidEndDate;
  if (
    startDate &&
    endDate &&
    !boundedDateRange(startDate, endDate, 370, true)
  )
    fieldErrors.endDate = messages.invalidTermRange;

  if (
    !identity ||
    !validSchoolId(academicYearId) ||
    Object.values(names).some((name) => !name) ||
    !startDate ||
    !endDate ||
    Object.keys(fieldErrors).length
  )
    return {
      success: false,
      state: {
        status: "error",
        message: messages.termSaveInvalid,
        fieldErrors,
      },
    };

  return {
    success: true,
    data: {
      ...identity,
      academicYearId,
      names: names as LocalizedNames,
      sequence,
      startDate,
      endDate,
    },
  };
}

export function parseAcademicTransition(form: FormData): {
  entity: AcademicEntity;
  transition: AcademicTransition;
  id: string;
  revision: string;
} | null {
  const entity = form.get("entity");
  const transition = form.get("transition");
  const id = form.get("id");
  const revision = form.get("revision");
  if (
    (entity !== "year" && entity !== "term") ||
    !["activate", "close", "archive", "restore"].includes(
      String(transition),
    ) ||
    !validSchoolId(id) ||
    !validRevision(revision)
  )
    return null;
  return {
    entity,
    transition: transition as AcademicTransition,
    id,
    revision,
  };
}
