import type {
  StudentFinanceContractItemKind,
  StudentFinanceContractItemStatus,
  StudentFinanceInstallmentKind,
  StudentFinanceContractStatus,
  StudentFinancePaymentStatus,
} from "@/generated/prisma/client";
import { validRevision, validSchoolId } from "./platform-school-validation";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const ZERO = BigInt(0);
const HUNDRED = BigInt(100);
const FIVE_THOUSAND = BigInt(5000);
const TEN_THOUSAND = BigInt(10000);
const CONTRACT_STATUSES = new Set<StudentFinanceContractStatus>([
  "DRAFT",
  "ACTIVE",
  "CANCELLED",
]);
const ITEM_KINDS = new Set<StudentFinanceContractItemKind>([
  "TUITION",
  "MEAL",
  "TRANSPORT",
  "UNIFORM",
  "BOOK_MATERIAL",
  "EXAM_ACTIVITY",
  "OTHER",
  "LATE_FEE",
]);
const ITEM_STATUSES = new Set<StudentFinanceContractItemStatus>([
  "ACTIVE",
  "ARCHIVED",
]);
const PAYMENT_STATUSES = new Set<StudentFinancePaymentStatus>([
  "ACTIVE",
  "ARCHIVED",
]);

export type FinanceField =
  | "record"
  | "contractId"
  | "itemId"
  | "studentProfileId"
  | "academicYearId"
  | "responsibleGuardianRelationshipId"
  | "protocolNumber"
  | "contractStatus"
  | "currencyCode"
  | "issuedOn"
  | "note"
  | "itemKind"
  | "itemDescription"
  | "grossAmount"
  | "discountRate"
  | "itemStatus"
  | "sortOrder"
  | "itemNote"
  | "planTotalAmount"
  | "downPaymentAmount"
  | "downPaymentDueDate"
  | "installmentCount"
  | "firstDueDate"
  | "paymentId"
  | "paidOn"
  | "paymentAmount"
  | "paymentDescription"
  | "paymentStatus";

export type FinanceState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<FinanceField, string>>;
  entityId?: string;
  values?: Partial<Record<FinanceField, string>>;
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

export type StudentFinanceContractItemAmounts = {
  grossAmount: string;
  discountRate: string;
  discountAmount: string;
  netAmount: string;
};

export type SaveStudentFinanceContractItemInput =
  StudentFinanceContractItemAmounts & {
    contractId: string;
    itemId: string | null;
    revision: string | null;
    kind: StudentFinanceContractItemKind;
    description: string;
    status: StudentFinanceContractItemStatus;
    sortOrder: number;
    note: string | null;
  };

export type StudentFinanceInstallmentPreviewLine = {
  kind: StudentFinanceInstallmentKind;
  sequence: number;
  label: string;
  dueDate: string;
  amount: string;
  note: string | null;
};

export type BuildStudentFinanceInstallmentPreviewInput = {
  totalAmount: string;
  downPaymentAmount: string;
  downPaymentDueDate: string;
  installmentCount: number;
  firstDueDate: string;
};

export type StudentFinanceInstallmentPreview =
  BuildStudentFinanceInstallmentPreviewInput & {
    lines: StudentFinanceInstallmentPreviewLine[];
  };

export type SaveStudentFinanceInstallmentPlanInput =
  StudentFinanceInstallmentPreview & {
    contractId: string;
  };

export type StudentFinanceBalanceSummary = {
  totalDebt: string;
  totalPaid: string;
  remainingBalance: string;
  overpaidAmount: string;
};

export type SaveStudentFinancePaymentInput = {
  contractId: string;
  paymentId: string | null;
  revision: string | null;
  paidOn: Date;
  amount: string;
  description: string;
  status: StudentFinancePaymentStatus;
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

function parseMoneyCents(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/€/g, "")
    .replace(/^(eur|euro)/i, "")
    .replace(/(eur|euro)$/i, "")
    .replace(",", ".");
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const units = BigInt(match[1]);
  const cents = BigInt((match[2] ?? "").padEnd(2, "0"));
  return units * HUNDRED + cents;
}

