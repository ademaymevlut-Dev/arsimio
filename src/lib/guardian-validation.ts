import { tr } from "@/i18n/dictionaries/tr";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { validRevision, validSchoolId } from "./platform-school-validation";

export type GuardianField =
  | "record"
  | "firstName"
  | "middleName"
  | "lastName"
  | "occupation"
  | "phone"
  | "email";

export type GuardianState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<GuardianField, string>>;
  entityId?: string;
};

export type GuardianMessages = AppDictionary["guardians"];

export type UpdateGuardianInput = {
  personId: string;
  revision: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  occupationText: string | null;
  phone: string | null;
  email: string | null;
};

export type ArchiveGuardianInput = {
  personId: string;
  revision: string;
};

type Parsed<T> =
  | { success: true; data: T }
  | { success: false; state: GuardianState };

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function text(value: FormDataEntryValue | null, max: number) {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
}

function optionalText(value: FormDataEntryValue | null, max: number) {
  if (value === null || value === "") return null;
  return text(value, max);
}

function provided(value: FormDataEntryValue | null) {
  return typeof value === "string" && value !== "";
}

function invalid(
  messages: GuardianMessages,
  fieldErrors: GuardianState["fieldErrors"],
): Parsed<never> {
  return {
    success: false,
    state: { status: "error", message: messages.invalid, fieldErrors },
  };
}

export function parseUpdateGuardian(
  form: FormData,
  messages: GuardianMessages = tr.guardians,
): Parsed<UpdateGuardianInput> {
  const personId = form.get("personId");
  const revision = form.get("revision");
  const firstName = text(form.get("firstName"), 100);
  const middleNameRaw = form.get("middleName");
  const middleName = optionalText(middleNameRaw, 100);
  const lastName = text(form.get("lastName"), 100);
  const occupationRaw = form.get("occupation");
  const occupationText = optionalText(occupationRaw, 150);
  const phoneRaw = form.get("phone");
  const phone = optionalText(phoneRaw, 50);
  const emailRaw = form.get("email");
  const email = optionalText(emailRaw, 320)?.toLowerCase() ?? null;
  const fieldErrors: GuardianState["fieldErrors"] = {};

  if (!validSchoolId(personId) || !validRevision(revision))
    fieldErrors.record = messages.unavailable;
  if (!firstName) fieldErrors.firstName = messages.invalidName;
  if (provided(middleNameRaw) && !middleName)
    fieldErrors.middleName = messages.invalidName;
  if (!lastName) fieldErrors.lastName = messages.invalidName;
  if (provided(occupationRaw) && !occupationText)
    fieldErrors.occupation = messages.invalid;
  if (provided(phoneRaw) && (!phone || !/^\+?[0-9 ()-]{6,30}$/.test(phone)))
    fieldErrors.phone = messages.invalidPhone;
  if (
    provided(emailRaw) &&
    (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    fieldErrors.email = messages.invalidEmail;

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(personId) ||
    !validRevision(revision) ||
    !firstName ||
    !lastName
  ) {
    return invalid(messages, fieldErrors);
  }

  return {
    success: true,
    data: {
      personId,
      revision,
      firstName,
      middleName,
      lastName,
      occupationText,
      phone,
      email,
    },
  };
}

export function parseArchiveGuardian(
  form: FormData,
  messages: GuardianMessages = tr.guardians,
): Parsed<ArchiveGuardianInput> {
  const personId = form.get("personId");
  const revision = form.get("revision");
  if (!validSchoolId(personId) || !validRevision(revision)) {
    return invalid(messages, { record: messages.unavailable });
  }
  return { success: true, data: { personId, revision } };
}
