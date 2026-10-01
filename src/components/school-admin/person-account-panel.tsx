"use client";

import { useActionState } from "react";
import {
  createPersonAccountAction,
  resetPersonAccountPasswordAction,
  suspendPersonAccountAction,
} from "@/app/(school-admin)/accounts/actions";
import type { AccountState } from "@/lib/account-validation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ExistingAccount = {
  id: string;
  username: string | null;
  status: string;
  mustChangePassword: boolean;
  suspendedAt: string | null;
} | null;

export function PersonAccountPanel({
  title,
  portal,
  personId,
  studentProfileId,
  existingAccount,
  canManage,
}: {
  title: string;
  portal: "SCHOOL_ADMIN" | "STUDENT" | "GUARDIAN" | "TEACHER";
  personId: string;
  studentProfileId?: string;
  existingAccount: ExistingAccount;
  canManage: boolean;
}) {
  const [createState, createAction, createPending] = useActionState<
    AccountState,
    FormData
  >(createPersonAccountAction, {});
  const [resetState, resetAction, resetPending] = useActionState<
    AccountState,
    FormData
  >(resetPersonAccountPasswordAction, {});
  const [suspendState, suspendAction, suspendPending] = useActionState<
    AccountState,
    FormData
  >(suspendPersonAccountAction, {});
  const activeState =
    createState.status || createState.temporaryPassword
      ? createState
      : resetState.status || resetState.temporaryPassword
        ? resetState
        : suspendState;

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          {existingAccount ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Kullanici adi: {existingAccount.username ?? "Tanimli degil"}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Bu kisi icin henuz giris hesabi yok.
            </p>
          )}
        </div>
        {existingAccount ? (
          <Badge variant={existingAccount.suspendedAt ? "danger" : "success"}>
            {existingAccount.suspendedAt ? "Askida" : existingAccount.status}
          </Badge>
        ) : null}
      </div>

      {activeState.status ? (
        <Alert
          className="mt-4"
          variant={activeState.status === "error" ? "danger" : "success"}
          role={activeState.status === "error" ? "alert" : "status"}
        >
          <div className="space-y-2">
            <p>{activeState.message}</p>
            {activeState.temporaryPassword ? (
              <p className="font-mono text-sm">
                Gecici parola: {activeState.temporaryPassword}
              </p>
            ) : null}
          </div>
        </Alert>
      ) : null}

      {!canManage ? null : existingAccount ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={resetAction}>
            <input
              type="hidden"
              name="personAccountId"
              value={existingAccount.id}
            />
            <Button type="submit" variant="outline" disabled={resetPending}>
              Parolayi sifirla
            </Button>
          </form>
          {!existingAccount.suspendedAt ? (
            <form action={suspendAction}>
              <input
                type="hidden"
                name="personAccountId"
                value={existingAccount.id}
              />
              <Button type="submit" variant="outline" disabled={suspendPending}>
                Askıya al
              </Button>
            </form>
          ) : null}
          {existingAccount.mustChangePassword ? (
            <Badge variant="warning">Ilk giriste parola degisecek</Badge>
          ) : null}
        </div>
      ) : portal === "SCHOOL_ADMIN" ? null : (
        <form action={createAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="portal" value={portal} />
          {studentProfileId ? (
            <input
              type="hidden"
              name="studentProfileId"
              value={studentProfileId}
            />
          ) : null}
          <div className="space-y-2">
            <Label htmlFor={`${portal}-${personId}-username`}>
              Kullanici adi
            </Label>
            <Input
              id={`${portal}-${personId}-username`}
              name="username"
              placeholder="ornek.kullanici"
              required
            />
            {createState.fieldErrors?.username ? (
              <p className="text-xs text-danger-foreground">
                {createState.fieldErrors.username}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="self-end" disabled={createPending}>
            Hesap olustur
          </Button>
        </form>
      )}
    </div>
  );
}
