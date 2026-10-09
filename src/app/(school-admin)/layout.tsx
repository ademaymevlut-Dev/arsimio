import type { ReactNode } from "react";
import { SchoolAdminShell } from "@/components/school-admin/school-admin-shell";
import { DEFAULT_BRANDING, normalizeColor } from "@/lib/school-branding";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getDictionary, getSchoolLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function SchoolAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, tenant, membership, permissions } =
    await requireSchoolPermission("dashboard.read");
  const primaryColor =
    normalizeColor(tenant.school.branding?.primaryColor) ??
    DEFAULT_BRANDING.primaryColor;
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const dictionary = await getDictionary(locale);
  const userLabel =
    user.firstName ?? membership.username ?? dictionary.shell.schoolUser;

  return (
    <SchoolAdminShell
      schoolName={tenant.school.name}
      hostname={tenant.hostname}
      primaryColor={primaryColor}
      userLabel={userLabel}
      username={membership.username}
      permissions={permissions}
      locale={locale}
      messages={{ language: dictionary.language, shell: dictionary.shell }}
    >
      {children}
    </SchoolAdminShell>
  );
}
