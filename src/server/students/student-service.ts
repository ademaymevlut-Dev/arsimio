import "server-only";
import type { Prisma, StudentLifecycleEventType } from "@/generated/prisma/client";
import type {
  AddGuardianInput,
  AddPreviousEducationInput,
  ArchivePreviousEducationInput,
  CreateStudentInput,
  SetFinancialGuardianInput,
  SetPrimaryGuardianInput,
  StudentServerMessages,
  StudentState,
  StudentTransitionInput,
  UpdateStudentDetailsInput,
} from "@/lib/student-validation";
import {
  IdentityProtectionUnavailableError,
  protectIdentity,
} from "./person-identity";

export type StudentActor = {
  schoolId: string;
  actorUserId: string;
  actorMembershipId: string;
  messages: StudentServerMessages;
};

function error(
  message: string,
  fieldErrors?: StudentState["fieldErrors"],
): StudentState {
  return { status: "error", message, fieldErrors };
}

async function audit(
  tx: Prisma.TransactionClient,
  actor: StudentActor,
  data: {
    action: string;
    entityType: string;
    entityId: string;
    beforeData?: Prisma.InputJsonValue;
    afterData?: Prisma.InputJsonValue;
    changedFields: string[];
    reason?: string;
  },
) {
  await tx.auditEvent.create({
    data: {
      schoolId: actor.schoolId,
      actorUserId: actor.actorUserId,
      actorMembershipId: actor.actorMembershipId,
      source: "USER",
      ...data,
    },
  });
}

async function allocateStudentNumber(
  tx: Prisma.TransactionClient,
  schoolId: string,
) {
  const rows = await tx.$queryRaw<Array<{ allocated: bigint }>>`
    INSERT INTO "school_number_sequences" ("school_id", "kind", "next_value", "updated_at")
    VALUES (${schoolId}::uuid, 'STUDENT_NUMBER'::"SchoolSequenceKind", 2, CURRENT_TIMESTAMP)
    ON CONFLICT ("school_id", "kind") DO UPDATE
      SET "next_value" = "school_number_sequences"."next_value" + 1,
          "updated_at" = CURRENT_TIMESTAMP
    RETURNING "next_value" - 1 AS "allocated"
  `;
  const allocated = rows[0]?.allocated;
  if (!allocated || allocated < BigInt(1))
    throw new Error("STUDENT_NUMBER_ALLOCATION_FAILED");
  return allocated.toString();
}

function normalizedPhone(value: string) {
  const plus = value.trim().startsWith("+") ? "+" : "";
  return `${plus}${value.replace(/\D/g, "")}`;
}

async function createContactPoints(
  tx: Prisma.TransactionClient,
  schoolId: string,
  personId: string,
  values: { phone: string | null; email: string | null },
) {
  if (values.phone) {
    await tx.personContactPoint.create({
      data: {
        schoolId,
        personId,
        kind: "PHONE",
        value: values.phone,
        normalizedValue: normalizedPhone(values.phone),
        isPrimaryForPerson: true,
      },
    });
  }
  if (values.email) {
    await tx.personContactPoint.create({
      data: {
        schoolId,
        personId,
        kind: "EMAIL",
        value: values.email,
        normalizedValue: values.email.toLowerCase(),
        isPrimaryForPerson: true,
      },
    });
  }
}

