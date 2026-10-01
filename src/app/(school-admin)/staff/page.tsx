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
import type { EmploymentStatus } from "@/generated/prisma/client";
import { getSchoolLocale } from "@/i18n/server";
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
  const staff = await getStaffDirectory(tenant.school.id, locale, {
    query: query.q,
    status: selectedStatus,
  });
  const canManage = permissions.includes("hr.staff.manage");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="PERSONEL"
        title="Personel"
        description="Okuldaki calisanlarin temel personel kayitlarini yonetin."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/staff/new">
                <Plus aria-hidden />
                Personel ekle
              </Link>
            </Button>
          ) : undefined
        }
      />

      <form className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
        <div>
          <Label htmlFor="staff-search">Ara</Label>
          <Input
            id="staff-search"
            name="q"
            type="search"
            defaultValue={query.q?.slice(0, 100) ?? ""}
            className="mt-2 h-10"
          />
        </div>
        <div>
          <Label htmlFor="staff-status">Durum</Label>
          <NativeSelect
            id="staff-status"
            name="status"
            defaultValue={selectedStatus ?? ""}
            className="mt-2"
          >
            <option value="">Tum durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="ON_LEAVE">Izin / pasif</option>
            <option value="ENDED">Ayrildi</option>
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline" className="h-10">
          Filtrele
        </Button>
      </form>

      <DataTableShell
        title="Personel listesi"
        description="Bu liste maas, banka veya sozlesme bilgisi gostermez."
        footer={`${staff.length} kayit gosteriliyor`}
      >
        {staff.length === 0 ? (
          <TableEmptyState
            title="Personel kaydi yok"
            description="Ilk personel kaydini yeni kisiyle veya mevcut kisi uzerinden olusturun."
            action={
              canManage ? (
                <Button asChild>
                  <Link href="/staff/new">Personel ekle</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Personel</TableHead>
                <TableHead>Departman</TableHead>
                <TableHead>Pozisyon</TableHead>
                <TableHead>Ogretmen</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Islemler</span>
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
                      {person.status}
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
