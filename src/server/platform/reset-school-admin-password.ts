import "server-only";
import { headers } from "next/headers";
import { getPrisma } from "@/lib/db";
import type { InitialSchoolAdminState } from "@/lib/initial-school-admin-validation";
import { validSchoolId } from "@/lib/platform-school-validation";
import { requirePlatformPermission } from "@/server/authorization/guards";
import { generateTemporaryPassword } from "@/server/accounts/accounts-service";
import { isSameOrigin } from "@/server/auth/identifiers";
import { hashPassword } from "@/server/auth/password";

const invalid: InitialSchoolAdminState = {
  status: "error",
  message: "Şifre sıfırlama bilgileri doğrulanamadı. Lütfen tekrar deneyin.",
};

export async function resetSchoolAdminPassword(
  form: FormData,
): Promise<InitialSchoolAdminState> {
  const { user } = await requirePlatformPermission("platform.admins.invite");
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  )
    return invalid;

  const schoolId = form.get("schoolId");
  const membershipId = form.get("membershipId");
  if (!validSchoolId(schoolId) || !validSchoolId(membershipId)) return invalid;

  const temporaryPassword = generateTemporaryPassword();
  let passwordHash: string;
  try {
    passwordHash = await hashPassword(temporaryPassword);
  } catch {
    return invalid;
  }

  try {
    return await getPrisma().$transaction(
      async (tx) => {
        const school = await tx.school.findFirst({
          where: {
            id: schoolId,
            archivedAt: null,
            status: { not: "ARCHIVED" },
          },
          select: { id: true },
        });
        if (!school)
          return {
            status: "error",
            message: "Okul şifre sıfırlama için uygun durumda değil.",
          };

        const membership = await tx.schoolMembership.findFirst({
          where: {
            id: membershipId,
            schoolId,
            archivedAt: null,
            roles: {
              some: {
                role: {
                  schoolId,
                  code: "SCHOOL_ADMIN",
                  scope: "SCHOOL",
                },
              },
            },
          },
          select: {
            id: true,
            schoolId: true,
            userId: true,
            username: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                archivedAt: true,
              },
            },
          },
        });
        if (!membership || membership.user.archivedAt)
          return {
            status: "error",
            message: "Okul yöneticisi bulunamadı.",
          };

        const now = new Date();
        await tx.userCredential.upsert({
          where: { userId: membership.userId },
          create: {
            userId: membership.userId,
            passwordHash,
            version: 1,
          },
          update: {
            passwordHash,
            version: { increment: 1 },
          },
        });
        await tx.user.update({
          where: { id: membership.userId },
          data: { status: "ACTIVE" },
        });
        await tx.schoolMembership.update({
          where: { id: membership.id },
          data: { status: "ACTIVE", suspendedAt: null },
        });

        const account = await tx.personAccount.findFirst({
          where: {
            schoolId,
            userId: membership.userId,
          },
          select: { id: true, portal: true },
        });
        if (account && account.portal !== "SCHOOL_ADMIN")
          return {
            status: "error",
            message:
              "Bu kullanıcı farklı bir portal hesabına bağlı. Okul admin şifresi sıfırlanamadı.",
          };

        let accountId = account?.id;
        if (!accountId) {
          const person = await tx.person.create({
            data: {
              schoolId,
              firstName: membership.user.firstName ?? "Okul",
              lastName: membership.user.lastName ?? "Admin",
              status: "ACTIVE",
            },
            select: { id: true },
          });
          accountId = (
            await tx.personAccount.create({
              data: {
                schoolId,
                personId: person.id,
                userId: membership.userId,
                portal: "SCHOOL_ADMIN",
                mustChangePassword: true,
                passwordResetAt: now,
              },
              select: { id: true },
            })
          ).id;
        } else {
          await tx.personAccount.update({
            where: { id: accountId },
            data: {
              mustChangePassword: true,
              passwordResetAt: now,
              suspendedAt: null,
              archivedAt: null,
            },
          });
        }
        await tx.authSession.updateMany({
          where: {
            userId: membership.userId,
            schoolId,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });
        await tx.auditEvent.create({
          data: {
            schoolId,
            actorUserId: user.id,
            source: "USER",
            action: "platform.school_admin.password_reset",
            entityType: "SchoolMembership",
            entityId: membership.id,
            afterData: {
              userId: membership.userId,
              membershipId: membership.id,
              username: membership.username,
              portal: "SCHOOL_ADMIN",
            },
            changedFields: ["credential", "personAccount", "sessions"],
            reason: "School administrator password reset by platform owner.",
          },
        });

        return {
          status: "success",
          message:
            "Okul yöneticisi için geçici parola oluşturuldu. Bu parola yalnız bu ekranda gösterilir.",
          temporaryPassword,
        };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      String(error.code) === "P2034"
    )
      return {
        status: "error",
        message: "Aynı anda başka işlem yapıldı. Lütfen tekrar deneyin.",
      };
    console.error("PLATFORM_SCHOOL_ADMIN_PASSWORD_RESET_UNAVAILABLE");
    return {
      status: "error",
      message: "Geçici parola oluşturulamadı. Lütfen tekrar deneyin.",
    };
  }
}
