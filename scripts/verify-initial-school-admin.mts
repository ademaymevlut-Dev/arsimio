import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/auth/password";
import { persistInitialSchoolAdmin } from "../src/server/platform/initial-school-admin-service";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
const connection =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;
assert.ok(connection, "Database connection is required");
neonConfig.webSocketConstructor = globalThis.WebSocket;
const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: connection }),
});
const rollback = new Error("EXPECTED_INITIAL_ADMIN_TEST_ROLLBACK");
const fixturePrefix = `initial-admin-${randomUUID()}`;
const passwordHash = await hashPassword("Rollback-only-test-2026");
let passed = 0;
function pass(message: string) {
  passed++;
  console.log(`PASS ${message}`);
}

try {
  await db.$transaction(
    async (tx) => {
      const actor = await tx.user.create({ data: { status: "ACTIVE" } });
      const school = await tx.school.create({
        data: {
          slug: `${fixturePrefix}-a`,
          name: "Initial admin test school",
          status: "ACTIVE",
        },
      });
      const role = await tx.role.create({
        data: {
          schoolId: school.id,
          key: `${school.id}:SCHOOL_ADMIN`,
          code: "SCHOOL_ADMIN",
          name: "Okul Admin",
          scope: "SCHOOL",
          isSystem: true,
        },
      });
      const input = {
        schoolId: school.id,
        actorUserId: actor.id,
        firstName: "Test",
        lastName: "Yönetici",
        username: "school.admin",
        passwordHash,
      };
      const result = await persistInitialSchoolAdmin(tx, input);
      assert.equal(result.status, "success");
      const membership = await tx.schoolMembership.findUniqueOrThrow({
        where: {
          schoolId_username: {
            schoolId: school.id,
            username: input.username,
          },
        },
        include: {
          user: { include: { credential: true } },
          roles: true,
        },
      });
      assert.equal(membership.status, "ACTIVE");
      assert.equal(membership.user.status, "ACTIVE");
      assert.equal(membership.user.credential?.passwordHash, passwordHash);
      assert.equal(membership.roles.length, 1);
      assert.equal(membership.roles[0].roleId, role.id);
      pass("user, credential, membership and SCHOOL_ADMIN role are atomic");

      const event = await tx.auditEvent.findFirstOrThrow({
        where: {
          schoolId: school.id,
          action: "platform.school_admin.created",
        },
      });
      assert.equal(event.actorUserId, actor.id);
      assert.equal(event.entityId, membership.id);
      assert.equal(JSON.stringify(event).includes(passwordHash), false);
      assert.equal(JSON.stringify(event).includes("Rollback-only-test-2026"), false);
      pass("audit records actor and target without password or hash");

      const repeated = await persistInitialSchoolAdmin(tx, {
        ...input,
        username: "second.admin",
      });
      assert.equal(repeated.status, "error");
      assert.equal(
        await tx.schoolMembership.count({ where: { schoolId: school.id } }),
        1,
      );
      assert.equal(
        await tx.auditEvent.count({
          where: {
            schoolId: school.id,
            action: "platform.school_admin.created",
          },
        }),
        1,
      );
      pass("initial setup cannot create a second school administrator");

      const usernameSchool = await tx.school.create({
        data: {
          slug: `${fixturePrefix}-b`,
          name: "Username conflict school",
          status: "ACTIVE",
        },
      });
      await tx.role.create({
        data: {
          schoolId: usernameSchool.id,
          key: `${usernameSchool.id}:SCHOOL_ADMIN`,
          code: "SCHOOL_ADMIN",
          name: "Okul Admin",
          scope: "SCHOOL",
        },
      });
      const existingUser = await tx.user.create({ data: { status: "ACTIVE" } });
      await tx.schoolMembership.create({
        data: {
          schoolId: usernameSchool.id,
          userId: existingUser.id,
          username: input.username,
          status: "ACTIVE",
        },
      });
      const conflict = await persistInitialSchoolAdmin(tx, {
        ...input,
        schoolId: usernameSchool.id,
      });
      assert.equal(conflict.status, "error");
      assert.ok(conflict.fieldErrors?.username);
      pass("an existing school username is never overwritten or merged");

      const noRoleSchool = await tx.school.create({
        data: {
          slug: `${fixturePrefix}-c`,
          name: "Missing role school",
          status: "ACTIVE",
        },
      });
      const missingRole = await persistInitialSchoolAdmin(tx, {
        ...input,
        schoolId: noRoleSchool.id,
      });
      assert.equal(missingRole.status, "error");
      assert.equal(
        await tx.schoolMembership.count({
          where: { schoolId: noRoleSchool.id },
        }),
        0,
      );
      pass("missing same-school role fails closed without partial records");

      await tx.school.update({
        where: { id: noRoleSchool.id },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
      assert.equal(
        (
          await persistInitialSchoolAdmin(tx, {
            ...input,
            schoolId: noRoleSchool.id,
          })
        ).status,
        "error",
      );
      pass("archived schools reject initial administrator creation");
      throw rollback;
    },
    { isolationLevel: "Serializable", timeout: 60000 },
  );
} catch (error) {
  if (error !== rollback) {
    console.error("Initial school admin verification failed.", {
      afterCheck: passed,
      name: error instanceof Error ? error.name : "unknown",
    });
    process.exitCode = 1;
  } else {
    assert.equal(
      await db.school.count({ where: { slug: { startsWith: fixturePrefix } } }),
      0,
    );
    console.log(
      `${passed} database checks passed. All fixtures and writes rolled back; no test data retained.`,
    );
  }
} finally {
  await db.$disconnect();
}

