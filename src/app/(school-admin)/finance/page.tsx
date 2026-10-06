import { PageHeader } from "@/components/admin/page-header";
import { StudentFinanceManager } from "@/components/school-admin/student-finance-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { StudentFinanceContractStatus } from "@/generated/prisma/client";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { validSchoolId } from "@/lib/platform-school-validation";
import { requireSchoolPermission } from "@/server/authorization/guards";
import {
  getStudentFinanceContext,
  getStudentFinanceContractDetail,
  getStudentFinanceContracts,
} from "@/server/finance/finance";

export const dynamic = "force-dynamic";

const CONTRACT_STATUSES = new Set<StudentFinanceContractStatus>([
  "DRAFT",
  "ACTIVE",
  "CANCELLED",
]);

function statusValue(value: string | undefined) {
  return value && CONTRACT_STATUSES.has(value as StudentFinanceContractStatus)
    ? (value as StudentFinanceContractStatus)
    : undefined;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    academicYearId?: string;
    status?: string;
    contractId?: string;
  }>;
}) {
  const [{ tenant, membership, permissions }, query] = await Promise.all([
    requireSchoolPermission("finance.contracts.read"),
    searchParams,
  ]);
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const selectedStatus = statusValue(query.status);
  const selectedYearId =
    query.academicYearId && validSchoolId(query.academicYearId)
      ? query.academicYearId
      : undefined;
  const selectedContractId =
    query.contractId && validSchoolId(query.contractId)
      ? query.contractId
      : null;

  const [dictionary, context, contracts, selectedContract] = await Promise.all([
    getDictionary(locale),
    getStudentFinanceContext(tenant.school.id),
    getStudentFinanceContracts(tenant.school.id, {
      query: query.q,
      academicYearId: selectedYearId,
      status: selectedStatus,
    }),
    selectedContractId
      ? getStudentFinanceContractDetail(tenant.school.id, selectedContractId)
      : Promise.resolve(null),
  ]);
  const text = dictionary.finance;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
      />

      <form className="grid gap-4 rounded-xl border bg-card p-5 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto] lg:items-end">
        <div>
          <Label htmlFor="finance-search">{text.searchLabel}</Label>
          <Input
            id="finance-search"
            name="q"
            type="search"
            defaultValue={query.q?.slice(0, 120) ?? ""}
            placeholder={text.searchPlaceholder}
            className="mt-2 h-10"
          />
        </div>
        <div>
          <Label htmlFor="finance-year-filter">{text.academicYear}</Label>
          <NativeSelect
            id="finance-year-filter"
            name="academicYearId"
            defaultValue={selectedYearId ?? ""}
            className="mt-2"
          >
            <option value="">{text.allYears}</option>
            {context.academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="finance-status-filter">{text.status}</Label>
          <NativeSelect
            id="finance-status-filter"
            name="status"
            defaultValue={selectedStatus ?? ""}
            className="mt-2"
          >
            <option value="">{text.allStatuses}</option>
            <option value="DRAFT">{text.statusDraft}</option>
            <option value="ACTIVE">{text.statusActive}</option>
            <option value="CANCELLED">{text.statusCancelled}</option>
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline" className="h-10">
          {text.applyFilters}
        </Button>
      </form>

      <StudentFinanceManager
        context={context}
        contracts={contracts}
        selectedContract={selectedContract}
        selectedContractId={selectedContractId}
        today={today()}
        locale={locale}
        messages={text}
        canManageContracts={permissions.includes("finance.contracts.manage")}
        canManagePayments={permissions.includes("finance.payments.manage")}
      />
    </div>
  );
}
