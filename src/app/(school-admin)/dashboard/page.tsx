import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  KeyRound,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { DataTableShell } from "@/components/admin/data-table-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getAcademicCalendarSummary } from "@/server/academics/academic-calendar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, tenant, membership, permissions } =
    await requireSchoolPermission("dashboard.read");
  const academic = await getAcademicCalendarSummary(tenant.school.id);
  const roleNames = membership.roles.map(({ role }) => role.name);
  const setup = [
    {
      title: "Okul Admin hesabı",
      description: "Domain, üyelik ve yönetici rolü hazır.",
      status: "Hazır",
      variant: "success" as const,
      icon: ShieldCheck,
    },
    {
      title: "Öğretim yılı ve dönemler",
      description: academic.yearCount
        ? `${academic.yearCount} öğretim yılı tanımlandı.`
        : "İlk akademik veri tablosu olarak sırada.",
      status: academic.yearCount ? "Hazır" : "Sıradaki",
      variant: academic.yearCount ? ("success" as const) : ("info" as const),
      icon: CalendarDays,
    },
    {
      title: "Okul kullanıcıları",
      description: "Personel ve öğretmen hesapları Okul Admin tarafından açılacak.",
      status: "Planlandı",
      variant: "secondary" as const,
      icon: UsersRound,
    },
    {
      title: "Sınıflar ve dersler",
      description: "Akademik yıl yapısının ardından açılacak.",
      status: "Bekliyor",
      variant: "outline" as const,
      icon: BookOpenCheck,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="OKUL YÖNETİMİ"
        title="Genel bakış"
        description={`${tenant.school.name} için yönetim alanı hazır. Akademik kurulum küçük ve doğrulanabilir adımlarla ilerleyecek.`}
      />
      <section className="grid gap-4 md:grid-cols-3" aria-label="Hesap özeti">
        {[
          {
            label: "Oturum sahibi",
            value: user.firstName ?? membership.username ?? "Okul kullanıcısı",
            note: membership.username ?? "Kullanıcı adı tanımlı değil",
            icon: KeyRound,
          },
          {
            label: "Yönetim rolü",
            value: roleNames.join(" · ") || "Rol bulunamadı",
            note: `${permissions.length} aktif permission`,
            icon: ShieldCheck,
          },
          {
            label: "Akademik kurulum",
            value: academic.activeYear?.name ?? "Başlamaya hazır",
            note: academic.activeYear
              ? "Aktif öğretim yılı"
              : academic.yearCount
                ? "Taslak yılı etkinleştirin"
                : "İlk adım: öğretim yılı ve dönem",
            icon: Clock3,
          },
        ].map(({ label, value, note, icon: Icon }) => (
          <Card key={label} className="py-5">
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <p className="mt-5 break-words text-lg font-medium text-foreground">
                {value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="flex flex-col gap-4 rounded-xl border border-success-border bg-success px-5 py-5 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card/70 text-success-foreground">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-medium text-success-foreground">
            Yönetim hesabınız ve okul kabuğu hazır
          </h2>
          <p className="mt-1 text-sm leading-6 text-success-foreground/85">
            Sol menü yalnız kullanılabilir ekranları gösterecek. Yeni modüller
            permission ve kabul testleri tamamlandıkça menüye eklenecek.
          </p>
        </div>
      </section>
      <DataTableShell
        title="Kurulum yol haritası"
        description="Okulun aktif modülleri ve sıradaki güvenli teslimler."
        footer="4 kurulum adımı gösteriliyor"
      >
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Adım</TableHead>
              <TableHead scope="col">Açıklama</TableHead>
              <TableHead scope="col">Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setup.map(({ title, description, status, variant, icon: Icon }) => (
              <TableRow key={title}>
                <TableCell>
                  <span className="flex items-center gap-3 font-medium">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {title}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {description}
                </TableCell>
                <TableCell>
                  <Badge variant={variant}>{status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}