export async function persistStudent(
  tx: Prisma.TransactionClient,
  actor: StudentActor,
  input: CreateStudentInput,
): Promise<StudentState> {
  const annualClass = await tx.academicYearClassSection.findFirst({
    where: {
      id: input.academicYearClassSectionId,
      schoolId: actor.schoolId,
      academicYearId: input.academicYearId,
      status: "ACTIVE",
      academicYear: { status: "ACTIVE", archivedAt: null },
    },
    include: { academicYear: true },
  });
  if (!annualClass) return error(actor.messages.noActiveYear, {
    classSectionId: actor.messages.invalidRelation,
  });
  if (
    input.admittedOn < annualClass.academicYear.startDate ||
    input.admittedOn > annualClass.academicYear.endDate
  ) return error(actor.messages.dateOutsideYear, {
    admittedOn: actor.messages.dateOutsideYear,
  });

  let protectedIdentity: ReturnType<typeof protectIdentity> | null = null;
  if (input.identity) {
    try {
      protectedIdentity = protectIdentity(
        actor.schoolId,
        input.identity.type,
        input.identity.value,
      );
    } catch (identityError) {
      if (identityError instanceof IdentityProtectionUnavailableError)
        return error(actor.messages.identityUnavailable, {
          identityValue: actor.messages.identityUnavailable,
        });
      throw identityError;
    }
    const duplicate = await tx.personIdentity.findFirst({
      where: {
        schoolId: actor.schoolId,
        type: input.identity.type,
        lookupHash: protectedIdentity.lookupHash,
      },
      select: { id: true },
    });
    if (duplicate) return error(actor.messages.identityDuplicate, {
      identityValue: actor.messages.identityDuplicate,
    });
  }

  const studentNumber = await allocateStudentNumber(tx, actor.schoolId);
  const person = await tx.person.create({
    data: {
      schoolId: actor.schoolId,
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      birthDate: input.birthDate,
      birthPlace: input.birthPlace,
      nationalityText: input.nationalityText,
      sex: input.sex,
    },
  });
  if (input.identity && protectedIdentity) {
    await tx.personIdentity.create({
      data: {
        schoolId: actor.schoolId,
        personId: person.id,
        type: input.identity.type,
        countryCode: input.identity.countryCode,
        encryptedValue: protectedIdentity.encryptedValue,
        lookupHash: protectedIdentity.lookupHash,
        lastFour: protectedIdentity.lastFour,
      },
    });
  }
  const student = await tx.studentProfile.create({
    data: {
      schoolId: actor.schoolId,
      personId: person.id,
      studentNumber,
      admittedOn: input.admittedOn,
      residenceCity: input.residenceCity,
      neighborhood: input.neighborhood,
      addressLine: input.addressLine,
      internalNote: input.internalNote,
      hasSpecialCondition: input.hasSpecialCondition,
      specialConditionNote: input.specialConditionNote,
    },
  });
  const enrollment = await tx.enrollment.create({
    data: {
      schoolId: actor.schoolId,
      studentProfileId: student.id,
      academicYearId: annualClass.academicYearId,
      enrolledOn: input.admittedOn,
    },
  });
  await tx.studentGroupPlacement.create({
    data: {
      schoolId: actor.schoolId,
      academicYearId: annualClass.academicYearId,
      enrollmentId: enrollment.id,
      academicYearClassSectionId: annualClass.id,
      validFrom: input.admittedOn,
    },
  });
  await tx.studentLifecycleEvent.create({
    data: {
      schoolId: actor.schoolId,
      studentProfileId: student.id,
      type: "ACTIVATED",
      effectiveOn: input.admittedOn,
    },
  });
  await audit(tx, actor, {
    action: "student.created",
    entityType: "StudentProfile",
    entityId: student.id,
    afterData: {
      studentNumber,
      academicYearId: annualClass.academicYearId,
      academicYearClassSectionId: annualClass.id,
      hasOfficialIdentity: Boolean(input.identity),
    },
    changedFields: ["person", "studentNumber", "enrollment", "placement"],
  });
  return {
    status: "success",
    message: actor.messages.studentCreated,
    entityId: student.id,
  };
}

