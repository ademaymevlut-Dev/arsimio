import { normalizeUsername } from "@/server/auth/identifiers";
import { isValidPassword, MIN_PASSWORD_LENGTH } from "@/server/auth/password";

export type InitialSchoolAdminField =
  | "firstName"
  | "lastName"
  | "username"
  | "password"
  | "passwordConfirmation";

export type InitialSchoolAdminState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<InitialSchoolAdminField, string>>;
};

export type InitialSchoolAdminInput = {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
};

function personName(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (
    normalized.length < 2 ||
    normalized.length > 100
  )
    return null;
  return normalized;
}

export function parseInitialSchoolAdmin(form: FormData):
  | { success: true; data: InitialSchoolAdminInput }
  | {
      success: false;
      state: InitialSchoolAdminState;
    } {
  const firstName = personName(form.get("firstName"));
  const lastName = personName(form.get("lastName"));
  const rawUsername = form.get("username");
  const password = form.get("password");
  const passwordConfirmation = form.get("passwordConfirmation");
  const username =
    typeof rawUsername === "string" ? normalizeUsername(rawUsername) : null;
  const errors: Partial<Record<InitialSchoolAdminField, string>> = {};

  if (!firstName) errors.firstName = "Ad 2–100 karakter olmalı.";
  if (!lastName) errors.lastName = "Soyad 2–100 karakter olmalı.";
  if (!username)
    errors.username =
      "3–64 karakter kullanın; harf/rakamla başlayıp nokta, tire veya alt çizgi içerebilir.";
  if (typeof password !== "string" || !isValidPassword(password))
    errors.password = `Parola ${MIN_PASSWORD_LENGTH}–128 karakter olmalı.`;
  if (
    typeof passwordConfirmation !== "string" ||
    typeof password !== "string" ||
    passwordConfirmation !== password
  )
    errors.passwordConfirmation = "Parolalar eşleşmiyor.";

  if (
    !firstName ||
    !lastName ||
    !username ||
    typeof password !== "string" ||
    Object.keys(errors).length
  )
    return {
      success: false,
      state: {
        status: "error",
        message: "Yönetici oluşturulamadı. İşaretli alanları kontrol edin.",
        fieldErrors: errors,
      },
    };

  return {
    success: true,
    data: { firstName, lastName, username, password },
  };
}
