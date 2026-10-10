"use client";

import { useActionState } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import {
  createInitialSchoolAdmin,
  resetSchoolAdminPassword,
} from "@/app/platform/schools/actions";
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
  canResetPassword,
}: {
  schoolId: string;
  admins: InitialAdminSummary[];
  canCreate: boolean;
  canResetPassword: boolean;
}) {
  const [createState, createAction, createPending] = useActionState<
    InitialSchoolAdminState,
    FormData
  >(createInitialSchoolAdmin, {});
  const [resetState, resetAction, resetPending] = useActionState<
    InitialSchoolAdminState,
    FormData
  >(resetSchoolAdminPassword, {});

  if (admins.length) {
    return (
      <div className="space-y-4">
        {resetState.message && (
          <Alert
            role={resetState.status === "error" ? "alert" : "status"}
            variant={resetState.status === "success" ? "success" : "danger"}
          >
            {resetState.status === "success" && (
              <CheckCircle2 className="mt-1 size-4 shrink-0" aria-hidden />
            )}
            <AlertDescription className="mt-0 space-y-3">
              <p>{resetState.message}</p>
              {resetState.temporaryPassword && (
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Geçici parola
                  </p>
                  <code className="mt-2 block select-all break-all font-mono text-base font-semibold text-foreground">
                    {resetState.temporaryPassword}
                  </code>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Bu parola tekrar gösterilmez. Okul yöneticisi ilk girişte
                    yeni parola belirleme ekranına yönlendirilir.
                  </p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        <DataTableShell
          title="Okul yöneticisi"
          description="Okul yöneticisi oluşturuldu. Gerekirse Süper Admin bu ekrandan yeni geçici parola üretebilir."
          footer={`${admins.length} Okul Admin üyeliği`}
        >
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Yönetici</TableHead>
                <TableHead scope="col">Kullanıcı adı</TableHead>
                <TableHead scope="col">Durum</TableHead>
                <TableHead scope="col">Son giriş</TableHead>
                <TableHead scope="col" className="text-right">
                  İşlem
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">
                    {[admin.firstName, admin.lastName]
                      .filter(Boolean)
                      .join(" ") || "İsimsiz kullanıcı"}
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
                  <TableCell className="text-right">
                    <form action={resetAction}>
                      <input type="hidden" name="schoolId" value={schoolId} />
                      <input
                        type="hidden"
                        name="membershipId"
                        value={admin.id}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={!canResetPassword || resetPending}
                      >
                        {resetPending ? (
                          <LoaderCircle
                            className="animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <KeyRound aria-hidden />
                        )}
                        Geçici şifre üret
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
        {!canResetPassword && (
          <Alert variant="warning">
            <AlertDescription>
              Okul yöneticisi şifresi sıfırlama yetkiniz yok veya okul şu anda
              düzenlenemiyor.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <form action={createAction} className="space-y-6">
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
            disabled={!canCreate || createPending}
            aria-invalid={Boolean(createState.fieldErrors?.firstName)}
            aria-describedby={
              createState.fieldErrors?.firstName
                ? "firstName-error"
                : undefined
            }
            className="mt-2 h-10"
          />
          <FieldError state={createState} field="firstName" />
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
            disabled={!canCreate || createPending}
            aria-invalid={Boolean(createState.fieldErrors?.lastName)}
            aria-describedby={
              createState.fieldErrors?.lastName ? "lastName-error" : undefined
            }
            className="mt-2 h-10"
          />
          <FieldError state={createState} field="lastName" />
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
          disabled={!canCreate || createPending}
          aria-invalid={Boolean(createState.fieldErrors?.username)}
          aria-describedby={
            createState.fieldErrors?.username
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
        <FieldError state={createState} field="username" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="password">Geçici başlangıç parolası</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            disabled={!canCreate || createPending}
            aria-invalid={Boolean(createState.fieldErrors?.password)}
            aria-describedby={
              createState.fieldErrors?.password
                ? "password-help password-error"
                : "password-help"
            }
            className="mt-2 h-10"
          />
          <p id="password-help" className="mt-2 text-xs text-muted-foreground">
            En az 8 karakter. Parola hiçbir rapor veya audit kaydına yazılmaz.
          </p>
          <FieldError state={createState} field="password" />
        </div>
        <div>
          <Label htmlFor="passwordConfirmation">Parolayı tekrar girin</Label>
          <Input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            disabled={!canCreate || createPending}
            aria-invalid={Boolean(
              createState.fieldErrors?.passwordConfirmation,
            )}
            aria-describedby={
              createState.fieldErrors?.passwordConfirmation
                ? "passwordConfirmation-error"
                : undefined
            }
            className="mt-2 h-10"
          />
          <FieldError state={createState} field="passwordConfirmation" />
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
          <Button type="submit" size="lg" disabled={createPending}>
            {createPending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <ShieldCheck aria-hidden />
            )}
            {createPending ? "Oluşturuluyor…" : "İlk yöneticiyi oluştur"}
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
      {createState.message && (
        <Alert
          role={createState.status === "error" ? "alert" : "status"}
          variant={createState.status === "success" ? "success" : "danger"}
        >
          {createState.status === "success" && (
            <CheckCircle2 className="mt-1 size-4 shrink-0" aria-hidden />
          )}
          <AlertDescription className="mt-0">
            {createState.message}
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
