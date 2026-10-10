import { notFound } from "next/navigation";
import { StudentDetailManager } from "@/components/school-admin/student-detail-manager";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import {
  dateOnlyInTimeZone,
  dateOnlyValue,
} from "@/lib/academic-calendar-validation";
import { validSchoolId } from "@/lib/platform-school-validation";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getStudentFinanceContractsForStudent } from "@/server/finance/finance";
import {
  getGuardianCandidates,
  getStudentRegistrationContext,
  getStudentDetail,
} from "@/server/students/students";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ tenant, membership, permissions }, route, query] = await Promise.all([
    requireSchoolPermission("students.read"),
    params,
    searchParams,
  ]);
  if (!validSchoolId(route.studentId)) notFound();

  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const canReadFinance = permissions.includes("finance.contracts.read");
  const [student, dictionary, financeContracts, registrationContext] = await Promise.all([
    getStudentDetail(tenant.school.id, route.studentId, {
      includeIdentities: permissions.includes("persons.identity.read"),
      includeGuardians: permissions.includes("guardians.read"),
    }),
    getDictionary(locale),
    canReadFinance
      ? getStudentFinanceContractsForStudent(tenant.school.id, route.studentId)
      : Promise.resolve([]),
    getStudentRegistrationContext(tenant.school.id),
  ]);
  if (!student) notFound();

  const canManageGuardians =
    permissions.includes("guardians.read") &&
    permissions.includes("guardians.manage");
  const candidates = canManageGuardians
    ? await getGuardianCandidates(tenant.school.id, student)
    : [];

  return (
    <StudentDetailManager
      student={student}
      candidates={candidates}
      canManageStudent={permissions.includes("students.manage")}
      canReadGuardians={permissions.includes("guardians.read")}
      canManageGuardians={canManageGuardians}
      canManageAccounts={permissions.includes("accounts.manage")}
      canReadFinance={canReadFinance}
      financeContracts={financeContracts}
      registrationContext={registrationContext}
      initialTab={Array.isArray(query.tab) ? query.tab[0] : query.tab}
      defaultEffectiveOn={dateOnlyValue(
        dateOnlyInTimeZone(new Date(), tenant.school.timezone),
      )}
      locale={locale}
      messages={{
        common: dictionary.common,
        students: dictionary.students,
        finance: dictionary.finance,
      }}
    />
  );
}
