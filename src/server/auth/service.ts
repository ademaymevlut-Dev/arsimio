import type { Prisma } from "../../generated/prisma/client";
import {
  tokenHash,
  newSessionToken,
  validToken,
  sessionMatches,
} from "./tokens";

type Db = Prisma.TransactionClient;
export type LoginTenant =
  | { kind: "platform"; hostname: string }
  | { kind: "school"; hostname: string; school: { id: string } };
const userSelect = {
  id: true,
  status: true,
  archivedAt: true,
  credential: { select: { passwordHash: true, version: true } },
} as const;

export async function findLoginIdentity(
  db: Db,
  tenant: LoginTenant,
  identifier: string,
) {
  if (tenant.kind === "platform") {
    const user = await db.user.findFirst({
      where: {
        email: identifier,
        platformRoles: {
          some: {
            role: { code: "SUPER_ADMIN", scope: "PLATFORM", schoolId: null },
          },
        },
      },
      select: userSelect,
    });
    if (!user || user.status !== "ACTIVE" || user.archivedAt) return null;
    return { user, membershipId: null, schoolId: null };
  }
  const member = await db.schoolMembership.findUnique({
    where: {
      schoolId_username: { schoolId: tenant.school.id, username: identifier },
    },
    select: {
      id: true,
      schoolId: true,
      status: true,
      archivedAt: true,
      school: { select: { status: true, archivedAt: true } },
      user: { select: userSelect },
    },
  });
  if (
    !member ||
    member.status !== "ACTIVE" ||
    member.archivedAt ||
    member.school.status !== "ACTIVE" ||
    member.school.archivedAt ||
    member.user.status !== "ACTIVE" ||
    member.user.archivedAt
  )
    return null;
  return {
    user: member.user,
    membershipId: member.id,
    schoolId: member.schoolId,
  };
}

// Atomic counter shared by serverless instances and all aliases of one school.
// Ten attempts per login identifier per 15-minute fixed window, including successful attempts.
export async function consumeLoginAttempt(
  db: Db,
  tenant: LoginTenant,
  identifier: string,
) {
  const key = tokenHash(
    `login:${tenant.kind === "platform" ? "platform" : tenant.school.id}:${identifier}`,
  );
  const rows = await db.$queryRaw<{ attempts: number }[]>`
    INSERT INTO auth_throttles (key, attempts, reset_at)
    VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN auth_throttles.reset_at <= NOW() THEN 1 ELSE LEAST(auth_throttles.attempts + 1, 11) END,
      reset_at = CASE WHEN auth_throttles.reset_at <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE auth_throttles.reset_at END
    RETURNING attempts`;
  return rows[0].attempts <= 10;
}

// Run inside a transaction after password verification; recheck account and credential state.
export async function issueSession(
  db: Db,
  tenant: LoginTenant,
  identifier: string,
  verified: NonNullable<Awaited<ReturnType<typeof findLoginIdentity>>>,
  previousToken?: string,
) {
  const current = await findLoginIdentity(db, tenant, identifier);
  if (
    !current?.user.credential ||
    !verified.user.credential ||
    current.user.id !== verified.user.id ||
    current.membershipId !== verified.membershipId ||
    current.user.credential.passwordHash !==
      verified.user.credential.passwordHash ||
    current.user.credential.version !== verified.user.credential.version
  )
    return null;
  const session = newSessionToken();
  if (validToken(previousToken))
    await db.authSession.updateMany({
      where: {
        tokenHash: tokenHash(previousToken),
        hostname: tenant.hostname,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  await db.authSession.create({
    data: {
      userId: current.user.id,
      tokenHash: session.hash,
      hostname: tenant.hostname,
      schoolId: current.schoolId,
      membershipId: current.membershipId,
      credentialVersion: current.user.credential.version,
      expiresAt: session.expiresAt,
    },
  });
  await db.user.update({
    where: { id: current.user.id },
    data: { lastLoginAt: new Date() },
  });
  await db.auditEvent.create({
    data: {
      source: "USER",
      actorUserId: current.user.id,
      schoolId: current.schoolId,
      actorMembershipId: current.membershipId,
      action: "auth.signed_in",
      entityType: "User",
      entityId: current.user.id,
    },
  });
  return session;
}

export async function readSessionUser(
  db: Db,
  token: string | undefined,
  tenant: LoginTenant,
) {
  if (!validToken(token)) return null;
  const session = await db.authSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: {
      hostname: true,
      schoolId: true,
      expiresAt: true,
      revokedAt: true,
      credentialVersion: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          status: true,
          archivedAt: true,
          credential: { select: { version: true } },
        },
      },
      membership: {
        select: {
          status: true,
          archivedAt: true,
          school: { select: { status: true, archivedAt: true } },
        },
      },
    },
  });
  if (
    !session ||
    !session.user.credential ||
    session.user.status !== "ACTIVE" ||
    session.user.archivedAt ||
    !sessionMatches(
      session,
      tenant.hostname,
      tenant.kind === "school" ? tenant.school.id : null,
      session.user.credential.version,
    )
  )
    return null;
  if (
    tenant.kind === "school" &&
    (!session.membership ||
      session.membership.status !== "ACTIVE" ||
      session.membership.archivedAt ||
      session.membership.school.status !== "ACTIVE" ||
      session.membership.school.archivedAt)
  )
    return null;
  return {
    id: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
  };
}

export async function revokeSession(
  db: Db,
  token: string | undefined,
  hostname: string,
) {
  if (!validToken(token)) return;
  const session = await db.authSession.findFirst({
    where: { tokenHash: tokenHash(token), hostname, revokedAt: null },
  });
  if (!session) return;
  await db.authSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });
  await db.auditEvent.create({
    data: {
      source: "USER",
      actorUserId: session.userId,
      schoolId: session.schoolId,
      actorMembershipId: session.membershipId,
      action: "auth.signed_out",
      entityType: "User",
      entityId: session.userId,
    },
  });
}
