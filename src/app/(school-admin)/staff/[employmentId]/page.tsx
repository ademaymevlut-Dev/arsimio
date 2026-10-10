import { notFound } from "next/navigation";
import { StaffDetailManager } from "@/components/school-admin/staff-detail-manager";
import {
  dateOnlyInTimeZone,
  dateOnlyValue,
} from "@/lib/academic-calendar-validation";
import { validSchoolId } from "@/lib/platform-school-validation";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getStaffDetail } from "@/server/staff/staff";
import { identityProtectionIsReady } from "@/server/students/person-identity";

export const dynamic = "force-dynamic";

export default async function StaffDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ employmentId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ tenant, membership, permissions }, route, query] = await Promise.all([
    requireSchoolPermission("hr.staff.read"),
    params,
    searchParams,
  ]);
  if (!validSchoolId(route.employmentId)) notFound();
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const [staff, dictionary] = await Promise.all([
    getStaffDetail(
      tenant.school.id,
      route.employmentId,
      locale,
      permissions.includes("hr.contracts.read"),
      permissions.includes("hr.compensation.read"),
      permissions.includes("hr.leave.read"),
    ),
    getDictionary(locale),
  ]);
  if (!staff) notFound();

  return (
    <StaffDetailManager
      staff={staff}
      canManageStaff={permissions.includes("hr.staff.manage")}
      canManageTeachers={permissions.includes("teachers.manage")}
      canManageAccounts={permissions.includes("accounts.manage")}
      canReadContracts={permissions.includes("hr.contracts.read")}
      canManageContracts={permissions.includes("hr.contracts.manage")}
      canReadCompensations={permissions.includes("hr.compensation.read")}
      canManageCompensations={permissions.includes("hr.compensation.manage")}
      canReadLeaves={permissions.includes("hr.leave.read")}
      canManageLeaves={permissions.includes("hr.leave.manage")}
      canManageIdentity={permissions.includes("persons.identity.manage")}
      identityProtectionReady={identityProtectionIsReady()}
      initialTab={Array.isArray(query.tab) ? query.tab[0] : query.tab}
      defaultEffectiveOn={dateOnlyValue(
        dateOnlyInTimeZone(new Date(), tenant.school.timezone),
      )}
      locale={locale}
      messages={{ common: dictionary.common, staff: dictionary.staff }}
    />
  );
}
