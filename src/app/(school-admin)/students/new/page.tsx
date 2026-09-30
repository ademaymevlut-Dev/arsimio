import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { StudentRegistrationForm } from "@/components/school-admin/student-registration-form";
import {
  dateOnlyInTimeZone,
  dateOnlyValue,
} from "@/lib/academic-calendar-validation";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { identityProtectionIsReady } from "@/server/students/person-identity";
import { getStudentRegistrationContext } from "@/server/students/students";

export const dynamic = "force-dynamic";

function clampDate(value: string, start: string, end: string) {
  if (value < start) return start;
  if (value > end) return end;
  return value;
}

export default async function NewStudentPage() {
  const { tenant, membership, permissions } =
    await requireSchoolPermission("students.manage");
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const [context, dictionary] = await Promise.all([
    getStudentRegistrationContext(tenant.school.id),
    getDictionary(locale),
  ]);
  const text = dictionary.students;

  if (!context.academicYear || context.classSections.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow={text.eyebrow}
          title={text.registrationTitle}
          description={text.registrationDescription}
          actions={
            <Button asChild variant="outline">
              <Link href="/students">{text.backToStudents}</Link>
            </Button>
          }
        />
        <Alert variant="warning">
          <AlertTitle>{text.noRegistrationOptions}</AlertTitle>
          <AlertDescription>
            {text.noRegistrationOptionsDescription}
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/academics/structure">{text.goToStructure}</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const today = dateOnlyValue(
    dateOnlyInTimeZone(new Date(), tenant.school.timezone),
  );
  const defaultAdmittedOn = clampDate(
    today,
    context.academicYear.startDate,
    context.academicYear.endDate,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={text.eyebrow}
        title={text.registrationTitle}
        description={text.registrationDescription}
        actions={
          <Button asChild variant="outline">
            <Link href="/students">{text.backToStudents}</Link>
          </Button>
        }
      />
      <StudentRegistrationForm
        context={context}
        defaultAdmittedOn={defaultAdmittedOn}
        canManageIdentity={permissions.includes("persons.identity.manage")}
        identityProtectionReady={identityProtectionIsReady()}
        messages={{
          common: dictionary.common,
          students: text,
          studentServer: dictionary.studentServer,
        }}
      />
    </div>
  );
}
