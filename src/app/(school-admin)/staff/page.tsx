import Link from "next/link";
import { ArrowRight, Plus, Settings2 } from "lucide-react";
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
import type { EmploymentStatus } from "@/generated/prisma/client";
import { formatMessage } from "@/i18n/format";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getStaffDirectory } from "@/server/staff/staff";

export const dynamic = "force-dynamic";

const STATUSES = new Set<EmploymentStatus>(["ACTIVE", "ON_LEAVE", "ENDED"]);

function statusValue(value: string | undefined) {
  return value && STATUSES.has(value as EmploymentStatus)
    ? (value as EmploymentStatus)
    : undefined;
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [{ tenant, membership, permissions }, query] = await Promise.all([
    requireSchoolPermission("hr.staff.read"),
    searchParams,
  ]);
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const selectedStatus = statusValue(query.status);
  const [staff, dictionary] = await Promise.all([
    getStaffDirectory(tenant.school.id, locale, {
      query: query.q,
      status: selectedStatus,
    }),
    getDictionary(locale),
  ]);
  const text = dictionary.staff;
  const canManage = permissions.includes("hr.staff.manage");
  const canReadCatalog = permissions.includes("hr.catalog.read");
  const statusLabels: Record<EmploymentStatus, string> = {
    ACTIVE: text.active,
    ON_LEAVE: text.onLeave,
    ENDED: text.ended,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
        actions={
          canManage || canReadCatalog ? (
            <div className="flex flex-wrap gap-2">
              {canReadCatalog ? (
                <Button asChild variant="outline">
                  <Link href="/staff/settings">
                    <Settings2 aria-hidden />
                    {text.catalogSettings}
                  </Link>
                </Button>
              ) : null}
              {canManage ? (
                <Button asChild>
                  <Link href="/staff/new">
                    <Plus aria-hidden />
                    {text.newStaff}
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      />

      <form className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
        <div>
          <Label htmlFor="staff-search">{text.searchLabel}</Label>
          <Input
            id="staff-search"
            name="q"
            type="search"
            defaultValue={query.q?.slice(0, 100) ?? ""}
            className="mt-2 h-10"
          />
        </div>
        <div>
          <Label htmlFor="staff-status">{text.statusLabel}</Label>
          <NativeSelect
            id="staff-status"
            name="status"
            defaultValue={selectedStatus ?? ""}
            className="mt-2"
          >
            <option value="">{text.allStatuses}</option>
            <option value="ACTIVE">{text.active}</option>
            <option value="ON_LEAVE">{text.onLeave}</option>
            <option value="ENDED">{text.ended}</option>
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline" className="h-10">
          {text.filter}
        </Button>
      </form>

      <DataTableShell
        title={text.listTitle}
        description={text.listDescription}
        footer={formatMessage(text.recordsFooter, { count: staff.length })}
      >
        {staff.length === 0 ? (
          <TableEmptyState
            title={text.noStaff}
            description={text.noStaffDescription}
            action={
              canManage ? (
                <Button asChild>
                  <Link href="/staff/new">{text.addStaff}</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{text.staffNumber}</TableHead>
                <TableHead>{text.staffMember}</TableHead>
                <TableHead>{text.department}</TableHead>
                <TableHead>{text.position}</TableHead>
                <TableHead>{text.teacher}</TableHead>
                <TableHead>{text.statusLabel}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{dictionary.common.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-mono">{person.staffNumber}</TableCell>
                  <TableCell>
                    <Link
                      href={`/staff/${person.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {person.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{person.department}</TableCell>
                  <TableCell>{person.position}</TableCell>
                  <TableCell>{person.teacherTitle ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        person.status === "ACTIVE"
                          ? "success"
                          : person.status === "ON_LEAVE"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {statusLabels[person.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/staff/${person.id}`}>
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
