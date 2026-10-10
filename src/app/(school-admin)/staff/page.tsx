import { StaffDirectoryTable } from "@/components/school-admin/staff-directory-table";
import type { EmploymentStatus } from "@/generated/prisma/client";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getStaffDirectory } from "@/server/staff/staff";

export const dynamic = "force-dynamic";

const STATUSES = new Set<EmploymentStatus>(["ACTIVE", "ON_LEAVE", "ENDED"]);

function statusValue(value: string | undefined) {
  return value && STATUSES.has(value as EmploymentStatus)
    ? (value as EmploymentStatus)
    : undefined;
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [{ tenant, membership, permissions }, query] = await Promise.all([
    requireSchoolPermission("hr.staff.read"),
    searchParams,
  ]);
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const selectedStatus = statusValue(query.status);
  const [staff, dictionary] = await Promise.all([
    getStaffDirectory(tenant.school.id, locale),
    getDictionary(locale),
  ]);

  return (
    <StaffDirectoryTable
      staff={staff}
      initialQuery={query.q?.slice(0, 100)}
      initialStatus={selectedStatus}
      canManage={permissions.includes("hr.staff.manage")}
      canReadCatalog={permissions.includes("hr.catalog.read")}
      locale={locale}
      messages={{ common: dictionary.common, staff: dictionary.staff }}
    />
  );
}
