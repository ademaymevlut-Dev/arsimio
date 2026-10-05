import type {
  GuardianRelationshipType,
  IdentityType,
  PersonSex,
  StudentExitReason,
} from "@/generated/prisma/client";
import { tr } from "@/i18n/dictionaries/tr";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { validRevision, validSchoolId } from "./platform-school-validation";

export type StudentField =
  | "record"
  | "firstName"
  | "middleName"
  | "lastName"
  | "birthDate"
  | "birthPlace"
  | "nationality"
  | "sex"
  | "residenceCity"
  | "neighborhood"
  | "addressLine"
  | "internalNote"
  | "specialConditionNote"
  | "photo"
  | "identityValue"
  | "identityCountry"
  | "academicYearId"
  | "classSectionId"
  | "admittedOn"
  | "guardianPersonId"
  | "relationshipType"
  | "occupation"
  | "guardianNote"
  | "phone"
  | "email"
  | "effectiveOn"
  | "exitReason"
  | "note"
  | "previousEducation";

export type StudentState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<StudentField, string>>;
  entityId?: string;
};

export type StudentServerMessages = AppDictionary["studentServer"];

export type CreateStudentInput = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  birthDate: Date | null;
  birthPlace: string | null;
  nationalityText: string | null;
  sex: PersonSex | null;
  identity: {
    type: IdentityType;
    value: string;
    countryCode: string | null;
  } | null;
  residenceCity: string | null;
  neighborhood: string | null;
  addressLine: string | null;
  internalNote: string | null;
  hasSpecialCondition: boolean;
  specialConditionNote: string | null;
  academicYearId: string;
  academicYearClassSectionId: string;
  admittedOn: Date;
};

export type AddGuardianInput = {
  studentProfileId: string;
  mode: "existing" | "new";
  guardianPersonId: string | null;
  relationshipType: GuardianRelationshipType;
  isLegalGuardian: boolean;
  isPrimaryContact: boolean;
  isFinancialResponsible: boolean;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  occupationText: string | null;
  note: string | null;
  phone: string | null;
  email: string | null;
};

export type SetPrimaryGuardianInput = {
  studentProfileId: string;
  relationshipId: string;
};

export type SetFinancialGuardianInput = {
  studentProfileId: string;
  relationshipId: string;
};

export type UpdateStudentDetailsInput = {
  studentProfileId: string;
  revision: string;
  residenceCity: string | null;
  neighborhood: string | null;
  addressLine: string | null;
  internalNote: string | null;
  hasSpecialCondition: boolean;
  specialConditionNote: string | null;
};

export type AddPreviousEducationInput = {
  studentProfileId: string;
  gradeLevelText: string | null;
  academicYearText: string | null;
  schoolName: string | null;
  successText: string | null;
  transportText: string | null;
  discountText: string | null;
  note: string | null;
};

export type ArchivePreviousEducationInput = {
  studentProfileId: string;
  previousEducationId: string;
};

export type UploadStudentPhotoInput = {
  studentProfileId: string;
  photo: File;
};

export type StudentTransitionInput = {
  studentProfileId: string;
  revision: string;
  transition: "inactive" | "reactivate";
  effectiveOn: Date;
  exitReason: StudentExitReason | null;
  note: string | null;
};

