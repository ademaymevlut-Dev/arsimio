import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, verifyPassword } from "../src/server/auth/password";
import { activateBootstrap } from "../src/server/auth/bootstrap";
import {
  consumeLoginAttempt,
  findLoginIdentity,
  issueSession,
  readSessionUser,
  revokeSession,
} from "../src/server/auth/service";
import { tokenHash } from "../src/server/auth/tokens";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
const link = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
assert.equal(link.projectId, "prj_TDX4sLtnwUpiYpvWZjOZqqkzqfNR");
const direct =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING;
assert.ok(direct && process.env.DATABASE_URL);
assert.equal(
  new URL(direct).hostname,
  new URL(process.env.DATABASE_URL).hostname.replace("-pooler.", "."),
);
neonConfig.webSocketConstructor = globalThis.WebSocket;
const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: direct }),
});
const rollback = new Error("EXPECTED_TEST_ROLLBACK");
const password = `Only-test-${randomUUID()}`;
const passwordHash = await hashPassword(password);
let passed = 0;
function pass(label: string) {
  passed++;
  console.log(`PASS ${label}`);
}
try {
  await db.$transaction(
    async (tx) => {
      if (process.argv.includes("--preview-migration")) {
        const migration = readFileSync(
          "prisma/migrations/20260919000200_password_auth/migration.sql",
          "utf8",
        );
        for (const statement of migration
          .replace(/^BEGIN;$/m, "")
          .replace(/^COMMIT;$/m, "")
          .split(";")) {
          if (statement.trim()) await tx.$executeRawUnsafe(statement);
        }
        pass("password migration executes inside rollback-only transaction");
      }
      const schools = await Promise.all(
        ["a", "b"].map((name) =>
          tx.school.create({
            data: { slug: `auth-test-${randomUUID()}`, name, status: "ACTIVE" },
          }),
        ),
      );
      const users = await Promise.all(
        schools.map(() =>
          tx.user.create({
            data: {
              status: "ACTIVE",
              credential: { create: { passwordHash } },
            },
          }),
        ),
      );
      const memberships = await Promise.all(
        schools.map((school, i) =>
          tx.schoolMembership.create({
            data: {
              schoolId: school.id,
              userId: users[i].id,
              username: "same.username",
              status: "ACTIVE",
            },
          }),
        ),
      );
      const [a, b] = schools.map((school, i) => ({
        kind: "school" as const,
        hostname: `auth-test-${i}.test`,
        school: { id: school.id },
      }));
      const platform = {
        kind: "platform" as const,
        hostname: "arsimio.vercel.app",
      };
      pass(
        "school users have no email and same username can exist in separate schools",
      );
      const identity = await findLoginIdentity(tx, a, "same.username");
      assert.ok(identity?.user.credential);
      assert.equal(identity.user.id, users[0].id);
      assert.equal(
        (await findLoginIdentity(tx, b, "same.username"))?.user.id,
        users[1].id,
      );
      pass("domain school selects its own username identity");
      assert.equal(
        await verifyPassword(password, identity.user.credential.passwordHash),
        true,
      );
      assert.equal(
        await verifyPassword(
          "wrong-test-password",
          identity.user.credential.passwordHash,
        ),
        false,
      );
      pass("password verification accepts correct and rejects wrong password");
      assert.equal(
        await findLoginIdentity(tx, platform, "same.username"),
        null,
      );
      pass("school username cannot sign in on platform");
      const session = await issueSession(tx, a, "same.username", identity);
      assert.ok(session);
      assert.equal(
        (await readSessionUser(tx, session.token, a))?.id,
        users[0].id,
      );
      assert.equal(await readSessionUser(tx, session.token, b), null);
      assert.equal(await readSessionUser(tx, session.token, platform), null);
      assert.equal(await readSessionUser(tx, session.hash, a), null);
      pass(
        "session works only on its own host/school and DB hash is not a bearer token",
      );
      await tx.schoolMembership.update({
        where: { id: memberships[0].id },
        data: { status: "SUSPENDED" },
      });
      assert.equal(await readSessionUser(tx, session.token, a), null);
      assert.equal(await findLoginIdentity(tx, a, "same.username"), null);
      pass(
        "membership suspension immediately rejects login and existing session",
      );
      await tx.schoolMembership.update({
        where: { id: memberships[0].id },
        data: { status: "ACTIVE" },
      });
      await tx.user.update({
        where: { id: users[0].id },
        data: { status: "SUSPENDED" },
      });
      assert.equal(await readSessionUser(tx, session.token, a), null);
      pass("user suspension immediately rejects existing session");
      await tx.user.update({
        where: { id: users[0].id },
        data: { status: "ACTIVE" },
      });
      await tx.school.update({
        where: { id: schools[0].id },
        data: { status: "SUSPENDED" },
      });
      assert.equal(await readSessionUser(tx, session.token, a), null);
      pass("school suspension immediately rejects existing session");
      await tx.school.update({
        where: { id: schools[0].id },
        data: { status: "ACTIVE" },
      });
      await tx.userCredential.update({
        where: { userId: users[0].id },
        data: { version: { increment: 1 } },
      });
      assert.equal(await readSessionUser(tx, session.token, a), null);
      assert.equal(await issueSession(tx, a, "same.username", identity), null);
      pass(
        "password version change invalidates sessions and stale login attempts",
      );
      const current = await findLoginIdentity(tx, a, "same.username");
      assert.ok(current);
      const renewed = await issueSession(
        tx,
        a,
        "same.username",
        current,
        session.token,
      );
      assert.ok(renewed);
      assert.ok(
        (
          await tx.authSession.findUnique({
            where: { tokenHash: session.hash },
          })
        )?.revokedAt,
      );
      await revokeSession(tx, renewed.token, a.hostname);
      assert.equal(await readSessionUser(tx, renewed.token, a), null);
      pass("login rotates previous token and logout revokes database session");
      for (let i = 0; i < 10; i++)
        assert.equal(await consumeLoginAttempt(tx, a, "same.username"), true);
      assert.equal(await consumeLoginAttempt(tx, a, "same.username"), false);
      assert.equal(
        await consumeLoginAttempt(
          tx,
          { ...a, hostname: "another-alias.test" },
          "same.username",
        ),
        false,
      );
      assert.equal(await consumeLoginAttempt(tx, b, "same.username"), true);
      await tx.authThrottle.update({
        where: { key: tokenHash(`login:${a.school.id}:same.username`) },
        data: { resetAt: new Date(0) },
      });
      assert.equal(await consumeLoginAttempt(tx, a, "same.username"), true);
      pass(
        "DB throttle limits 10 attempts, covers aliases, isolates schools and expires",
      );
      const adminRole = await tx.role.findFirstOrThrow({
        where: { code: "SUPER_ADMIN", scope: "PLATFORM", schoolId: null },
      });
      const email = `auth-test-${randomUUID()}@example.invalid`;
      const reserved = await tx.user.create({
        data: { email, platformRoles: { create: { roleId: adminRole.id } } },
      });
      assert.equal(await findLoginIdentity(tx, platform, email), null);
      await activateBootstrap(tx, email, passwordHash);
      const admin = await findLoginIdentity(tx, platform, email);
      assert.equal(admin?.user.id, reserved.id);
      assert.ok(admin);
      await assert.rejects(activateBootstrap(tx, email, passwordHash));
      const adminSession = await issueSession(tx, platform, email, admin);
      assert.ok(adminSession);
      assert.equal(
        (await readSessionUser(tx, adminSession.token, platform))?.id,
        reserved.id,
      );
      assert.equal(await readSessionUser(tx, adminSession.token, a), null);
      pass(
        "operator bootstrap is one-time; platform email session grants no school session",
      );
      const events = await tx.auditEvent.findMany({
        where: {
          actorUserId: { in: [...users.map((u) => u.id), reserved.id] },
        },
      });
      assert.ok(events.some((event) => event.action === "auth.signed_in"));
      assert.ok(events.some((event) => event.action === "auth.signed_out"));
      assert.ok(
        events.some((event) => event.action === "auth.bootstrap_password_set"),
      );
      const logged = JSON.stringify(events);
      for (const secret of [
        password,
        passwordHash,
        session.token,
        session.hash,
        tokenHash(adminSession.token),
      ])
        assert.equal(logged.includes(secret), false);
      pass(
        "auth audit contains actor/context but no password/hash/session secret",
      );
      async function rejectsDb(
        label: string,
        query: string,
        ...values: unknown[]
      ) {
        await tx.$executeRawUnsafe("SAVEPOINT expected_rejection");
        let rejected = false;
        try {
          await tx.$executeRawUnsafe(query, ...values);
        } catch {
          rejected = true;
        }
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT expected_rejection");
        assert.ok(rejected, label);
        pass(label);
      }
      await rejectsDb(
        "duplicate username inside a school rejected",
        "UPDATE school_memberships SET school_id = $1::uuid WHERE id = $2::uuid",
        schools[0].id,
        memberships[1].id,
      );
      await rejectsDb(
        "non-normalized username rejected",
        "UPDATE school_memberships SET username = 'UPPERCASE' WHERE id = $1::uuid",
        memberships[0].id,
      );
      await rejectsDb(
        "cross-school session membership rejected",
        "UPDATE auth_sessions SET school_id = $1::uuid WHERE token_hash = $2",
        schools[1].id,
        session.hash,
      );
      await rejectsDb(
        "partial school/session scope rejected",
        "UPDATE auth_sessions SET membership_id = NULL WHERE token_hash = $1",
        session.hash,
      );
      throw rollback;
    },
    { timeout: 60000 },
  );
} catch (error) {
  if (error !== rollback) {
    console.error(
      "Auth verification failed (details withheld to protect fixture credentials).",
      {
        afterCheck: passed,
        name: error instanceof Error ? error.name : "unknown",
        code:
          typeof error === "object" && error && "code" in error
            ? error.code
            : null,
      },
    );
    process.exitCode = 1;
  } else
    console.log(
      `${passed} auth/database checks passed; all fixtures and preview DDL rolled back.`,
    );
} finally {
  await db.$disconnect();
}
