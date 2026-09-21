"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  LOCALE_COOKIE_NAME,
  isLocale,
} from "@/i18n/config";
import { getPrisma } from "@/lib/db";
import { getAppUser } from "@/server/auth/user";
import { isSameOrigin } from "@/server/auth/identifiers";
import { getTenantContext } from "@/server/tenancy/context";

const LOCALE_COOKIE_SECONDS = 60 * 60 * 24 * 365;

export async function changeLocale(form: FormData) {
  const incoming = await headers();
  if (
    !isSameOrigin(
      incoming.get("origin"),
      incoming.get("host"),
      process.env.NODE_ENV === "development",
    )
  )
    return;

  const locale = form.get("locale");
  if (!isLocale(locale)) return;

  const jar = await cookies();
  jar.set(LOCALE_COOKIE_NAME, locale, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LOCALE_COOKIE_SECONDS,
  });

  const [tenant, user] = await Promise.all([getTenantContext(), getAppUser()]);
  if (tenant.kind === "school" && user) {
    await getPrisma().schoolMembership.updateMany({
      where: {
        schoolId: tenant.school.id,
        userId: user.id,
        status: "ACTIVE",
        archivedAt: null,
      },
      data: { preferredLocale: locale },
    });
  }

  revalidatePath("/", "layout");
}
