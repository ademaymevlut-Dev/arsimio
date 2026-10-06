import type {
  EmploymentCompensationAmountKind,
  EmploymentCompensationPayType,
  EmploymentCompensationStatus,
  EmploymentContractStatus,
  EmploymentContractType,
  EmploymentExitReason,
  EmploymentLeaveKind,
  EmploymentLeaveStatus,
  EmploymentType,
  IdentityType,
  TeacherCategory,
  TeacherStatus,
} from "@/generated/prisma/client";
import { tr } from "@/i18n/dictionaries/tr";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { validRevision, validSchoolId } from "./platform-school-validation";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

const EMPLOYMENT_TYPES = new Set<EmploymentType>([
  "FULL_TIME",
  "PART_TIME",
  "FIXED_TERM",
  "CONTRACTOR",
  "INTERN",
]);
const CONTRACT_TYPES = new Set<EmploymentContractType>([
  "INDEFINITE",
  "FIXED_TERM",
  "PART_TIME",
  "SERVICE",
  "INTERN",
  "OTHER",
]);
const CONTRACT_STATUSES = new Set<EmploymentContractStatus>([
  "ACTIVE",
  "ENDED",
  "CANCELLED",
]);
const COMPENSATION_PAY_TYPES = new Set<EmploymentCompensationPayType>([
  "MONTHLY",
  "HOURLY",
  "DAILY",
  "LESSON",
  "OTHER",
]);
const COMPENSATION_AMOUNT_KINDS = new Set<EmploymentCompensationAmountKind>([
  "GROSS",
  "NET",
]);
const COMPENSATION_STATUSES = new Set<EmploymentCompensationStatus>([
  "ACTIVE",
  "ENDED",
  "CANCELLED",
]);
const LEAVE_KINDS = new Set<EmploymentLeaveKind>([
  "ANNUAL",
  "SICK",
  "UNPAID",
  "MATERNITY",
  "ADMINISTRATIVE",
  "OTHER",
]);
const LEAVE_STATUSES = new Set<EmploymentLeaveStatus>([
  "PLANNED",
  "APPROVED",
  "CANCELLED",
]);

const EXIT_REASONS = new Set<EmploymentExitReason>([
  "RESIGNED",
  "TERMINATED",
  "CONTRACT_ENDED",
  "MATERNITY_LEAVE",
  "HEALTH",
  "RELOCATION",
  "OTHER",
  "UNKNOWN",
]);

