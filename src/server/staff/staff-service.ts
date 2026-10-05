import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type {
  CreateEmploymentInput,
  EmploymentTransitionInput,
  StaffCatalogItemInput,
  StaffCatalogTransitionInput,
  StaffMessages,
  StaffState,
  SaveEmploymentContractInput,
  TeacherProfileInput,
  UploadStaffPhotoInput,
  UpdateStaffHrProfileInput,
} from "@/lib/staff-validation";
import {
  IdentityProtectionUnavailableError,
  protectIdentity,
} from "@/server/students/person-identity";

export type StaffActor = {
  schoolId: string;
  actorUserId: string;
  actorMembershipId: string;
};

function error(
  message: string,
  fieldErrors?: StaffState["fieldErrors"],
): StaffState {
  return { status: "error", message, fieldErrors };
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

const CATALOG_LOCALES = ["tr", "sq", "en"] as const;

async function audit(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
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

async function allocateStaffNumber(
  tx: Prisma.TransactionClient,
  schoolId: string,
) {
  const rows = await tx.$queryRaw<Array<{ allocated: bigint }>>`
    INSERT INTO "school_number_sequences" ("school_id", "kind", "next_value", "updated_at")
    VALUES (${schoolId}::uuid, 'STAFF_NUMBER'::"SchoolSequenceKind", 2, CURRENT_TIMESTAMP)
    ON CONFLICT ("school_id", "kind") DO UPDATE
      SET "next_value" = "school_number_sequences"."next_value" + 1,
          "updated_at" = CURRENT_TIMESTAMP
    RETURNING "next_value" - 1 AS "allocated"
  `;
  const allocated = rows[0]?.allocated;
  if (!allocated || allocated < BigInt(1))
    throw new Error("STAFF_NUMBER_ALLOCATION_FAILED");
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

async function validateCatalogs(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: { departmentId: string; positionId: string },
) {
  const [department, position] = await Promise.all([
    tx.staffDepartment.findFirst({
      where: {
        id: input.departmentId,
        schoolId: actor.schoolId,
        archivedAt: null,
      },
      select: { id: true },
    }),
    tx.staffPosition.findFirst({
      where: {
        id: input.positionId,
        schoolId: actor.schoolId,
        archivedAt: null,
      },
      select: { id: true },
    }),
  ]);
  if (!department)
    return error("Departman bulunamadi.", {
      departmentId: "Departman okul kapsaminda degil.",
    });
  if (!position)
    return error("Pozisyon bulunamadi.", {
      positionId: "Pozisyon okul kapsaminda degil.",
    });
  return null;
}

async function upsertDepartmentTranslations(
  tx: Prisma.TransactionClient,
  schoolId: string,
  departmentId: string,
  names: StaffCatalogItemInput["name"],
) {
  for (const locale of CATALOG_LOCALES) {
    await tx.staffDepartmentTranslation.upsert({
      where: {
        departmentId_locale: {
          departmentId,
          locale,
        },
      },
      update: { name: names[locale] },
      create: {
        schoolId,
        departmentId,
        locale,
        name: names[locale],
      },
    });
  }
}

async function upsertPositionTranslations(
  tx: Prisma.TransactionClient,
  schoolId: string,
  positionId: string,
  names: StaffCatalogItemInput["name"],
) {
  for (const locale of CATALOG_LOCALES) {
    await tx.staffPositionTranslation.upsert({
      where: {
        positionId_locale: {
          positionId,
          locale,
        },
      },
      update: { name: names[locale] },
      create: {
        schoolId,
        positionId,
        locale,
        name: names[locale],
      },
    });
  }
}

async function persistDepartmentCatalogItem(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: StaffCatalogItemInput,
): Promise<StaffState> {
  if (!input.catalogId) {
    const department = await tx.staffDepartment.create({
      data: {
        schoolId: actor.schoolId,
        code: input.code,
        defaultName: input.name.tr,
      },
      select: { id: true },
    });
    await upsertDepartmentTranslations(
      tx,
      actor.schoolId,
      department.id,
      input.name,
    );
    await audit(tx, actor, {
      action: "staff_catalog.department.created",
      entityType: "StaffDepartment",
      entityId: department.id,
      afterData: { code: input.code, name: input.name },
      changedFields: ["staffDepartment", "staffDepartmentTranslations"],
    });
    return {
      status: "success",
      message: "Departman tanimi olusturuldu.",
      entityId: department.id,
    };
  }

  const existing = await tx.staffDepartment.findFirst({
    where: { id: input.catalogId, schoolId: actor.schoolId },
    select: {
      id: true,
      code: true,
      defaultName: true,
      archivedAt: true,
      updatedAt: true,
      translations: {
        select: { locale: true, name: true },
      },
    },
  });
  if (!existing) return error("Departman tanimi bulunamadi.");
  if (existing.updatedAt.toISOString() !== input.revision)
    return error("Kayit bu arada degismis. Sayfayi yenileyip tekrar deneyin.");

  await tx.staffDepartment.update({
    where: { id: existing.id },
    data: { code: input.code, defaultName: input.name.tr },
  });
  await upsertDepartmentTranslations(tx, actor.schoolId, existing.id, input.name);
  await audit(tx, actor, {
    action: "staff_catalog.department.updated",
    entityType: "StaffDepartment",
    entityId: existing.id,
    beforeData: {
      code: existing.code,
      defaultName: existing.defaultName,
      archivedAt: existing.archivedAt?.toISOString() ?? null,
      translations: existing.translations,
    },
    afterData: { code: input.code, name: input.name },
    changedFields: ["staffDepartment", "staffDepartmentTranslations"],
  });
  return { status: "success", message: "Departman tanimi guncellendi." };
}

async function persistPositionCatalogItem(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: StaffCatalogItemInput,
): Promise<StaffState> {
  if (!input.catalogId) {
    const position = await tx.staffPosition.create({
      data: {
        schoolId: actor.schoolId,
        code: input.code,
        defaultName: input.name.tr,
      },
      select: { id: true },
    });
    await upsertPositionTranslations(tx, actor.schoolId, position.id, input.name);
    await audit(tx, actor, {
      action: "staff_catalog.position.created",
      entityType: "StaffPosition",
      entityId: position.id,
      afterData: { code: input.code, name: input.name },
      changedFields: ["staffPosition", "staffPositionTranslations"],
    });
    return {
      status: "success",
      message: "Pozisyon tanimi olusturuldu.",
      entityId: position.id,
    };
  }

  const existing = await tx.staffPosition.findFirst({
    where: { id: input.catalogId, schoolId: actor.schoolId },
    select: {
      id: true,
      code: true,
      defaultName: true,
      archivedAt: true,
      updatedAt: true,
      translations: {
        select: { locale: true, name: true },
      },
    },
  });
  if (!existing) return error("Pozisyon tanimi bulunamadi.");
  if (existing.updatedAt.toISOString() !== input.revision)
    return error("Kayit bu arada degismis. Sayfayi yenileyip tekrar deneyin.");

  await tx.staffPosition.update({
    where: { id: existing.id },
    data: { code: input.code, defaultName: input.name.tr },
  });
  await upsertPositionTranslations(tx, actor.schoolId, existing.id, input.name);
  await audit(tx, actor, {
    action: "staff_catalog.position.updated",
    entityType: "StaffPosition",
    entityId: existing.id,
    beforeData: {
      code: existing.code,
      defaultName: existing.defaultName,
      archivedAt: existing.archivedAt?.toISOString() ?? null,
      translations: existing.translations,
    },
    afterData: { code: input.code, name: input.name },
    changedFields: ["staffPosition", "staffPositionTranslations"],
  });
  return { status: "success", message: "Pozisyon tanimi guncellendi." };
}

export function persistStaffCatalogItem(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: StaffCatalogItemInput,
): Promise<StaffState> {
  return input.kind === "department"
    ? persistDepartmentCatalogItem(tx, actor, input)
    : persistPositionCatalogItem(tx, actor, input);
}

async function persistDepartmentCatalogTransition(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: StaffCatalogTransitionInput,
): Promise<StaffState> {
  const existing = await tx.staffDepartment.findFirst({
    where: { id: input.catalogId, schoolId: actor.schoolId },
    select: {
      id: true,
      code: true,
      defaultName: true,
      archivedAt: true,
      updatedAt: true,
    },
  });
  if (!existing) return error("Departman tanimi bulunamadi.");
  if (existing.updatedAt.toISOString() !== input.revision)
    return error("Kayit bu arada degismis. Sayfayi yenileyip tekrar deneyin.");

  const archivedAt = input.transition === "archive" ? new Date() : null;
  if (
    (input.transition === "archive" && existing.archivedAt) ||
    (input.transition === "restore" && !existing.archivedAt)
  )
    return { status: "success", message: "Departman tanimi zaten guncel." };

  await tx.staffDepartment.update({
    where: { id: existing.id },
    data: { archivedAt },
  });
  await audit(tx, actor, {
    action: `staff_catalog.department.${input.transition}`,
    entityType: "StaffDepartment",
    entityId: existing.id,
    beforeData: {
      code: existing.code,
      defaultName: existing.defaultName,
      archivedAt: existing.archivedAt?.toISOString() ?? null,
    },
    afterData: {
      code: existing.code,
      defaultName: existing.defaultName,
      archivedAt: archivedAt?.toISOString() ?? null,
    },
    changedFields: ["staffDepartment.archivedAt"],
  });
  return {
    status: "success",
    message:
      input.transition === "archive"
        ? "Departman tanimi arsivlendi."
        : "Departman tanimi geri alindi.",
  };
}

async function persistPositionCatalogTransition(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: StaffCatalogTransitionInput,
): Promise<StaffState> {
  const existing = await tx.staffPosition.findFirst({
    where: { id: input.catalogId, schoolId: actor.schoolId },
    select: {
      id: true,
      code: true,
      defaultName: true,
      archivedAt: true,
      updatedAt: true,
    },
  });
  if (!existing) return error("Pozisyon tanimi bulunamadi.");
  if (existing.updatedAt.toISOString() !== input.revision)
    return error("Kayit bu arada degismis. Sayfayi yenileyip tekrar deneyin.");

  const archivedAt = input.transition === "archive" ? new Date() : null;
  if (
    (input.transition === "archive" && existing.archivedAt) ||
    (input.transition === "restore" && !existing.archivedAt)
  )
    return { status: "success", message: "Pozisyon tanimi zaten guncel." };

  await tx.staffPosition.update({
    where: { id: existing.id },
    data: { archivedAt },
  });
  await audit(tx, actor, {
    action: `staff_catalog.position.${input.transition}`,
    entityType: "StaffPosition",
    entityId: existing.id,
    beforeData: {
      code: existing.code,
      defaultName: existing.defaultName,
      archivedAt: existing.archivedAt?.toISOString() ?? null,
    },
    afterData: {
      code: existing.code,
      defaultName: existing.defaultName,
      archivedAt: archivedAt?.toISOString() ?? null,
    },
    changedFields: ["staffPosition.archivedAt"],
  });
  return {
    status: "success",
    message:
      input.transition === "archive"
        ? "Pozisyon tanimi arsivlendi."
        : "Pozisyon tanimi geri alindi.",
  };
}

export function persistStaffCatalogTransition(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: StaffCatalogTransitionInput,
): Promise<StaffState> {
  return input.kind === "department"
    ? persistDepartmentCatalogTransition(tx, actor, input)
    : persistPositionCatalogTransition(tx, actor, input);
}

export async function persistEmployment(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: CreateEmploymentInput,
): Promise<StaffState> {
  const catalogError = await validateCatalogs(tx, actor, input);
  if (catalogError) return catalogError;

  let personId = input.personId;
  if (input.mode === "existing") {
    const person = personId
      ? await tx.person.findFirst({
          where: {
            id: personId,
            schoolId: actor.schoolId,
            status: "ACTIVE",
            archivedAt: null,
          },
          select: { id: true },
        })
      : null;
    if (!person) return error("Kisi bulunamadi.", { personId: "Kisi secin." });
  } else {
    if (!input.firstName || !input.lastName)
      return error("Ad ve soyad zorunlu.", {
        firstName: "Ad zorunlu.",
        lastName: "Soyad zorunlu.",
      });
    const person = await tx.person.create({
      data: {
        schoolId: actor.schoolId,
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    personId = person.id;
    await createContactPoints(tx, actor.schoolId, person.id, {
      phone: input.phone,
      email: input.email,
    });
  }

  const openEmployment = await tx.employment.findFirst({
    where: {
      schoolId: actor.schoolId,
      personId: personId!,
      archivedAt: null,
      status: { in: ["ACTIVE", "ON_LEAVE"] },
    },
    select: { id: true },
  });
  if (openEmployment)
    return error("Bu kisinin okulda acik personel kaydi zaten var.", {
      personId: "Once mevcut personel kaydini kapatin.",
    });

  const staffNumber = await allocateStaffNumber(tx, actor.schoolId);
  const employment = await tx.employment.create({
    data: {
      schoolId: actor.schoolId,
      personId: personId!,
      departmentId: input.departmentId,
      positionId: input.positionId,
      staffNumber,
      type: input.employmentType,
      hiredOn: input.hiredOn,
      note: input.note,
    },
    select: { id: true },
  });
  await tx.employmentLifecycleEvent.create({
    data: {
      schoolId: actor.schoolId,
      employmentId: employment.id,
      type: "HIRED",
      effectiveOn: input.hiredOn,
      note: input.note,
    },
  });
  await audit(tx, actor, {
    action: "employment.created",
    entityType: "Employment",
    entityId: employment.id,
    afterData: {
      personId,
      staffNumber,
      departmentId: input.departmentId,
      positionId: input.positionId,
      type: input.employmentType,
      hiredOn: dateValue(input.hiredOn),
      createdPerson: input.mode === "new",
    },
    changedFields: ["person", "employment", "staffNumber", "lifecycle"],
  });
  return {
    status: "success",
    message: `Personel kaydi olusturuldu. Personel no: ${staffNumber}`,
    entityId: employment.id,
  };
}

export async function persistEmploymentTransition(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: EmploymentTransitionInput,
): Promise<StaffState> {
  const employment = await tx.employment.findFirst({
    where: {
      id: input.employmentId,
      schoolId: actor.schoolId,
      archivedAt: null,
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      personId: true,
      staffNumber: true,
    },
  });
  if (!employment) return error("Personel kaydi bulunamadi.");
  if (employment.updatedAt.toISOString() !== input.revision)
    return error("Kayit bu arada degismis. Sayfayi yenileyip tekrar deneyin.");

  if (input.transition === "on_leave" && employment.status !== "ACTIVE")
    return error("Yalniz aktif personel izne/pasife alinabilir.");
  if (input.transition === "reactivate" && employment.status !== "ON_LEAVE")
    return error("Yalniz izin/pasif durumdaki personel yeniden aktif olabilir.");
  if (input.transition === "end" && employment.status === "ENDED")
    return error("Personel kaydi zaten kapanmis.");

  const beforeData = {
    status: employment.status,
    staffNumber: employment.staffNumber,
  };
  const next =
    input.transition === "on_leave"
      ? { status: "ON_LEAVE" as const, endedOn: null, exitReason: input.exitReason, note: input.note }
      : input.transition === "reactivate"
        ? { status: "ACTIVE" as const, endedOn: null, exitReason: null, note: input.note }
        : {
            status: "ENDED" as const,
            endedOn: input.effectiveOn,
            exitReason: input.exitReason ?? "UNKNOWN",
            note: input.note,
          };
  await tx.employment.update({
    where: { id: employment.id },
    data: next,
  });
  if (input.transition === "end") {
    await tx.teacherProfile.updateMany({
      where: {
        schoolId: actor.schoolId,
        employmentId: employment.id,
        archivedAt: null,
      },
      data: { status: "INACTIVE" },
    });
    await tx.employmentContract.updateMany({
      where: {
        schoolId: actor.schoolId,
        employmentId: employment.id,
        status: "ACTIVE",
      },
      data: {
        status: "ENDED",
        endedOn: input.effectiveOn,
        note: input.note,
      },
    });
  }
  await tx.employmentLifecycleEvent.create({
    data: {
      schoolId: actor.schoolId,
      employmentId: employment.id,
      type:
        input.transition === "on_leave"
          ? "ON_LEAVE"
          : input.transition === "reactivate"
            ? "REACTIVATED"
            : "ENDED",
      effectiveOn: input.effectiveOn,
      exitReason: input.exitReason,
      note: input.note,
    },
  });
  await audit(tx, actor, {
    action: `employment.${input.transition}`,
    entityType: "Employment",
    entityId: employment.id,
    beforeData,
    afterData: {
      status: next.status,
      effectiveOn: dateValue(input.effectiveOn),
      exitReason: input.exitReason,
      teacherProfileInactivated: input.transition === "end",
      activeContractEnded: input.transition === "end",
    },
    changedFields: [
      "employment.status",
      "employment.note",
      "lifecycle",
      ...(input.transition === "end" ? ["employmentContract.status"] : []),
    ],
  });
  return { status: "success", message: "Personel durumu guncellendi." };
}

export async function persistEmploymentContract(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: SaveEmploymentContractInput,
  messages: StaffMessages,
): Promise<StaffState> {
  const employment = await tx.employment.findFirst({
    where: {
      id: input.employmentId,
      schoolId: actor.schoolId,
      archivedAt: null,
    },
    select: { id: true, staffNumber: true, status: true },
  });
  if (!employment) return error(messages.unavailable);

  const existing = input.contractId
    ? await tx.employmentContract.findFirst({
        where: {
          id: input.contractId,
          schoolId: actor.schoolId,
          employmentId: employment.id,
        },
      })
    : null;
  if (input.contractId && !existing) return error(messages.contractUnavailable);
  if (
    existing &&
    input.revision &&
    existing.updatedAt.toISOString() !== input.revision
  )
    return error(messages.conflict);

  const duplicateNumber = await tx.employmentContract.findFirst({
    where: {
      schoolId: actor.schoolId,
      contractNumber: input.contractNumber,
      ...(input.contractId ? { id: { not: input.contractId } } : {}),
    },
    select: { id: true },
  });
  if (duplicateNumber)
    return error(messages.contractNumberDuplicate, {
      contractNumber: messages.contractNumberDuplicate,
    });

  if (input.status === "ACTIVE") {
    if (employment.status === "ENDED")
      return error(messages.contractRequiresOpenEmployment, {
        contractStatus: messages.contractRequiresOpenEmployment,
      });
    const activeContract = await tx.employmentContract.findFirst({
      where: {
        schoolId: actor.schoolId,
        employmentId: employment.id,
        status: "ACTIVE",
        ...(input.contractId ? { id: { not: input.contractId } } : {}),
      },
      select: { id: true },
    });
    if (activeContract)
      return error(messages.activeContractExists, {
        contractStatus: messages.activeContractExists,
      });
  }

  const data = {
    contractNumber: input.contractNumber,
    type: input.type,
    status: input.status,
    startedOn: input.startedOn,
    endedOn: input.endedOn,
    note: input.note,
  };
  const contract = existing
    ? await tx.employmentContract.update({
        where: { id: existing.id },
        data,
      })
    : await tx.employmentContract.create({
        data: {
          schoolId: actor.schoolId,
          employmentId: employment.id,
          ...data,
        },
      });

  await audit(tx, actor, {
    action: existing ? "employment_contract.updated" : "employment_contract.created",
    entityType: "EmploymentContract",
    entityId: contract.id,
    beforeData: existing
      ? {
          contractNumber: existing.contractNumber,
          type: existing.type,
          status: existing.status,
          startedOn: dateValue(existing.startedOn),
          endedOn: existing.endedOn ? dateValue(existing.endedOn) : null,
          note: existing.note,
        }
      : undefined,
    afterData: {
      employmentId: employment.id,
      staffNumber: employment.staffNumber,
      contractNumber: contract.contractNumber,
      type: contract.type,
      status: contract.status,
      startedOn: dateValue(contract.startedOn),
      endedOn: contract.endedOn ? dateValue(contract.endedOn) : null,
      note: contract.note,
    },
    changedFields: ["employmentContract"],
  });
  return {
    status: "success",
    message: existing ? messages.contractUpdated : messages.contractCreated,
    entityId: contract.id,
  };
}

export async function persistTeacherProfile(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: TeacherProfileInput,
): Promise<StaffState> {
  const employment = await tx.employment.findFirst({
    where: {
      id: input.employmentId,
      schoolId: actor.schoolId,
      archivedAt: null,
      status: { in: ["ACTIVE", "ON_LEAVE"] },
    },
    select: { id: true, personId: true },
  });
  if (!employment) return error("Ogretmen profili icin aktif personel kaydi gerekir.");

  const subjects = input.subjectIds.length
    ? await tx.subject.findMany({
        where: {
          schoolId: actor.schoolId,
          id: { in: input.subjectIds },
          archivedAt: null,
        },
        select: { id: true },
      })
    : [];
  if (subjects.length !== input.subjectIds.length)
    return error("Secilen derslerden biri okul kapsaminda degil.", {
      subjectIds: "Dersleri kontrol edin.",
    });
  const subjectIds = subjects.map((subject) => subject.id);

  const existing = await tx.teacherProfile.findFirst({
    where: {
      schoolId: actor.schoolId,
      employmentId: employment.id,
      archivedAt: null,
    },
    select: { id: true, category: true, title: true, status: true },
  });
  const profile = existing
    ? await tx.teacherProfile.update({
        where: { id: existing.id },
        data: {
          category: input.category,
          title: input.title.tr,
          status: input.teacherStatus,
          note: input.note,
        },
        select: { id: true },
      })
    : await tx.teacherProfile.create({
        data: {
          schoolId: actor.schoolId,
          employmentId: employment.id,
          category: input.category,
          title: input.title.tr,
          status: input.teacherStatus,
          note: input.note,
        },
        select: { id: true },
      });

  for (const [locale, title] of Object.entries(input.title)) {
    await tx.teacherProfileTranslation.upsert({
      where: {
        teacherProfileId_locale: {
          teacherProfileId: profile.id,
          locale,
        },
      },
      update: { title },
      create: {
        schoolId: actor.schoolId,
        teacherProfileId: profile.id,
        locale,
        title,
      },
    });
  }

  await tx.teacherSubjectCapability.deleteMany({
    where: {
      schoolId: actor.schoolId,
      teacherProfileId: profile.id,
      subjectId: { notIn: subjectIds },
    },
  });
  for (const subjectId of subjectIds) {
    await tx.teacherSubjectCapability.upsert({
      where: {
        teacherProfileId_subjectId: {
          teacherProfileId: profile.id,
          subjectId,
        },
      },
      update: {},
      create: {
        schoolId: actor.schoolId,
        teacherProfileId: profile.id,
        subjectId,
      },
    });
  }
  await audit(tx, actor, {
    action: existing ? "teacher_profile.updated" : "teacher_profile.created",
    entityType: "TeacherProfile",
    entityId: profile.id,
    beforeData: existing
      ? {
          category: existing.category,
          title: existing.title,
          status: existing.status,
        }
      : undefined,
    afterData: {
      employmentId: employment.id,
      personId: employment.personId,
      category: input.category,
      title: input.title,
      status: input.teacherStatus,
      subjectIds,
    },
    changedFields: ["teacherProfile", "teacherProfileTranslations", "subjectCapabilities"],
  });
  return {
    status: "success",
    message: existing
      ? "Ogretmen profili guncellendi."
      : "Ogretmen profili olusturuldu.",
    entityId: profile.id,
  };
}

export async function persistStaffPhotoMetadata(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: {
    employmentId: UploadStaffPhotoInput["employmentId"];
    url: string;
    storageKey: string;
    mimeType: string;
  },
): Promise<StaffState & { previousStorageKey?: string | null }> {
  const employment = await tx.employment.findFirst({
    where: {
      id: input.employmentId,
      schoolId: actor.schoolId,
      archivedAt: null,
    },
    include: { person: { select: { id: true, photoStorageKey: true } } },
  });
  if (!employment) return error("Personel kaydi bulunamadi.");
  await tx.person.update({
    where: { id: employment.person.id },
    data: {
      photoUrl: input.url,
      photoStorageKey: input.storageKey,
      photoMimeType: input.mimeType,
      photoUpdatedAt: new Date(),
    },
  });
  await audit(tx, actor, {
    action: "staff.photo-updated",
    entityType: "Person",
    entityId: employment.person.id,
    afterData: {
      employmentId: employment.id,
      staffNumber: employment.staffNumber,
      storageKey: input.storageKey,
    },
    changedFields: [
      "photoUrl",
      "photoStorageKey",
      "photoMimeType",
      "photoUpdatedAt",
    ],
  });
  return {
    status: "success",
    message: "Personel fotografi guncellendi.",
    entityId: employment.id,
    previousStorageKey: employment.person.photoStorageKey,
  };
}

export async function persistStaffHrProfile(
  tx: Prisma.TransactionClient,
  actor: StaffActor,
  input: UpdateStaffHrProfileInput,
  messages: StaffMessages,
): Promise<StaffState> {
  const employment = await tx.employment.findFirst({
    where: {
      id: input.employmentId,
      schoolId: actor.schoolId,
      archivedAt: null,
    },
    select: {
      id: true,
      schoolId: true,
      personId: true,
      staffNumber: true,
      updatedAt: true,
      hrProfile: true,
    },
  });
  if (!employment) return error(messages.unavailable);
  if (employment.updatedAt.toISOString() !== input.revision)
    return error(messages.conflict);

  let identityUpdated = false;
  if (input.identity) {
    let protectedIdentity: ReturnType<typeof protectIdentity>;
    try {
      protectedIdentity = protectIdentity(
        actor.schoolId,
        input.identity.type,
        input.identity.value,
      );
    } catch (errorValue) {
      if (errorValue instanceof IdentityProtectionUnavailableError)
        return error(messages.identityUnavailable, {
          identityValue: messages.identityUnavailable,
        });
      throw errorValue;
    }

    const duplicate = await tx.personIdentity.findFirst({
      where: {
        schoolId: actor.schoolId,
        type: input.identity.type,
        lookupHash: protectedIdentity.lookupHash,
        personId: { not: employment.personId },
      },
      select: { id: true },
    });
    if (duplicate)
      return error(messages.identityDuplicate, {
        identityValue: messages.identityDuplicate,
      });

    await tx.personIdentity.upsert({
      where: {
        schoolId_personId_type: {
          schoolId: actor.schoolId,
          personId: employment.personId,
          type: input.identity.type,
        },
      },
      update: {
        countryCode: input.identity.countryCode,
        encryptedValue: protectedIdentity.encryptedValue,
        lookupHash: protectedIdentity.lookupHash,
        lastFour: protectedIdentity.lastFour,
      },
      create: {
        schoolId: actor.schoolId,
        personId: employment.personId,
        type: input.identity.type,
        countryCode: input.identity.countryCode,
        encryptedValue: protectedIdentity.encryptedValue,
        lookupHash: protectedIdentity.lookupHash,
        lastFour: protectedIdentity.lastFour,
      },
    });
    identityUpdated = true;
  }

  const hrData = {
    residenceCity: input.residenceCity,
    neighborhood: input.neighborhood,
    addressLine: input.addressLine,
    emergencyContactName: input.emergencyContactName,
    emergencyContactRelation: input.emergencyContactRelation,
    emergencyContactPhone: input.emergencyContactPhone,
    internalNote: input.internalNote,
  };
  const profile = await tx.employmentHrProfile.upsert({
    where: { employmentId: employment.id },
    update: hrData,
    create: {
      employmentId: employment.id,
      schoolId: actor.schoolId,
      ...hrData,
    },
  });

  await audit(tx, actor, {
    action: "staff.hr-profile-updated",
    entityType: "EmploymentHrProfile",
    entityId: profile.employmentId,
    beforeData: employment.hrProfile
      ? {
          residenceCity: employment.hrProfile.residenceCity,
          neighborhood: employment.hrProfile.neighborhood,
          addressLine: employment.hrProfile.addressLine,
          emergencyContactName: employment.hrProfile.emergencyContactName,
          emergencyContactRelation: employment.hrProfile.emergencyContactRelation,
          emergencyContactPhone: employment.hrProfile.emergencyContactPhone,
          internalNote: employment.hrProfile.internalNote,
        }
      : undefined,
    afterData: {
      employmentId: employment.id,
      staffNumber: employment.staffNumber,
      ...hrData,
      identityUpdated,
    },
    changedFields: [
      "employmentHrProfile",
      ...(identityUpdated ? ["personIdentity"] : []),
    ],
  });
  return {
    status: "success",
    message: messages.hrProfileUpdated,
    entityId: employment.id,
  };
}
