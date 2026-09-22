import Link from "next/link";
import { AcademicStructureManager } from "@/components/school-admin/academic-structure-manager";
import { PageHeader } from "@/components/admin/page-header";
import { TableEmptyState } from "@/components/admin/data-table-shell";
import { Button } from "@/components/ui/button";
import { getAcademicCalendar } from "@/server/academics/academic-calendar";
import { getAcademicStructure } from "@/server/academics/academic-structure";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getDictionary, getSchoolLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AcademicStructurePage({
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
  const [allYears, dictionary] = await Promise.all([
    getAcademicCalendar(tenant.school.id, locale, tenant.school.defaultLocale),
    getDictionary(locale),
  ]);
  const years = allYears.filter((year) => year.status !== "ARCHIVED");
  const requested = years.find((year) => year.id === query.year)?.id;
  const selectedYearId =
    requested ??
    years.find((year) => year.status === "ACTIVE")?.id ??
    years[0]?.id ??
    null;
  const messages = {
    common: dictionary.common,
    academicStructure: dictionary.academicStructure,
  };

  if (!selectedYearId) {
    return (
      <div className="space-y-7">
        <PageHeader
          eyebrow={dictionary.academicStructure.eyebrow}
          title={dictionary.academicStructure.title}
          description={dictionary.academicStructure.description}
        />
        <div className="rounded-xl border bg-card">
          <TableEmptyState
            title={dictionary.academicStructure.noYearTitle}
            description={dictionary.academicStructure.noYearDescription}
            action={
              <Button asChild>
                <Link href="/academics/years">
                  {dictionary.academicStructure.goToYears}
                </Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const structure = await getAcademicStructure(
    tenant.school.id,
    selectedYearId,
    locale,
    tenant.school.defaultLocale,
  );
  if (!structure) throw new Error("Academic structure year is unavailable.");

  return (
    <AcademicStructureManager
      schoolName={tenant.school.name}
      years={years}
      selectedYearId={selectedYearId}
      structure={structure}
      canManage={permissions.includes("academics.manage")}
      messages={messages}
    />
  );
}
