import { notFound } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGuardianPortalHome } from "@/server/accounts/accounts";
import { requirePortalAccount } from "@/server/accounts/portal-guards";

export const dynamic = "force-dynamic";

export default async function GuardianPortalPage() {
  const { tenant, account } = await requirePortalAccount("GUARDIAN");
  const home = await getGuardianPortalHome(tenant.school.id, account.personId);
  if (!home) notFound();

  return (
    <main className="min-h-svh bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
              VELI PORTALI
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
            <CardTitle>Cocuklar</CardTitle>
          </CardHeader>
          <CardContent>
            {home.children.length === 1 ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Tek cocuk kaydi bulundugu icin bilgiler dogrudan gosteriliyor.
              </p>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">
                Birden fazla cocuk varsa bu ekrandan secim yapilacak. Simdilik
                tum bagli cocuklar listeleniyor.
              </p>
            )}
            <div className="space-y-3">
              {home.children.map((child) => (
                <div key={child.relationshipId} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-medium">{child.fullName}</h2>
                    {child.isPrimaryContact ? (
                      <Badge variant="success">Primary veli sizsiniz</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No: {child.studentNumber} · {child.classSection ?? "-"} ·{" "}
                    {child.academicYear ?? "-"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
