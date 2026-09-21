import type { ReactNode } from "react";
import { SchoolAdminShell } from "@/components/school-admin/school-admin-shell";
import { DEFAULT_BRANDING, normalizeColor } from "@/lib/school-branding";
import { requireSchoolPermission } from "@/server/authorization/guards";

export const dynamic = "force-dynamic";

export default async function SchoolAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, tenant, membership, permissions } =
    await requireSchoolPermission("dashboard.read");
  const roleNames = membership.roles.map(({ role }) => role.name);
  const userLabel = user.firstName ?? membership.username ?? "Okul yöneticisi";
  const primaryColor =
    normalizeColor(tenant.school.branding?.primaryColor) ??
    DEFAULT_BRANDING.primaryColor;

  return (
    <SchoolAdminShell
      schoolName={tenant.school.name}
      hostname={tenant.hostname}
      primaryColor={primaryColor}
      userLabel={userLabel}
      username={membership.username}
      roleNames={roleNames}
      permissions={permissions}
    >
      {children}
    </SchoolAdminShell>
  );
}

