import { PageHeader } from "@/components/admin/page-header";
import { ClassWeeklyScheduleManager } from "@/components/school-admin/class-weekly-schedule-manager";
import {
  dateOnlyInTimeZone,
  dateOnlyValue,
} from "@/lib/academic-calendar-validation";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getClassWeeklySchedule } from "@/server/teaching/weekly-schedule";

export const dynamic = "force-dynamic";

export default async function ClassWeeklySchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ classSectionId?: string }>;
}) {
  const [{ tenant, membership, permissions }, query] = await Promise.all([
    requireSchoolPermission("teaching.schedule.read"),
    searchParams,
  ]);
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const [dictionary, data] = await Promise.all([
    getDictionary(locale),
    getClassWeeklySchedule(
      tenant.school.id,
      query.classSectionId,
      locale,
    ),
  ]);
  const text = dictionary.staff;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={text.classWeeklyScheduleEyebrow}
        title={text.classWeeklyScheduleTitle}
        description={text.classWeeklySchedulePageDescription}
      />
      <ClassWeeklyScheduleManager
        data={data}
        canManageSchedule={permissions.includes("teaching.schedule.manage")}
        defaultEffectiveOn={dateOnlyValue(
          dateOnlyInTimeZone(new Date(), tenant.school.timezone),
        )}
        messages={text}
      />
    </div>
  );
}
