"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FinanceState } from "@/lib/finance-validation";
import {
  manageSaveStudentFinanceContract,
  manageSaveStudentFinanceContractItem,
  manageSaveStudentFinanceInstallmentPlan,
  manageSaveStudentFinancePayment,
} from "@/server/finance/manage-finance";

export async function saveStudentFinanceContractAction(
  _state: FinanceState,
  form: FormData,
) {
  const result = await manageSaveStudentFinanceContract(form);
  if (result.status === "success" && result.entityId) {
    revalidatePath("/finance");
    redirect(`/finance?contractId=${result.entityId}`);
  }
  return result;
}

export async function saveStudentFinanceContractItemAction(
  _state: FinanceState,
  form: FormData,
) {
  const result = await manageSaveStudentFinanceContractItem(form);
  const contractId = form.get("contractId");
  if (result.status === "success") {
    revalidatePath("/finance");
    if (typeof contractId === "string")
      revalidatePath(`/finance?contractId=${contractId}`);
  }
  return result;
}

export async function saveStudentFinanceInstallmentPlanAction(
  _state: FinanceState,
  form: FormData,
) {
  const result = await manageSaveStudentFinanceInstallmentPlan(form);
  const contractId = form.get("contractId");
  if (result.status === "success") {
    revalidatePath("/finance");
    if (typeof contractId === "string")
      revalidatePath(`/finance?contractId=${contractId}`);
  }
  return result;
}

export async function saveStudentFinancePaymentAction(
  _state: FinanceState,
  form: FormData,
) {
  const result = await manageSaveStudentFinancePayment(form);
  const contractId = form.get("contractId");
  if (result.status === "success") {
    revalidatePath("/finance");
    if (typeof contractId === "string")
      revalidatePath(`/finance?contractId=${contractId}`);
  }
  return result;
}
