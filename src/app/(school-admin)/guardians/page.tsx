import { GuardianDirectoryTable } from "@/components/school-admin/guardian-directory-table";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { getGuardianDirectory } from "@/server/accounts/accounts";
import { requireSchoolPermission } from "@/server/authorization/guards";

export const dynamic = "force-dynamic";

export default async function GuardiansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ tenant, membership }, query] = await Promise.all([
    requireSchoolPermission("guardians.read"),
    searchParams,
  ]);
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const [guardians, dictionary] = await Promise.all([
    getGuardianDirectory(tenant.school.id),
    getDictionary(locale),
  ]);

  return (
    <GuardianDirectoryTable
      guardians={guardians}
      initialQuery={query.q?.slice(0, 100)}
      locale={locale}
      messages={{ common: dictionary.common, guardians: dictionary.guardians }}
    />
  );
}
