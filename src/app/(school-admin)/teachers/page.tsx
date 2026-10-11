import { TeacherDirectoryTable } from "@/components/school-admin/teacher-directory-table";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getTeacherDirectory } from "@/server/staff/staff";

export const dynamic = "force-dynamic";

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ tenant, membership }, query] = await Promise.all([
    requireSchoolPermission("teachers.read"),
    searchParams,
  ]);
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const [teachers, dictionary] = await Promise.all([
    getTeacherDirectory(tenant.school.id, locale),
    getDictionary(locale),
  ]);
  return (
    <TeacherDirectoryTable
      teachers={teachers}
      initialQuery={query.q?.slice(0, 100)}
      locale={locale}
      messages={{ common: dictionary.common, staff: dictionary.staff }}
    />
  );
}
