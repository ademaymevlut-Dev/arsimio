import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { StaffDetailManager } from "@/components/school-admin/staff-detail-manager";
import {
  dateOnlyInTimeZone,
  dateOnlyValue,
} from "@/lib/academic-calendar-validation";
import { validSchoolId } from "@/lib/platform-school-validation";
import { getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getStaffDetail } from "@/server/staff/staff";

export const dynamic = "force-dynamic";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ employmentId: string }>;
}) {
  const [{ tenant, membership, permissions }, route] = await Promise.all([
    requireSchoolPermission("hr.staff.read"),
    params,
  ]);
  if (!validSchoolId(route.employmentId)) notFound();
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const staff = await getStaffDetail(
    tenant.school.id,
    route.employmentId,
    locale,
  );
  if (!staff) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PERSONEL DETAY"
        title={staff.fullName}
        description="Personel durumu, ogretmen profili ve ogretmen hesabi."
      />
      <StaffDetailManager
        staff={staff}
        canManageStaff={permissions.includes("hr.staff.manage")}
        canManageTeachers={permissions.includes("teachers.manage")}
        canManageAccounts={permissions.includes("accounts.manage")}
        defaultEffectiveOn={dateOnlyValue(
          dateOnlyInTimeZone(new Date(), tenant.school.timezone),
        )}
      />
    </div>
  );
}
