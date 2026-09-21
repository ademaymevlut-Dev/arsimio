"use client";

import { useActionState, useState } from "react";
import {
  CheckCircle2,
  GraduationCap,
  LoaderCircle,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  saveSchoolBranding,
  saveSchoolProfile,
} from "@/app/platform/schools/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DEFAULT_BRANDING,
  normalizeColor,
  readableForeground,
  resolveBranding,
  type BrandColors,
} from "@/lib/school-branding";
import type { SettingsState } from "@/lib/platform-school-validation";

function Feedback({ state }: { state: SettingsState }) {
  if (!state.message) return null;
  return (
    <Alert
      role={state.status === "error" ? "alert" : "status"}
      variant={state.status === "error" ? "danger" : "success"}
    >
      {state.status === "success" && (
        <CheckCircle2 className="mt-1 size-4 shrink-0" aria-hidden />
      )}
      <AlertDescription className="mt-0">{state.message}</AlertDescription>
    </Alert>
  );
}

export function SchoolProfileForm({
  id,
  name,
  legalName,
  revision,
  editable,
}: {
  id: string;
  name: string;
  legalName: string | null;
  revision: string;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(saveSchoolProfile, {});
  const [profile, setProfile] = useState({ name, legalName: legalName ?? "" });
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="schoolId" value={id} />
      <input type="hidden" name="revision" value={state.revision ?? revision} />
      <fieldset
        disabled={!editable || pending}
        className="space-y-5 disabled:opacity-60"
      >
        <div>
          <label
            htmlFor="school-name"
            className="mb-2 block text-sm font-medium"
          >
            Okul adı
          </label>
          <Input
            id="school-name"
            name="name"
            value={profile.name}
            onChange={(event) =>
              setProfile({ ...profile, name: event.target.value })
            }
            required
            minLength={2}
            maxLength={200}
            className="h-10"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Giriş ekranında ve okul listesinde görünür.
          </p>
        </div>
        <div>
          <label
            htmlFor="legal-name"
            className="mb-2 block text-sm font-medium"
          >
            Resmî kurum adı{" "}
            <span className="font-normal text-muted-foreground">
              (isteğe bağlı)
            </span>
          </label>
          <Input
            id="legal-name"
            name="legalName"
            value={profile.legalName}
            onChange={(event) =>
              setProfile({ ...profile, legalName: event.target.value })
            }
            maxLength={240}
            className="h-10"
            placeholder="Kurumun resmî unvanı"
          />
        </div>
        {editable && (
          <Button type="submit" size="lg">
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Save aria-hidden />
            )}
            {pending ? "Kaydediliyor…" : "Bilgileri kaydet"}
          </Button>
        )}
      </fieldset>
      {!editable && (
        <p className="text-xs text-muted-foreground">
          Bu kayıt için düzenleme yetkiniz yok veya okul arşivlenmiş.
        </p>
      )}
      <Feedback state={state} />
    </form>
  );
}

const colorFields: {
  key: keyof BrandColors;
  title: string;
  description: string;
}[] = [
  {
    key: "primaryColor",
    title: "Ana renk",
    description: "Giriş butonu ve temel vurgular",
  },
  {
    key: "secondaryColor",
    title: "İkincil renk",
    description: "Logo alanı ve yardımcı marka detayları; sayfa zemini değil",
  },
  {
    key: "accentColor",
    title: "Vurgu rengi",
    description: "Dekoratif çizgi ve küçük detaylar",
  },
];

