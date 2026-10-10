import "server-only";
import type { ContactKind, Prisma } from "@/generated/prisma/client";
import type {
  ArchiveGuardianInput,
  GuardianMessages,
  GuardianState,
  UpdateGuardianInput,
} from "@/lib/guardian-validation";

type GuardianActor = {
  schoolId: string;
  actorUserId: string;
  actorMembershipId: string;
  messages: GuardianMessages;
};

function error(
  message: string,
  fieldErrors?: GuardianState["fieldErrors"],
): GuardianState {
  return { status: "error", message, fieldErrors };
}

function normalizedPhone(value: string) {
  const plus = value.trim().startsWith("+") ? "+" : "";
  return `${plus}${value.replace(/\D/g, "")}`;
}

async function updateContactPoint(
  tx: Prisma.TransactionClient,
  schoolId: string,
  personId: string,
  kind: ContactKind,
  value: string | null,
) {
  const contactPoints = await tx.personContactPoint.findMany({
    where: { schoolId, personId, kind },
    orderBy: { updatedAt: "desc" },
  });
  const now = new Date();

  if (!value) {
    await tx.personContactPoint.updateMany({
      where: { schoolId, personId, kind, archivedAt: null },
      data: { archivedAt: now },
    });
    return;
  }

  const normalizedValue =
    kind === "PHONE" ? normalizedPhone(value) : value.toLowerCase();
  const matching = contactPoints.find(
    (contactPoint) => contactPoint.normalizedValue === normalizedValue,
  );

  await tx.personContactPoint.updateMany({
    where: {
      schoolId,
      personId,
      kind,
      archivedAt: null,
      ...(matching ? { id: { not: matching.id } } : {}),
    },
    data: { archivedAt: now },
  });

  if (matching) {
    await tx.personContactPoint.update({
      where: { id: matching.id },
      data: {
        value,
        normalizedValue,
        isPrimaryForPerson: true,
        archivedAt: null,
      },
    });
    return;
  }

  await tx.personContactPoint.create({
    data: {
      schoolId,
      personId,
      kind,
      value,
      normalizedValue,
      isPrimaryForPerson: true,
    },
  });
}

export async function persistGuardianDetails(
  tx: Prisma.TransactionClient,
  actor: GuardianActor,
  input: UpdateGuardianInput,
): Promise<GuardianState> {
  const guardian = await tx.person.findFirst({
    where: {
      id: input.personId,
      schoolId: actor.schoolId,
      status: "ACTIVE",
      archivedAt: null,
      guardianRelationships: {
        some: { schoolId: actor.schoolId, archivedAt: null },
      },
    },
    include: {
      accounts: {
        where: { schoolId: actor.schoolId, portal: "GUARDIAN", archivedAt: null },
        select: { userId: true },
      },
    },
  });
  if (!guardian) return error(actor.messages.unavailable);
  if (guardian.updatedAt.toISOString() !== input.revision)
    return error(actor.messages.conflict);

  const updated = await tx.person.updateMany({
    where: {
      id: guardian.id,
      schoolId: actor.schoolId,
      updatedAt: guardian.updatedAt,
    },
    data: {
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      occupationText: input.occupationText,
    },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);

  await updateContactPoint(
    tx,
    actor.schoolId,
    guardian.id,
    "PHONE",
    input.phone,
  );
  await updateContactPoint(
    tx,
    actor.schoolId,
    guardian.id,
    "EMAIL",
    input.email,
  );

  const userIds = guardian.accounts.map((account) => account.userId);
  if (userIds.length > 0) {
    await tx.user.updateMany({
      where: { id: { in: userIds } },
      data: { firstName: input.firstName, lastName: input.lastName },
    });
  }

  await tx.auditEvent.create({
    data: {
      schoolId: actor.schoolId,
      actorUserId: actor.actorUserId,
      actorMembershipId: actor.actorMembershipId,
      source: "USER",
      action: "guardian.details-updated",
      entityType: "Person",
      entityId: guardian.id,
      beforeData: {
        firstName: guardian.firstName,
        middleName: guardian.middleName,
        lastName: guardian.lastName,
        occupationText: guardian.occupationText,
      },
      afterData: {
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        occupationText: input.occupationText,
        contactKinds: [
          input.phone ? "PHONE" : null,
          input.email ? "EMAIL" : null,
        ].filter(Boolean),
      },
      changedFields: [
        "firstName",
        "middleName",
        "lastName",
        "occupationText",
        "contactPoints",
      ],
    },
  });

  return {
    status: "success",
    message: actor.messages.updated,
    entityId: guardian.id,
  };
}

export async function persistGuardianArchive(
  tx: Prisma.TransactionClient,
  actor: GuardianActor,
  input: ArchiveGuardianInput,
): Promise<GuardianState> {
  const guardian = await tx.person.findFirst({
    where: {
      id: input.personId,
      schoolId: actor.schoolId,
      status: "ACTIVE",
      archivedAt: null,
      guardianRelationships: {
        some: { schoolId: actor.schoolId, archivedAt: null },
      },
    },
    include: {
      guardianRelationships: {
        where: { schoolId: actor.schoolId, archivedAt: null },
        select: { id: true, studentProfileId: true },
      },
      accounts: {
        where: { schoolId: actor.schoolId, portal: "GUARDIAN", archivedAt: null },
        select: { id: true, userId: true },
      },
    },
  });
  if (!guardian) return error(actor.messages.unavailable);
  if (guardian.updatedAt.toISOString() !== input.revision)
    return error(actor.messages.conflict);

  const now = new Date();
  await tx.guardianRelationship.updateMany({
    where: {
      schoolId: actor.schoolId,
      guardianPersonId: guardian.id,
      archivedAt: null,
    },
    data: {
      archivedAt: now,
      isPrimaryContact: false,
      isFinancialResponsible: false,
    },
  });

  for (const account of guardian.accounts) {
    await tx.personAccount.update({
      where: { id: account.id },
      data: { suspendedAt: now },
    });
    await tx.schoolMembership.updateMany({
      where: { schoolId: actor.schoolId, userId: account.userId },
      data: { status: "SUSPENDED", suspendedAt: now },
    });
    await tx.authSession.updateMany({
      where: {
        schoolId: actor.schoolId,
        userId: account.userId,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
  }

  await tx.auditEvent.create({
    data: {
      schoolId: actor.schoolId,
      actorUserId: actor.actorUserId,
      actorMembershipId: actor.actorMembershipId,
      source: "USER",
      action: "guardian.archived",
      entityType: "Person",
      entityId: guardian.id,
      beforeData: {
        activeRelationshipIds: guardian.guardianRelationships.map(
          (relationship) => relationship.id,
        ),
        studentProfileIds: guardian.guardianRelationships.map(
          (relationship) => relationship.studentProfileId,
        ),
      },
      afterData: { relationshipsArchivedAt: now.toISOString() },
      changedFields: ["guardianRelationships", "guardianAccount", "sessions"],
    },
  });

  return {
    status: "success",
    message: actor.messages.deleted,
    entityId: guardian.id,
  };
}
