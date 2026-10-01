import "server-only";
import type { AccountPortal } from "@/generated/prisma/client";
import { notFound, redirect } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { getAppUser } from "@/server/auth/user";
import { getTenantContext } from "@/server/tenancy/context";

export async function requirePortalAccount(portal: AccountPortal) {
  const tenant = await getTenantContext();
  if (tenant.kind !== "school") notFound();
  const user = await getAppUser();
  if (!user) redirect("/login");
  if (user.account?.mustChangePassword) redirect("/change-password");
  if (!user.account || user.account.portal !== portal)
    redirect("/access-denied");

  const account = await getPrisma().personAccount.findFirst({
    where: {
      id: user.account.id,
      schoolId: tenant.school.id,
      userId: user.id,
      portal,
      archivedAt: null,
      suspendedAt: null,
    },
    select: { id: true, personId: true, portal: true },
  });
  if (!account) redirect("/access-denied");
  return { user, tenant, account };
}
