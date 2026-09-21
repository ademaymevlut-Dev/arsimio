import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { BrandColors } from "@/lib/school-branding";
import type {
  SchoolProfileInput,
  SettingsState,
} from "@/lib/platform-school-validation";

export const schoolSettingsConflict: SettingsState = {
  status: "error",
  message:
    "Bu kayıt başka bir işlemle değişti. Sayfayı yenileyip değişikliklerinizi tekrar uygulayın.",
};
const invalid: SettingsState = {
  status: "error",
  message: "Bilgiler doğrulanamadı. Alanları kontrol edip tekrar deneyin.",
};

// Internal persistence only. The caller must authenticate, authorize and validate input.
// Kept separate so the actual database mutation can be exercised in rollback-only tests.
export async function persistSchoolSettings(
  tx: Prisma.TransactionClient,
  input: {
    id: string;
    actorUserId: string;
    revision: string;
    kind: "profile" | "branding";
    profile: SchoolProfileInput | null;
    colors: BrandColors | null;
  },
): Promise<SettingsState> {
  const { id, actorUserId, revision, kind, profile, colors } = input;
  const school = await tx.school.findUnique({
    where: { id },
    select: {
      name: true,
      legalName: true,
      status: true,
      archivedAt: true,
      updatedAt: true,
      branding: true,
    },
  });
  if (!school || school.archivedAt || school.status === "ARCHIVED")
    return {
      status: "error",
      message: "Bu okul şu anda düzenlenemiyor.",
    };
  let nextRevision: Date;
  let beforeData;
  let afterData;
  if (profile) {
    if (revision !== school.updatedAt.toISOString())
      return schoolSettingsConflict;
    if (
      profile.name === school.name &&
      profile.legalName === school.legalName
    ) {
      return {
        status: "success",
        message: "Değişiklik bulunmadı. Kayıtlı okul bilgileri güncel.",
        revision,
      };
    }
    const result = await tx.school.updateMany({
      where: {
        id,
        updatedAt: new Date(revision as string),
        archivedAt: null,
        status: { not: "ARCHIVED" },
      },
      data: profile,
    });
    if (result.count !== 1) return schoolSettingsConflict;
    nextRevision = (
      await tx.school.findUniqueOrThrow({
        where: { id },
        select: { updatedAt: true },
      })
    ).updatedAt;
    beforeData = { name: school.name, legalName: school.legalName };
    afterData = profile;
  } else if (colors) {
    beforeData = {
      primaryColor: school.branding?.primaryColor ?? null,
      secondaryColor: school.branding?.secondaryColor ?? null,
      accentColor: school.branding?.accentColor ?? null,
    };
    if (
      school.branding &&
      revision === school.branding.updatedAt.toISOString() &&
      colors.primaryColor === beforeData.primaryColor &&
      colors.secondaryColor === beforeData.secondaryColor &&
      colors.accentColor === beforeData.accentColor
    ) {
      return {
        status: "success",
        message: "Değişiklik bulunmadı. Kayıtlı marka renkleri güncel.",
        revision,
      };
    }
    if (revision === "new") {
      if (school.branding) return schoolSettingsConflict;
      nextRevision = (
        await tx.schoolBranding.create({
          data: { schoolId: id, ...colors },
          select: { updatedAt: true },
        })
      ).updatedAt;
    } else {
      const result = await tx.schoolBranding.updateMany({
        where: { schoolId: id, updatedAt: new Date(revision as string) },
        data: colors,
      });
      if (result.count !== 1) return schoolSettingsConflict;
      nextRevision = (
        await tx.schoolBranding.findUniqueOrThrow({
          where: { schoolId: id },
          select: { updatedAt: true },
        })
      ).updatedAt;
    }
    afterData = colors;
  } else return invalid;
  await tx.auditEvent.create({
    data: {
      schoolId: id,
      actorUserId,
      source: "USER",
      action:
        kind === "profile"
          ? "platform.school.updated"
          : "platform.branding.updated",
      entityType: kind === "profile" ? "School" : "SchoolBranding",
      entityId: id,
      beforeData,
      afterData,
      changedFields: Object.keys(afterData).filter(
        (key) =>
          (beforeData as Record<string, unknown>)[key] !==
          (afterData as Record<string, unknown>)[key],
      ),
    },
  });
  return {
    status: "success",
    message:
      kind === "profile"
        ? "Okul bilgileri kaydedildi."
        : "Marka renkleri kaydedildi. Okul giriş ekranına uygulandı.",
    revision: nextRevision.toISOString(),
  };
}
