import { AcademicCalendarManager } from "@/components/school-admin/academic-calendar-manager";
import { getAcademicCalendar } from "@/server/academics/academic-calendar";
import { requireSchoolPermission } from "@/server/authorization/guards";

export const dynamic = "force-dynamic";

export default async function AcademicYearsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const [{ tenant, permissions }, query] = await Promise.all([
    requireSchoolPermission("academics.read"),
    searchParams,
  ]);
  const years = await getAcademicCalendar(tenant.school.id);
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
    />
  );
}
