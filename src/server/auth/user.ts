import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/db";
import { getTenantContext } from "@/server/tenancy/context";
import { readSessionUser } from "./service";
import { sessionCookieName } from "./tokens";

export const getAppUser = cache(async () => {
  const tenant = await getTenantContext();
  const token = (await cookies()).get(
    sessionCookieName(process.env.NODE_ENV === "production"),
  )?.value;
  return readSessionUser(getPrisma(), token, tenant);
});
