import type { AccountPortal } from "@/generated/prisma/client";
import { normalizeUsername } from "@/server/auth/identifiers";
import { isValidPassword, MIN_PASSWORD_LENGTH } from "@/server/auth/password";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AccountField =
  | "personId"
  | "studentProfileId"
  | "portal"
  | "username"
  | "password"
  | "passwordConfirmation";

export type AccountState = {
  status?: "success" | "error";
  message?: string;
  temporaryPassword?: string;
  fieldErrors?: Partial<Record<AccountField, string>>;
};

export type CreateAccountInput = {
  personId: string;
  studentProfileId: string | null;
  portal: Extract<AccountPortal, "STUDENT" | "GUARDIAN" | "TEACHER">;
  username: string;
};

export type ResetAccountInput = {
  personAccountId: string;
};

export type SuspendAccountInput = {
  personAccountId: string;
};

export type ChangePasswordInput = {
  password: string;
};

export function parseCreatePersonAccount(form: FormData):
  | { success: true; data: CreateAccountInput }
  | { success: false; state: AccountState } {
  const personId = form.get("personId");
  const studentProfileId = form.get("studentProfileId");
  const portal = form.get("portal");
  const rawUsername = form.get("username");
  const username =
    typeof rawUsername === "string" ? normalizeUsername(rawUsername) : null;
  const errors: Partial<Record<AccountField, string>> = {};

  if (typeof personId !== "string" || !uuid.test(personId))
    errors.personId = "Kisi secimi gecersiz.";
  if (
    typeof studentProfileId === "string" &&
    studentProfileId.length > 0 &&
    !uuid.test(studentProfileId)
  )
    errors.studentProfileId = "Ogrenci kaydi gecersiz.";
  if (portal !== "STUDENT" && portal !== "GUARDIAN" && portal !== "TEACHER")
    errors.portal = "Hesap turu gecersiz.";
  if (!username)
    errors.username =
      "3-64 karakter kullanin; harf/rakamla baslayip nokta, tire veya alt cizgi icerebilir.";

  if (Object.keys(errors).length)
    return {
      success: false,
      state: {
        status: "error",
        message: "Hesap olusturulamadi. Isaretli alanlari kontrol edin.",
        fieldErrors: errors,
      },
    };

  return {
    success: true,
    data: {
      personId: personId as string,
      studentProfileId:
        typeof studentProfileId === "string" && studentProfileId.length > 0
          ? studentProfileId
          : null,
      portal: portal as Extract<AccountPortal, "STUDENT" | "GUARDIAN" | "TEACHER">,
      username: username!,
    },
  };
}

export function parseAccountById(form: FormData):
  | { success: true; data: ResetAccountInput }
  | { success: false; state: AccountState } {
  const personAccountId = form.get("personAccountId");
  if (typeof personAccountId !== "string" || !uuid.test(personAccountId))
    return {
      success: false,
      state: {
        status: "error",
        message: "Hesap secimi gecersiz.",
      },
    };
  return { success: true, data: { personAccountId } };
}

export function parseChangePassword(form: FormData):
  | { success: true; data: ChangePasswordInput }
  | { success: false; state: AccountState } {
  const password = form.get("password");
  const passwordConfirmation = form.get("passwordConfirmation");
  const errors: Partial<Record<AccountField, string>> = {};
  if (typeof password !== "string" || !isValidPassword(password))
    errors.password = `Parola ${MIN_PASSWORD_LENGTH}-128 karakter olmali.`;
  if (
    typeof passwordConfirmation !== "string" ||
    typeof password !== "string" ||
    passwordConfirmation !== password
  )
    errors.passwordConfirmation = "Parolalar eslesmiyor.";
  if (Object.keys(errors).length)
    return {
      success: false,
      state: {
        status: "error",
        message: "Parola degistirilemedi.",
        fieldErrors: errors,
      },
    };
  return { success: true, data: { password: password as string } };
}
