import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import { neonConfig, Pool } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

// All fixtures (and, in preview mode, the migration) are rolled back.
// Run only against the Arsimio database configured in this checkout.
const preview = process.argv.includes("--preview-migration");
const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING;
assert.ok(connectionString, "An unpooled database URL is required.");
const direct = new URL(connectionString);
const runtime = new URL(process.env.DATABASE_URL);
assert.equal(direct.hostname, runtime.hostname.replace("-pooler.", "."));
assert.equal(direct.pathname, runtime.pathname);
assert.ok(globalThis.WebSocket, "Use Node.js 22.18+ (24 recommended).");
neonConfig.webSocketConstructor = globalThis.WebSocket;

const pool = new Pool({ connectionString, connectionTimeoutMillis: 15000 });
const schoolA = randomUUID();
const schoolB = randomUUID();
const userA = randomUUID();
const userB = randomUUID();
const memberA = randomUUID();
const memberB = randomUUID();
const teacherA = randomUUID();
const teacherB = randomUUID();
const platformRole = randomUUID();
const schoolPermission = randomUUID();
const platformPermission = randomUUID();
const invitationA = randomUUID();
const eventA = randomUUID();
const now = new Date();
let passed = 0;
let client;

async function insert(table, values) {
  const columns = Object.keys(values);
  assert.ok([table, ...columns].every((name) => /^[a-z_]+$/.test(name)));
  return client.query(
    `INSERT INTO public."${table}" (${columns.map((name) => `"${name}"`).join(", ")}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})`,
    Object.values(values),
  );
}

function pass(label) {
  passed += 1;
  console.log(`PASS ${label}`);
}

async function rejects(label, code, action) {
  await client.query("SAVEPOINT expected_rejection");
  let failure;
  try {
    await action();
  } catch (error) {
    failure = error;
  }
  await client.query("ROLLBACK TO SAVEPOINT expected_rejection");
  await client.query("RELEASE SAVEPOINT expected_rejection");
  const expectedCodes = Array.isArray(code) ? code : [code];
  assert.ok(expectedCodes.includes(failure?.code), `${label}: expected ${expectedCodes.join("/")}, received ${failure?.code ?? "no rejection"}`);
  pass(label);
}

