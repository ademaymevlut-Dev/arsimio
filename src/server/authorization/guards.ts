import "server-only";
import { notFound, redirect } from "next/navigation";
import { getTenantContext } from "@/server/tenancy/context";
import { getAppUser } from "@/server/auth/user";
import { getPrisma } from "@/lib/db";
import { canAccessSchool } from "./policy";

export async function requirePlatformPermission(permission: string) {
  const tenant = await getTenantContext();
  if (tenant.kind !== "platform") notFound();
  const user = await getAppUser();
  if (!user) redirect("/login");
  const grant = await getPrisma().userRole.findFirst({
    where: {
      userId: user.id,
      roleScope: "PLATFORM",
      role: {
        scope: "PLATFORM",
        schoolId: null,
        permissions: {
          some: {
            scope: "PLATFORM",
            permission: { code: permission, scope: "PLATFORM" },
          },
        },
      },
    },
  });
  if (!grant) redirect("/access-denied");
  return { user, tenant };
}

export async function requireSchoolPermission(permission: string) {
  const tenant = await getTenantContext();
  if (tenant.kind !== "school") notFound();
  const user = await getAppUser();
  if (!user) redirect("/login");
  const membership = await getPrisma().schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId: tenant.school.id, userId: user.id } },
    include: {
      roles: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      },
    },
  });
  const permissions =
    membership?.roles
      .filter(
        (r) =>
          r.schoolId === tenant.school.id &&
          r.role.scope === "SCHOOL" &&
          r.role.schoolId === tenant.school.id,
      )
      .flatMap((r) =>
        r.role.permissions
          .filter(
            (p) => p.scope === "SCHOOL" && p.permission.scope === "SCHOOL",
          )
          .map((p) => p.permission.code),
      ) ?? [];
  if (
    !membership ||
    membership.archivedAt ||
    !canAccessSchool(
      {
        userStatus: "ACTIVE",
        schoolStatus: tenant.school.status,
        membershipStatus: membership.status,
        membershipSchoolId: membership.schoolId,
        tenantSchoolId: tenant.school.id,
        resourceSchoolId: tenant.school.id,
        permissions,
      },
      permission,
    )
  )
    redirect("/access-denied");
  return { user, tenant, membership, permissions };
}
