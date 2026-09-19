import "server-only";
import { cache } from "react";
import { getAuth } from "./server";
import { getPrisma } from "@/lib/db";

export const getAppUser = cache(async () => {
  // Provider session revalidation as well as fresh application status/role checks.
  // SDK 0.5.0-beta compares this query flag to the STRING "true" before fetching,
  // despite typing it as boolean. Keep this narrow workaround until upgrading SDK.
  const { data: session, error } = await getAuth().getSession({
    query: { disableCookieCache: "true" as unknown as boolean },
  });
  if (error || !session?.user || !session.user.emailVerified) return null;
  // Reads never assign privileges or implicitly link identities by email.
  return getPrisma().user.findFirst({
    where: {
      authProvider: "neon",
      authProviderUserId: session.user.id,
      status: "ACTIVE",
      archivedAt: null,
    },
    select: { id: true, email: true, firstName: true },
  });
});
