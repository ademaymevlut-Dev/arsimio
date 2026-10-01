import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { TeacherDetailTabs } from "@/components/school-admin/teacher-detail-tabs";
import {
  dateOnlyInTimeZone,
  dateOnlyValue,
} from "@/lib/academic-calendar-validation";
import { validSchoolId } from "@/lib/platform-school-validation";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getTeacherDetail } from "@/server/teaching/teaching";

export const dynamic = "force-dynamic";

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ teacherProfileId: string }>;
}) {
  const [{ tenant, membership, permissions }, route] = await Promise.all([
    requireSchoolPermission("teachers.read"),
    params,
  ]);
  if (!validSchoolId(route.teacherProfileId)) notFound();
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const [teacher, dictionary] = await Promise.all([
    getTeacherDetail(tenant.school.id, route.teacherProfileId, locale),
    getDictionary(locale),
  ]);
  if (!teacher) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dictionary.staff.teacherDetailEyebrow}
        title={teacher.fullName}
        description={dictionary.staff.teacherDetailDescription}
      />
      <TeacherDetailTabs
        teacher={teacher}
        canManageAssignments={permissions.includes("teaching.assignments.manage")}
        canManageAccounts={permissions.includes("accounts.manage")}
        defaultEffectiveOn={dateOnlyValue(
          dateOnlyInTimeZone(new Date(), tenant.school.timezone),
        )}
        messages={dictionary.staff}
      />
    </div>
  );
}
