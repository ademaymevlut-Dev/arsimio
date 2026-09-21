import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  Globe2,
  Palette,
  ScanLine,
} from "lucide-react";
import { getPlatformSchools } from "@/server/platform/schools";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SchoolDirectory } from "@/components/platform/school-directory";

export default async function PlatformPage() {
  const schools = await getPlatformSchools();
  const active = schools.filter((school) => school.status === "ACTIVE").length;
  const verified = schools
    .flatMap((school) => school.domains)
    .filter(
      (domain) => domain.status === "VERIFIED" && domain.verifiedAt,
    ).length;
  const branded = schools.filter(
    (school) => school.branding?.primaryColor,
  ).length;
  const stats = [
    {
      label: "Kayıtlı okul",
      value: schools.length,
      note: `${active} okul aktif`,
      icon: Building2,
    },
    {
      label: "Doğrulanmış domain",
      value: verified,
      note: "Okula özel giriş adresleri",
      icon: Globe2,
    },
    {
      label: "Renk paleti tanımlı",
      value: branded,
      note: "Okul bazlı marka ayarları",
      icon: Palette,
    },
  ];
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-primary">
            YÖNETİM MERKEZİ
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Genel bakış</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Okullarınızın dijital kimliğini ve kurulum durumunu tek yerden
            yönetin.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/platform/schools">
            Okulları yönet <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
      <section
        aria-label="Platform özeti"
        className="grid gap-4 sm:grid-cols-3"
      >
        {stats.map(({ label, value, note, icon: Icon }) => (
          <Card key={label} className="py-5">
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <p className="mt-5 text-4xl font-medium tracking-tight tabular-nums">
                {value}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section
        className="grid overflow-hidden rounded-xl border bg-card xl:grid-cols-[1.1fr_1fr]"
        aria-labelledby="identity-title"
      >
        <div className="p-6 sm:p-7">
          <span className="mb-5 inline-flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <ScanLine className="size-5" aria-hidden />
          </span>
          <h2
            id="identity-title"
            className="text-xl font-medium tracking-tight"
          >
            Bir platform. Her okula özel kimlik.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Domainler birbirinden ayrı, yönetim tek merkezde. Her okulun
            bilgilerini ve giriş ekranındaki renklerini kendi kaydı üzerinden
            düzenleyin.
          </p>
          <Link
            href="/platform/schools"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            Okul ayarlarına git <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="flex flex-col justify-center border-t bg-muted/20 px-6 py-7 xl:border-t-0 xl:border-l">
          <p className="mb-5 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
            BU AŞAMADAKİ KAPSAM
          </p>
          {[
            {
              text: "Okul ve domain kayıtları",
              detail: "Mevcut veritabanıyla bağlantılı",
              ready: true,
            },
            {
              text: "Okul bilgileri ve marka renkleri",
              detail: "Önizleyin, düzenleyin ve kaydedin",
              ready: true,
            },
            {
              text: "Logo, görseller ve giriş şablonları",
              detail: "Bir sonraki marka kimliği aşaması",
              ready: false,
            },
          ].map((item, index) => (
            <div key={item.text} className="flex gap-3 py-3 first:pt-0">
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] ${item.ready ? "bg-primary/10 text-primary" : "border text-muted-foreground"}`}
              >
                {item.ready ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  `0${index + 1}`
                )}
              </span>
              <div>
                <p className="text-sm font-medium">{item.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Okullarınız</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Veritabanındaki güncel okul kayıtları
            </p>
          </div>
          <Link
            href="/platform/schools"
            className="text-xs font-medium text-primary hover:underline"
          >
            Tümünü görüntüle →
          </Link>
        </div>
        <SchoolDirectory
          schools={schools.map((school) => ({
            id: school.id,
            name: school.name,
            slug: school.slug,
            status: school.status,
            primaryColor: school.branding?.primaryColor ?? null,
            secondaryColor: school.branding?.secondaryColor ?? null,
            accentColor: school.branding?.accentColor ?? null,
            hasLogo: Boolean(school.branding?.logoAssetKey),
            domains: school.domains.map(({ hostname, status }) => ({
              hostname,
              status,
            })),
            members: school._count.memberships,
          }))}
        />
      </section>
    </div>
  );
}