export async function persistGuardianRelationship(
  tx: Prisma.TransactionClient,
  actor: StudentActor,
  input: AddGuardianInput,
): Promise<StudentState> {
  const student = await tx.studentProfile.findFirst({
    where: { id: input.studentProfileId, schoolId: actor.schoolId },
    select: { id: true, personId: true },
  });
  if (!student) return error(actor.messages.unavailable);

  let guardianPersonId = input.guardianPersonId;
  let createdGuardian = false;
  if (input.mode === "existing") {
    const guardian = guardianPersonId
      ? await tx.person.findFirst({
          where: { id: guardianPersonId, schoolId: actor.schoolId, status: "ACTIVE" },
          select: { id: true },
        })
      : null;
    if (!guardian || guardian.id === student.personId)
      return error(actor.messages.invalidRelation, {
        guardianPersonId: actor.messages.invalidRelation,
      });
  } else {
    if (!input.firstName || !input.lastName) return error(actor.messages.invalidName);
    const guardian = await tx.person.create({
      data: {
        schoolId: actor.schoolId,
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        occupationText: input.occupationText,
      },
    });
    guardianPersonId = guardian.id;
    createdGuardian = true;
    await createContactPoints(tx, actor.schoolId, guardian.id, input);
  }
  if (!guardianPersonId) return error(actor.messages.invalidRelation);

  if (input.mode === "existing" && input.occupationText) {
    await tx.person.update({
      where: { id: guardianPersonId },
      data: { occupationText: input.occupationText },
    });
  }

  const existing = await tx.guardianRelationship.findFirst({
    where: {
      schoolId: actor.schoolId,
      studentProfileId: student.id,
      guardianPersonId,
    },
  });
  if (existing && !existing.archivedAt) return error(actor.messages.duplicate);

  if (input.isPrimaryContact) {
    await tx.guardianRelationship.updateMany({
      where: {
        schoolId: actor.schoolId,
        studentProfileId: student.id,
        archivedAt: null,
        isPrimaryContact: true,
      },
      data: { isPrimaryContact: false },
    });
  }
  if (input.isFinancialResponsible) {
    await tx.guardianRelationship.updateMany({
      where: {
        schoolId: actor.schoolId,
        studentProfileId: student.id,
        archivedAt: null,
        isFinancialResponsible: true,
      },
      data: { isFinancialResponsible: false },
    });
  }

  const relationship = existing
    ? await tx.guardianRelationship.update({
        where: { id: existing.id },
        data: {
          relationshipType: input.relationshipType,
          isLegalGuardian: input.isLegalGuardian,
          isPrimaryContact: input.isPrimaryContact,
          isFinancialResponsible: input.isFinancialResponsible,
          note: input.note,
          archivedAt: null,
        },
      })
    : await tx.guardianRelationship.create({
        data: {
          schoolId: actor.schoolId,
          studentProfileId: student.id,
          guardianPersonId,
          relationshipType: input.relationshipType,
          isLegalGuardian: input.isLegalGuardian,
          isPrimaryContact: input.isPrimaryContact,
          isFinancialResponsible: input.isFinancialResponsible,
          note: input.note,
        },
      });

  await audit(tx, actor, {
    action: "student.guardian-linked",
    entityType: "GuardianRelationship",
    entityId: relationship.id,
    afterData: {
      studentProfileId: student.id,
      relationshipType: input.relationshipType,
      isLegalGuardian: input.isLegalGuardian,
      isPrimaryContact: input.isPrimaryContact,
      isFinancialResponsible: input.isFinancialResponsible,
      createdGuardian,
      contactKinds: [input.phone ? "PHONE" : null, input.email ? "EMAIL" : null].filter(Boolean),
    },
    changedFields: [
      "guardianPerson",
      "relationshipType",
      "isLegalGuardian",
      "isPrimaryContact",
      "isFinancialResponsible",
      "note",
      "occupationText",
    ],
  });
  return { status: "success", message: actor.messages.guardianCreated, entityId: relationship.id };
}

