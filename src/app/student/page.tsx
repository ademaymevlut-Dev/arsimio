import { notFound } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudentPortalHome } from "@/server/accounts/accounts";
import { requirePortalAccount } from "@/server/accounts/portal-guards";

export const dynamic = "force-dynamic";

export default async function StudentPortalPage() {
  const { tenant, account } = await requirePortalAccount("STUDENT");
  const home = await getStudentPortalHome(tenant.school.id, account.personId);
  if (!home) notFound();

  return (
    <main className="min-h-svh bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
              OGRENCI PORTALI
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{home.fullName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tenant.school.name}
            </p>
          </div>
          <form action={signOut}>
            <Button variant="outline">Cikis yap</Button>
          </form>
        </header>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Ogrenci bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Okul numarasi</dt>
                <dd className="mt-1 font-mono font-medium">
                  {home.studentNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Durum</dt>
                <dd className="mt-1">
                  <Badge variant={home.status === "ACTIVE" ? "success" : "warning"}>
                    {home.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Ogretim yili</dt>
                <dd className="mt-1 font-medium">{home.academicYear ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sinif</dt>
                <dd className="mt-1 font-medium">{home.classSection ?? "-"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
