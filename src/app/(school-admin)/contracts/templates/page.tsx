import { PageHeader } from "@/components/admin/page-header";
import { StaffContractTemplateManager } from "@/components/school-admin/staff-contract-template-manager";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getStaffContractTemplates } from "@/server/staff/staff";

export const dynamic = "force-dynamic";

export default async function ContractTemplatesPage() {
  const { tenant, membership, permissions } =
    await requireSchoolPermission("hr.contracts.read");
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const [dictionary, contractTemplates] = await Promise.all([
    getDictionary(locale),
    getStaffContractTemplates(tenant.school.id),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dictionary.shell.contracts}
        title={dictionary.staff.contractTemplateSettingsTitle}
        description={dictionary.staff.contractTemplateSettingsDescription}
      />
      <StaffContractTemplateManager
        templates={contractTemplates}
        messages={dictionary.staff}
        common={dictionary.common}
        canManage={permissions.includes("hr.contracts.manage")}
      />
    </div>
  );
}
