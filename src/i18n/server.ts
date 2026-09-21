import "server-only";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  type Locale,
} from "./config";
import type { AppDictionary } from "./dictionaries/types";

const dictionaries: Record<Locale, () => Promise<AppDictionary>> = {
  tr: () => import("./dictionaries/tr").then((module) => module.default),
  sq: () => import("./dictionaries/sq").then((module) => module.default),
  en: () => import("./dictionaries/en").then((module) => module.default),
};

export async function getRequestLocale(
  fallback: Locale = DEFAULT_LOCALE,
): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE_NAME)?.value;
  return normalizeLocale(value, fallback);
}

export async function getDictionary(locale: Locale): Promise<AppDictionary> {
  return dictionaries[locale]();
}

export async function getRequestDictionary(
  fallback: Locale = DEFAULT_LOCALE,
) {
  const locale = await getRequestLocale(fallback);
  return { locale, dictionary: await getDictionary(locale) };
}

export async function getSchoolLocale(
  preferredLocale: string | null | undefined,
  schoolDefaultLocale: string | null | undefined,
) {
  const schoolDefault = normalizeLocale(schoolDefaultLocale);
  if (preferredLocale) return normalizeLocale(preferredLocale, schoolDefault);
  return getRequestLocale(schoolDefault);
}
