import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DataTableShell, TableEmptyState } from "@/components/admin/data-table-shell";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMessage } from "@/i18n/format";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getTeacherDirectory } from "@/server/staff/staff";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const { tenant, membership } = await requireSchoolPermission("teachers.read");
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const [teachers, dictionary] = await Promise.all([
    getTeacherDirectory(tenant.school.id, locale),
    getDictionary(locale),
  ]);
  const text = dictionary.staff;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={text.teachersEyebrow}
        title={text.teachersTitle}
        description={text.teachersDescription}
      />

      <DataTableShell
        title={text.teachersListTitle}
        description={text.teachersListDescription}
        footer={formatMessage(text.teachersFooter, { count: teachers.length })}
      >
        {teachers.length === 0 ? (
          <TableEmptyState
            title={text.noTeachers}
            description={text.noTeachersDescription}
            action={
              <Button asChild>
                <Link href="/staff">{text.goToStaff}</Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{text.staffNumber}</TableHead>
                <TableHead>{text.teacher}</TableHead>
                <TableHead>{text.titleColumn}</TableHead>
                <TableHead>{text.typeColumn}</TableHead>
                <TableHead>{text.subjects}</TableHead>
                <TableHead>{text.statusLabel}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{dictionary.common.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-mono">
                    {teacher.staffNumber}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/staff/${teacher.employmentId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {teacher.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{teacher.title}</TableCell>
                  <TableCell>
                    {teacher.category === "CLASSROOM"
                      ? text.classroomTeacher
                      : text.branchTeacher}
                  </TableCell>
                  <TableCell>
                    {teacher.subjects.length
                      ? teacher.subjects.join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        teacher.status === "ACTIVE" &&
                        teacher.employmentStatus === "ACTIVE"
                          ? "success"
                          : "warning"
                      }
                    >
                      {teacher.status === "ACTIVE" ? text.active : text.onLeave} /{" "}
                      {teacher.employmentStatus === "ACTIVE"
                        ? text.active
                        : teacher.employmentStatus === "ON_LEAVE"
                          ? text.onLeave
                          : text.ended}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/staff/${teacher.employmentId}`}>
                        <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTableShell>
    </div>
  );
}
