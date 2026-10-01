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
import { getSchoolLocale } from "@/i18n/server";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getTeacherDirectory } from "@/server/staff/staff";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const { tenant, membership } = await requireSchoolPermission("teachers.read");
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const teachers = await getTeacherDirectory(tenant.school.id, locale);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="OGRETMENLER"
        title="Ogretmenler"
        description="Ogretmen profillerini ve okutabilecegi dersleri izleyin. Gercek yil/sinif/ders atamasi sonraki modulde yapilacak."
      />

      <DataTableShell
        title="Ogretmen listesi"
        description="Bu ekran profil bilgisidir; haftalik ders programi ve sinif sorumlulugu sonraki adimda eklenecek."
        footer={`${teachers.length} ogretmen gosteriliyor`}
      >
        {teachers.length === 0 ? (
          <TableEmptyState
            title="Ogretmen profili yok"
            description="Personel detayindan bir calisani ogretmen profiline cevirin."
            action={
              <Button asChild>
                <Link href="/staff">Personel listesine git</Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personel no</TableHead>
                <TableHead>Ogretmen</TableHead>
                <TableHead>Unvan</TableHead>
                <TableHead>Tur</TableHead>
                <TableHead>Dersler</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Islemler</span>
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
                  <TableCell>{teacher.category}</TableCell>
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
                      {teacher.status} / {teacher.employmentStatus}
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
