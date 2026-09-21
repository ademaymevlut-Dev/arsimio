import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Globe2,
  ImageIcon,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { getPlatformSchool } from "@/server/platform/schools";
import { SchoolStatus } from "@/components/platform/school-status";
import {
  SchoolBrandingForm,
  SchoolProfileForm,
} from "@/components/platform/school-settings";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  readableForeground,
  resolveBranding,
  schoolInitials,
} from "@/lib/school-branding";
import { InitialSchoolAdmin } from "@/components/platform/initial-school-admin";

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { school, canEditProfile, canEditBranding, canCreateInitialAdmin } =
    await getPlatformSchool(schoolId);
  const colors = resolveBranding(school.branding);
  return (
    <div className="space-y-7">
      <Link
        href="/platform/schools"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Tüm okullar
      </Link>
      <header className="flex items-center gap-4">
        <span
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold"
          style={{
            backgroundColor: colors.primaryColor,
            color: readableForeground(colors.primaryColor),
          }}
          aria-hidden
        >
          {schoolInitials(school.name)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="break-words text-3xl font-semibold tracking-tight">
              {school.name}
            </h1>
            <SchoolStatus status={school.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Okul bilgileri, erişim adresleri ve marka kimliği
          </p>
        </div>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card className="[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle>Okul bilgileri</CardTitle>
            <CardDescription>
              Kurumun platformda görünen kimliği.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SchoolProfileForm
              key={school.id}
              id={school.id}
              name={school.name}
              legalName={school.legalName}
              revision={school.updatedAt.toISOString()}
              editable={canEditProfile}
            />
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 text-xs">
              <div>
                <dt className="text-muted-foreground">Okul kodu</dt>
                <dd className="mt-2 font-mono">{school.slug}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Saat dilimi / dil</dt>
                <dd className="mt-2">
                  {school.timezone} / {school.defaultLocale.toUpperCase()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card className="[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="size-4 text-primary" aria-hidden />
              Domainler
            </CardTitle>
            <CardDescription>
              Bu okulun giriş ekranına bağlı adresler.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {school.domains.length ? (
              school.domains.map((domain) => (
                <div key={domain.hostname} className="rounded-lg border p-4">
                  <p className="break-all text-sm font-medium">
                    {domain.hostname}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <SchoolStatus status={domain.status} />
                    {domain.isPrimary && (
                      <span className="text-[11px] text-muted-foreground">
                        Birincil domain
                      </span>
                    )}
                  </div>
                  {domain.status === "VERIFIED" && domain.verifiedAt && (
                    <Button asChild variant="outline" className="mt-4 w-full">
                      <a
                        href={`https://${domain.hostname}/login`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Giriş sayfasını aç <ArrowUpRight aria-hidden />
                      </a>
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Henüz domain tanımlanmamış.
              </p>
            )}
            <p className="text-xs leading-5 text-muted-foreground">
              Domainler bu aşamada salt okunur. Mevcut eşleşmeler ve okul erişim
              kuralları korunur.
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="[--card-spacing:--spacing(6)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden />
            İlk Okul Admin hesabı
          </CardTitle>
          <CardDescription>
            Okulun kendi domainine kullanıcı adı ve parola ile giriş yapacak
            ilk yöneticiyi tanımlayın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InitialSchoolAdmin
            schoolId={school.id}
            canCreate={canCreateInitialAdmin}
            admins={school.memberships.map((membership) => ({
              id: membership.id,
              username: membership.username,
              membershipStatus: membership.status,
              userStatus: membership.user.status,
              firstName: membership.user.firstName,
              lastName: membership.user.lastName,
              joinedAt: membership.joinedAt?.toISOString() ?? null,
              lastLoginAt: membership.user.lastLoginAt?.toISOString() ?? null,
            }))}
          />
        </CardContent>
      </Card>
      <Card className="[--card-spacing:--spacing(6)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-4 text-primary" aria-hidden />
            Marka renkleri
          </CardTitle>
          <CardDescription>
            Okul giriş ekranının renklerini canlı önizleme ile düzenleyin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolBrandingForm
            key={school.id}
            id={school.id}
            name={school.name}
            initialColors={colors}
            revision={school.branding?.updatedAt.toISOString() ?? "new"}
            editable={canEditBranding}
          />
        </CardContent>
      </Card>
      <section className="flex flex-col gap-4 rounded-xl border border-dashed p-6 sm:flex-row">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-medium">
            Logo, okul görselleri ve şablonlar{" "}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Sonraki aşama
            </span>
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {school.branding?.logoAssetKey
              ? "Bu okulun mevcut logo kaydı korunuyor. "
              : "Henüz okul logosu eklenmemiş. "}
            Logo ve kapak görseli yükleme, kalıcı dosya depolamasıyla birlikte
            açılacak. Giriş ekranı şablonlarını da buradan yöneteceğiz.
          </p>
        </div>
      </section>
    </div>
  );
}
