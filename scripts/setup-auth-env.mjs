// Explicit operator command. Only the linked Arsimio project is allowed.
// Secret values pass directly to the CLI's stdin and are never logged.
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const linked = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
assert.equal(linked.projectId, "prj_TDX4sLtnwUpiYpvWZjOZqqkzqfNR");
assert.equal(linked.orgId, "team_0DSjClwrubTowFFnPLeTj052");
assert.equal(
  process.argv[2],
  "--apply",
  "Run with --apply after checking existing env names.",
);
const email = process.argv[3];
assert.ok(
  email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  "Supply the approved bootstrap email.",
);
for (const environment of ["development", "preview", "production"]) {
  const value = randomBytes(48).toString("base64url");
  try {
    execFileSync(
      "pnpm",
      [
        "dlx",
        "vercel",
        "env",
        "add",
        "NEON_AUTH_COOKIE_SECRET",
        environment,
        "--scope",
        linked.orgId,
      ],
      { input: value, stdio: ["pipe", "pipe", "pipe"] },
    );
    console.log(`${environment}: NEON_AUTH_COOKIE_SECRET added (value hidden)`);
  } catch {
    throw new Error(
      `${environment}: env add failed. Check existing key; do not overwrite/rotate automatically.`,
    );
  }
}
for (const environment of ["development", "production"]) {
  try {
    execFileSync(
      "pnpm",
      [
        "dlx",
        "vercel",
        "env",
        "add",
        "ARSIMIO_BOOTSTRAP_ADMIN_EMAIL",
        environment,
        "--scope",
        linked.orgId,
      ],
      { input: email.toLowerCase(), stdio: ["pipe", "pipe", "pipe"] },
    );
    console.log(`${environment}: bootstrap email configured`);
  } catch {
    throw new Error(
      `${environment}: bootstrap email env add failed; inspect before retrying.`,
    );
  }
}
