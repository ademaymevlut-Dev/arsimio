import { AcademicCalendarManager } from "@/components/school-admin/academic-calendar-manager";
import { getAcademicCalendar } from "@/server/academics/academic-calendar";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getDictionary, getSchoolLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AcademicYearsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const [{ tenant, membership, permissions }, query] = await Promise.all([
    requireSchoolPermission("academics.read"),
    searchParams,
  ]);
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const [years, dictionary] = await Promise.all([
    getAcademicCalendar(
      tenant.school.id,
      locale,
      tenant.school.defaultLocale,
    ),
    getDictionary(locale),
  ]);
  const requested = years.find((year) => year.id === query.year)?.id;
  const selectedYearId =
    requested ??
    years.find((year) => year.status === "ACTIVE")?.id ??
    years.find((year) => year.status !== "ARCHIVED")?.id ??
    years[0]?.id ??
    null;

  return (
    <AcademicCalendarManager
      schoolName={tenant.school.name}
      years={years}
      selectedYearId={selectedYearId}
      canManage={permissions.includes("academics.manage")}
      locale={locale}
      messages={{ common: dictionary.common, academics: dictionary.academics }}
    />
  );
}