try {
  client = await pool.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("SET LOCAL statement_timeout = '30s'");
  if (preview) {
    const { rows } = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
    );
    assert.equal(rows.length, 0, "Preview requires an empty application schema.");
    const file = new URL("../prisma/migrations/20260919000100_init_core/migration.sql", import.meta.url);
    const migration = await readFile(file, "utf8");
    // This known migration wraps its DDL in BEGIN/COMMIT for atomic deployment.
    // Remove only those boundary statements to keep the preview rollbackable.
    assert.equal((migration.match(/^BEGIN;$/gm) ?? []).length, 1);
    assert.equal((migration.match(/^COMMIT;$/gm) ?? []).length, 1);
    await client.query(migration.replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, ""));
    pass("initial migration executes inside a rollback-only transaction");
  }

  for (const id of [schoolA, schoolB]) {
    await insert("schools", { id, slug: `verify-${id}`, name: "Schema verification", updated_at: now });
  }
  for (const id of [userA, userB]) {
    await insert("users", { id, email: `${id}@example.invalid`, updated_at: now });
  }
  await insert("school_memberships", { id: memberA, school_id: schoolA, user_id: userA, updated_at: now });
  await insert("school_memberships", { id: memberB, school_id: schoolB, user_id: userB, updated_at: now });
  await insert("school_memberships", { id: randomUUID(), school_id: schoolB, user_id: userA, updated_at: now });
  pass("one user can belong to multiple schools");

  for (const [id, school] of [[teacherA, schoolA], [teacherB, schoolB]]) {
    await insert("roles", { id, school_id: school, key: id, code: "TEACHER", name: "Teacher", scope: "SCHOOL", updated_at: now });
  }
  const platformCode = `VERIFY_${platformRole}`;
  await insert("roles", { id: platformRole, key: platformRole, code: platformCode, name: "Platform verification", scope: "PLATFORM", updated_at: now });
  pass("school role codes can repeat across schools");
  for (const [id, scope] of [[schoolPermission, "SCHOOL"], [platformPermission, "PLATFORM"]]) {
    await insert("permissions", { id, code: `verify.${id}`, scope, updated_at: now });
  }
  await insert("role_permissions", { role_id: teacherA, permission_id: schoolPermission, scope: "SCHOOL" });
  await insert("role_permissions", { role_id: platformRole, permission_id: platformPermission, scope: "PLATFORM" });
  await insert("membership_roles", { school_id: schoolA, membership_id: memberA, role_id: teacherA });
  await insert("user_roles", { user_id: userA, role_id: platformRole });
  pass("matching tenant/platform role and permission assignments succeed");

  await rejects("cross-school role assignment", "23503", () => insert("membership_roles", { school_id: schoolA, membership_id: memberA, role_id: teacherB }));
  await rejects("forged school on membership assignment", "23503", () => insert("membership_roles", { school_id: schoolB, membership_id: memberA, role_id: teacherB }));
  await rejects("platform role assigned to school membership", "23503", () => insert("membership_roles", { school_id: schoolA, membership_id: memberA, role_id: platformRole }));
  await rejects("school role assigned globally", "23503", () => insert("user_roles", { user_id: userB, role_id: teacherA }));
  await rejects("forged scope on global assignment", "23514", () => insert("user_roles", { user_id: userB, role_id: teacherA, role_scope: "SCHOOL" }));
  await rejects("platform permission assigned to school role", "23503", () => insert("role_permissions", { role_id: teacherA, permission_id: platformPermission, scope: "SCHOOL" }));
  await rejects("forged permission assignment scope", "23503", () => insert("role_permissions", { role_id: teacherA, permission_id: platformPermission, scope: "PLATFORM" }));
  await rejects("tenantless school role", "23514", () => insert("roles", { id: randomUUID(), key: randomUUID(), code: "INVALID", name: "Invalid", scope: "SCHOOL", updated_at: now }));
  await rejects("school-bound platform role", "23514", () => insert("roles", { id: randomUUID(), school_id: schoolA, key: randomUUID(), code: "INVALID", name: "Invalid", scope: "PLATFORM", updated_at: now }));
  await rejects("duplicate platform role code", "23505", () => insert("roles", { id: randomUUID(), key: randomUUID(), code: platformCode, name: "Duplicate", scope: "PLATFORM", updated_at: now }));
  await rejects("changing a role tenant after assignment", ["23001", "23503"], () => client.query("UPDATE public.roles SET school_id = $1, code = 'MOVED' WHERE id = $2", [schoolB, teacherA]));
  await rejects("duplicate school membership", "23505", () => insert("school_memberships", { id: randomUUID(), school_id: schoolA, user_id: userA, updated_at: now }));

  await insert("school_invitations", { id: invitationA, school_id: schoolA, email: `${randomUUID()}@example.invalid`, token_hash: randomBytes(32).toString("hex"), invited_by_user_id: userA, expires_at: new Date(now.getTime() + 86400000), updated_at: now });
  await insert("invitation_roles", { school_id: schoolA, invitation_id: invitationA, role_id: teacherA });
  pass("same-school invitation role assignment");
  await rejects("cross-school invitation role", "23503", () => insert("invitation_roles", { school_id: schoolA, invitation_id: invitationA, role_id: teacherB }));
  await rejects("forged invitation school", "23503", () => insert("invitation_roles", { school_id: schoolB, invitation_id: invitationA, role_id: teacherB }));
  await rejects("platform role in school invitation", "23503", () => insert("invitation_roles", { school_id: schoolA, invitation_id: invitationA, role_id: platformRole }));

  const audit = { id: eventA, school_id: schoolA, actor_user_id: userA, actor_membership_id: memberA, action: "verification.created", entity_type: "verification" };
  await insert("audit_events", audit);
  await insert("audit_events", { id: randomUUID(), source: "SYSTEM", action: "verification.system", entity_type: "verification" });
  pass("valid tenant audit and platform system audit");
  await rejects("audit membership from a different school", "23503", () => insert("audit_events", { ...audit, id: randomUUID(), school_id: schoolB }));
  await rejects("audit membership belonging to another user", "23503", () => insert("audit_events", { ...audit, id: randomUUID(), actor_user_id: userB }));
  await rejects("partial audit context bypass", "23514", () => insert("audit_events", { ...audit, id: randomUUID(), school_id: null }));
  await rejects("user audit without actor", "23514", () => insert("audit_events", { id: randomUUID(), action: "verification.invalid", entity_type: "verification" }));
  await rejects("audit UPDATE", "55000", () => client.query("UPDATE public.audit_events SET reason = 'tampered' WHERE id = $1", [eventA]));
  await rejects("audit DELETE", "55000", () => client.query("DELETE FROM public.audit_events WHERE id = $1", [eventA]));
  await rejects("audit TRUNCATE", "55000", () => client.query("TRUNCATE public.audit_events"));
  await rejects("deleting referenced audit membership", ["23001", "23503"], () => client.query("DELETE FROM public.school_memberships WHERE id = $1", [memberA]));

  const domain = { id: randomUUID(), school_id: schoolA, hostname: `${randomUUID()}.example.invalid`, status: "VERIFIED", verified_at: now, is_primary: true, updated_at: now };
  await insert("school_domains", domain);
  pass("verified primary domain");
  await rejects("two primary domains for one school", "23505", () => insert("school_domains", { ...domain, id: randomUUID(), hostname: `${randomUUID()}.example.invalid` }));
  await rejects("domain claimed by two schools", "23505", () => insert("school_domains", { ...domain, id: randomUUID(), school_id: schoolB }));
  await rejects("unverified primary domain", "23514", () => insert("school_domains", { ...domain, id: randomUUID(), school_id: schoolB, hostname: `${randomUUID()}.example.invalid`, status: "PENDING" }));
  await rejects("hostname containing protocol", "23514", () => insert("school_domains", { ...domain, id: randomUUID(), school_id: schoolB, hostname: "https://invalid.example" }));
  await rejects("uppercase email bypass", "23514", () => insert("users", { id: randomUUID(), email: "Uppercase@example.invalid", updated_at: now }));
  await rejects("incomplete auth identity", "23514", () => insert("users", { id: randomUUID(), email: `${randomUUID()}@example.invalid`, auth_provider: "test", updated_at: now }));

  await client.query("ROLLBACK");
  if (preview) {
    const { rows } = await client.query("SELECT to_regclass('public.schools') AS name");
    assert.equal(rows[0].name, null, "Preview must leave no application tables.");
  } else {
    const { rows } = await client.query("SELECT count(*)::int AS total FROM public.schools WHERE id = ANY($1::uuid[])", [[schoolA, schoolB]]);
    assert.equal(rows[0].total, 0, "Verification must leave no fixtures.");
  }
  pass("rollback leaves no verification data");
  console.log(`${passed} checks passed${preview ? " (migration preview)" : ""}.`);
} catch (error) {
  // Do not print driver errors wholesale: they can include connection details.
  console.error("Schema verification failed", { code: error.code ?? error.name, constraint: error.constraint ?? null, assertion: error instanceof assert.AssertionError ? error.message : undefined });
  process.exitCode = 1;
} finally {
  if (client) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
  await pool.end();
}
