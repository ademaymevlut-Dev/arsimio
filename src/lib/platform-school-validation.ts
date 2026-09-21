import { normalizeColor, type BrandColors } from "./school-branding";

export type SettingsState = {
  status?: "success" | "error";
  message?: string;
  revision?: string;
};
export type SchoolProfileInput = { name: string; legalName: string | null };

export function validSchoolId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function validRevision(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
  )
    return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

export function parseSchoolProfile(form: FormData): SchoolProfileInput | null {
  const name = form.get("name");
  const legalName = form.get("legalName");
  if (typeof name !== "string" || typeof legalName !== "string") return null;
  const trimmed = name.trim();
  if (
    trimmed.length < 2 ||
    trimmed.length > 200 ||
    legalName.trim().length > 240
  )
    return null;
  if (/[\u0000-\u001f\u007f]/.test(trimmed + legalName)) return null;
  return { name: trimmed, legalName: legalName.trim() || null };
}

export function parseBrandColors(form: FormData): BrandColors | null {
  const primaryColor = normalizeColor(form.get("primaryColor"));
  const secondaryColor = normalizeColor(form.get("secondaryColor"));
  const accentColor = normalizeColor(form.get("accentColor"));
  return primaryColor && secondaryColor && accentColor
    ? { primaryColor, secondaryColor, accentColor }
    : null;
}
