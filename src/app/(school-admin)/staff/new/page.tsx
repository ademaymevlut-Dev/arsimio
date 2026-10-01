import { PageHeader } from "@/components/admin/page-header";
import { StaffRegistrationForm } from "@/components/school-admin/staff-registration-form";
import {
  dateOnlyInTimeZone,
  dateOnlyValue,
} from "@/lib/academic-calendar-validation";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getStaffRegistrationContext } from "@/server/staff/staff";

export const dynamic = "force-dynamic";

export default async function NewStaffPage() {
  const { tenant, membership } = await requireSchoolPermission("hr.staff.manage");
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const [context, dictionary] = await Promise.all([
    getStaffRegistrationContext(tenant.school.id, locale),
    getDictionary(locale),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dictionary.staff.eyebrow}
        title={dictionary.staff.newPageTitle}
        description={dictionary.staff.newPageDescription}
      />
      <StaffRegistrationForm
        departments={context.departments}
        positions={context.positions}
        people={context.people}
        defaultHiredOn={dateOnlyValue(
          dateOnlyInTimeZone(new Date(), tenant.school.timezone),
        )}
        messages={dictionary.staff}
      />
    </div>
  );
}
