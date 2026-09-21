import type { CSSProperties } from "react";
import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { getTenantContext } from "@/server/tenancy/context";
import { LoginForm } from "./login-form";
import { notFound } from "next/navigation";
import { readableForeground, resolveBranding } from "@/lib/school-branding";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { normalizeLocale } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";
import { getRequestDictionary } from "@/i18n/server";

export async function LoginPage({
  bootstrap = false,
}: {
  bootstrap?: boolean;
}) {
  const tenant = await getTenantContext();
  if (bootstrap && tenant.kind !== "platform") notFound();
  const platform = tenant.kind === "platform";
  const fallback = platform
    ? undefined
    : normalizeLocale(tenant.school.defaultLocale);
  const { locale, dictionary } = await getRequestDictionary(fallback);
  const messages = dictionary.auth;
  const name = platform ? "arsimio" : tenant.school.name;
  const colors = resolveBranding(platform ? null : tenant.school.branding);
  const color = colors.primaryColor;
  return (
    <main
      className="grid min-h-svh flex-1 lg:grid-cols-[1.05fr_1fr]"
      style={
        {
          "--primary": color,
          "--primary-foreground": readableForeground(color),
        } as CSSProperties
      }
    >
      <section className="relative flex flex-col justify-between overflow-hidden bg-background p-6 lg:min-h-svh lg:p-14">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex size-11 items-center justify-center rounded-xl"
              style={{
                backgroundColor: colors.secondaryColor,
                color: readableForeground(colors.secondaryColor),
              }}
            >
              <GraduationCap className="size-6" aria-hidden />
            </span>
            <span className="text-xl font-semibold tracking-tight">{name}</span>
          </div>
          <LanguageSwitcher
            locale={locale}
            messages={dictionary.language}
            compact
          />
        </div>
        <div className="relative hidden py-24 lg:block">
          <p className="mb-5 text-sm font-medium tracking-[0.18em]">
            {platform ? messages.platformEyebrow : messages.schoolEyebrow}
          </p>
          <h1 className="max-w-lg text-4xl leading-[1.12] font-semibold tracking-tight sm:text-5xl">
            {platform
              ? messages.platformHero
              : messages.schoolHero}
          </h1>
          <p className="mt-6 max-w-md text-base leading-7">
            {platform
              ? messages.platformDescription
              : formatMessage(messages.schoolDescription, { name })}
          </p>
          <div
            className="mt-10 h-1 w-16 rounded-full"
            style={{ backgroundColor: colors.accentColor }}
          />
        </div>
        <div className="hidden items-center justify-between text-sm lg:flex">
          <span>{messages.productLine}</span>
          <span>2026</span>
        </div>
      </section>
      <section className="flex items-center justify-center bg-card px-6 py-14 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" aria-hidden />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">
            {bootstrap ? messages.bootstrapTitle : messages.welcomeTitle}
          </h2>
          <p className="mt-3 mb-8 text-sm leading-6 text-muted-foreground">
            {bootstrap
              ? messages.bootstrapDescription
              : platform
                ? messages.platformPrompt
                : formatMessage(messages.schoolPrompt, { name })}
          </p>
          {bootstrap ? (
            <div className="rounded-xl border bg-muted/30 p-5 text-sm leading-6">
              <p>{messages.bootstrapCommand}</p>
              <code className="mt-3 block rounded-md bg-background p-3 font-mono">
                pnpm auth:bootstrap
              </code>
              <p className="mt-3 text-muted-foreground">
                {messages.bootstrapHelp}
              </p>
            </div>
          ) : (
            <LoginForm platform={platform} messages={messages} />
          )}
          <p className="mt-6 text-sm leading-6 text-muted-foreground">
            {bootstrap ? (
              <Link
                className="text-primary underline underline-offset-4"
                href="/login"
              >
                {messages.backToLogin}
              </Link>
            ) : platform ? (
              <Link className="underline underline-offset-4" href="/setup">
                {messages.activateFirstAdmin}
              </Link>
            ) : (
              messages.noAccount
            )}
          </p>
          <p className="mt-12 border-t pt-5 text-xs leading-5 text-muted-foreground">
            {tenant.hostname} · {messages.secureAccess}
          </p>
        </div>
      </section>
    </main>
  );
}