function parsePercentBasisPoints(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const whole = BigInt(match[1]);
  const decimals = BigInt((match[2] ?? "").padEnd(2, "0"));
  const basisPoints = whole * HUNDRED + decimals;
  return basisPoints <= TEN_THOUSAND ? basisPoints : null;
}

function formatCents(cents: bigint) {
  const sign = cents < ZERO ? "-" : "";
  const absolute = cents < ZERO ? -cents : cents;
  return `${sign}${absolute / HUNDRED}.${(absolute % HUNDRED).toString().padStart(2, "0")}`;
}

function formatBasisPoints(basisPoints: bigint) {
  return `${basisPoints / HUNDRED}.${(basisPoints % HUNDRED).toString().padStart(2, "0")}`;
}

function parseSortOrder(value: FormDataEntryValue | null) {
  if (value === null || value === "") return 0;
  if (typeof value !== "string" || !/^\d{1,4}$/.test(value)) return null;
  return Number.parseInt(value, 10);
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

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysInMonthUtc(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addMonthsClamped(date: Date, months: number) {
  const originalDay = date.getUTCDate();
  const monthIndex = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const targetDay = Math.min(
    originalDay,
    daysInMonthUtc(targetYear, targetMonth),
  );
  return new Date(Date.UTC(targetYear, targetMonth, targetDay));
}

function parseInstallmentCount(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d{1,2}$/.test(value)) return null;
  const count = Number.parseInt(value, 10);
  return count >= 1 && count <= 60 ? count : null;
}

function distributeCents(amount: bigint, count: number) {
  if (count < 1 || amount < ZERO) return null;
  const divisor = BigInt(count);
  const base = amount / divisor;
  const remainder = amount % divisor;
  const values = Array.from({ length: count }, () => base);
  values[count - 1] += remainder;
  return values;
}

export function formatStudentFinanceContractDisplayNumber(
  academicYearName: string,
  protocolNumber: string,
) {
  return `${academicYearName.trim()} - Protocol ${protocolNumber.trim()}`;
}

export function calculateStudentFinanceContractItemAmounts(
  grossAmount: string,
  discountRate: string,
): StudentFinanceContractItemAmounts | null {
  const grossCents = parseMoneyCents(grossAmount);
  const basisPoints = parsePercentBasisPoints(discountRate);
  if (grossCents === null || basisPoints === null || grossCents <= ZERO)
    return null;

  const discountCents =
    (grossCents * basisPoints + FIVE_THOUSAND) / TEN_THOUSAND;
  const netCents = grossCents - discountCents;

  return {
    grossAmount: formatCents(grossCents),
    discountRate: formatBasisPoints(basisPoints),
    discountAmount: formatCents(discountCents),
    netAmount: formatCents(netCents),
  };
}

export function calculateStudentFinanceBalance(
  activeItemNetAmounts: string[],
  activePaymentAmounts: string[],
): StudentFinanceBalanceSummary | null {
  const itemCents = activeItemNetAmounts.map((amount) =>
    parseMoneyCents(amount),
  );
  const paymentCents = activePaymentAmounts.map((amount) =>
    parseMoneyCents(amount),
  );

  if (
    itemCents.some((amount) => amount === null) ||
    paymentCents.some((amount) => amount === null)
  )
    return null;

  const totalDebtCents = (itemCents as bigint[]).reduce(
    (sum, amount) => sum + amount,
    ZERO,
  );
  const totalPaidCents = (paymentCents as bigint[]).reduce(
    (sum, amount) => sum + amount,
    ZERO,
  );
  const netBalanceCents = totalDebtCents - totalPaidCents;

  return {
    totalDebt: formatCents(totalDebtCents),
    totalPaid: formatCents(totalPaidCents),
    remainingBalance: formatCents(
      netBalanceCents > ZERO ? netBalanceCents : ZERO,
    ),
    overpaidAmount: formatCents(
      netBalanceCents < ZERO ? -netBalanceCents : ZERO,
    ),
  };
}

export function buildStudentFinanceInstallmentPreview({
  totalAmount,
  downPaymentAmount,
  downPaymentDueDate,
  installmentCount,
  firstDueDate,
}: BuildStudentFinanceInstallmentPreviewInput): StudentFinanceInstallmentPreview | null {
  const totalCents = parseMoneyCents(totalAmount);
  const downPaymentCents = parseMoneyCents(downPaymentAmount);
  const parsedDownPaymentDueDate = parseDateOnly(downPaymentDueDate);
  const parsedFirstDueDate = parseDateOnly(firstDueDate);

  if (
    totalCents === null ||
    totalCents <= ZERO ||
    downPaymentCents === null ||
    downPaymentCents < ZERO ||
    downPaymentCents > totalCents ||
    installmentCount < 1 ||
    installmentCount > 60 ||
    !parsedDownPaymentDueDate ||
    !parsedFirstDueDate
  )
    return null;

  const remainingCents = totalCents - downPaymentCents;
  const installmentAmounts = distributeCents(remainingCents, installmentCount);
  if (!installmentAmounts) return null;

  return {
    totalAmount: formatCents(totalCents),
    downPaymentAmount: formatCents(downPaymentCents),
    downPaymentDueDate: formatDateOnly(parsedDownPaymentDueDate),
    installmentCount,
    firstDueDate: formatDateOnly(parsedFirstDueDate),
    lines: [
      {
        kind: "DOWN_PAYMENT",
        sequence: 0,
        label: "Peşinat / Parapagim",
        dueDate: formatDateOnly(parsedDownPaymentDueDate),
        amount: formatCents(downPaymentCents),
        note: null,
      },
      ...installmentAmounts.map((amount, index) => ({
        kind: "INSTALLMENT" as const,
        sequence: index + 1,
        label: `Kësti ${index + 1}`,
        dueDate: formatDateOnly(addMonthsClamped(parsedFirstDueDate, index)),
        amount: formatCents(amount),
        note: null,
      })),
    ],
  };
}

export function redistributeStudentFinanceInstallmentAmounts(
  totalAmount: string,
  downPaymentAmount: string,
  currentInstallmentAmounts: string[],
  changedSequence: number,
  changedAmount: string,
) {
  const totalCents = parseMoneyCents(totalAmount);
  const downPaymentCents = parseMoneyCents(downPaymentAmount);
  const changedCents = parseMoneyCents(changedAmount);
  const currentCents = currentInstallmentAmounts.map((amount) =>
    parseMoneyCents(amount),
  );

  if (
    totalCents === null ||
    downPaymentCents === null ||
    changedCents === null ||
    totalCents <= ZERO ||
    downPaymentCents < ZERO ||
    downPaymentCents > totalCents ||
    changedCents < ZERO ||
    currentCents.length < 1 ||
    currentCents.some((amount) => amount === null) ||
    changedSequence < 1 ||
    changedSequence > currentCents.length
  )
    return null;

  const normalizedCurrent = currentCents as bigint[];
  const changedIndex = changedSequence - 1;
  const beforeChanged = normalizedCurrent
    .slice(0, changedIndex)
    .reduce((sum, amount) => sum + amount, ZERO);
  const remainingAfterChanged =
    totalCents - downPaymentCents - beforeChanged - changedCents;
  const remainingSlots = normalizedCurrent.length - changedSequence;

  if (remainingAfterChanged < ZERO) return null;
  if (remainingSlots === 0 && remainingAfterChanged !== ZERO) return null;

  const redistributed =
    remainingSlots > 0
      ? distributeCents(remainingAfterChanged, remainingSlots)
      : [];
  if (!redistributed) return null;

  return [
    ...normalizedCurrent.slice(0, changedIndex).map(formatCents),
    formatCents(changedCents),
    ...redistributed.map(formatCents),
  ];
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

export function parseSaveStudentFinanceContractItem(
  form: FormData,
): Parsed<SaveStudentFinanceContractItemInput> {
  const contractId = form.get("contractId");
  const itemIdRaw = form.get("itemId");
  const itemId = typeof itemIdRaw === "string" && itemIdRaw ? itemIdRaw : null;
  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && revisionRaw ? revisionRaw : null;
  const kindRaw = form.get("itemKind");
  const kind =
    typeof kindRaw === "string" &&
    ITEM_KINDS.has(kindRaw as StudentFinanceContractItemKind)
      ? (kindRaw as StudentFinanceContractItemKind)
      : null;
  const description = text(form.get("itemDescription"), 200);
  const grossCents = parseMoneyCents(form.get("grossAmount"));
  const discountBasisPoints =
    parsePercentBasisPoints(form.get("discountRate")) ?? ZERO;
  const amounts =
    grossCents !== null
      ? calculateStudentFinanceContractItemAmounts(
          formatCents(grossCents),
          formatBasisPoints(discountBasisPoints),
        )
      : null;
  const statusRaw = form.get("itemStatus");
  const status =
    typeof statusRaw === "string" &&
    ITEM_STATUSES.has(statusRaw as StudentFinanceContractItemStatus)
      ? (statusRaw as StudentFinanceContractItemStatus)
      : "ACTIVE";
  const sortOrder = parseSortOrder(form.get("sortOrder"));
  const noteRaw = form.get("itemNote");
  const note = optionalText(noteRaw, 1000);
  const fieldErrors: FinanceState["fieldErrors"] = {};

  if (!validSchoolId(contractId)) fieldErrors.contractId = "Kontrat gecersiz.";
  if (itemId && !validSchoolId(itemId)) fieldErrors.itemId = "Kalem gecersiz.";
  if (itemId && !validRevision(revision))
    fieldErrors.record = "Kalem kaydi guncel degil.";
  if (!kind) fieldErrors.itemKind = "Kalem turu gecersiz.";
  if (!description) fieldErrors.itemDescription = "Kalem aciklamasi gecersiz.";
  if (grossCents === null || grossCents <= ZERO)
    fieldErrors.grossAmount = "Brut tutar gecersiz.";
  if (
    provided(form.get("discountRate")) &&
    parsePercentBasisPoints(form.get("discountRate")) === null
  )
    fieldErrors.discountRate = "Indirim yuzdesi gecersiz.";
  if (
    provided(statusRaw) &&
    !ITEM_STATUSES.has(statusRaw as StudentFinanceContractItemStatus)
  )
    fieldErrors.itemStatus = "Kalem durumu gecersiz.";
  if (sortOrder === null) fieldErrors.sortOrder = "Siralama gecersiz.";
  if (provided(noteRaw) && !note) fieldErrors.itemNote = "Not gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(contractId) ||
    (itemId && (!validSchoolId(itemId) || !validRevision(revision))) ||
    !kind ||
    !description ||
    !amounts ||
    sortOrder === null
  ) {
    return {
      success: false,
      state: {
        status: "error",
        message: "Finans kalem bilgileri gecersiz.",
        fieldErrors,
      },
    };
  }

  return {
    success: true,
    data: {
      contractId,
      itemId,
      revision,
      kind,
      description,
      ...amounts,
      status,
      sortOrder,
      note,
    },
  };
}

export function parseSaveStudentFinanceInstallmentPlan(
  form: FormData,
): Parsed<SaveStudentFinanceInstallmentPlanInput> {
  const contractId = form.get("contractId");
  const totalAmountRaw = form.get("planTotalAmount");
  const downPaymentAmountRaw = form.get("downPaymentAmount");
  const downPaymentDueDateRaw = form.get("downPaymentDueDate");
  const installmentCount = parseInstallmentCount(form.get("installmentCount"));
  const firstDueDateRaw = form.get("firstDueDate");
  const totalCents = parseMoneyCents(totalAmountRaw);
  const downPaymentCents = parseMoneyCents(downPaymentAmountRaw);
  const downPaymentDueDate =
    typeof downPaymentDueDateRaw === "string" ? downPaymentDueDateRaw : "";
  const firstDueDate = typeof firstDueDateRaw === "string" ? firstDueDateRaw : "";
  const fieldErrors: FinanceState["fieldErrors"] = {};

  if (!validSchoolId(contractId)) fieldErrors.contractId = "Kontrat gecersiz.";
  if (totalCents === null || totalCents <= ZERO)
    fieldErrors.planTotalAmount = "Toplam tutar gecersiz.";
  if (downPaymentCents === null || downPaymentCents < ZERO)
    fieldErrors.downPaymentAmount = "Pesinat tutari gecersiz.";
  if (
    totalCents !== null &&
    downPaymentCents !== null &&
    downPaymentCents > totalCents
  )
    fieldErrors.downPaymentAmount = "Pesinat toplam tutardan buyuk olamaz.";
  if (!parseDateOnly(downPaymentDueDateRaw))
    fieldErrors.downPaymentDueDate = "Pesinat tarihi gecersiz.";
  if (!installmentCount)
    fieldErrors.installmentCount = "Taksit sayisi gecersiz.";
  if (!parseDateOnly(firstDueDateRaw))
    fieldErrors.firstDueDate = "Ilk vade tarihi gecersiz.";

  const preview =
    totalCents !== null &&
    downPaymentCents !== null &&
    installmentCount !== null
      ? buildStudentFinanceInstallmentPreview({
          totalAmount: formatCents(totalCents),
          downPaymentAmount: formatCents(downPaymentCents),
          downPaymentDueDate,
          installmentCount,
          firstDueDate,
        })
      : null;

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(contractId) ||
    !preview
  ) {
    return {
      success: false,
      state: {
        status: "error",
        message: "Taksit plani bilgileri gecersiz.",
        fieldErrors,
      },
    };
  }

  return {
    success: true,
    data: {
      contractId,
      ...preview,
    },
  };
}

