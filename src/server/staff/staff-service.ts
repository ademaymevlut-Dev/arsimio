import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type {
  CreateEmploymentInput,
  EmploymentTransitionInput,
  StaffState,
  TeacherProfileInput,
} from "@/lib/staff-validation";

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
    },
    changedFields: ["employment.status", "employment.note", "lifecycle"],
  });
  return { status: "success", message: "Personel durumu guncellendi." };
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
