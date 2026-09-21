import "server-only";
import { headers } from "next/headers";
import { getPrisma } from "@/lib/db";
import {
  parseInitialSchoolAdmin,
  type InitialSchoolAdminState,
} from "@/lib/initial-school-admin-validation";
import { validSchoolId } from "@/lib/platform-school-validation";
import { requirePlatformPermission } from "@/server/authorization/guards";
import { isSameOrigin } from "@/server/auth/identifiers";
import { hashPassword } from "@/server/auth/password";
import {
  initialAdminAlreadyExists,
  persistInitialSchoolAdmin,
} from "./initial-school-admin-service";

const invalid: InitialSchoolAdminState = {
  status: "error",
  message: "Yönetici bilgileri doğrulanamadı. Lütfen tekrar deneyin.",
};

export async function createInitialSchoolAdmin(
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
  if (!validSchoolId(schoolId)) return invalid;
  const parsed = parseInitialSchoolAdmin(form);
  if (!parsed.success) return parsed.state;

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(parsed.data.password);
    parsed.data.password = "";
  } catch {
    return invalid;
  }

  try {
    return await getPrisma().$transaction(
      (tx) =>
        persistInitialSchoolAdmin(tx, {
          schoolId,
          actorUserId: user.id,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          username: parsed.data.username,
          passwordHash,
        }),
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      String(error.code) === "P2034"
    )
      return initialAdminAlreadyExists;
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      String(error.code) === "P2002"
    )
      return {
        status: "error",
        message:
          "Bu kullanıcı adı kullanılıyor veya yönetici başka bir işlemde oluşturuldu.",
      };
    console.error("INITIAL_SCHOOL_ADMIN_CREATE_UNAVAILABLE");
    return {
      status: "error",
      message: "Yönetici hesabı oluşturulamadı. Lütfen tekrar deneyin.",
    };
  }
}

