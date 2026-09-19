import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

let auth: ReturnType<typeof createNeonAuth> | undefined;
export function getAuth() {
  if (!auth) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;
    if (!baseUrl || !secret || secret.length < 32)
      throw new Error("Authentication configuration is incomplete.");
    auth = createNeonAuth({
      baseUrl,
      cookies: { secret, sameSite: "lax" },
      logLevel: "silent",
    });
  }
  return auth;
}
