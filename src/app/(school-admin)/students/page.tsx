import type { StudentStatus } from "@/generated/prisma/client";
import { StudentDirectoryTable } from "@/components/school-admin/student-directory-table";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getStudentDirectory } from "@/server/students/students";

export const dynamic = "force-dynamic";

const STUDENT_STATUSES = new Set<StudentStatus>([
  "ACTIVE",
  "INACTIVE",
  "GRADUATED",
  "WITHDRAWN",
  "TRANSFERRED",
]);

function statusValue(value: string | undefined): StudentStatus | undefined {
  return value && STUDENT_STATUSES.has(value as StudentStatus)
    ? (value as StudentStatus)
    : undefined;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [{ tenant, membership, permissions }, query] = await Promise.all([
    requireSchoolPermission("students.read"),
    searchParams,
  ]);
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const [students, dictionary] = await Promise.all([
    getStudentDirectory(
      tenant.school.id,
      {},
      permissions.includes("guardians.read"),
    ),
    getDictionary(locale),
  ]);

  return (
    <StudentDirectoryTable
      students={students}
      initialQuery={query.q?.slice(0, 100)}
      initialStatus={statusValue(query.status)}
      canManage={permissions.includes("students.manage")}
      locale={locale}
      messages={{ common: dictionary.common, students: dictionary.students }}
    />
  );
}
