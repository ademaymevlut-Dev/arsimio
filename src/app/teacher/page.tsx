import { notFound } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePortalAccount } from "@/server/accounts/portal-guards";
import { getTeacherPortalHome } from "@/server/staff/staff";

export const dynamic = "force-dynamic";

export default async function TeacherPortalPage() {
  const { tenant, account } = await requirePortalAccount("TEACHER");
  const home = await getTeacherPortalHome(tenant.school.id, account.personId);
  if (!home) notFound();

  return (
    <main className="min-h-svh bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
              OGRETMEN PORTALI
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
            <CardTitle>Ogretmen profili</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Personel no</dt>
                <dd className="mt-1 font-mono font-medium">
                  {home.staffNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Durum</dt>
                <dd className="mt-1">
                  <Badge
                    variant={
                      home.status === "ACTIVE" &&
                      home.employmentStatus === "ACTIVE"
                        ? "success"
                        : "warning"
                    }
                  >
                    {home.status} / {home.employmentStatus}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Unvan</dt>
                <dd className="mt-1 font-medium">{home.title}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tur</dt>
                <dd className="mt-1 font-medium">{home.category}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">
                  Ders yetkinlikleri
                </dt>
                <dd className="mt-1 font-medium">
                  {home.subjects.length ? home.subjects.join(", ") : "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