const TEACHER_CATEGORIES = new Set<TeacherCategory>(["CLASSROOM", "BRANCH"]);
const TEACHER_STATUSES = new Set<TeacherStatus>(["ACTIVE", "INACTIVE"]);
const IDENTITY_TYPES = new Set<IdentityType>(["NATIONAL_ID", "PASSPORT"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const STAFF_CATALOG_KINDS = new Set<StaffCatalogKind>([
  "department",
  "position",
]);
const STAFF_CATALOG_TRANSITIONS = new Set<StaffCatalogTransition>([
  "archive",
  "restore",
]);
const CATALOG_CODE = /^[A-Z0-9][A-Z0-9_-]{1,49}$/;
const TEMPLATE_CODE = /^[A-Z0-9][A-Z0-9_-]{1,79}$/;
const TEMPLATE_LOCALES = new Set(["tr", "sq", "en"]);

export type StaffField =
  | "record"
  | "mode"
  | "personId"
  | "firstName"
  | "middleName"
  | "lastName"
  | "phone"
  | "email"
  | "hiredOn"
  | "employmentType"
  | "departmentId"
  | "positionId"
  | "effectiveOn"
  | "transition"
  | "exitReason"
  | "note"
  | "category"
  | "titleTr"
  | "titleSq"
  | "titleEn"
  | "teacherStatus"
  | "subjectIds"
  | "photo"
  | "residenceCity"
  | "neighborhood"
  | "addressLine"
  | "emergencyContactName"
  | "emergencyContactRelation"
  | "emergencyContactPhone"
  | "internalNote"
  | "identityType"
  | "identityValue"
  | "identityCountry"
  | "contractId"
  | "contractTemplateId"
  | "contractNumber"
  | "contractType"
  | "contractStatus"
  | "contractStartedOn"
  | "contractEndedOn"
  | "contractNote"
  | "compensationId"
  | "compensationAmount"
  | "compensationCurrency"
  | "compensationAmountKind"
  | "compensationPayType"
  | "compensationStatus"
  | "compensationStartedOn"
  | "compensationEndedOn"
  | "compensationNote"
  | "leaveId"
  | "leaveKind"
  | "leaveStatus"
  | "leaveStartedOn"
  | "leaveEndedOn"
  | "leaveDayCount"
  | "leaveNote"
  | "catalogKind"
  | "catalogId"
  | "code"
  | "nameTr"
  | "nameSq"
  | "nameEn"
  | "templateId"
  | "templateCode"
  | "templateLocale"
  | "templateTitle"
  | "templateHeader"
  | "templateFooter"
  | "templateNote"
  | "clauseId"
  | "clauseOrder"
  | "clauseTitle"
  | "clauseBody";

export type StaffState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<StaffField, string>>;
  entityId?: string;
};

export type StaffMessages = AppDictionary["staff"];

export type CreateEmploymentInput = {
  mode: "existing" | "new";
  personId: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  hiredOn: Date;
  employmentType: EmploymentType;
  departmentId: string;
  positionId: string;
  note: string | null;
};

export type EmploymentTransitionInput = {
  employmentId: string;
  revision: string;
  transition: "on_leave" | "reactivate" | "end";
  effectiveOn: Date;
  exitReason: EmploymentExitReason | null;
  note: string | null;
};

export type TeacherProfileInput = {
  employmentId: string;
  category: TeacherCategory;
  title: { tr: string; sq: string; en: string };
  teacherStatus: TeacherStatus;
  note: string | null;
  subjectIds: string[];
};

export type UploadStaffPhotoInput = {
  employmentId: string;
  photo: File;
};

export type UpdateStaffHrProfileInput = {
  employmentId: string;
  revision: string;
  residenceCity: string | null;
  neighborhood: string | null;
  addressLine: string | null;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactPhone: string | null;
  internalNote: string | null;
  identity: {
    type: IdentityType;
    value: string;
    countryCode: string | null;
  } | null;
};

export type SaveEmploymentContractInput = {
  employmentId: string;
  contractId: string | null;
  templateId: string | null;
  revision: string | null;
  contractNumber: string;
  type: EmploymentContractType;
  status: EmploymentContractStatus;
  startedOn: Date;
  endedOn: Date | null;
  note: string | null;
};

export type SaveEmploymentCompensationInput = {
  employmentId: string;
  compensationId: string | null;
  revision: string | null;
  amount: string;
  currencyCode: string;
  amountKind: EmploymentCompensationAmountKind;
  payType: EmploymentCompensationPayType;
  status: EmploymentCompensationStatus;
  startedOn: Date;
  endedOn: Date | null;
  note: string | null;
};

export type SaveEmploymentLeaveInput = {
  employmentId: string;
  leaveId: string | null;
  revision: string | null;
  kind: EmploymentLeaveKind;
  status: EmploymentLeaveStatus;
  startedOn: Date;
  endedOn: Date;
  dayCount: string;
  note: string | null;
};

export type StaffCatalogKind = "department" | "position";
export type StaffCatalogTransition = "archive" | "restore";

export type StaffCatalogItemInput = {
  kind: StaffCatalogKind;
  catalogId: string | null;
  revision: string | null;
  code: string;
  name: { tr: string; sq: string; en: string };
};

export type StaffCatalogTransitionInput = {
  kind: StaffCatalogKind;
  catalogId: string;
  revision: string;
  transition: StaffCatalogTransition;
};

export type ContractTemplateInput = {
  templateId: string | null;
  revision: string | null;
  code: string;
  locale: "tr" | "sq" | "en";
  title: string;
  headerText: string | null;
  footerText: string | null;
  note: string | null;
};

export type ContractTemplateTransitionInput = {
  templateId: string;
  revision: string;
  transition: StaffCatalogTransition;
};

export type ContractTemplateClauseInput = {
  templateId: string;
  clauseId: string | null;
  revision: string | null;
  sortOrder: number;
  title: string;
  body: string;
};

export type ContractTemplateClauseTransitionInput = {
  templateId: string;
  clauseId: string;
  revision: string;
  transition: StaffCatalogTransition;
};

type Parsed<T> =
  | { success: true; data: T }
  | { success: false; state: StaffState };

function text(value: FormDataEntryValue | null, max: number) {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
}

function optionalText(value: FormDataEntryValue | null, max: number) {
  if (value === null || value === "") return null;
  return text(value, max);
}

const MULTILINE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function multilineText(value: FormDataEntryValue | null, max: number) {
  if (typeof value !== "string" || MULTILINE_CONTROL_CHARACTERS.test(value))
    return null;
  const normalized = value.replace(/\r\n/g, "\n").trim();
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
}

function optionalMultilineText(value: FormDataEntryValue | null, max: number) {
  if (value === null || value === "") return null;
  return multilineText(value, max);
}

function catalogCode(value: FormDataEntryValue | null) {
  const normalized = text(value, 50)?.toUpperCase().replace(/\s+/g, "_") ?? null;
  return normalized && CATALOG_CODE.test(normalized) ? normalized : null;
}

function templateCode(value: FormDataEntryValue | null) {
  const normalized = text(value, 80)?.toUpperCase().replace(/\s+/g, "_") ?? null;
  return normalized && TEMPLATE_CODE.test(normalized) ? normalized : null;
}

function provided(value: FormDataEntryValue | null) {
  return typeof value === "string" && value !== "";
}

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

function decimalAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? normalized : null;
}

