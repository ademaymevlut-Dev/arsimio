import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword,
  verifyPassword,
  isValidPassword,
} from "../src/server/auth/password";
import { loginIdentifier, isSameOrigin } from "../src/server/auth/identifiers";
import {
  newSessionToken,
  sessionMatches,
  sessionCookieName,
  tokenHash,
  validToken,
} from "../src/server/auth/tokens";

test("platform email and school username are distinct login modes", () => {
  assert.equal(
    loginIdentifier("platform", " Admin@Example.com "),
    "admin@example.com",
  );
  assert.equal(loginIdentifier("platform", "teacher.one"), null);
  assert.equal(loginIdentifier("school", " Teacher.One "), "teacher.one");
  assert.equal(loginIdentifier("school", "admin@example.com"), null);
  for (const invalid of ["ab", "a b", "../admin", "_admin", "a".repeat(65)])
    assert.equal(loginIdentifier("school", invalid), null);
});
test("password limits preserve spaces and do not silently truncate", async () => {
  assert.equal(isValidPassword("short"), false);
  assert.equal(isValidPassword("a".repeat(128)), true);
  await assert.rejects(hashPassword("a".repeat(129)));
  const hash = await hashPassword(" strong password ");
  assert.equal(await verifyPassword("strong password", hash), false);
});
test("salted scrypt verifies only correct password and rejects malformed hashes", async () => {
  const password = "Sadece-test-parolasi-2026";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("Yanlis-test-parolasi", first), false);
  assert.equal(await verifyPassword(password, null), false);
  assert.equal(
    await verifyPassword(password, first.replace("32768", "999999999")),
    false,
  );
});
test("sessions have unpredictable tokens stored only as hashes", () => {
  const first = newSessionToken();
  const second = newSessionToken();
  assert.equal(validToken(first.token), true);
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.hash, first.token);
  assert.equal(first.hash, tokenHash(first.token));
  assert.equal(validToken("forged"), false);
  assert.equal(sessionCookieName(true), "__Host-arsimio_session");
});
test("session rejects other host, school, expiry, revocation and credential version", () => {
  const session = {
    hostname: "school-a.test",
    schoolId: "a",
    expiresAt: new Date(Date.now() + 60000),
    revokedAt: null,
    credentialVersion: 1,
  };
  assert.equal(sessionMatches(session, "school-a.test", "a", 1), true);
  assert.equal(sessionMatches(session, "school-b.test", "a", 1), false);
  assert.equal(sessionMatches(session, "school-a.test", "b", 1), false);
  assert.equal(sessionMatches(session, "school-a.test", null, 1), false);
  assert.equal(sessionMatches(session, "school-a.test", "a", 2), false);
  assert.equal(
    sessionMatches(
      { ...session, revokedAt: new Date() },
      "school-a.test",
      "a",
      1,
    ),
    false,
  );
  assert.equal(
    sessionMatches(session, "school-a.test", "a", 1, session.expiresAt),
    false,
  );
});
test("unsafe and missing origins are rejected even without Next's built-in CSRF check", () => {
  assert.equal(
    isSameOrigin("https://arsimio.vercel.app", "arsimio.vercel.app", false),
    true,
  );
  assert.equal(
    isSameOrigin("http://localhost:3000", "localhost:3000", true),
    true,
  );
  for (const origin of [
    null,
    "null",
    "https://evil.test",
    "https://arsimio.vercel.app.evil.test",
    "http://arsimio.vercel.app",
    "https://arsimio.vercel.app/login",
  ])
    assert.equal(isSameOrigin(origin, "arsimio.vercel.app", false), false);
});
