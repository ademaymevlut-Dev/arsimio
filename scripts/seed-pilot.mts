import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import { PILOT_SCHOOLS } from "../src/config/pilot";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
neonConfig.webSocketConstructor = globalThis.WebSocket;
const apply = process.argv.includes("--apply");
const adminEmail =
  process.env.ARSIMIO_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
assert.ok(
  adminEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail),
  "Set ARSIMIO_BOOTSTRAP_ADMIN_EMAIL explicitly.",
);
const link = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
assert.equal(link.projectId, "prj_TDX4sLtnwUpiYpvWZjOZqqkzqfNR");
assert.equal(link.orgId, "team_0DSjClwrubTowFFnPLeTj052");

const verified = new Set<string>();
if (apply) {
  const result = JSON.parse(
    execFileSync(
      "pnpm",
      [
        "dlx",
        "vercel",
        "api",
        `/v9/projects/${link.projectId}/domains`,
        "--scope",
        link.orgId,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
  for (const school of PILOT_SCHOOLS) {
    assert.ok(
      result.domains.some(
        (d: {
          name: string;
          projectId: string;
          verified: boolean;
          redirect: string | null;
        }) =>
          d.name === school.hostname &&
          d.projectId === link.projectId &&
          d.verified &&
          !d.redirect,
      ),
      "Domain must be verified on Arsimio without redirect.",
    );
    await fetch(`https://${school.hostname}`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    verified.add(school.hostname);
  }
}

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});
const schoolPermissions = [
  "dashboard.read",
  "school.settings.read",
  "school.settings.update",
  "users.invite",
  "memberships.manage",
  "audit.read",
];
const platformPermissions = [
  "platform.schools.read",
  "platform.schools.create",
  "platform.schools.update",
  "platform.domains.manage",
  "platform.branding.update",
  "platform.admins.invite",
  "platform.audit.read",
];
const roleNames = {
  SCHOOL_ADMIN: "Okul Admin",
  TEACHER: "Öğretmen",
  STUDENT: "Öğrenci",
  GUARDIAN: "Veli",
  DRIVER: "Servis Şoförü",
};
try {
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          schools: PILOT_SCHOOLS,
          adminReservation: "PENDING; verified auth identity required",
          writes: false,
        },
        null,
        2,
      ),
    );
  } else {
    await db.$transaction(
      async (tx) => {
        // Prevent concurrent initial seeds; existing permissions/branding/status are not reset.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(87091901)`;
        for (const [scope, codes] of [
          ["PLATFORM", platformPermissions],
          ["SCHOOL", schoolPermissions],
        ] as const) {
          for (const code of codes)
            await tx.permission.upsert({
              where: { code },
              update: {},
              create: { code, scope },
            });
        }
        async function createRole(
          key: string,
          code: string,
          name: string,
          schoolId: string | null,
          codes: string[],
        ) {
          const found = await tx.role.findUnique({ where: { key } });
          if (found) {
            assert.equal(
              found.schoolId,
              schoolId,
              "Existing role scope mismatch.",
            );
            return found;
          }
          const scope = schoolId ? "SCHOOL" : "PLATFORM";
          const role = await tx.role.create({
            data: { key, code, name, scope, schoolId, isSystem: true },
          });
          for (const permission of await tx.permission.findMany({
            where: { code: { in: codes }, scope },
          })) {
            await tx.rolePermission.create({
              data: { roleId: role.id, permissionId: permission.id, scope },
            });
          }
          return role;
        }
        const superRole = await createRole(
          "platform:SUPER_ADMIN",
          "SUPER_ADMIN",
          "Süper Admin",
          null,
          platformPermissions,
        );
        // Existing users never receive new privileges implicitly on a repeat seed.
        const existing = await tx.user.findUnique({
          where: { email: adminEmail },
        });
        if (!existing) {
          const user = await tx.user.create({
            data: { email: adminEmail, status: "PENDING" },
          });
          await tx.userRole.create({
            data: { userId: user.id, roleId: superRole.id },
          });
          await tx.auditEvent.create({
            data: {
              source: "SYSTEM",
              action: "platform.admin.reserved",
              entityType: "User",
              entityId: user.id,
              afterData: { status: "PENDING" },
              reason:
                "Operator-approved bootstrap; no auth access until verified identity is bound.",
            },
          });
        }
        for (const school of PILOT_SCHOOLS) {
          let record = await tx.school.findUnique({
            where: { slug: school.slug },
          });
          if (!record) {
            record = await tx.school.create({
              data: {
                slug: school.slug,
                name: school.name,
                status: "ACTIVE",
                branding: {
                  create: {
                    primaryColor: school.primaryColor,
                    accentColor: school.accentColor,
                  },
                },
              },
            });
            await tx.auditEvent.create({
              data: {
                schoolId: record.id,
                source: "SYSTEM",
                action: "school.created",
                entityType: "School",
                entityId: record.id,
                afterData: { name: school.name, slug: school.slug },
                reason: "Two-school pilot seed",
              },
            });
          }
          const domain = await tx.schoolDomain.findUnique({
            where: { hostname: school.hostname },
          });
          if (domain)
            assert.equal(
              domain.schoolId,
              record.id,
              "Refusing to transfer an existing hostname.",
            );
          else {
            const isVerified = verified.has(school.hostname);
            await tx.schoolDomain.create({
              data: {
                schoolId: record.id,
                hostname: school.hostname,
                status: isVerified ? "VERIFIED" : "PENDING",
                verifiedAt: isVerified ? new Date() : null,
                isPrimary: isVerified,
                lastCheckedAt: new Date(),
              },
            });
            await tx.auditEvent.create({
              data: {
                schoolId: record.id,
                source: "SYSTEM",
                action: "domain.verified",
                entityType: "SchoolDomain",
                entityId: school.hostname,
                afterData: { hostname: school.hostname },
                reason:
                  "Vercel project ownership, verification and HTTPS checked.",
              },
            });
          }
          for (const [code, name] of Object.entries(roleNames)) {
            await createRole(
              `${record.id}:${code}`,
              code,
              name,
              record.id,
              code === "SCHOOL_ADMIN" ? schoolPermissions : ["dashboard.read"],
            );
          }
        }
      },
      { timeout: 60000 },
    );
    console.log(
      "Pilot seed applied. Existing statuses, memberships, permissions and branding preserved; no passwords/auth accounts created.",
    );
  }
} finally {
  await db.$disconnect();
}
