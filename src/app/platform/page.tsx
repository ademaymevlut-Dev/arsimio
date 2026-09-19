import { requirePlatformPermission } from "@/server/authorization/guards";
import { getPrisma } from "@/lib/db";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const { user } = await requirePlatformPermission("platform.schools.read");
  const schools = await getPrisma().school.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      domains: { select: { hostname: true, status: true } },
    },
    orderBy: { name: "asc" },
  });
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-12 flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div>
          <p className="text-sm text-muted-foreground">
            arsimio / Platform yönetimi
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Okullarınız</h1>
        </div>
        <form action={signOut}>
          <Button variant="outline">Çıkış yap</Button>
        </form>
      </header>
      <p className="mb-8 text-sm text-muted-foreground">
        {user.email} · Süper Admin
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        {schools.map((school) => (
          <Card key={school.id}>
            <CardHeader>
              <CardTitle>{school.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">
                {school.status === "ACTIVE" ? "Aktif okul" : school.status}
              </p>
              {school.domains.map((domain) => (
                <p
                  className="break-all text-sm text-muted-foreground"
                  key={domain.hostname}
                >
                  {domain.hostname} ·{" "}
                  {domain.status === "VERIFIED" ? "Doğrulanmış" : domain.status}
                </p>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Pilot kurulumu: okul listesi hazır. Yönetici davetleri ve okul ayarları
        sonraki geliştirme paketinde açılacak.
      </p>
    </main>
  );
}