function currencyCode(value: FormDataEntryValue | null) {
  const normalized =
    typeof value === "string" && value.trim()
      ? value.trim().toUpperCase()
      : "EUR";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function inclusiveCalendarDayCount(startedOn: Date, endedOn: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((endedOn.getTime() - startedOn.getTime()) / dayMs) + 1;
}

function leaveDayCount(
  value: FormDataEntryValue | null,
  startedOn: Date | null,
  endedOn: Date | null,
) {
  const raw = typeof value === "string" ? value.trim().replace(",", ".") : "";
  const normalized =
    raw || (startedOn && endedOn ? String(inclusiveCalendarDayCount(startedOn, endedOn)) : "");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;
  const count = Number(normalized);
  return Number.isFinite(count) && count > 0 && count <= 366
    ? normalized
    : null;
}

function invalid(fieldErrors: StaffState["fieldErrors"]): Parsed<never> {
  return {
    success: false,
    state: {
      status: "error",
      message: "Form kaydedilemedi. Isaretli alanlari kontrol edin.",
      fieldErrors,
    },
  };
}

export function parseCreateEmployment(
  form: FormData,
): Parsed<CreateEmploymentInput> {
  const modeRaw = form.get("mode");
  const mode = modeRaw === "existing" || modeRaw === "new" ? modeRaw : null;
  const personId = form.get("personId");
  const firstName = optionalText(form.get("firstName"), 100);
  const middleNameRaw = form.get("middleName");
  const middleName = optionalText(middleNameRaw, 100);
  const lastName = optionalText(form.get("lastName"), 100);
  const phoneRaw = form.get("phone");
  const phone = optionalText(phoneRaw, 50);
  const emailRaw = form.get("email");
  const email = optionalText(emailRaw, 320)?.toLowerCase() ?? null;
  const hiredOn = parseDateOnly(form.get("hiredOn"));
  const typeRaw = form.get("employmentType");
  const employmentType =
    typeof typeRaw === "string" && EMPLOYMENT_TYPES.has(typeRaw as EmploymentType)
      ? (typeRaw as EmploymentType)
      : null;
  const departmentId = form.get("departmentId");
  const positionId = form.get("positionId");
  const noteRaw = form.get("note");
  const note = optionalText(noteRaw, 500);
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!mode) fieldErrors.mode = "Kayit turu gecersiz.";
  if (mode === "existing" && !validSchoolId(personId))
    fieldErrors.personId = "Kisi secimi gecersiz.";
  if (mode === "new" && !firstName) fieldErrors.firstName = "Ad zorunlu.";
  if (mode === "new" && provided(middleNameRaw) && !middleName)
    fieldErrors.middleName = "Ikinci ad gecersiz.";
  if (mode === "new" && !lastName) fieldErrors.lastName = "Soyad zorunlu.";
  if (provided(phoneRaw) && !phone) fieldErrors.phone = "Telefon gecersiz.";
  if (provided(emailRaw) && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    fieldErrors.email = "E-posta gecersiz.";
  if (!hiredOn) fieldErrors.hiredOn = "Ise giris tarihi gecersiz.";
  if (!employmentType) fieldErrors.employmentType = "Calisma turu gecersiz.";
  if (!validSchoolId(departmentId)) fieldErrors.departmentId = "Departman secin.";
  if (!validSchoolId(positionId)) fieldErrors.positionId = "Pozisyon secin.";
  if (provided(noteRaw) && !note) fieldErrors.note = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !mode ||
    !hiredOn ||
    !employmentType ||
    !validSchoolId(departmentId) ||
    !validSchoolId(positionId)
  ) return invalid(fieldErrors);

  return {
    success: true,
    data: {
      mode,
      personId: mode === "existing" ? (personId as string) : null,
      firstName,
      middleName,
      lastName,
      phone,
      email,
      hiredOn,
      employmentType,
      departmentId,
      positionId,
      note,
    },
  };
}

export function parseEmploymentTransition(
  form: FormData,
): Parsed<EmploymentTransitionInput> {
  const employmentId = form.get("employmentId");
  const revision = form.get("revision");
  const transitionRaw = form.get("transition");
  const transition =
    transitionRaw === "on_leave" ||
    transitionRaw === "reactivate" ||
    transitionRaw === "end"
      ? transitionRaw
      : null;
  const effectiveOn = parseDateOnly(form.get("effectiveOn"));
  const exitReasonRaw = form.get("exitReason");
  const exitReason =
    typeof exitReasonRaw === "string" && EXIT_REASONS.has(exitReasonRaw as EmploymentExitReason)
      ? (exitReasonRaw as EmploymentExitReason)
      : null;
  const noteRaw = form.get("note");
  const note = optionalText(noteRaw, 500);
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!validSchoolId(employmentId)) fieldErrors.record = "Personel kaydi gecersiz.";
  if (!validRevision(revision)) fieldErrors.record = "Kayit surumu gecersiz.";
  if (!transition) fieldErrors.transition = "Islem gecersiz.";
  if (!effectiveOn) fieldErrors.effectiveOn = "Tarih gecersiz.";
  if (transition === "end" && !exitReason) fieldErrors.exitReason = "Ayrilis sebebi secin.";
  if (provided(exitReasonRaw) && !exitReason) fieldErrors.exitReason = "Sebep gecersiz.";
  if (provided(noteRaw) && !note) fieldErrors.note = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(employmentId) ||
    !validRevision(revision) ||
    !transition ||
    !effectiveOn
  ) return invalid(fieldErrors);

  return {
    success: true,
    data: {
      employmentId,
      revision,
      transition,
      effectiveOn,
      exitReason,
      note,
    },
  };
}

