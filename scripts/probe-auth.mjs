import { config } from "dotenv";
import { randomBytes } from "node:crypto";
config({ path: ".env.local", quiet: true });
const base = process.env.NEON_AUTH_BASE_URL;
if (!base) throw new Error("NEON_AUTH_BASE_URL missing");
for (const origin of [
  "https://arsimio.vercel.app",
  "https://horizonedu.vercel.app",
  "https://gjimcamedu.vercel.app",
]) {
  const response = await fetch(`${base}/get-session?disableCookieCache=true`, {
    headers: { Origin: origin },
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => null);
  console.log(
    JSON.stringify({
      origin,
      status: response.status,
      unauthenticated: data === null,
      errorCode: data?.code ?? null,
    }),
  );
  if (process.argv.includes("--login")) {
    // Negative sign-in only: no account creation or email sending.
    const rejected = await fetch(`${base}/sign-in/email`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "arsimio-probe@example.invalid", password: randomBytes(24).toString("base64url") }),
      signal: AbortSignal.timeout(15000),
    });
    const failure = await rejected.json().catch(() => null);
    console.log(JSON.stringify({ origin, method: "sign-in/email", status: rejected.status, code: failure?.code ?? null }));
  }
}
