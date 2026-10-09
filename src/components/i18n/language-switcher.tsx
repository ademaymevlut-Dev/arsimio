"use client";

import { useId } from "react";
import { Languages } from "lucide-react";
import { changeLocale } from "@/app/locale/actions";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  locale,
  messages,
  compact = false,
  instant = false,
}: {
  locale: Locale;
  messages: AppDictionary["language"];
  compact?: boolean;
  instant?: boolean;
}) {
  const id = useId();

  if (instant) {
    return (
      <form
        action={changeLocale}
        aria-label={messages.label}
        className="inline-flex items-center gap-1.5"
      >
        <Languages className="size-3.5 text-muted-foreground" aria-hidden />
        <div className="inline-flex items-center rounded-full bg-muted/80 p-0.5">
          {SUPPORTED_LOCALES.map((code) => {
            const selected = code === locale;

            return (
              <button
                key={code}
                type="submit"
                name="locale"
                value={code}
                title={messages.names[code]}
                aria-label={messages.names[code]}
                aria-pressed={selected}
                className={cn(
                  "min-w-8 rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide uppercase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                {code}
              </button>
            );
          })}
        </div>
      </form>
    );
  }

  return (
    <form action={changeLocale} className="flex items-center gap-2">
      <Languages className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
      <label className="sr-only" htmlFor={id}>
        {messages.label}
      </label>
      <NativeSelect
        key={locale}
        id={id}
        name="locale"
        defaultValue={locale}
        className={compact ? "h-8 w-[92px]" : "w-[120px]"}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {messages.names[code]}
          </option>
        ))}
      </NativeSelect>
      <Button type="submit" variant="outline" size={compact ? "sm" : "default"}>
        {messages.apply}
      </Button>
    </form>
  );
}