export function parseSaveStudentFinancePayment(
  form: FormData,
): Parsed<SaveStudentFinancePaymentInput> {
  const contractId = form.get("contractId");
  const paymentIdRaw = form.get("paymentId");
  const paymentId =
    typeof paymentIdRaw === "string" && paymentIdRaw ? paymentIdRaw : null;
  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && revisionRaw ? revisionRaw : null;
  const paidOnRaw = form.get("paidOn");
  const paidOn = parseDateOnly(paidOnRaw);
  const amountRaw = form.get("paymentAmount");
  const amountCents = parseMoneyCents(amountRaw);
  const descriptionRaw = form.get("paymentDescription");
  const description = optionalText(descriptionRaw, 300) ?? "Ödeme";
  const statusRaw = form.get("paymentStatus");
  const status =
    typeof statusRaw === "string" &&
    PAYMENT_STATUSES.has(statusRaw as StudentFinancePaymentStatus)
      ? (statusRaw as StudentFinancePaymentStatus)
      : "ACTIVE";
  const fieldErrors: FinanceState["fieldErrors"] = {};

  if (!validSchoolId(contractId)) fieldErrors.contractId = "Kontrat gecersiz.";
  if (paymentId && !validSchoolId(paymentId))
    fieldErrors.paymentId = "Odeme kaydi gecersiz.";
  if (paymentId && !validRevision(revision))
    fieldErrors.record = "Odeme kaydi guncel degil.";
  if (!paidOn) fieldErrors.paidOn = "Odeme tarihi gecersiz.";
  if (amountCents === null || amountCents <= ZERO)
    fieldErrors.paymentAmount = "Odeme tutari gecersiz.";
  if (
    typeof descriptionRaw === "string" &&
    descriptionRaw.trim().length > 0 &&
    !optionalText(descriptionRaw, 300)
  )
    fieldErrors.paymentDescription = "Odeme aciklamasi gecersiz.";
  if (
    provided(statusRaw) &&
    !PAYMENT_STATUSES.has(statusRaw as StudentFinancePaymentStatus)
  )
    fieldErrors.paymentStatus = "Odeme durumu gecersiz.";

  if (
    Object.keys(fieldErrors).length ||
    !validSchoolId(contractId) ||
    (paymentId && (!validSchoolId(paymentId) || !validRevision(revision))) ||
    !paidOn ||
    amountCents === null ||
    amountCents <= ZERO
  ) {
    return {
      success: false,
      state: {
        status: "error",
        message: "Odeme bilgileri gecersiz.",
        fieldErrors,
        values: {
          paidOn: typeof paidOnRaw === "string" ? paidOnRaw : "",
          paymentAmount: typeof amountRaw === "string" ? amountRaw : "",
          paymentDescription:
            typeof descriptionRaw === "string" ? descriptionRaw : "",
        },
      },
    };
  }

  return {
    success: true,
    data: {
      contractId,
      paymentId,
      revision,
      paidOn,
      amount: formatCents(amountCents),
      description,
      status,
    },
  };
}
