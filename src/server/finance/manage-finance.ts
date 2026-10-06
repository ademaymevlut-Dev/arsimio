import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { getPrisma } from "@/lib/db";
import {
  parseSaveStudentFinanceContract,
  parseSaveStudentFinanceContractItem,
  parseSaveStudentFinanceInstallmentPlan,
  parseSaveStudentFinancePayment,
  type FinanceState,
  type SaveStudentFinanceContractInput,
  type SaveStudentFinanceContractItemInput,
  type SaveStudentFinanceInstallmentPlanInput,
  type SaveStudentFinancePaymentInput,
} from "@/lib/finance-validation";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { isSameOrigin } from "@/server/auth/identifiers";

type FinanceMessages = {
  invalid: string;
  failed: string;
  conflict: string;
  duplicate: string;
  invalidRelation: string;
  contractSaved: string;
  itemSaved: string;
  installmentPlanSaved: string;
  paymentSaved: string;
};

type FinanceActor = {
  schoolId: string;
  actorUserId: string;
  messages: FinanceMessages;
};

async function actorContext(permission: string) {
  const { user, tenant, membership } = await requireSchoolPermission(permission);
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  )
    return null;
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const dictionary = await getDictionary(locale);
  return {
    schoolId: tenant.school.id,
    actorUserId: user.id,
    messages: dictionary.finance,
  } satisfies FinanceActor;
}

async function invalid(): Promise<FinanceState> {
  const dictionary = await getDictionary("tr");
  return { status: "error", message: dictionary.finance.invalid };
}

function databaseError(
  errorValue: unknown,
  messages: FinanceMessages,
): FinanceState {
  if (!errorValue || typeof errorValue !== "object" || !("code" in errorValue))
    return { status: "error", message: messages.failed };
  const code = String(errorValue.code);
  if (code === "P2034") return { status: "error", message: messages.conflict };
  if (code === "P2002") return { status: "error", message: messages.duplicate };
  if (["P2003", "P2004", "P2010"].includes(code))
    return { status: "error", message: messages.invalidRelation };
  return { status: "error", message: messages.failed };
}

async function run<T>(
  permission: string,
  parser: (form: FormData) =>
    | { success: true; data: T }
    | { success: false; state: FinanceState },
  persist: (
    tx: Prisma.TransactionClient,
    actor: FinanceActor,
    data: T,
  ) => Promise<FinanceState>,
  form: FormData,
): Promise<FinanceState> {
  const actor = await actorContext(permission);
  if (!actor) return invalid();
  const parsed = parser(form);
  if (!parsed.success) return parsed.state;
  try {
    return await getPrisma().$transaction(
      (tx) => persist(tx, actor, parsed.data),
      { isolationLevel: "Serializable", timeout: 15000 },
    );
  } catch (errorValue) {
    console.error("STUDENT_FINANCE_SAVE_UNAVAILABLE", errorValue);
    return databaseError(errorValue, actor.messages);
  }
}

async function persistContract(
  tx: Prisma.TransactionClient,
  actor: FinanceActor,
  data: SaveStudentFinanceContractInput,
): Promise<FinanceState> {
  const relation = await tx.guardianRelationship.findFirst({
    where: {
      id: data.responsibleGuardianRelationshipId,
      schoolId: actor.schoolId,
      studentProfileId: data.studentProfileId,
      archivedAt: null,
    },
    select: { id: true },
  });
  const academicYear = await tx.academicYear.findFirst({
    where: { id: data.academicYearId, schoolId: actor.schoolId, archivedAt: null },
    select: { id: true },
  });
  const student = await tx.studentProfile.findFirst({
    where: { id: data.studentProfileId, schoolId: actor.schoolId },
    select: { id: true },
  });
  if (!relation || !academicYear || !student)
    return {
      status: "error",
      message: actor.messages.invalidRelation,
      fieldErrors: { responsibleGuardianRelationshipId: actor.messages.invalidRelation },
    };

  const record = {
    studentProfileId: data.studentProfileId,
    academicYearId: data.academicYearId,
    responsibleGuardianRelationshipId: data.responsibleGuardianRelationshipId,
    protocolNumber: data.protocolNumber,
    status: data.status,
    currencyCode: data.currencyCode,
    issuedOn: data.issuedOn,
    note: data.note,
    updatedByUserId: actor.actorUserId,
  };

  if (data.contractId) {
    const result = await tx.studentFinanceContract.updateMany({
      where: {
        id: data.contractId,
        schoolId: actor.schoolId,
        updatedAt: new Date(data.revision!),
      },
      data: record,
    });
    if (result.count !== 1)
      return { status: "error", message: actor.messages.conflict };
    return {
      status: "success",
      message: actor.messages.contractSaved,
      entityId: data.contractId,
    };
  }

  const created = await tx.studentFinanceContract.create({
    data: {
      ...record,
      schoolId: actor.schoolId,
      createdByUserId: actor.actorUserId,
    },
    select: { id: true },
  });
  return {
    status: "success",
    message: actor.messages.contractSaved,
    entityId: created.id,
  };
}

