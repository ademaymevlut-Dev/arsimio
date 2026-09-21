"use client";

import { useId } from "react";
import { Languages } from "lucide-react";
import { changeLocale } from "@/app/locale/actions";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";

export function LanguageSwitcher({
  locale,
  messages,
  compact = false,
}: {
  locale: Locale;
  messages: AppDictionary["language"];
  compact?: boolean;
}) {
  const id = useId();
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