export async function persistPrimaryGuardian(
  tx: Prisma.TransactionClient,
  actor: StudentActor,
  input: SetPrimaryGuardianInput,
): Promise<StudentState> {
  const target = await tx.guardianRelationship.findFirst({
    where: {
      id: input.relationshipId,
      studentProfileId: input.studentProfileId,
      schoolId: actor.schoolId,
      archivedAt: null,
    },
  });
  if (!target) return error(actor.messages.unavailable);
  if (target.isPrimaryContact)
    return { status: "success", message: actor.messages.primaryUpdated, entityId: target.id };

  await tx.guardianRelationship.updateMany({
    where: {
      schoolId: actor.schoolId,
      studentProfileId: input.studentProfileId,
      archivedAt: null,
      isPrimaryContact: true,
    },
    data: { isPrimaryContact: false },
  });
  await tx.guardianRelationship.update({
    where: { id: target.id },
    data: { isPrimaryContact: true },
  });
  await audit(tx, actor, {
    action: "student.primary-guardian-changed",
    entityType: "GuardianRelationship",
    entityId: target.id,
    beforeData: { studentProfileId: input.studentProfileId },
    afterData: { isPrimaryContact: true },
    changedFields: ["isPrimaryContact"],
  });
  return { status: "success", message: actor.messages.primaryUpdated, entityId: target.id };
}

export async function persistFinancialGuardian(
  tx: Prisma.TransactionClient,
  actor: StudentActor,
  input: SetFinancialGuardianInput,
): Promise<StudentState> {
  const target = await tx.guardianRelationship.findFirst({
    where: {
      id: input.relationshipId,
      studentProfileId: input.studentProfileId,
      schoolId: actor.schoolId,
      archivedAt: null,
    },
  });
  if (!target) return error(actor.messages.unavailable);
  if (target.isFinancialResponsible)
    return { status: "success", message: actor.messages.guardianUpdated, entityId: target.id };

  await tx.guardianRelationship.updateMany({
    where: {
      schoolId: actor.schoolId,
      studentProfileId: input.studentProfileId,
      archivedAt: null,
      isFinancialResponsible: true,
    },
    data: { isFinancialResponsible: false },
  });
  await tx.guardianRelationship.update({
    where: { id: target.id },
    data: { isFinancialResponsible: true },
  });
  await audit(tx, actor, {
    action: "student.financial-guardian-changed",
    entityType: "GuardianRelationship",
    entityId: target.id,
    beforeData: { studentProfileId: input.studentProfileId },
    afterData: { isFinancialResponsible: true },
    changedFields: ["isFinancialResponsible"],
  });
  return { status: "success", message: actor.messages.guardianUpdated, entityId: target.id };
}

