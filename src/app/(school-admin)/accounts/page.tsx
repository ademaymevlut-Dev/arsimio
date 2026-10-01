import { requireSchoolPermission } from "@/server/authorization/guards";
import { getAccountDirectory } from "@/server/accounts/accounts";
import { PersonAccountPanel } from "@/components/school-admin/person-account-panel";
import { LinkSchoolAdminsPanel } from "@/components/school-admin/link-school-admins-panel";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const { tenant, permissions } = await requireSchoolPermission("accounts.read");
  const accounts = await getAccountDirectory(tenant.school.id);
  const canManage = permissions.includes("accounts.manage");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="KULLANICI HESAPLARI"
        title="Kullanici hesaplari"
        description="Okul icindeki ogrenci, veli ve admin giris hesaplarini izleyin."
      />
      {canManage ? <LinkSchoolAdminsPanel /> : null}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Hesap listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Henuz kisiye bagli giris hesabi yok.
            </p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <PersonAccountPanel
                  key={account.id}
                  title={`${account.fullName} - ${account.portal}`}
                  portal={
                    account.portal === "SCHOOL_ADMIN"
                      ? "SCHOOL_ADMIN"
                      : account.portal === "GUARDIAN"
                        ? "GUARDIAN"
                        : account.portal === "TEACHER"
                          ? "TEACHER"
                          : "STUDENT"
                  }
                  personId={account.personId}
                  existingAccount={account}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
