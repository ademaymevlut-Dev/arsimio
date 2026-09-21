import "server-only";
import {
  persistSchoolSettings,
  schoolSettingsConflict,
} from "./school-settings-service";
import { headers } from "next/headers";
import { getPrisma } from "@/lib/db";
import { requirePlatformPermission } from "@/server/authorization/guards";
import { isSameOrigin } from "@/server/auth/identifiers";
import {
  parseBrandColors,
  parseSchoolProfile,
  validRevision,
  validSchoolId,
  type SettingsState,
} from "@/lib/platform-school-validation";

const invalid: SettingsState = {
  status: "error",
  message: "Bilgiler doğrulanamadı. Alanları kontrol edip tekrar deneyin.",
};

export async function updateSchoolSettings(
  kind: "profile" | "branding",
  form: FormData,
): Promise<SettingsState> {
  // Authorization is checked here for every mutation, not just in the layout.
  const { user } = await requirePlatformPermission(
    kind === "profile" ? "platform.schools.update" : "platform.branding.update",
  );
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  )
    return invalid;
  const id = form.get("schoolId");
  const revision = form.get("revision");
  if (!validSchoolId(id) || (revision !== "new" && !validRevision(revision)))
    return invalid;
  if (kind === "profile" && revision === "new") return invalid;
  const profile = kind === "profile" ? parseSchoolProfile(form) : null;
  const colors = kind === "branding" ? parseBrandColors(form) : null;
  if (!(profile || colors)) return invalid;

  try {
    return await getPrisma().$transaction(
      (tx) =>
        persistSchoolSettings(tx, {
          id,
          actorUserId: user.id,
          revision,
          kind,
          profile,
          colors,
        }),
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      ["P2002", "P2034"].includes(String(error.code))
    )
      return schoolSettingsConflict;
    console.error("PLATFORM_SCHOOL_UPDATE_UNAVAILABLE");
    return {
      status: "error",
      message: "Değişiklikler kaydedilemedi. Lütfen tekrar deneyin.",
    };
  }
}
