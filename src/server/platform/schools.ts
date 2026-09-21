import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { requirePlatformPermission } from "@/server/authorization/guards";
import { validSchoolId } from "@/lib/platform-school-validation";

export const getPlatformSchools = cache(async () => {
  await requirePlatformPermission("platform.schools.read");
  return getPrisma().school.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      branding: {
        select: {
          primaryColor: true,
          accentColor: true,
          secondaryColor: true,
          logoAssetKey: true,
        },
      },
      domains: {
        select: {
          hostname: true,
          status: true,
          isPrimary: true,
          verifiedAt: true,
        },
        orderBy: { isPrimary: "desc" },
      },
      _count: {
        select: {
          memberships: { where: { status: "ACTIVE", archivedAt: null } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
});

export async function getPlatformSchool(id: string) {
  const { user } = await requirePlatformPermission("platform.schools.read");
  if (!validSchoolId(id)) notFound();
  const [school, grants] = await Promise.all([
    getPrisma().school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        legalName: true,
        status: true,
        timezone: true,
        defaultLocale: true,
        updatedAt: true,
        archivedAt: true,
        branding: {
          select: {
            primaryColor: true,
            secondaryColor: true,
            accentColor: true,
            logoAssetKey: true,
            iconAssetKey: true,
            updatedAt: true,
          },
        },
        domains: {
          select: {
            hostname: true,
            status: true,
            isPrimary: true,
            verifiedAt: true,
          },
          orderBy: { isPrimary: "desc" },
        },
        memberships: {
          where: {
            roles: {
              some: {
                role: { code: "SCHOOL_ADMIN", scope: "SCHOOL" },
              },
            },
          },
          select: {
            id: true,
            username: true,
            status: true,
            joinedAt: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                status: true,
                lastLoginAt: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    getPrisma().userRole.findMany({
      where: {
        userId: user.id,
        roleScope: "PLATFORM",
        role: { scope: "PLATFORM", schoolId: null },
      },
      select: {
        role: {
          select: {
            permissions: {
              where: { scope: "PLATFORM", permission: { scope: "PLATFORM" } },
              select: { permission: { select: { code: true } } },
            },
          },
        },
      },
    }),
  ]);
  if (!school) notFound();
  const permissions = new Set(
    grants.flatMap((grant) =>
      grant.role.permissions.map((entry) => entry.permission.code),
    ),
  );
  const editable = !school.archivedAt && school.status !== "ARCHIVED";
  return {
    school,
    canEditProfile: editable && permissions.has("platform.schools.update"),
    canEditBranding: editable && permissions.has("platform.branding.update"),
    canCreateInitialAdmin:
      editable &&
      school.memberships.length === 0 &&
      permissions.has("platform.admins.invite"),
  };
}