export async function persistStudentDetails(
  tx: Prisma.TransactionClient,
  actor: StudentActor,
  input: UpdateStudentDetailsInput,
): Promise<StudentState> {
  const student = await tx.studentProfile.findFirst({
    where: { id: input.studentProfileId, schoolId: actor.schoolId },
    select: { id: true, updatedAt: true },
  });
  if (!student) return error(actor.messages.unavailable);
  if (student.updatedAt.toISOString() !== input.revision)
    return error(actor.messages.conflict);
  const updated = await tx.studentProfile.updateMany({
    where: { id: student.id, schoolId: actor.schoolId, updatedAt: student.updatedAt },
    data: {
      residenceCity: input.residenceCity,
      neighborhood: input.neighborhood,
      addressLine: input.addressLine,
      internalNote: input.internalNote,
      hasSpecialCondition: input.hasSpecialCondition,
      specialConditionNote: input.specialConditionNote,
    },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  await audit(tx, actor, {
    action: "student.details-updated",
    entityType: "StudentProfile",
    entityId: student.id,
    afterData: {
      residenceCity: input.residenceCity,
      hasSpecialCondition: input.hasSpecialCondition,
    },
    changedFields: [
      "residenceCity",
      "neighborhood",
      "addressLine",
      "internalNote",
      "hasSpecialCondition",
      "specialConditionNote",
    ],
  });
  return { status: "success", message: actor.messages.studentUpdated, entityId: student.id };
}

export async function persistPreviousEducation(
  tx: Prisma.TransactionClient,
  actor: StudentActor,
  input: AddPreviousEducationInput,
): Promise<StudentState> {
  const student = await tx.studentProfile.findFirst({
    where: { id: input.studentProfileId, schoolId: actor.schoolId },
    select: { id: true },
  });
  if (!student) return error(actor.messages.unavailable);
  const record = await tx.studentPreviousEducationRecord.create({
    data: {
      schoolId: actor.schoolId,
      studentProfileId: student.id,
      gradeLevelText: input.gradeLevelText,
      academicYearText: input.academicYearText,
      schoolName: input.schoolName,
      successText: input.successText,
      transportText: input.transportText,
      discountText: input.discountText,
      note: input.note,
    },
  });
  await audit(tx, actor, {
    action: "student.previous-education-created",
    entityType: "StudentPreviousEducationRecord",
    entityId: record.id,
    afterData: { studentProfileId: student.id },
    changedFields: ["previousEducation"],
  });
  return { status: "success", message: actor.messages.previousEducationSaved, entityId: record.id };
}

export async function persistPreviousEducationArchive(
  tx: Prisma.TransactionClient,
  actor: StudentActor,
  input: ArchivePreviousEducationInput,
): Promise<StudentState> {
  const record = await tx.studentPreviousEducationRecord.findFirst({
    where: {
      id: input.previousEducationId,
      studentProfileId: input.studentProfileId,
      schoolId: actor.schoolId,
      archivedAt: null,
    },
  });
  if (!record) return error(actor.messages.unavailable);
  await tx.studentPreviousEducationRecord.update({
    where: { id: record.id },
    data: { archivedAt: new Date() },
  });
  await audit(tx, actor, {
    action: "student.previous-education-archived",
    entityType: "StudentPreviousEducationRecord",
    entityId: record.id,
    beforeData: { studentProfileId: input.studentProfileId },
    changedFields: ["archivedAt"],
  });
  return { status: "success", message: actor.messages.previousEducationArchived, entityId: record.id };
}

export async function persistStudentPhotoMetadata(
  tx: Prisma.TransactionClient,
  actor: StudentActor,
  input: {
    studentProfileId: string;
    url: string;
    storageKey: string;
    mimeType: string;
  },
): Promise<StudentState & { previousStorageKey?: string | null }> {
  const student = await tx.studentProfile.findFirst({
    where: { id: input.studentProfileId, schoolId: actor.schoolId },
    include: { person: { select: { id: true, photoStorageKey: true } } },
  });
  if (!student) return error(actor.messages.unavailable);
  await tx.person.update({
    where: { id: student.person.id },
    data: {
      photoUrl: input.url,
      photoStorageKey: input.storageKey,
      photoMimeType: input.mimeType,
      photoUpdatedAt: new Date(),
    },
  });
  await audit(tx, actor, {
    action: "student.photo-updated",
    entityType: "Person",
    entityId: student.person.id,
    afterData: { studentProfileId: student.id, storageKey: input.storageKey },
    changedFields: ["photoUrl", "photoStorageKey", "photoMimeType", "photoUpdatedAt"],
  });
  return {
    status: "success",
    message: actor.messages.studentPhotoUpdated,
    entityId: student.id,
    previousStorageKey: student.person.photoStorageKey,
  };
}

export async function persistStudentTransition(
  tx: Prisma.TransactionClient,
  actor: StudentActor,
  input: StudentTransitionInput,
): Promise<StudentState> {
  const student = await tx.studentProfile.findFirst({
    where: { id: input.studentProfileId, schoolId: actor.schoolId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: { placements: { where: { validTo: null } } },
      },
    },
  });
  if (!student) return error(actor.messages.unavailable);
  if (student.updatedAt.toISOString() !== input.revision)
    return error(actor.messages.conflict);

  if (input.transition === "inactive") {
    if (student.status !== "ACTIVE") return error(actor.messages.conflict);
    if (!input.exitReason) return error(actor.messages.invalid);
    const nextStatus =
      input.exitReason === "OTHER_SCHOOL" ? "TRANSFERRED" : "WITHDRAWN";
    if (input.effectiveOn < student.admittedOn)
      return error(actor.messages.invalidDate, { effectiveOn: actor.messages.invalidDate });
    for (const enrollment of student.enrollments) {
      if (input.effectiveOn < enrollment.enrolledOn)
        return error(actor.messages.invalidDate, { effectiveOn: actor.messages.invalidDate });
      for (const placement of enrollment.placements) {
        if (input.effectiveOn < placement.validFrom)
          return error(actor.messages.invalidDate, { effectiveOn: actor.messages.invalidDate });
      }
    }
    const updated = await tx.studentProfile.updateMany({
      where: {
        id: student.id,
        schoolId: actor.schoolId,
        updatedAt: student.updatedAt,
      },
      data: { status: nextStatus, inactiveOn: input.effectiveOn },
    });
    if (updated.count !== 1) return error(actor.messages.conflict);
    for (const enrollment of student.enrollments) {
      for (const placement of enrollment.placements) {
        await tx.studentGroupPlacement.update({
          where: { id: placement.id },
          data: { validTo: input.effectiveOn },
        });
      }
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "COMPLETED",
          endedOn: input.effectiveOn,
          outcome: input.exitReason === "OTHER_SCHOOL" ? "TRANSFERRED" : "WITHDRAWN",
          outcomeOn: input.effectiveOn,
        },
      });
    }
    const eventType: StudentLifecycleEventType =
      input.exitReason === "OTHER_SCHOOL" ? "TRANSFERRED_OUT" : "WITHDRAWN";
    await tx.studentLifecycleEvent.create({
      data: {
        schoolId: actor.schoolId,
        studentProfileId: student.id,
        type: eventType,
        effectiveOn: input.effectiveOn,
        exitReason: input.exitReason,
        note: input.note,
      },
    });
    await audit(tx, actor, {
      action: "student.inactivated",
      entityType: "StudentProfile",
      entityId: student.id,
      beforeData: { status: student.status },
      afterData: {
        status: nextStatus,
        effectiveOn: input.effectiveOn.toISOString().slice(0, 10),
        exitReason: input.exitReason,
      },
      changedFields: ["status", "inactiveOn", "enrollment", "placement"],
      reason: input.note ?? undefined,
    });
    return { status: "success", message: actor.messages.studentInactive, entityId: student.id };
  }

  if (!["INACTIVE", "WITHDRAWN", "TRANSFERRED"].includes(student.status))
    return error(actor.messages.conflict);
  if (
    input.effectiveOn < student.admittedOn ||
    (student.inactiveOn && input.effectiveOn < student.inactiveOn)
  )
    return error(actor.messages.invalidDate, {
      effectiveOn: actor.messages.invalidDate,
    });
  const updated = await tx.studentProfile.updateMany({
    where: { id: student.id, schoolId: actor.schoolId, updatedAt: student.updatedAt },
    data: { status: "ACTIVE", inactiveOn: null },
  });
  if (updated.count !== 1) return error(actor.messages.conflict);
  await tx.studentLifecycleEvent.create({
    data: {
      schoolId: actor.schoolId,
      studentProfileId: student.id,
      type: "REACTIVATED",
      effectiveOn: input.effectiveOn,
      note: input.note,
    },
  });
  await audit(tx, actor, {
    action: "student.reactivated",
    entityType: "StudentProfile",
    entityId: student.id,
    beforeData: { status: student.status },
    afterData: { status: "ACTIVE", effectiveOn: input.effectiveOn.toISOString().slice(0, 10) },
    changedFields: ["status", "inactiveOn"],
    reason: input.note ?? undefined,
  });
  return { status: "success", message: actor.messages.studentReactivated, entityId: student.id };
}