export function SchoolBrandingForm({
  id,
  name,
  initialColors,
  revision,
  editable,
}: {
  id: string;
  name: string;
  initialColors: BrandColors;
  revision: string;
  editable: boolean;
}) {
  const [colors, setColors] = useState(initialColors);
  const [state, action, pending] = useActionState(saveSchoolBranding, {});
  const preview = resolveBranding(colors);
  const valid = Object.values(colors).every((color) => normalizeColor(color));
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="schoolId" value={id} />
      <input type="hidden" name="revision" value={state.revision ?? revision} />
      <div className="grid gap-7 xl:grid-cols-[1fr_1.1fr]">
        <fieldset
          disabled={!editable || pending}
          className="space-y-5 disabled:opacity-60"
        >
          {colorFields.map(({ key, title, description }) => (
            <div key={key}>
              <label htmlFor={key} className="mb-2 block text-sm font-medium">
                {title}
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  aria-label={`${title} seç`}
                  value={preview[key]}
                  onChange={(event) =>
                    setColors({ ...colors, [key]: event.target.value })
                  }
                  className="size-10 shrink-0 cursor-pointer rounded-lg border bg-background p-1 disabled:cursor-default"
                />
                <Input
                  id={key}
                  name={key}
                  value={colors[key]}
                  onChange={(event) =>
                    setColors({ ...colors, [key]: event.target.value })
                  }
                  pattern="#[0-9a-fA-F]{6}"
                  maxLength={7}
                  required
                  className="h-10 font-mono text-sm"
                  aria-describedby={`${key}-help`}
                />
              </div>
              <p
                id={`${key}-help`}
                className="mt-2 text-xs text-muted-foreground"
              >
                {description}
              </p>
            </div>
          ))}
          <div className="rounded-lg border bg-muted p-3">
            <p className="text-sm font-medium">Arka plan · ortak</p>
            <p className="mt-2 flex items-center gap-2 text-xs">
              <span
                className="size-5 rounded border bg-background"
                aria-hidden
              />
              <code>#EDF2F9</code>
            </p>
            <p className="mt-2 text-xs leading-5">
              Bu aşamada sayfa zemini globals.css üzerinden yönetilir; okul
              bazında değiştirilmez. Kartlar ve uyarı renkleri de ortaktır.
            </p>
          </div>
        </fieldset>
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium">Giriş ekranı önizlemesi</p>
            <span className="text-[10px] text-muted-foreground">
              Kaydetmeden önce
            </span>
          </div>
          <div
            className="overflow-hidden rounded-xl border"
            aria-label="Okul giriş ekranı renk önizlemesi"
          >
            <div className="flex items-center gap-1.5 border-b bg-muted px-3 py-2">
              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
            </div>
            <div className="grid grid-cols-2">
              <div className="flex min-h-64 flex-col justify-between bg-background p-4">
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: preview.secondaryColor,
                      color: readableForeground(preview.secondaryColor),
                    }}
                  >
                    <GraduationCap className="size-5" aria-hidden />
                  </span>
                  <span className="break-all">{name}</span>
                </p>
                <div>
                  <p className="text-lg leading-tight font-semibold">
                    Okulunuzla
                    <br />
                    bağlantıda kalın.
                  </p>
                  <div
                    className="mt-4 h-1 w-9 rounded-full"
                    style={{ backgroundColor: preview.accentColor }}
                  />
                </div>
                <p className="text-[9px]">
                  Arsimio · Eğitim yönetimi
                </p>
              </div>
              <div className="flex flex-col justify-center bg-card p-4 text-card-foreground">
                <p className="text-sm font-semibold">Tekrar hoş geldiniz</p>
                <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                  Okul hesabınızla devam edin.
                </p>
                <div className="mt-5 rounded border border-input px-2 py-2 text-[9px] text-muted-foreground">
                  Kullanıcı adı
                </div>
                <div className="mt-2 rounded border border-input px-2 py-2 text-[9px] text-muted-foreground">
                  ••••••••
                </div>
                <div
                  className="mt-3 rounded py-2 text-center text-[10px] font-medium"
                  style={{
                    backgroundColor: preview.primaryColor,
                    color: readableForeground(preview.primaryColor),
                  }}
                >
                  Giriş yap
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Marka renkleri yalnızca bu okulun giriş ekranına uygulanır. Açık
            zemin, beyaz kartlar ve uyarı renkleri tüm okullarda ortaktır.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        {editable ? (
          <>
            <Button type="submit" size="lg" disabled={pending || !valid}>
              {pending ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Save aria-hidden />
              )}
              {pending ? "Kaydediliyor…" : "Renkleri kaydet"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setColors({ ...DEFAULT_BRANDING })}
            >
              Varsayılan paleti önizle
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setColors(initialColors)}
            >
              <RotateCcw aria-hidden />
              Kayıtlı renklere dön
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Bu kayıt için marka düzenleme yetkiniz yok veya okul arşivlenmiş.
          </p>
        )}
      </div>
      <Feedback state={state} />
    </form>
  );
}
