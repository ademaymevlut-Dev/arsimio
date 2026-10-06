import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { PersonAccountPanel } from "@/components/school-admin/person-account-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { validSchoolId } from "@/lib/platform-school-validation";
import { getGuardianDetail } from "@/server/accounts/accounts";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getStudentFinanceContractsForGuardian } from "@/server/finance/finance";

export const dynamic = "force-dynamic";

export default async function GuardianDetailPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const [{ tenant, membership, permissions }, route] = await Promise.all([
    requireSchoolPermission("guardians.read"),
    params,
  ]);
  if (!validSchoolId(route.personId)) notFound();
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const canReadFinance = permissions.includes("finance.contracts.read");
  const [guardian, dictionary, financeContracts] = await Promise.all([
    getGuardianDetail(tenant.school.id, route.personId),
    getDictionary(locale),
    canReadFinance
      ? getStudentFinanceContractsForGuardian(tenant.school.id, route.personId)
      : Promise.resolve([]),
  ]);
  if (!guardian) notFound();
  const canManageAccounts = permissions.includes("accounts.manage");
  const finance = dictionary.finance;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="VELI DETAYI"
        title={guardian.fullName}
        description="Veli bilgileri, cocuk baglantilari ve giris hesabi."
        actions={
          <Button asChild variant="outline">
            <Link href="/guardians">
              <ArrowLeft aria-hidden />
              Velilere don
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Veli bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Telefon</dt>
              <dd className="mt-1 font-medium">{guardian.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">E-posta</dt>
              <dd className="mt-1 font-medium">{guardian.email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Cocuk sayisi</dt>
              <dd className="mt-1 font-medium">{guardian.children.length}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <PersonAccountPanel
              title="Veli giris hesabi"
              portal="GUARDIAN"
              personId={guardian.personId}
              existingAccount={guardian.account}
              canManage={canManageAccounts}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Cocuklar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {guardian.children.map((child) => (
              <div
                key={child.relationshipId}
                className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-medium">{child.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No: {child.studentNumber} · {child.classSection ?? "-"} ·{" "}
                    {child.academicYear ?? "-"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{child.relationshipType}</Badge>
                  {child.isPrimaryContact ? (
                    <Badge variant="success">Primary</Badge>
                  ) : null}
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/students/${child.studentProfileId}`}>
                      Ogrenciye git
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {canReadFinance && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{finance.guardianContractsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {finance.guardianContractsDescription}
            </p>
            {financeContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {finance.noContractsDescription}
              </p>
            ) : (
              <div className="space-y-3">
                {financeContracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-medium">{contract.displayNumber}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {contract.student.fullName} · {finance.remaining}:{" "}
                        {contract.totals.remainingBalance} {contract.currencyCode}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/finance?contractId=${contract.id}`}>
                        {finance.viewFinance}
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