export function parseTeacherProfile(form: FormData): Parsed<TeacherProfileInput> {
  const employmentId = form.get("employmentId");
  const categoryRaw = form.get("category");
  const category =
    typeof categoryRaw === "string" && TEACHER_CATEGORIES.has(categoryRaw as TeacherCategory)
      ? (categoryRaw as TeacherCategory)
      : null;
  const titleTr = text(form.get("titleTr"), 120);
  const titleSq = text(form.get("titleSq"), 120);
  const titleEn = text(form.get("titleEn"), 120);
  const statusRaw = form.get("teacherStatus");
  const teacherStatus =
    typeof statusRaw === "string" && TEACHER_STATUSES.has(statusRaw as TeacherStatus)
      ? (statusRaw as TeacherStatus)
      : null;
  const noteRaw = form.get("note");
  const note = optionalText(noteRaw, 500);
  const subjectIds = form
    .getAll("subjectIds")
    .filter((value): value is string => validSchoolId(value));
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!validSchoolId(employmentId)) fieldErrors.record = "Personel kaydi gecersiz.";
  if (!category) fieldErrors.category = "Ogretmen turu secin.";
  if (!titleTr) fieldErrors.titleTr = "Turkce unvan zorunlu.";
  if (!titleSq) fieldErrors.titleSq = "Arnavutca unvan zorunlu.";
  if (!titleEn) fieldErrors.titleEn = "Ingilizce unvan zorunlu.";
  if (!teacherStatus) fieldErrors.teacherStatus = "Durum gecersiz.";
  if (provided(noteRaw) && !note) fieldErrors.note = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(employmentId) ||
    !category ||
    !titleTr ||
    !titleSq ||
    !titleEn ||
    !teacherStatus
  ) return invalid(fieldErrors);

  return {
    success: true,
    data: {
      employmentId,
      category,
      title: { tr: titleTr, sq: titleSq, en: titleEn },
      teacherStatus,
      note,
      subjectIds: [...new Set(subjectIds)],
    },
  };
}

export function parseUploadStaffPhoto(
  form: FormData,
  messages: StaffMessages = tr.staff,
): Parsed<UploadStaffPhotoInput> {
  const employmentId = form.get("employmentId");
  const photo = form.get("photo");
  const fieldErrors: StaffState["fieldErrors"] = {};
  if (!validSchoolId(employmentId)) fieldErrors.record = messages.failed;
  if (!(photo instanceof File) || photo.size === 0)
    fieldErrors.photo = messages.invalidPhoto;
  if (photo instanceof File && photo.size > 5 * 1024 * 1024)
    fieldErrors.photo = messages.invalidPhoto;
  if (photo instanceof File && photo.size > 0 && !IMAGE_TYPES.has(photo.type))
    fieldErrors.photo = messages.invalidPhoto;
  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(employmentId) ||
    !(photo instanceof File)
  )
    return {
      success: false,
      state: {
        status: "error",
        message: messages.failed,
        fieldErrors,
      },
    };
  return { success: true, data: { employmentId, photo } };
}

export function parseUpdateStaffHrProfile(
  form: FormData,
  messages: StaffMessages = tr.staff,
): Parsed<UpdateStaffHrProfileInput> {
  const employmentId = form.get("employmentId");
  const revision = form.get("revision");
  const residenceCityRaw = form.get("residenceCity");
  const residenceCity = optionalText(residenceCityRaw, 120);
  const neighborhoodRaw = form.get("neighborhood");
  const neighborhood = optionalText(neighborhoodRaw, 120);
  const addressLineRaw = form.get("addressLine");
  const addressLine = optionalText(addressLineRaw, 300);
  const emergencyContactNameRaw = form.get("emergencyContactName");
  const emergencyContactName = optionalText(emergencyContactNameRaw, 200);
  const emergencyContactRelationRaw = form.get("emergencyContactRelation");
  const emergencyContactRelation = optionalText(emergencyContactRelationRaw, 80);
  const emergencyContactPhoneRaw = form.get("emergencyContactPhone");
  const emergencyContactPhone = optionalText(emergencyContactPhoneRaw, 50);
  const internalNoteRaw = form.get("internalNote");
  const internalNote = optionalText(internalNoteRaw, 500);
  const identityTypeRaw = form.get("identityType");
  const identityType =
    typeof identityTypeRaw === "string" &&
    IDENTITY_TYPES.has(identityTypeRaw as IdentityType)
      ? (identityTypeRaw as IdentityType)
      : null;
  const identityValueRaw = form.get("identityValue");
  const identityValue = optionalText(identityValueRaw, 40);
  const identityCountryValue = form.get("identityCountry");
  const identityCountry =
    optionalText(identityCountryValue, 2)?.toUpperCase() ?? null;
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!validSchoolId(employmentId)) fieldErrors.record = messages.failed;
  if (!validRevision(revision)) fieldErrors.record = messages.failed;
  if (provided(residenceCityRaw) && !residenceCity)
    fieldErrors.residenceCity = messages.invalid;
  if (provided(neighborhoodRaw) && !neighborhood)
    fieldErrors.neighborhood = messages.invalid;
  if (provided(addressLineRaw) && !addressLine)
    fieldErrors.addressLine = messages.invalid;
  if (provided(emergencyContactNameRaw) && !emergencyContactName)
    fieldErrors.emergencyContactName = messages.invalid;
  if (provided(emergencyContactRelationRaw) && !emergencyContactRelation)
    fieldErrors.emergencyContactRelation = messages.invalid;
  if (provided(emergencyContactPhoneRaw) && !emergencyContactPhone)
    fieldErrors.emergencyContactPhone = messages.invalid;
  if (provided(internalNoteRaw) && !internalNote)
    fieldErrors.internalNote = messages.invalid;
  if (provided(identityValueRaw) && !identityType)
    fieldErrors.identityValue = messages.invalidIdentity;
  if (
    provided(identityValueRaw) &&
    (!identityValue || !/^[\p{L}\p{N} .-]{3,40}$/u.test(identityValue))
  )
    fieldErrors.identityValue = messages.invalidIdentity;
  if (
    provided(identityCountryValue) &&
    (!identityCountry || !/^[A-Z]{2}$/.test(identityCountry))
  )
    fieldErrors.identityCountry = messages.invalidIdentity;
  if (provided(identityCountryValue) && !provided(identityValueRaw))
    fieldErrors.identityCountry = messages.invalidIdentity;

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(employmentId) ||
    !validRevision(revision)
  )
    return {
      success: false,
      state: { status: "error", message: messages.invalid, fieldErrors },
    };

  return {
    success: true,
    data: {
      employmentId,
      revision,
      residenceCity,
      neighborhood,
      addressLine,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      internalNote,
      identity:
        identityValue && identityType
          ? {
              type: identityType,
              value: identityValue,
              countryCode: identityCountry,
            }
          : null,
    },
  };
}

