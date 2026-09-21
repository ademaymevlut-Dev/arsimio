import { getPlatformSchools } from "@/server/platform/schools";
import { SchoolDirectory } from "@/components/platform/school-directory";

export default async function SchoolsPage() {
  const schools = await getPlatformSchools();
  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-primary">
          OKUL YÖNETİMİ
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Okullar ve domainler
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Bir okul seçerek bilgilerini, domain durumunu ve marka renklerini
          yönetin.
        </p>
      </header>
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
      <p className="text-xs leading-6 text-muted-foreground">
        Bu aşamada mevcut okullar yönetilir. Yeni okul açılışı, domain ekleme ve
        yönetici daveti ayrı kurulum akışında ele alınacak.
      </p>
    </div>
  );
}
