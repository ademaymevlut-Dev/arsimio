"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { getTenantContext } from "@/server/tenancy/context";
import { isSameOrigin, loginIdentifier } from "@/server/auth/identifiers";
import { isValidPassword, verifyPassword } from "@/server/auth/password";
import {
  consumeLoginAttempt,
  findLoginIdentity,
  issueSession,
  revokeSession,
} from "@/server/auth/service";
import { sessionCookieName, SESSION_SECONDS } from "@/server/auth/tokens";

export type AuthState = { error?: string };
const failure = {
  error:
    "Giriş yapılamadı. Bilgilerinizi kontrol edin veya daha sonra tekrar deneyin.",
};

async function sameOriginRequest() {
  const request = await headers();
  return isSameOrigin(
    request.get("origin"),
    request.get("host"),
    process.env.NODE_ENV === "development",
  );
}

export async function signIn(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  const tenant = await getTenantContext();
  if (!(await sameOriginRequest())) return failure;
  const rawIdentifier = form.get("identifier");
  const password = form.get("password");
  if (
    typeof rawIdentifier !== "string" ||
    typeof password !== "string" ||
    rawIdentifier.length > 320 ||
    !isValidPassword(password)
  )
    return failure;
  const identifier = loginIdentifier(tenant.kind, rawIdentifier);
  if (!identifier) return failure;
  try {
    const db = getPrisma();
    if (!(await consumeLoginAttempt(db, tenant, identifier))) return failure;
    const identity = await findLoginIdentity(db, tenant, identifier);
    const valid = await verifyPassword(
      password,
      identity?.user.credential?.passwordHash,
    );
    if (!valid || !identity) return failure;
    const jar = await cookies();
    const name = sessionCookieName(process.env.NODE_ENV === "production");
    const session = await db.$transaction((tx) =>
      issueSession(tx, tenant, identifier, identity, jar.get(name)?.value),
    );
    if (!session) return failure;
    jar.set(name, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
      maxAge: SESSION_SECONDS,
    });
  } catch {
    console.error("AUTH_SIGN_IN_UNAVAILABLE");
    return {
      error: "Giriş hizmetine şu an ulaşılamıyor. Lütfen tekrar deneyin.",
    };
  }
  redirect(tenant.kind === "platform" ? "/platform" : "/dashboard");
}

export async function signOut() {
  const tenant = await getTenantContext();
  if (!(await sameOriginRequest())) throw new Error("İstek doğrulanamadı.");
  const jar = await cookies();
  const name = sessionCookieName(process.env.NODE_ENV === "production");
  await getPrisma().$transaction((tx) =>
    revokeSession(tx, jar.get(name)?.value, tenant.hostname),
  );
  jar.set(name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  redirect("/login");
}
