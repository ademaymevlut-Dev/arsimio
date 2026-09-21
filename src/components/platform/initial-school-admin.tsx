"use client";

import { useActionState } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { createInitialSchoolAdmin } from "@/app/platform/schools/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableShell } from "@/components/admin/data-table-shell";
import type {
  InitialSchoolAdminField,
  InitialSchoolAdminState,
} from "@/lib/initial-school-admin-validation";

export type InitialAdminSummary = {
  id: string;
  username: string | null;
  membershipStatus: string;
  userStatus: string;
  firstName: string | null;
  lastName: string | null;
  joinedAt: string | null;
  lastLoginAt: string | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function FieldError({
  state,
  field,
}: {
  state: InitialSchoolAdminState;
  field: InitialSchoolAdminField;
}) {
  const error = state.fieldErrors?.[field];
  if (!error) return null;
  return (
    <p id={`${field}-error`} className="mt-2 text-xs text-danger-foreground">
      {error}
    </p>
  );
}

function AdminStatus({
  membershipStatus,
  userStatus,
}: Pick<InitialAdminSummary, "membershipStatus" | "userStatus">) {
  const active = membershipStatus === "ACTIVE" && userStatus === "ACTIVE";
  return (
    <Badge variant={active ? "success" : "warning"}>
      {active ? "Aktif" : "Erişim kısıtlı"}
    </Badge>
  );
}

export function InitialSchoolAdmin({
  schoolId,
  admins,
  canCreate,
}: {
  schoolId: string;
  admins: InitialAdminSummary[];
  canCreate: boolean;
}) {
  const [state, action, pending] = useActionState<
    InitialSchoolAdminState,
    FormData
  >(createInitialSchoolAdmin, {});

  if (admins.length) {
    return (
      <DataTableShell
        title="Okul yöneticisi"
        description="İlk yönetici oluşturuldu. Bundan sonraki kullanıcılar okulun kendi yönetim alanından tanımlanacak."
        footer={`${admins.length} Okul Admin üyeliği`}
      >
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Yönetici</TableHead>
              <TableHead scope="col">Kullanıcı adı</TableHead>
              <TableHead scope="col">Durum</TableHead>
              <TableHead scope="col">Son giriş</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">
                  {[admin.firstName, admin.lastName].filter(Boolean).join(" ") ||
                    "İsimsiz kullanıcı"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {admin.username ?? "Tanımlanmamış"}
                </TableCell>
                <TableCell>
                  <AdminStatus
                    membershipStatus={admin.membershipStatus}
                    userStatus={admin.userStatus}
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {admin.lastLoginAt
                    ? dateTimeFormatter.format(new Date(admin.lastLoginAt))
                    : "Henüz giriş yapmadı"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="schoolId" value={schoolId} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">Ad</Label>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            minLength={2}
            maxLength={100}
            required
            disabled={!canCreate || pending}
            aria-invalid={Boolean(state.fieldErrors?.firstName)}
            aria-describedby={
              state.fieldErrors?.firstName ? "firstName-error" : undefined
            }
            className="mt-2 h-10"
          />
          <FieldError state={state} field="firstName" />
        </div>
        <div>
          <Label htmlFor="lastName">Soyad</Label>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            minLength={2}
            maxLength={100}
            required
            disabled={!canCreate || pending}
            aria-invalid={Boolean(state.fieldErrors?.lastName)}
            aria-describedby={
              state.fieldErrors?.lastName ? "lastName-error" : undefined
            }
            className="mt-2 h-10"
          />
          <FieldError state={state} field="lastName" />
        </div>
      </div>
      <div>
        <Label htmlFor="username">Okul kullanıcı adı</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          minLength={3}
          maxLength={64}
          pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}"
          required
          disabled={!canCreate || pending}
          aria-invalid={Boolean(state.fieldErrors?.username)}
          aria-describedby={
            state.fieldErrors?.username
              ? "username-help username-error"
              : "username-help"
          }
          className="mt-2 h-10 font-mono"
          placeholder="okul.admin"
        />
        <p id="username-help" className="mt-2 text-xs text-muted-foreground">
          Bu kullanıcı adı yalnız bu okulun domaininde çalışır ve küçük harfe
          çevrilir.
        </p>
        <FieldError state={state} field="username" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="password">Geçici başlangıç parolası</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            disabled={!canCreate || pending}
            aria-invalid={Boolean(state.fieldErrors?.password)}
            aria-describedby={
              state.fieldErrors?.password
                ? "password-help password-error"
                : "password-help"
            }
            className="mt-2 h-10"
          />
          <p id="password-help" className="mt-2 text-xs text-muted-foreground">
            En az 12 karakter. Parola hiçbir rapor veya audit kaydına yazılmaz.
          </p>
          <FieldError state={state} field="password" />
        </div>
        <div>
          <Label htmlFor="passwordConfirmation">Parolayı tekrar girin</Label>
          <Input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            disabled={!canCreate || pending}
            aria-invalid={Boolean(
              state.fieldErrors?.passwordConfirmation,
            )}
            aria-describedby={
              state.fieldErrors?.passwordConfirmation
                ? "passwordConfirmation-error"
                : undefined
            }
            className="mt-2 h-10"
          />
          <FieldError state={state} field="passwordConfirmation" />
        </div>
      </div>
      <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex max-w-xl items-start gap-2 text-xs leading-5 text-muted-foreground">
          <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
          Bu başlangıç akışı yalnız ilk Okul Admin hesabını oluşturur. Yeni
          personel, öğretmen ve diğer kullanıcılar daha sonra okul yöneticisi
          tarafından açılır.
        </p>
        {canCreate && (
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <ShieldCheck aria-hidden />
            )}
            {pending ? "Oluşturuluyor…" : "İlk yöneticiyi oluştur"}
          </Button>
        )}
      </div>
      {!canCreate && (
        <Alert variant="warning">
          <AlertDescription>
            Bu okulda ilk yönetici oluşturma yetkiniz yok veya okul şu anda
            düzenlenemiyor.
          </AlertDescription>
        </Alert>
      )}
      {state.message && (
        <Alert
          role={state.status === "error" ? "alert" : "status"}
          variant={state.status === "success" ? "success" : "danger"}
        >
          {state.status === "success" && (
            <CheckCircle2 className="mt-1 size-4 shrink-0" aria-hidden />
          )}
          <AlertDescription className="mt-0">{state.message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