async function persistItem(
  tx: Prisma.TransactionClient,
  actor: FinanceActor,
  data: SaveStudentFinanceContractItemInput,
): Promise<FinanceState> {
  const contract = await tx.studentFinanceContract.findFirst({
    where: { id: data.contractId, schoolId: actor.schoolId },
    select: { id: true },
  });
  if (!contract)
    return { status: "error", message: actor.messages.invalidRelation };

  const record = {
    kind: data.kind,
    description: data.description,
    grossAmount: data.grossAmount,
    discountRate: data.discountRate,
    discountAmount: data.discountAmount,
    netAmount: data.netAmount,
    status: data.status,
    sortOrder: data.sortOrder,
    note: data.note,
    updatedByUserId: actor.actorUserId,
  };

  if (data.itemId) {
    const result = await tx.studentFinanceContractItem.updateMany({
      where: {
        id: data.itemId,
        schoolId: actor.schoolId,
        contractId: data.contractId,
        updatedAt: new Date(data.revision!),
      },
      data: record,
    });
    if (result.count !== 1)
      return { status: "error", message: actor.messages.conflict };
  } else {
    await tx.studentFinanceContractItem.create({
      data: {
        ...record,
        schoolId: actor.schoolId,
        contractId: data.contractId,
        createdByUserId: actor.actorUserId,
      },
    });
  }

  return { status: "success", message: actor.messages.itemSaved };
}

async function persistInstallmentPlan(
  tx: Prisma.TransactionClient,
  actor: FinanceActor,
  data: SaveStudentFinanceInstallmentPlanInput,
): Promise<FinanceState> {
  const contract = await tx.studentFinanceContract.findFirst({
    where: { id: data.contractId, schoolId: actor.schoolId },
    select: { id: true },
  });
  if (!contract)
    return { status: "error", message: actor.messages.invalidRelation };

  await tx.studentFinanceInstallment.deleteMany({
    where: { schoolId: actor.schoolId, contractId: data.contractId },
  });
  await tx.studentFinanceInstallment.createMany({
    data: data.lines.map((line) => ({
      schoolId: actor.schoolId,
      contractId: data.contractId,
      kind: line.kind,
      sequence: line.sequence,
      label: line.label,
      dueDate: new Date(`${line.dueDate}T00:00:00.000Z`),
      amount: line.amount,
      note: line.note,
      createdByUserId: actor.actorUserId,
      updatedByUserId: actor.actorUserId,
    })),
  });
  return { status: "success", message: actor.messages.installmentPlanSaved };
}

async function persistPayment(
  tx: Prisma.TransactionClient,
  actor: FinanceActor,
  data: SaveStudentFinancePaymentInput,
): Promise<FinanceState> {
  const contract = await tx.studentFinanceContract.findFirst({
    where: { id: data.contractId, schoolId: actor.schoolId },
    select: { id: true },
  });
  if (!contract)
    return { status: "error", message: actor.messages.invalidRelation };

  const record = {
    paidOn: data.paidOn,
    amount: data.amount,
    description: data.description,
    status: data.status,
    updatedByUserId: actor.actorUserId,
  };

  if (data.paymentId) {
    const result = await tx.studentFinancePayment.updateMany({
      where: {
        id: data.paymentId,
        schoolId: actor.schoolId,
        contractId: data.contractId,
        updatedAt: new Date(data.revision!),
      },
      data: record,
    });
    if (result.count !== 1)
      return { status: "error", message: actor.messages.conflict };
  } else {
    await tx.studentFinancePayment.create({
      data: {
        ...record,
        schoolId: actor.schoolId,
        contractId: data.contractId,
        createdByUserId: actor.actorUserId,
      },
    });
  }

  return { status: "success", message: actor.messages.paymentSaved };
}

export function manageSaveStudentFinanceContract(form: FormData) {
  return run(
    "finance.contracts.manage",
    parseSaveStudentFinanceContract,
    persistContract,
    form,
  );
}

export function manageSaveStudentFinanceContractItem(form: FormData) {
  return run(
    "finance.contracts.manage",
    parseSaveStudentFinanceContractItem,
    persistItem,
    form,
  );
}

export function manageSaveStudentFinanceInstallmentPlan(form: FormData) {
  return run(
    "finance.contracts.manage",
    parseSaveStudentFinanceInstallmentPlan,
    persistInstallmentPlan,
    form,
  );
}

export function manageSaveStudentFinancePayment(form: FormData) {
  return run(
    "finance.payments.manage",
    parseSaveStudentFinancePayment,
    persistPayment,
    form,
  );
}
