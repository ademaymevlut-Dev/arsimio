import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { InitialSchoolAdminState } from "@/lib/initial-school-admin-validation";

type PersistInitialSchoolAdminInput = {
  schoolId: string;
  actorUserId: string;
  firstName: string;
  lastName: string;
  username: string;
  passwordHash: string;
};

export const initialAdminAlreadyExists: InitialSchoolAdminState = {
  status: "error",
  message:
    "Bu okul için ilk yönetici zaten oluşturulmuş. Yeni kullanıcıları Okul Admin alanından yönetin.",
};

// Internal persistence only. The caller authenticates, authorizes, validates,
// applies same-origin protection and hashes the password before entering here.
export async function persistInitialSchoolAdmin(
  tx: Prisma.TransactionClient,
  input: PersistInitialSchoolAdminInput,
): Promise<InitialSchoolAdminState> {
  const school = await tx.school.findUnique({
    where: { id: input.schoolId },
    select: { id: true, name: true, status: true, archivedAt: true },
  });
  if (!school || school.archivedAt || school.status === "ARCHIVED")
    return {
      status: "error",
      message: "Bu okul için yönetici hesabı oluşturulamıyor.",
    };

  const role = await tx.role.findFirst({
    where: {
      schoolId: input.schoolId,
      code: "SCHOOL_ADMIN",
      scope: "SCHOOL",
    },
    select: { id: true, schoolId: true },
  });
  if (!role || role.schoolId !== input.schoolId)
    return {
      status: "error",
      message: "Okul Admin rolü hazır değil. Okul kurulumunu kontrol edin.",
    };

  const existingAdmin = await tx.schoolMembership.findFirst({
    where: {
      schoolId: input.schoolId,
      roles: {
        some: {
          schoolId: input.schoolId,
          role: {
            schoolId: input.schoolId,
            code: "SCHOOL_ADMIN",
            scope: "SCHOOL",
          },
        },
      },
    },
    select: { id: true },
  });
  if (existingAdmin) return initialAdminAlreadyExists;

  const usernameTaken = await tx.schoolMembership.findUnique({
    where: {
      schoolId_username: {
        schoolId: input.schoolId,
        username: input.username,
      },
    },
    select: { id: true },
  });
  if (usernameTaken)
    return {
      status: "error",
      message: "Bu kullanıcı adı okul içinde zaten kullanılıyor.",
      fieldErrors: { username: "Başka bir kullanıcı adı seçin." },
    };

  const user = await tx.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      status: "ACTIVE",
      credential: { create: { passwordHash: input.passwordHash } },
    },
    select: { id: true },
  });
  const membership = await tx.schoolMembership.create({
    data: {
      schoolId: input.schoolId,
      userId: user.id,
      username: input.username,
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
  await tx.auditEvent.create({
    data: {
      schoolId: input.schoolId,
      actorUserId: input.actorUserId,
      source: "USER",
      action: "platform.school_admin.created",
      entityType: "SchoolMembership",
      entityId: membership.id,
      afterData: {
        userId: user.id,
        membershipId: membership.id,
        username: input.username,
        roleCode: "SCHOOL_ADMIN",
        status: "ACTIVE",
      },
      changedFields: ["user", "credential", "membership", "role"],
      reason: "Initial school administrator created by platform owner.",
    },
  });

  return {
    status: "success",
    message: `${input.firstName} ${input.lastName} için ilk Okul Admin hesabı oluşturuldu.`,
  };
}

