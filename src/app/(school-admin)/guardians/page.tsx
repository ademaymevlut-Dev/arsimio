import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGuardianDirectory } from "@/server/accounts/accounts";
import { requireSchoolPermission } from "@/server/authorization/guards";

export const dynamic = "force-dynamic";

export default async function GuardiansPage() {
  const { tenant } = await requireSchoolPermission("guardians.read");
  const guardians = await getGuardianDirectory(tenant.school.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="VELI YONETIMI"
        title="Veliler"
        description="Anne ve baba kayitlarini, cocuk iliskilerini ve giris hesaplarini yonetin."
      />
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Veli listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {guardians.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Henuz anne/baba iliskisi olan kisi yok.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Veli</th>
                    <th className="py-2 pr-4">Iletisim</th>
                    <th className="py-2 pr-4">Cocuk</th>
                    <th className="py-2 pr-4">Hesap</th>
                    <th className="py-2 pr-4">Islem</th>
                  </tr>
                </thead>
                <tbody>
                  {guardians.map((guardian) => (
                    <tr key={guardian.personId} className="border-t">
                      <td className="py-3 pr-4 font-medium">
                        {guardian.fullName}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        <div>{guardian.phone ?? "-"}</div>
                        <div>{guardian.email ?? "-"}</div>
                      </td>
                      <td className="py-3 pr-4">
                        {guardian.childCount}
                        {guardian.primaryChildCount > 0 ? (
                          <Badge className="ml-2" variant="success">
                            {guardian.primaryChildCount} primary
                          </Badge>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">
                        {guardian.account ? (
                          <Badge
                            variant={
                              guardian.account.suspendedAt
                                ? "danger"
                                : "success"
                            }
                          >
                            {guardian.account.username ?? guardian.account.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Yok</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/guardians/${guardian.personId}`}>
                            Detay
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