export function parseSaveEmploymentContract(
  form: FormData,
  messages: StaffMessages = tr.staff,
): Parsed<SaveEmploymentContractInput> {
  const employmentId = form.get("employmentId");
  const contractIdRaw = form.get("contractId");
  const contractId =
    typeof contractIdRaw === "string" && contractIdRaw ? contractIdRaw : null;
  const templateIdRaw = form.get("contractTemplateId");
  const templateId =
    typeof templateIdRaw === "string" && templateIdRaw ? templateIdRaw : null;
  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && revisionRaw ? revisionRaw : null;
  const contractNumber = text(form.get("contractNumber"), 80);
  const typeRaw = form.get("contractType");
  const type =
    typeof typeRaw === "string" &&
    CONTRACT_TYPES.has(typeRaw as EmploymentContractType)
      ? (typeRaw as EmploymentContractType)
      : null;
  const statusRaw = form.get("contractStatus");
  const status =
    typeof statusRaw === "string" &&
    CONTRACT_STATUSES.has(statusRaw as EmploymentContractStatus)
      ? (statusRaw as EmploymentContractStatus)
      : null;
  const startedOn = parseDateOnly(form.get("contractStartedOn"));
  const endedOnRaw = form.get("contractEndedOn");
  const endedOn = endedOnRaw === "" ? null : parseDateOnly(endedOnRaw);
  const noteRaw = form.get("contractNote");
  const note = optionalText(noteRaw, 1000);
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!validSchoolId(employmentId)) fieldErrors.record = messages.failed;
  if (contractId && !validSchoolId(contractId))
    fieldErrors.contractId = messages.invalid;
  if (templateId && !validSchoolId(templateId))
    fieldErrors.contractTemplateId = messages.invalid;
  if (contractId && !validRevision(revision))
    fieldErrors.record = messages.conflict;
  if (!contractNumber) fieldErrors.contractNumber = messages.invalidContractNumber;
  if (!type) fieldErrors.contractType = messages.invalid;
  if (!status) fieldErrors.contractStatus = messages.invalid;
  if (!startedOn) fieldErrors.contractStartedOn = messages.invalidDate;
  if (provided(endedOnRaw) && !endedOn)
    fieldErrors.contractEndedOn = messages.invalidDate;
  if (startedOn && endedOn && endedOn < startedOn)
    fieldErrors.contractEndedOn = messages.invalidContractDates;
  if (provided(noteRaw) && !note) fieldErrors.contractNote = messages.invalid;

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(employmentId) ||
    (templateId && !validSchoolId(templateId)) ||
    (contractId && (!validSchoolId(contractId) || !validRevision(revision))) ||
    !contractNumber ||
    !type ||
    !status ||
    !startedOn
  )
    return {
      success: false,
      state: { status: "error", message: messages.invalid, fieldErrors },
    };

  return {
    success: true,
    data: {
      employmentId,
      contractId,
      templateId,
      revision,
      contractNumber,
      type,
      status,
      startedOn,
      endedOn,
      note,
    },
  };
}

