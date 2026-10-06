import type { StudentFinanceContractStatus } from "@/generated/prisma/client";
import { validRevision, validSchoolId } from "./platform-school-validation";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const CONTRACT_STATUSES = new Set<StudentFinanceContractStatus>([
  "DRAFT",
  "ACTIVE",
  "CANCELLED",
]);

export type FinanceField =
  | "record"
  | "studentProfileId"
  | "academicYearId"
  | "responsibleGuardianRelationshipId"
  | "protocolNumber"
  | "contractStatus"
  | "currencyCode"
  | "issuedOn"
  | "note";

export type FinanceState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<FinanceField, string>>;
  entityId?: string;
};

export type SaveStudentFinanceContractInput = {
  contractId: string | null;
  revision: string | null;
  studentProfileId: string;
  academicYearId: string;
  responsibleGuardianRelationshipId: string;
  protocolNumber: string;
  status: StudentFinanceContractStatus;
  currencyCode: string;
  issuedOn: Date;
  note: string | null;
};

type Parsed<T> =
  | { success: true; data: T }
  | { success: false; state: FinanceState };

function text(value: FormDataEntryValue | null, max: number) {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= max ? normalized : null;
}

function optionalText(value: FormDataEntryValue | null, max: number) {
  if (value === null || value === "") return null;
  return text(value, max);
}

function currencyCode(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function provided(value: FormDataEntryValue | null) {
  return typeof value === "string" && value !== "";
}

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

export function formatStudentFinanceContractDisplayNumber(
  academicYearName: string,
  protocolNumber: string,
) {
  return `${academicYearName.trim()} - Protocol ${protocolNumber.trim()}`;
}

export function parseSaveStudentFinanceContract(
  form: FormData,
): Parsed<SaveStudentFinanceContractInput> {
  const contractIdRaw = form.get("contractId");
  const contractId =
    typeof contractIdRaw === "string" && contractIdRaw ? contractIdRaw : null;
  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && revisionRaw ? revisionRaw : null;
  const studentProfileId = form.get("studentProfileId");
  const academicYearId = form.get("academicYearId");
  const responsibleGuardianRelationshipId = form.get(
    "responsibleGuardianRelationshipId",
  );
  const protocolNumber = text(form.get("protocolNumber"), 80);
  const statusRaw = form.get("contractStatus");
  const status =
    typeof statusRaw === "string" &&
    CONTRACT_STATUSES.has(statusRaw as StudentFinanceContractStatus)
      ? (statusRaw as StudentFinanceContractStatus)
      : "DRAFT";
  const code = currencyCode(form.get("currencyCode")) ?? "EUR";
  const issuedOnRaw = form.get("issuedOn");
  const issuedOn = parseDateOnly(issuedOnRaw);
  const noteRaw = form.get("note");
  const note = optionalText(noteRaw, 1000);
  const fieldErrors: FinanceState["fieldErrors"] = {};

  if (contractId && !validSchoolId(contractId))
    fieldErrors.record = "Kontrat kaydi gecersiz.";
  if (contractId && !validRevision(revision))
    fieldErrors.record = "Kontrat kaydi guncel degil.";
  if (!validSchoolId(studentProfileId))
    fieldErrors.studentProfileId = "Ogrenci kaydi gecersiz.";
  if (!validSchoolId(academicYearId))
    fieldErrors.academicYearId = "Ogretim yili gecersiz.";
  if (!validSchoolId(responsibleGuardianRelationshipId))
    fieldErrors.responsibleGuardianRelationshipId =
      "Odeme sorumlusu veli gecersiz.";
  if (!protocolNumber) fieldErrors.protocolNumber = "Protokol no gecersiz.";
  if (
    provided(statusRaw) &&
    !CONTRACT_STATUSES.has(statusRaw as StudentFinanceContractStatus)
  )
    fieldErrors.contractStatus = "Kontrat durumu gecersiz.";
  if (
    provided(form.get("currencyCode")) &&
    !currencyCode(form.get("currencyCode"))
  )
    fieldErrors.currencyCode = "Para birimi gecersiz.";
  if (!issuedOn) fieldErrors.issuedOn = "Protokol tarihi gecersiz.";
  if (provided(noteRaw) && !note) fieldErrors.note = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(studentProfileId) ||
    !validSchoolId(academicYearId) ||
    !validSchoolId(responsibleGuardianRelationshipId) ||
    !protocolNumber ||
    !issuedOn ||
    (contractId && (!validSchoolId(contractId) || !validRevision(revision)))
  ) {
    return {
      success: false,
      state: {
        status: "error",
        message: "Finans kontrat bilgileri gecersiz.",
        fieldErrors,
      },
    };
  }

  return {
    success: true,
    data: {
      contractId,
      revision,
      studentProfileId,
      academicYearId,
      responsibleGuardianRelationshipId,
      protocolNumber,
      status,
      currencyCode: code,
      issuedOn,
      note,
    },
  };
}
