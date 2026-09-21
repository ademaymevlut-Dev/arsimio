import type { ReactNode } from "react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { requirePlatformPermission } from "@/server/authorization/guards";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requirePlatformPermission("platform.schools.read");
  return (
    <PlatformShell email={user.email ?? "Platform yöneticisi"}>
      {children}
    </PlatformShell>
  );
}
