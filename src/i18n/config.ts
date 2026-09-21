export const SUPPORTED_LOCALES = ["tr", "sq", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_COOKIE_NAME = "arsimio_locale";

export const HTML_LOCALES: Record<Locale, string> = {
  tr: "tr-TR",
  sq: "sq-AL",
  en: "en-US",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

export function normalizeLocale(
  value: unknown,
  fallback: Locale = DEFAULT_LOCALE,
): Locale {
  return isLocale(value) ? value : fallback;
}

export type LocalizedNames = Record<Locale, string>;
