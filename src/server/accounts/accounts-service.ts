import "server-only";
import { randomBytes } from "node:crypto";
import type { AccountPortal, Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/server/auth/password";

type Db = Prisma.TransactionClient;

export type CreatePersonAccountInput = {
  schoolId: string;
  actorUserId: string;
  actorMembershipId: string;
  personId: string;
  studentProfileId?: string | null;
  portal: Extract<AccountPortal, "STUDENT" | "GUARDIAN">;
  username: string;
  defaultLocale: string;
};

export type AccountServiceResult =
  | { status: "success"; message: string; temporaryPassword?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const portalRoleCode = {
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  GUARDIAN: "GUARDIAN",
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  STAFF: "STAFF",
} satisfies Record<AccountPortal, string>;

function fullName(person: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ");
}

export function portalStartPath(portal: AccountPortal | null | undefined) {
  if (portal === "GUARDIAN") return "/guardian";
  if (portal === "STUDENT") return "/student";
  return "/dashboard";
}

export function generateTemporaryPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#%+";
  const bytes = randomBytes(14);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function resolvePortalEligibility(
  tx: Db,
  input: CreatePersonAccountInput,
) {
  const person = await tx.person.findFirst({
    where: {
      id: input.personId,
      schoolId: input.schoolId,
      status: "ACTIVE",
      archivedAt: null,
    },
    include: {
      studentProfile: true,
      guardianRelationships: {
        where: {
          schoolId: input.schoolId,
          archivedAt: null,
          ...(input.studentProfileId
            ? { studentProfileId: input.studentProfileId }
            : {}),
        },
        select: { id: true },
      },
    },
  });
  if (!person)
    return {
      ok: false as const,
      message: "Kisi bulunamadi veya okul kapsaminda degil.",
    };
  if (input.portal === "STUDENT") {
    if (
      !person.studentProfile ||
      person.studentProfile.schoolId !== input.schoolId ||
      (input.studentProfileId && person.studentProfile.id !== input.studentProfileId)
    )
      return {
        ok: false as const,
        message: "Ogrenci hesabi yalniz ogrenci kisi kaydina acilabilir.",
      };
  }
  if (input.portal === "GUARDIAN" && person.guardianRelationships.length === 0)
    return {
      ok: false as const,
      message: "Veli hesabi icin kisinin en az bir aktif cocuk iliskisi olmali.",
    };
  return { ok: true as const, person };
}

export async function createPersonAccount(
  tx: Db,
  input: CreatePersonAccountInput,
): Promise<AccountServiceResult> {
  const eligibility = await resolvePortalEligibility(tx, input);
  if (!eligibility.ok) return { status: "error", message: eligibility.message };

  const existingAccount = await tx.personAccount.findFirst({
    where: {
      schoolId: input.schoolId,
      personId: input.personId,
      portal: input.portal,
      archivedAt: null,
    },
    include: { user: { include: { memberships: true } } },
  });
  if (existingAccount)
    return {
      status: "error",
      message: "Bu kisi icin ayni portal hesabi zaten var.",
    };

  const usernameTaken = await tx.schoolMembership.findUnique({
    where: {
      schoolId_username: { schoolId: input.schoolId, username: input.username },
    },
    select: { id: true },
  });
  if (usernameTaken)
    return {
      status: "error",
      message: "Bu kullanici adi okul icinde zaten kullaniliyor.",
      fieldErrors: { username: "Baska bir kullanici adi secin." },
    };

  const role = await tx.role.findFirst({
    where: {
      schoolId: input.schoolId,
      code: portalRoleCode[input.portal],
      scope: "SCHOOL",
    },
    select: { id: true },
  });
  if (!role)
    return {
      status: "error",
      message: `${portalRoleCode[input.portal]} rolu hazir degil.`,
    };

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const person = eligibility.person;
  const user = await tx.user.create({
    data: {
      firstName: person.firstName,
      lastName: person.lastName,
      status: "ACTIVE",
      credential: { create: { passwordHash } },
    },
    select: { id: true },
  });
  const membership = await tx.schoolMembership.create({
    data: {
      schoolId: input.schoolId,
      userId: user.id,
      username: input.username,
      preferredLocale: input.defaultLocale,
      status: "ACTIVE",
      joinedAt: new Date(),
    },
    select: { id: true },
  });
  await tx.membershipRole.create({
    data: {
      schoolId: input.schoolId,
      membershipId: membership.id,
      roleId: role.id,
      assignedById: input.actorUserId,
    },
  });
  const account = await tx.personAccount.create({
    data: {
      schoolId: input.schoolId,
      personId: person.id,
      userId: user.id,
      portal: input.portal,
      mustChangePassword: true,
      passwordResetAt: new Date(),
    },
    select: { id: true },
  });
  await tx.auditEvent.create({
    data: {
      schoolId: input.schoolId,
      actorUserId: input.actorUserId,
      actorMembershipId: input.actorMembershipId,
      source: "USER",
      action: "person_account.created",
      entityType: "PersonAccount",
      entityId: account.id,
      afterData: {
        personId: person.id,
        userId: user.id,
        membershipId: membership.id,
        portal: input.portal,
        username: input.username,
      },
      changedFields: ["user", "credential", "membership", "role", "account"],
    },
  });

  return {
    status: "success",
    message: `${fullName(person)} icin hesap olusturuldu.`,
    temporaryPassword,
  };
}

export async function resetPersonAccountPassword(
  tx: Db,
  input: {
    schoolId: string;
    actorUserId: string;
    actorMembershipId: string;
    personAccountId: string;
  },
): Promise<AccountServiceResult> {
  const account = await tx.personAccount.findFirst({
    where: {
      id: input.personAccountId,
      schoolId: input.schoolId,
      archivedAt: null,
    },
    select: { id: true, userId: true, portal: true },
  });
  if (!account) return { status: "error", message: "Hesap bulunamadi." };

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  await tx.userCredential.update({
    where: { userId: account.userId },
    data: { passwordHash, version: { increment: 1 } },
  });
  await tx.personAccount.update({
    where: { id: account.id },
    data: {
      mustChangePassword: true,
      passwordResetAt: new Date(),
      suspendedAt: null,
    },
  });
  await tx.schoolMembership.updateMany({
    where: { schoolId: input.schoolId, userId: account.userId },
    data: { status: "ACTIVE", suspendedAt: null },
  });
  await tx.user.update({
    where: { id: account.userId },
    data: { status: "ACTIVE" },
  });
  await tx.authSession.updateMany({
    where: { userId: account.userId, schoolId: input.schoolId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await tx.auditEvent.create({
    data: {
      schoolId: input.schoolId,
      actorUserId: input.actorUserId,
      actorMembershipId: input.actorMembershipId,
      source: "USER",
      action: "person_account.password_reset",
      entityType: "PersonAccount",
      entityId: account.id,
      afterData: { userId: account.userId, portal: account.portal },
      changedFields: ["credential", "sessions"],
    },
  });
  return {
    status: "success",
    message: "Gecici parola olusturuldu.",
    temporaryPassword,
  };
}

export async function suspendPersonAccount(
  tx: Db,
  input: {
    schoolId: string;
    actorUserId: string;
    actorMembershipId: string;
    personAccountId: string;
  },
): Promise<AccountServiceResult> {
  const account = await tx.personAccount.findFirst({
    where: {
      id: input.personAccountId,
      schoolId: input.schoolId,
      archivedAt: null,
    },
    select: { id: true, userId: true, portal: true, suspendedAt: true },
  });
  if (!account) return { status: "error", message: "Hesap bulunamadi." };
  const now = new Date();
  await tx.personAccount.update({
    where: { id: account.id },
    data: { suspendedAt: account.suspendedAt ?? now },
  });
  await tx.schoolMembership.updateMany({
    where: { schoolId: input.schoolId, userId: account.userId },
    data: { status: "SUSPENDED", suspendedAt: now },
  });
  await tx.user.update({
    where: { id: account.userId },
    data: { status: "SUSPENDED" },
  });
  await tx.authSession.updateMany({
    where: { userId: account.userId, schoolId: input.schoolId, revokedAt: null },
    data: { revokedAt: now },
  });
  await tx.auditEvent.create({
    data: {
      schoolId: input.schoolId,
      actorUserId: input.actorUserId,
      actorMembershipId: input.actorMembershipId,
      source: "USER",
      action: "person_account.suspended",
      entityType: "PersonAccount",
      entityId: account.id,
      afterData: { userId: account.userId, portal: account.portal },
      changedFields: ["account", "membership", "user", "sessions"],
    },
  });
  return { status: "success", message: "Hesap askıya alindi." };
}

export async function changeOwnTemporaryPassword(
  tx: Db,
  input: {
    schoolId: string;
    userId: string;
    password: string;
  },
): Promise<AccountServiceResult> {
  const account = await tx.personAccount.findFirst({
    where: {
      schoolId: input.schoolId,
      userId: input.userId,
      archivedAt: null,
    },
    select: { id: true, userId: true, portal: true },
  });
  if (!account) return { status: "error", message: "Hesap bulunamadi." };
  const passwordHash = await hashPassword(input.password);
  await tx.userCredential.update({
    where: { userId: input.userId },
    data: { passwordHash, version: { increment: 1 } },
  });
  await tx.personAccount.update({
    where: { id: account.id },
    data: { mustChangePassword: false },
  });
  await tx.authSession.updateMany({
    where: { userId: input.userId, schoolId: input.schoolId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await tx.auditEvent.create({
    data: {
      schoolId: input.schoolId,
      actorUserId: input.userId,
      source: "USER",
      action: "person_account.password_changed",
      entityType: "PersonAccount",
      entityId: account.id,
      changedFields: ["credential", "account", "sessions"],
    },
  });
  return { status: "success", message: "Parola degistirildi." };
}

export async function linkExistingSchoolAdminAccounts(
  tx: Db,
  input: {
    schoolId: string;
    actorUserId: string;
    actorMembershipId: string;
  },
): Promise<AccountServiceResult> {
  const admins = await tx.schoolMembership.findMany({
    where: {
      schoolId: input.schoolId,
      status: "ACTIVE",
      archivedAt: null,
      roles: {
        some: {
          schoolId: input.schoolId,
          role: { code: "SCHOOL_ADMIN", scope: "SCHOOL" },
        },
      },
    },
    include: {
      user: {
        include: {
          personAccounts: {
            where: {
              schoolId: input.schoolId,
              portal: "SCHOOL_ADMIN",
              archivedAt: null,
            },
          },
        },
      },
    },
  });
  let linked = 0;
  let skipped = 0;
  for (const admin of admins) {
    if (admin.user.personAccounts.length > 0) continue;
    const firstName = admin.user.firstName?.trim();
    const lastName = admin.user.lastName?.trim();
    if (!firstName || !lastName) {
      skipped += 1;
      continue;
    }
    const sameName = await tx.person.count({
      where: {
        schoolId: input.schoolId,
        firstName,
        lastName,
        archivedAt: null,
      },
    });
    if (sameName > 0) {
      skipped += 1;
      continue;
    }
    const person = await tx.person.create({
      data: {
        schoolId: input.schoolId,
        firstName,
        lastName,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const account = await tx.personAccount.create({
      data: {
        schoolId: input.schoolId,
        personId: person.id,
        userId: admin.userId,
        portal: "SCHOOL_ADMIN",
        mustChangePassword: false,
      },
      select: { id: true },
    });
    await tx.auditEvent.create({
      data: {
        schoolId: input.schoolId,
        actorUserId: input.actorUserId,
        actorMembershipId: input.actorMembershipId,
        source: "USER",
        action: "person_account.school_admin_linked",
        entityType: "PersonAccount",
        entityId: account.id,
        afterData: {
          personId: person.id,
          userId: admin.userId,
          membershipId: admin.id,
          portal: "SCHOOL_ADMIN",
        },
        changedFields: ["person", "account"],
      },
    });
    linked += 1;
  }
  return {
    status: "success",
    message: `${linked} Okul Admin hesabi kisiye baglandi. ${skipped} kayit elle kontrol icin atlandi.`,
  };
}
