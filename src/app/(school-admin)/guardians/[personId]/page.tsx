import { notFound } from "next/navigation";
import { GuardianDetailManager } from "@/components/school-admin/guardian-detail-manager";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { validSchoolId } from "@/lib/platform-school-validation";
import { getGuardianDetail } from "@/server/accounts/accounts";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getStudentFinanceContractsForGuardian } from "@/server/finance/finance";

export const dynamic = "force-dynamic";

export default async function GuardianDetailPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const [{ tenant, membership, permissions }, route] = await Promise.all([
    requireSchoolPermission("guardians.read"),
    params,
  ]);
  if (!validSchoolId(route.personId)) notFound();
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const canReadFinance = permissions.includes("finance.contracts.read");
  const [guardian, dictionary, financeContracts] = await Promise.all([
    getGuardianDetail(tenant.school.id, route.personId),
    getDictionary(locale),
    canReadFinance
      ? getStudentFinanceContractsForGuardian(tenant.school.id, route.personId)
      : Promise.resolve([]),
  ]);
  if (!guardian) notFound();
  const canManageGuardian = permissions.includes("guardians.manage");
  const canManageAccounts = permissions.includes("accounts.manage");

  return (
    <GuardianDetailManager
      guardian={guardian}
      canManageGuardian={canManageGuardian}
      canManageAccounts={canManageAccounts}
      canReadFinance={canReadFinance}
      financeContracts={financeContracts}
      messages={{
        common: dictionary.common,
        guardians: dictionary.guardians,
        finance: dictionary.finance,
      }}
    />
  );
}
