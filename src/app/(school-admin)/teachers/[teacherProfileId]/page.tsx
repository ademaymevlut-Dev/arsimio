import { notFound } from "next/navigation";
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
  searchParams,
}: {
  params: Promise<{ teacherProfileId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ tenant, membership, permissions }, route, query] = await Promise.all([
    requireSchoolPermission("teachers.read"),
    params,
    searchParams,
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

  const today = dateOnlyValue(
    dateOnlyInTimeZone(new Date(), tenant.school.timezone),
  );

  return (
    <TeacherDetailTabs
      teacher={teacher}
      canManageAssignments={permissions.includes("teaching.assignments.manage")}
      canManageAccounts={permissions.includes("accounts.manage")}
      initialTab={Array.isArray(query.tab) ? query.tab[0] : query.tab}
      defaultEffectiveOn={today}
      locale={locale}
      messages={{ common: dictionary.common, staff: dictionary.staff }}
    />
  );
}
