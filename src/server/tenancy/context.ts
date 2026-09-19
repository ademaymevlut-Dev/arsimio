import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import {
  classifyHostname,
  domainIsUsable,
  normalizeHostname,
} from "./hostname";

// React cache is request-local. Never share a session/tenant result across requests.
export const getTenantContext = cache(async () => {
  const incoming = await headers();
  const hostname = normalizeHostname(incoming.get("host"));
  if (!hostname) notFound();
  const route = classifyHostname(
    hostname,
    process.env.NODE_ENV === "development",
  );
  if (route.kind === "platform") return { kind: "platform" as const, hostname };
  const domain = await getPrisma().schoolDomain.findUnique({
    where: { hostname: route.hostname },
    select: {
      status: true,
      verifiedAt: true,
      school: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          archivedAt: true,
          branding: { select: { primaryColor: true, accentColor: true } },
        },
      },
    },
  });
  if (!domainIsUsable(domain) || !domain) notFound();
  return { kind: "school" as const, hostname, school: domain.school };
});
