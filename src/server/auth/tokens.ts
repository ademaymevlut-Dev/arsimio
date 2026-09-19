import { createHash, randomBytes } from "node:crypto";

export const SESSION_SECONDS = 8 * 60 * 60;
export const sessionCookieName = (production: boolean) =>
  production ? "__Host-arsimio_session" : "arsimio_session";
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const validToken = (value: string | undefined): value is string =>
  Boolean(value && /^[a-f0-9]{64}$/.test(value));
export function newSessionToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    hash: tokenHash(token),
    expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
  };
}

export function sessionMatches(
  session: {
    hostname: string;
    schoolId: string | null;
    expiresAt: Date;
    revokedAt: Date | null;
    credentialVersion: number;
  },
  hostname: string,
  schoolId: string | null,
  version: number,
  now = new Date(),
) {
  return (
    !session.revokedAt &&
    session.expiresAt > now &&
    session.hostname === hostname &&
    session.schoolId === schoolId &&
    session.credentialVersion === version
  );
}
