import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { DataTableShell, TableEmptyState } from "@/components/admin/data-table-shell";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StudentStatus } from "@/generated/prisma/client";
import { formatMessage } from "@/i18n/format";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getStudentDirectory } from "@/server/students/students";

export const dynamic = "force-dynamic";

const STUDENT_STATUSES = new Set<StudentStatus>([
  "ACTIVE",
  "INACTIVE",
  "GRADUATED",
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
  const selectedStatus = statusValue(query.status);
  const [students, dictionary] = await Promise.all([
    getStudentDirectory(tenant.school.id, {
      query: query.q,
      status: selectedStatus,
    }, permissions.includes("guardians.read")),
    getDictionary(locale),
  ]);
  const text = dictionary.students;
  const canManage = permissions.includes("students.manage");
  const statusLabels: Record<StudentStatus, string> = {
    ACTIVE: text.active,
    INACTIVE: text.inactive,
    GRADUATED: text.graduated,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/students/new">
                <Plus aria-hidden />
                {text.newStudent}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <form className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
        <div>
          <Label htmlFor="student-search">{text.searchLabel}</Label>
          <Input
            id="student-search"
            name="q"
            type="search"
            defaultValue={query.q?.slice(0, 100) ?? ""}
            placeholder={text.searchPlaceholder}
            className="mt-2 h-10"
          />
        </div>
        <div>
          <Label htmlFor="student-status-filter">{text.statusLabel}</Label>
          <NativeSelect
            id="student-status-filter"
            name="status"
            defaultValue={selectedStatus ?? ""}
            className="mt-2"
          >
            <option value="">{text.allStatuses}</option>
            <option value="ACTIVE">{text.active}</option>
            <option value="INACTIVE">{text.inactive}</option>
            <option value="GRADUATED">{text.graduated}</option>
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline" className="h-10">
          {text.applyFilters}
        </Button>
      </form>

      <DataTableShell
        title={text.listTitle}
        description={text.listDescription}
        footer={formatMessage(text.recordsFooter, { count: students.length })}
      >
        {students.length === 0 ? (
          <TableEmptyState
            title={text.noStudents}
            description={text.noStudentsDescription}
            action={
              canManage ? (
                <Button asChild>
                  <Link href="/students/new">{text.newStudent}</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{text.studentNumber}</TableHead>
                <TableHead>{text.student}</TableHead>
                <TableHead>{text.classSection}</TableHead>
                <TableHead>{text.academicYear}</TableHead>
                <TableHead>{text.primaryGuardian}</TableHead>
                <TableHead>{dictionary.common.status}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{dictionary.common.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono font-medium">
                    {student.studentNumber}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/students/${student.id}`}
                      className="font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {student.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {student.classSection ?? text.noClassSection}
                  </TableCell>
                  <TableCell>{student.academicYear ?? "—"}</TableCell>
                  <TableCell>
                    {student.primaryGuardian ?? text.noPrimaryGuardian}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        student.status === "ACTIVE"
                          ? "success"
                          : student.status === "INACTIVE"
                            ? "warning"
                            : "info"
                      }
                    >
                      {statusLabels[student.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/students/${student.id}`}>
                        <ArrowRight aria-hidden />
                        <span className="sr-only">{student.fullName}</span>
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