export function parseSaveEmploymentCompensation(
  form: FormData,
  messages: StaffMessages = tr.staff,
): Parsed<SaveEmploymentCompensationInput> {
  const employmentId = form.get("employmentId");
  const compensationIdRaw = form.get("compensationId");
  const compensationId =
    typeof compensationIdRaw === "string" && compensationIdRaw
      ? compensationIdRaw
      : null;
  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && revisionRaw ? revisionRaw : null;
  const amount = decimalAmount(form.get("compensationAmount"));
  const compensationCurrency = currencyCode(form.get("compensationCurrency"));
  const amountKindRaw = form.get("compensationAmountKind");
  const amountKind =
    typeof amountKindRaw === "string" &&
    COMPENSATION_AMOUNT_KINDS.has(
      amountKindRaw as EmploymentCompensationAmountKind,
    )
      ? (amountKindRaw as EmploymentCompensationAmountKind)
      : null;
  const payTypeRaw = form.get("compensationPayType");
  const payType =
    typeof payTypeRaw === "string" &&
    COMPENSATION_PAY_TYPES.has(payTypeRaw as EmploymentCompensationPayType)
      ? (payTypeRaw as EmploymentCompensationPayType)
      : null;
  const statusRaw = form.get("compensationStatus");
  const status =
    typeof statusRaw === "string" &&
    COMPENSATION_STATUSES.has(statusRaw as EmploymentCompensationStatus)
      ? (statusRaw as EmploymentCompensationStatus)
      : null;
  const startedOn = parseDateOnly(form.get("compensationStartedOn"));
  const endedOnRaw = form.get("compensationEndedOn");
  const endedOn = endedOnRaw === "" ? null : parseDateOnly(endedOnRaw);
  const noteRaw = form.get("compensationNote");
  const note = optionalText(noteRaw, 1000);
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!validSchoolId(employmentId)) fieldErrors.record = messages.failed;
  if (compensationId && !validSchoolId(compensationId))
    fieldErrors.compensationId = messages.invalid;
  if (compensationId && !validRevision(revision))
    fieldErrors.record = messages.conflict;
  if (!amount) fieldErrors.compensationAmount = messages.invalidCompensationAmount;
  if (!compensationCurrency)
    fieldErrors.compensationCurrency = messages.invalidCurrency;
  if (!amountKind) fieldErrors.compensationAmountKind = messages.invalid;
  if (!payType) fieldErrors.compensationPayType = messages.invalid;
  if (!status) fieldErrors.compensationStatus = messages.invalid;
  if (!startedOn) fieldErrors.compensationStartedOn = messages.invalidDate;
  if (provided(endedOnRaw) && !endedOn)
    fieldErrors.compensationEndedOn = messages.invalidDate;
  if (startedOn && endedOn && endedOn < startedOn)
    fieldErrors.compensationEndedOn = messages.invalidCompensationDates;
  if (provided(noteRaw) && !note) fieldErrors.compensationNote = messages.invalid;

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(employmentId) ||
    (compensationId &&
      (!validSchoolId(compensationId) || !validRevision(revision))) ||
    !amount ||
    !compensationCurrency ||
    !amountKind ||
    !payType ||
    !status ||
    !startedOn
  )
    return {
      success: false,
      state: { status: "error", message: messages.invalid, fieldErrors },
    };

  return {
    success: true,
    data: {
      employmentId,
      compensationId,
      revision,
      amount,
      currencyCode: compensationCurrency,
      amountKind,
      payType,
      status,
      startedOn,
      endedOn,
      note,
    },
  };
}

export function parseSaveEmploymentLeave(
  form: FormData,
  messages: StaffMessages = tr.staff,
): Parsed<SaveEmploymentLeaveInput> {
  const employmentId = form.get("employmentId");
  const leaveIdRaw = form.get("leaveId");
  const leaveId =
    typeof leaveIdRaw === "string" && leaveIdRaw ? leaveIdRaw : null;
  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && revisionRaw ? revisionRaw : null;
  const kindRaw = form.get("leaveKind");
  const kind =
    typeof kindRaw === "string" && LEAVE_KINDS.has(kindRaw as EmploymentLeaveKind)
      ? (kindRaw as EmploymentLeaveKind)
      : null;
  const statusRaw = form.get("leaveStatus");
  const status =
    typeof statusRaw === "string" &&
    LEAVE_STATUSES.has(statusRaw as EmploymentLeaveStatus)
      ? (statusRaw as EmploymentLeaveStatus)
      : null;
  const startedOn = parseDateOnly(form.get("leaveStartedOn"));
  const endedOn = parseDateOnly(form.get("leaveEndedOn"));
  const dayCountRaw = form.get("leaveDayCount");
  const dayCount = leaveDayCount(dayCountRaw, startedOn, endedOn);
  const noteRaw = form.get("leaveNote");
  const note = optionalText(noteRaw, 1000);
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!validSchoolId(employmentId)) fieldErrors.record = messages.failed;
  if (leaveId && !validSchoolId(leaveId)) fieldErrors.leaveId = messages.invalid;
  if (leaveId && !validRevision(revision)) fieldErrors.record = messages.conflict;
  if (!kind) fieldErrors.leaveKind = messages.invalid;
  if (!status) fieldErrors.leaveStatus = messages.invalid;
  if (!startedOn) fieldErrors.leaveStartedOn = messages.invalidDate;
  if (!endedOn) fieldErrors.leaveEndedOn = messages.invalidDate;
  if (startedOn && endedOn && endedOn < startedOn)
    fieldErrors.leaveEndedOn = messages.invalidLeaveDates;
  if (!dayCount) fieldErrors.leaveDayCount = messages.invalidLeaveDayCount;
  if (provided(noteRaw) && !note) fieldErrors.leaveNote = messages.invalid;

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(employmentId) ||
    (leaveId && (!validSchoolId(leaveId) || !validRevision(revision))) ||
    !kind ||
    !status ||
    !startedOn ||
    !endedOn ||
    !dayCount
  )
    return {
      success: false,
      state: { status: "error", message: messages.invalid, fieldErrors },
    };

  return {
    success: true,
    data: {
      employmentId,
      leaveId,
      revision,
      kind,
      status,
      startedOn,
      endedOn,
      dayCount,
      note,
    },
  };
}

