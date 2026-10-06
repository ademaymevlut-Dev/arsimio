import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StaffCatalogManager } from "@/components/school-admin/staff-catalog-manager";
import { StaffContractTemplateManager } from "@/components/school-admin/staff-contract-template-manager";
import { Button } from "@/components/ui/button";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import {
  getStaffCatalogs,
  getStaffContractTemplates,
} from "@/server/staff/staff";

export const dynamic = "force-dynamic";

export default async function StaffSettingsPage() {
  const { tenant, membership, permissions } =
    await requireSchoolPermission("hr.catalog.read");
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const canReadContractTemplates = permissions.includes("hr.contracts.read");
  const [dictionary, catalogs, contractTemplates] = await Promise.all([
    getDictionary(locale),
    getStaffCatalogs(tenant.school.id, locale),
    canReadContractTemplates
      ? getStaffContractTemplates(tenant.school.id)
      : Promise.resolve([]),
  ]);
  const canManage = permissions.includes("hr.catalog.manage");
  const canManageContractTemplates = permissions.includes("hr.contracts.manage");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dictionary.staff.catalogEyebrow}
        title={dictionary.staff.catalogTitle}
        description={dictionary.staff.catalogDescription}
        actions={
          <Button asChild variant="outline">
            <Link href="/staff">
              <ArrowLeft aria-hidden />
              {dictionary.staff.backToStaff}
            </Link>
          </Button>
        }
      />
      <StaffCatalogManager
        departments={catalogs.departments}
        positions={catalogs.positions}
        messages={dictionary.staff}
        common={dictionary.common}
        canManage={canManage}
      />
      {canReadContractTemplates ? (
        <StaffContractTemplateManager
          templates={contractTemplates}
          messages={dictionary.staff}
          common={dictionary.common}
          canManage={canManageContractTemplates}
        />
      ) : null}
    </div>
  );
}
