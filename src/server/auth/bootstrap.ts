import type { Prisma } from "../../generated/prisma/client";

// Operator-only helper: never import into a Server Action or public signup route.
export async function activateBootstrap(
  db: Prisma.TransactionClient,
  email: string,
  passwordHash: string,
) {
  const user = await db.user.findFirst({
    where: {
      email,
      status: "PENDING",
      archivedAt: null,
      authProvider: null,
      authProviderUserId: null,
      credential: null,
      platformRoles: {
        some: {
          role: { scope: "PLATFORM", code: "SUPER_ADMIN", schoolId: null },
        },
      },
    },
    select: { id: true },
  });
  if (!user)
    throw new Error(
      "Kuruluma uygun ayrılmış PENDING yönetici bulunamadı. Var olan parola değiştirilmedi.",
    );
  const changed = await db.user.updateMany({
    where: {
      id: user.id,
      status: "PENDING",
      archivedAt: null,
      authProvider: null,
      authProviderUserId: null,
    },
    data: { status: "ACTIVE" },
  });
  if (changed.count !== 1)
    throw new Error("Hesap durumu değişti; tekrar kontrol edin.");
  await db.userCredential.create({ data: { userId: user.id, passwordHash } });
  await db.auditEvent.create({
    data: {
      source: "SYSTEM",
      actorUserId: user.id,
      action: "auth.bootstrap_password_set",
      entityType: "User",
      entityId: user.id,
      beforeData: { status: "PENDING" },
      afterData: { status: "ACTIVE", method: "password" },
      reason:
        "One-time local operator bootstrap; password and hash are never recorded in audit.",
    },
  });
  return user.id;
}