export function parseStaffCatalogItem(
  form: FormData,
): Parsed<StaffCatalogItemInput> {
  const kindRaw = form.get("catalogKind");
  const kind =
    typeof kindRaw === "string" &&
    STAFF_CATALOG_KINDS.has(kindRaw as StaffCatalogKind)
      ? (kindRaw as StaffCatalogKind)
      : null;
  const catalogIdRaw = form.get("catalogId");
  const catalogId =
    typeof catalogIdRaw === "string" && catalogIdRaw
      ? catalogIdRaw
      : null;
  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && revisionRaw ? revisionRaw : null;
  const code = catalogCode(form.get("code"));
  const nameTr = text(form.get("nameTr"), 120);
  const nameSq = text(form.get("nameSq"), 120);
  const nameEn = text(form.get("nameEn"), 120);
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!kind) fieldErrors.catalogKind = "Katalog turu gecersiz.";
  if (catalogId && !validSchoolId(catalogId))
    fieldErrors.catalogId = "Katalog kaydi gecersiz.";
  if (catalogId && !validRevision(revision))
    fieldErrors.record = "Kayit surumu gecersiz.";
  if (!code)
    fieldErrors.code =
      "Kod 2-50 karakter olmali; harf, rakam, tire veya alt cizgi kullanin.";
  if (!nameTr) fieldErrors.nameTr = "Turkce ad zorunlu.";
  if (!nameSq) fieldErrors.nameSq = "Arnavutca ad zorunlu.";
  if (!nameEn) fieldErrors.nameEn = "Ingilizce ad zorunlu.";

  if (
    Object.keys(fieldErrors).length ||
    !kind ||
    !code ||
    !nameTr ||
    !nameSq ||
    !nameEn ||
    (catalogId && (!validSchoolId(catalogId) || !validRevision(revision)))
  )
    return invalid(fieldErrors);

  return {
    success: true,
    data: {
      kind,
      catalogId,
      revision,
      code,
      name: { tr: nameTr, sq: nameSq, en: nameEn },
    },
  };
}

export function parseStaffCatalogTransition(
  form: FormData,
): Parsed<StaffCatalogTransitionInput> {
  const kindRaw = form.get("catalogKind");
  const kind =
    typeof kindRaw === "string" &&
    STAFF_CATALOG_KINDS.has(kindRaw as StaffCatalogKind)
      ? (kindRaw as StaffCatalogKind)
      : null;
  const catalogId = form.get("catalogId");
  const revision = form.get("revision");
  const transitionRaw = form.get("transition");
  const transition =
    typeof transitionRaw === "string" &&
    STAFF_CATALOG_TRANSITIONS.has(
      transitionRaw as StaffCatalogTransition,
    )
      ? (transitionRaw as StaffCatalogTransition)
      : null;
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!kind) fieldErrors.catalogKind = "Katalog turu gecersiz.";
  if (!validSchoolId(catalogId)) fieldErrors.catalogId = "Katalog kaydi gecersiz.";
  if (!validRevision(revision)) fieldErrors.record = "Kayit surumu gecersiz.";
  if (!transition) fieldErrors.record = "Islem gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !kind ||
    !validSchoolId(catalogId) ||
    !validRevision(revision) ||
    !transition
  )
    return invalid(fieldErrors);

  return {
    success: true,
    data: {
      kind,
      catalogId,
      revision,
      transition,
    },
  };
}

