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
  getStudentDetail,
} from "@/server/students/students";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const [{ tenant, membership, permissions }, route] = await Promise.all([
    requireSchoolPermission("students.read"),
    params,
  ]);
  if (!validSchoolId(route.studentId)) notFound();

  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const canReadFinance = permissions.includes("finance.contracts.read");
  const [student, dictionary, financeContracts] = await Promise.all([
    getStudentDetail(tenant.school.id, route.studentId, {
      includeIdentities: permissions.includes("persons.identity.read"),
      includeGuardians: permissions.includes("guardians.read"),
    }),
    getDictionary(locale),
    canReadFinance
      ? getStudentFinanceContractsForStudent(tenant.school.id, route.studentId)
      : Promise.resolve([]),
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