type Parsed<T> =
  | { success: true; data: T }
  | { success: false; state: StudentState };

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const IDENTITY_TYPES = new Set<IdentityType>(["NATIONAL_ID", "PASSPORT"]);
const SEXES = new Set<PersonSex>(["MALE", "FEMALE"]);
const RELATIONSHIPS = new Set<GuardianRelationshipType>(["MOTHER", "FATHER"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXIT_REASONS = new Set<StudentExitReason>([
  "FAMILY_RELOCATION",
  "COST",
  "OTHER_SCHOOL",
  "OTHER",
  "UNKNOWN",
]);

function text(value: FormDataEntryValue | null, max: number) {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
}

function optionalText(value: FormDataEntryValue | null, max: number) {
  if (value === null || value === "") return null;
  return text(value, max);
}

export function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

function checked(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function provided(value: FormDataEntryValue | null) {
  return typeof value === "string" && value !== "";
}

function invalid(
  messages: StudentServerMessages,
  fieldErrors: StudentState["fieldErrors"],
): Parsed<never> {
  return {
    success: false,
    state: { status: "error", message: messages.invalid, fieldErrors },
  };
}

export function parseCreateStudent(
  form: FormData,
  messages: StudentServerMessages = tr.studentServer,
): Parsed<CreateStudentInput> {
  const firstName = text(form.get("firstName"), 100);
  const middleNameRaw = form.get("middleName");
  const middleName = optionalText(middleNameRaw, 100);
  const lastName = text(form.get("lastName"), 100);
  const birthDateRaw = form.get("birthDate");
  const birthDate = birthDateRaw === "" ? null : parseDateOnly(birthDateRaw);
  const birthPlaceRaw = form.get("birthPlace");
  const birthPlace = optionalText(birthPlaceRaw, 150);
  const nationalityRaw = form.get("nationality");
  const nationalityText = optionalText(nationalityRaw, 100);
  const sexRaw = form.get("sex");
  const sex = typeof sexRaw === "string" && SEXES.has(sexRaw as PersonSex)
    ? (sexRaw as PersonSex)
    : null;
  const residenceCityRaw = form.get("residenceCity");
  const residenceCity = optionalText(residenceCityRaw, 120);
  const neighborhoodRaw = form.get("neighborhood");
  const neighborhood = optionalText(neighborhoodRaw, 120);
  const addressLineRaw = form.get("addressLine");
  const addressLine = optionalText(addressLineRaw, 500);
  const internalNoteRaw = form.get("internalNote");
  const internalNote = optionalText(internalNoteRaw, 1000);
  const hasSpecialCondition = checked(form.get("hasSpecialCondition"));
  const specialConditionNoteRaw = form.get("specialConditionNote");
  const specialConditionNote = optionalText(specialConditionNoteRaw, 1000);
  const identityValueRaw = form.get("identityValue");
  const identityValue = optionalText(identityValueRaw, 40);
  const identityTypeRaw = form.get("identityType");
  const identityType =
    typeof identityTypeRaw === "string" && IDENTITY_TYPES.has(identityTypeRaw as IdentityType)
      ? (identityTypeRaw as IdentityType)
      : null;
  const identityCountryValue = form.get("identityCountry");
  const identityCountryRaw = optionalText(identityCountryValue, 2)?.toUpperCase() ?? null;
  const academicYearId = form.get("academicYearId");
  const classSectionId = form.get("classSectionId");
  const admittedOn = parseDateOnly(form.get("admittedOn"));
  const fieldErrors: StudentState["fieldErrors"] = {};

  if (!firstName) fieldErrors.firstName = messages.invalidName;
  if (provided(middleNameRaw) && !middleName) fieldErrors.middleName = messages.invalidName;
  if (!lastName) fieldErrors.lastName = messages.invalidName;
  if (provided(birthDateRaw) && !birthDate) fieldErrors.birthDate = messages.invalidDate;
  if (provided(birthPlaceRaw) && !birthPlace) fieldErrors.birthPlace = messages.invalid;
  if (provided(nationalityRaw) && !nationalityText) fieldErrors.nationality = messages.invalid;
  if (provided(sexRaw) && !sex) fieldErrors.sex = messages.invalid;
  if (provided(residenceCityRaw) && !residenceCity) fieldErrors.residenceCity = messages.invalid;
  if (provided(neighborhoodRaw) && !neighborhood) fieldErrors.neighborhood = messages.invalid;
  if (provided(addressLineRaw) && !addressLine) fieldErrors.addressLine = messages.invalid;
  if (provided(internalNoteRaw) && !internalNote) fieldErrors.internalNote = messages.invalid;
  if (provided(specialConditionNoteRaw) && !specialConditionNote)
    fieldErrors.specialConditionNote = messages.invalid;
  if (provided(identityValueRaw) && !identityType)
    fieldErrors.identityValue = messages.invalidIdentity;
  if (
    provided(identityValueRaw) &&
    (!identityValue || !/^[\p{L}\p{N} .-]{3,40}$/u.test(identityValue))
  )
    fieldErrors.identityValue = messages.invalidIdentity;
  if (
    provided(identityCountryValue) &&
    (!identityCountryRaw || !/^[A-Z]{2}$/.test(identityCountryRaw))
  )
    fieldErrors.identityCountry = messages.invalidIdentity;
  if (provided(identityCountryValue) && !identityValue)
    fieldErrors.identityValue = messages.invalidIdentity;
  if (!validSchoolId(academicYearId)) fieldErrors.academicYearId = messages.invalidRelation;
  if (!validSchoolId(classSectionId)) fieldErrors.classSectionId = messages.invalidRelation;
  if (!admittedOn) fieldErrors.admittedOn = messages.invalidDate;

  if (
    Object.keys(fieldErrors).length ||
    !firstName ||
    !lastName ||
    (provided(birthDateRaw) && !birthDate) ||
    (provided(sexRaw) && !sex) ||
    fieldErrors.identityValue ||
    fieldErrors.identityCountry ||
    !validSchoolId(academicYearId) ||
    !validSchoolId(classSectionId) ||
    !admittedOn
  ) return invalid(messages, fieldErrors);

  return {
    success: true,
    data: {
      firstName,
      middleName,
      lastName,
      birthDate,
      birthPlace,
      nationalityText,
      sex,
      residenceCity,
      neighborhood,
      addressLine,
      internalNote,
      hasSpecialCondition,
      specialConditionNote,
      identity: identityValue && identityType
        ? { type: identityType, value: identityValue, countryCode: identityCountryRaw }
        : null,
      academicYearId,
      academicYearClassSectionId: classSectionId,
      admittedOn,
    },
  };
}

export function parseAddGuardian(
  form: FormData,
  messages: StudentServerMessages = tr.studentServer,
): Parsed<AddGuardianInput> {
  const studentProfileId = form.get("studentProfileId");
  const modeRaw = form.get("mode");
  const mode = modeRaw === "existing" || modeRaw === "new" ? modeRaw : null;
  const guardianPersonId = form.get("guardianPersonId");
  const relationshipRaw = form.get("relationshipType");
  const relationshipType =
    typeof relationshipRaw === "string" && RELATIONSHIPS.has(relationshipRaw as GuardianRelationshipType)
      ? (relationshipRaw as GuardianRelationshipType)
      : null;
  const firstName = optionalText(form.get("firstName"), 100);
  const middleNameRaw = form.get("middleName");
  const middleName = optionalText(middleNameRaw, 100);
  const lastName = optionalText(form.get("lastName"), 100);
  const occupationRaw = form.get("occupation");
  const occupationText = optionalText(occupationRaw, 150);
  const guardianNoteRaw = form.get("guardianNote");
  const note = optionalText(guardianNoteRaw, 500);
  const phoneRaw = form.get("phone");
  const phone = optionalText(phoneRaw, 50);
  const emailRaw = form.get("email");
  const email = optionalText(emailRaw, 320)?.toLowerCase() ?? null;
  const fieldErrors: StudentState["fieldErrors"] = {};

  if (!validSchoolId(studentProfileId)) fieldErrors.record = messages.unavailable;
  if (!mode) fieldErrors.guardianPersonId = messages.invalidRelation;
  if (mode === "existing" && !validSchoolId(guardianPersonId))
    fieldErrors.guardianPersonId = messages.invalidRelation;
  if (mode === "new" && !firstName) fieldErrors.firstName = messages.invalidName;
  if (mode === "new" && provided(middleNameRaw) && !middleName)
    fieldErrors.middleName = messages.invalidName;
  if (mode === "new" && !lastName) fieldErrors.lastName = messages.invalidName;
  if (provided(occupationRaw) && !occupationText) fieldErrors.occupation = messages.invalid;
  if (provided(guardianNoteRaw) && !note) fieldErrors.guardianNote = messages.invalid;
  if (!relationshipType) fieldErrors.relationshipType = messages.invalidRelation;
  if (
    mode === "new" &&
    provided(phoneRaw) &&
    (!phone || !/^\+?[0-9 ()-]{6,30}$/.test(phone))
  )
    fieldErrors.phone = messages.invalid;
  if (
    mode === "new" &&
    provided(emailRaw) &&
    (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    fieldErrors.email = messages.invalid;

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(studentProfileId) ||
    !relationshipType ||
    !mode
  )
    return invalid(messages, fieldErrors);

  return {
    success: true,
    data: {
      studentProfileId,
      mode,
      guardianPersonId: mode === "existing" && validSchoolId(guardianPersonId) ? guardianPersonId : null,
      relationshipType,
      isLegalGuardian: checked(form.get("isLegalGuardian")),
      isPrimaryContact: checked(form.get("isPrimaryContact")),
      isFinancialResponsible: checked(form.get("isFinancialResponsible")),
      firstName: mode === "new" ? firstName : null,
      middleName: mode === "new" ? middleName : null,
      lastName: mode === "new" ? lastName : null,
      occupationText,
      note,
      phone: mode === "new" ? phone : null,
      email: mode === "new" ? email : null,
    },
  };
}

export function parseSetPrimaryGuardian(
  form: FormData,
  messages: StudentServerMessages = tr.studentServer,
): Parsed<SetPrimaryGuardianInput> {
  const studentProfileId = form.get("studentProfileId");
  const relationshipId = form.get("relationshipId");
  if (!validSchoolId(studentProfileId) || !validSchoolId(relationshipId))
    return invalid(messages, { record: messages.unavailable });
  return { success: true, data: { studentProfileId, relationshipId } };
}

export function parseSetFinancialGuardian(
  form: FormData,
  messages: StudentServerMessages = tr.studentServer,
): Parsed<SetFinancialGuardianInput> {
  const studentProfileId = form.get("studentProfileId");
  const relationshipId = form.get("relationshipId");
  if (!validSchoolId(studentProfileId) || !validSchoolId(relationshipId))
    return invalid(messages, { record: messages.unavailable });
  return { success: true, data: { studentProfileId, relationshipId } };
}

export function parseUpdateStudentDetails(
  form: FormData,
  messages: StudentServerMessages = tr.studentServer,
): Parsed<UpdateStudentDetailsInput> {
  const studentProfileId = form.get("studentProfileId");
  const revision = form.get("revision");
  const residenceCityRaw = form.get("residenceCity");
  const residenceCity = optionalText(residenceCityRaw, 120);
  const neighborhoodRaw = form.get("neighborhood");
  const neighborhood = optionalText(neighborhoodRaw, 120);
  const addressLineRaw = form.get("addressLine");
  const addressLine = optionalText(addressLineRaw, 500);
  const internalNoteRaw = form.get("internalNote");
  const internalNote = optionalText(internalNoteRaw, 1000);
  const specialConditionNoteRaw = form.get("specialConditionNote");
  const specialConditionNote = optionalText(specialConditionNoteRaw, 1000);
  const fieldErrors: StudentState["fieldErrors"] = {};
  if (!validSchoolId(studentProfileId) || !validRevision(revision)) fieldErrors.record = messages.unavailable;
  if (provided(residenceCityRaw) && !residenceCity) fieldErrors.residenceCity = messages.invalid;
  if (provided(neighborhoodRaw) && !neighborhood) fieldErrors.neighborhood = messages.invalid;
  if (provided(addressLineRaw) && !addressLine) fieldErrors.addressLine = messages.invalid;
  if (provided(internalNoteRaw) && !internalNote) fieldErrors.internalNote = messages.invalid;
  if (provided(specialConditionNoteRaw) && !specialConditionNote)
    fieldErrors.specialConditionNote = messages.invalid;
  if (Object.keys(fieldErrors).length || !validSchoolId(studentProfileId) || !validRevision(revision))
    return invalid(messages, fieldErrors);
  return {
    success: true,
    data: {
      studentProfileId,
      revision,
      residenceCity,
      neighborhood,
      addressLine,
      internalNote,
      hasSpecialCondition: checked(form.get("hasSpecialCondition")),
      specialConditionNote,
    },
  };
}

export function parseAddPreviousEducation(
  form: FormData,
  messages: StudentServerMessages = tr.studentServer,
): Parsed<AddPreviousEducationInput> {
  const studentProfileId = form.get("studentProfileId");
  const gradeLevelText = optionalText(form.get("gradeLevelText"), 50);
  const academicYearText = optionalText(form.get("academicYearText"), 50);
  const schoolName = optionalText(form.get("schoolName"), 200);
  const successText = optionalText(form.get("successText"), 100);
  const transportText = optionalText(form.get("transportText"), 100);
  const discountText = optionalText(form.get("discountText"), 100);
  const note = optionalText(form.get("note"), 500);
  const hasAnyValue = Boolean(
    gradeLevelText ||
      academicYearText ||
      schoolName ||
      successText ||
      transportText ||
      discountText ||
      note,
  );
  const fieldErrors: StudentState["fieldErrors"] = {};
  if (!validSchoolId(studentProfileId)) fieldErrors.record = messages.unavailable;
  if (!hasAnyValue) fieldErrors.previousEducation = messages.invalid;
  if (Object.keys(fieldErrors).length || !validSchoolId(studentProfileId))
    return invalid(messages, fieldErrors);
  return {
    success: true,
    data: {
      studentProfileId,
      gradeLevelText,
      academicYearText,
      schoolName,
      successText,
      transportText,
      discountText,
      note,
    },
  };
}

export function parseArchivePreviousEducation(
  form: FormData,
  messages: StudentServerMessages = tr.studentServer,
): Parsed<ArchivePreviousEducationInput> {
  const studentProfileId = form.get("studentProfileId");
  const previousEducationId = form.get("previousEducationId");
  if (!validSchoolId(studentProfileId) || !validSchoolId(previousEducationId))
    return invalid(messages, { previousEducation: messages.unavailable });
  return { success: true, data: { studentProfileId, previousEducationId } };
}

export function parseUploadStudentPhoto(
  form: FormData,
  messages: StudentServerMessages = tr.studentServer,
): Parsed<UploadStudentPhotoInput> {
  const studentProfileId = form.get("studentProfileId");
  const photo = form.get("photo");
  const fieldErrors: StudentState["fieldErrors"] = {};
  if (!validSchoolId(studentProfileId)) fieldErrors.record = messages.unavailable;
  if (!(photo instanceof File) || photo.size === 0) fieldErrors.photo = messages.invalid;
  if (photo instanceof File && photo.size > 5 * 1024 * 1024) fieldErrors.photo = messages.invalid;
  if (photo instanceof File && photo.size > 0 && !IMAGE_TYPES.has(photo.type))
    fieldErrors.photo = messages.invalid;
  if (Object.keys(fieldErrors).length || !validSchoolId(studentProfileId) || !(photo instanceof File))
    return invalid(messages, fieldErrors);
  return { success: true, data: { studentProfileId, photo } };
}

export function parseStudentTransition(
  form: FormData,
  messages: StudentServerMessages = tr.studentServer,
): Parsed<StudentTransitionInput> {
  const studentProfileId = form.get("studentProfileId");
  const revision = form.get("revision");
  const transition = form.get("transition");
  const effectiveOn = parseDateOnly(form.get("effectiveOn"));
  const exitReasonRaw = form.get("exitReason");
  const exitReason =
    typeof exitReasonRaw === "string" && EXIT_REASONS.has(exitReasonRaw as StudentExitReason)
      ? (exitReasonRaw as StudentExitReason)
      : null;
  const note = optionalText(form.get("note"), 500);
  const fieldErrors: StudentState["fieldErrors"] = {};
  if (!validSchoolId(studentProfileId) || !validRevision(revision)) fieldErrors.record = messages.unavailable;
  if (transition !== "inactive" && transition !== "reactivate") fieldErrors.record = messages.invalid;
  if (!effectiveOn) fieldErrors.effectiveOn = messages.invalidDate;
  if (transition === "inactive" && !exitReason) fieldErrors.exitReason = messages.invalid;
  if (Object.keys(fieldErrors).length || !validSchoolId(studentProfileId) || !validRevision(revision) || !effectiveOn || (transition !== "inactive" && transition !== "reactivate"))
    return invalid(messages, fieldErrors);
  return {
    success: true,
    data: {
      studentProfileId,
      revision,
      transition,
      effectiveOn,
      exitReason: transition === "inactive" ? exitReason : null,
      note,
    },
  };
}