export function parseContractTemplate(
  form: FormData,
  messages: StaffMessages = tr.staff,
): Parsed<ContractTemplateInput> {
  const templateIdRaw = form.get("templateId");
  const templateId =
    typeof templateIdRaw === "string" && templateIdRaw ? templateIdRaw : null;
  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && revisionRaw ? revisionRaw : null;
  const code = templateCode(form.get("templateCode"));
  const localeRaw = form.get("templateLocale");
  const locale =
    typeof localeRaw === "string" && TEMPLATE_LOCALES.has(localeRaw)
      ? (localeRaw as "tr" | "sq" | "en")
      : null;
  const title = text(form.get("templateTitle"), 200);
  const headerRaw = form.get("templateHeader");
  const headerText = optionalMultilineText(headerRaw, 2000);
  const footerRaw = form.get("templateFooter");
  const footerText = optionalMultilineText(footerRaw, 2000);
  const noteRaw = form.get("templateNote");
  const note = optionalMultilineText(noteRaw, 1000);
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (templateId && !validSchoolId(templateId))
    fieldErrors.templateId = messages.invalid;
  if (templateId && !validRevision(revision)) fieldErrors.record = messages.conflict;
  if (!code) fieldErrors.templateCode = messages.invalidTemplateCode;
  if (!locale) fieldErrors.templateLocale = messages.invalid;
  if (!title) fieldErrors.templateTitle = messages.invalidTemplateTitle;
  if (provided(headerRaw) && !headerText)
    fieldErrors.templateHeader = messages.invalid;
  if (provided(footerRaw) && !footerText)
    fieldErrors.templateFooter = messages.invalid;
  if (provided(noteRaw) && !note) fieldErrors.templateNote = messages.invalid;

  if (
    Object.keys(fieldErrors).length ||
    !code ||
    !locale ||
    !title ||
    (templateId && (!validSchoolId(templateId) || !validRevision(revision)))
  )
    return {
      success: false,
      state: { status: "error", message: messages.invalid, fieldErrors },
    };

  return {
    success: true,
    data: {
      templateId,
      revision,
      code,
      locale,
      title,
      headerText,
      footerText,
      note,
    },
  };
}

export function parseContractTemplateTransition(
  form: FormData,
  messages: StaffMessages = tr.staff,
): Parsed<ContractTemplateTransitionInput> {
  const templateId = form.get("templateId");
  const revision = form.get("revision");
  const transitionRaw = form.get("transition");
  const transition =
    typeof transitionRaw === "string" &&
    STAFF_CATALOG_TRANSITIONS.has(transitionRaw as StaffCatalogTransition)
      ? (transitionRaw as StaffCatalogTransition)
      : null;
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!validSchoolId(templateId)) fieldErrors.templateId = messages.invalid;
  if (!validRevision(revision)) fieldErrors.record = messages.conflict;
  if (!transition) fieldErrors.record = messages.invalid;

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(templateId) ||
    !validRevision(revision) ||
    !transition
  )
    return {
      success: false,
      state: { status: "error", message: messages.invalid, fieldErrors },
    };

  return {
    success: true,
    data: { templateId, revision, transition },
  };
}

export function parseContractTemplateClause(
  form: FormData,
  messages: StaffMessages = tr.staff,
): Parsed<ContractTemplateClauseInput> {
  const templateId = form.get("templateId");
  const clauseIdRaw = form.get("clauseId");
  const clauseId =
    typeof clauseIdRaw === "string" && clauseIdRaw ? clauseIdRaw : null;
  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && revisionRaw ? revisionRaw : null;
  const orderRaw = form.get("clauseOrder");
  const sortOrder =
    typeof orderRaw === "string" && /^\d{1,3}$/.test(orderRaw)
      ? Number(orderRaw)
      : null;
  const title = text(form.get("clauseTitle"), 200);
  const body = multilineText(form.get("clauseBody"), 5000);
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!validSchoolId(templateId)) fieldErrors.templateId = messages.invalid;
  if (clauseId && !validSchoolId(clauseId)) fieldErrors.clauseId = messages.invalid;
  if (clauseId && !validRevision(revision)) fieldErrors.record = messages.conflict;
  if (!sortOrder || sortOrder < 1 || sortOrder > 999)
    fieldErrors.clauseOrder = messages.invalidClauseOrder;
  if (!title) fieldErrors.clauseTitle = messages.invalidClauseTitle;
  if (!body) fieldErrors.clauseBody = messages.invalidClauseBody;

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(templateId) ||
    (clauseId && (!validSchoolId(clauseId) || !validRevision(revision))) ||
    !sortOrder ||
    !title ||
    !body
  )
    return {
      success: false,
      state: { status: "error", message: messages.invalid, fieldErrors },
    };

  return {
    success: true,
    data: { templateId, clauseId, revision, sortOrder, title, body },
  };
}

export function parseContractTemplateClauseTransition(
  form: FormData,
  messages: StaffMessages = tr.staff,
): Parsed<ContractTemplateClauseTransitionInput> {
  const templateId = form.get("templateId");
  const clauseId = form.get("clauseId");
  const revision = form.get("revision");
  const transitionRaw = form.get("transition");
  const transition =
    typeof transitionRaw === "string" &&
    STAFF_CATALOG_TRANSITIONS.has(transitionRaw as StaffCatalogTransition)
      ? (transitionRaw as StaffCatalogTransition)
      : null;
  const fieldErrors: StaffState["fieldErrors"] = {};

  if (!validSchoolId(templateId)) fieldErrors.templateId = messages.invalid;
  if (!validSchoolId(clauseId)) fieldErrors.clauseId = messages.invalid;
  if (!validRevision(revision)) fieldErrors.record = messages.conflict;
  if (!transition) fieldErrors.record = messages.invalid;

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(templateId) ||
    !validSchoolId(clauseId) ||
    !validRevision(revision) ||
    !transition
  )
    return {
      success: false,
      state: { status: "error", message: messages.invalid, fieldErrors },
    };

  return {
    success: true,
    data: { templateId, clauseId, revision, transition },
  };
}
