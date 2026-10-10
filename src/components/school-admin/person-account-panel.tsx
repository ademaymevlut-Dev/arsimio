"use client";

import { useActionState, useEffect, useState } from "react";
import { KeyRound, Plus, ShieldX } from "lucide-react";
import { toast } from "sonner";
import {
  createPersonAccountAction,
  resetPersonAccountPasswordAction,
  suspendPersonAccountAction,
} from "@/app/(school-admin)/accounts/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountState } from "@/lib/account-validation";

type ExistingAccount = {
  id: string;
  username: string | null;
  status: string;
  mustChangePassword: boolean;
  suspendedAt: string | null;
} | null;

const initialAccountState: AccountState = {};

function AccountActionAlert({ state }: { state: AccountState }) {
  if (!state.status || !state.message) return null;

  return (
    <Alert
      variant={state.status === "error" ? "danger" : "success"}
      role={state.status === "error" ? "alert" : "status"}
    >
      <div className="space-y-2">
        <p>{state.message}</p>
        {state.temporaryPassword ? (
          <p className="rounded-md bg-background px-3 py-2 font-mono text-sm">
            Geçici parola: {state.temporaryPassword}
          </p>
        ) : null}
      </div>
    </Alert>
  );
}

function CreateAccountDialogContent({
  portal,
  personId,
  studentProfileId,
  onOpenChange,
}: {
  portal: "SCHOOL_ADMIN" | "STUDENT" | "GUARDIAN" | "TEACHER";
  personId: string;
  studentProfileId?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    createPersonAccountAction,
    initialAccountState,
  );

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state.message, state.status]);

  return (
    <DialogContent className="max-w-md p-5">
      <DialogHeader>
        <DialogTitle>Hesap oluştur</DialogTitle>
        <DialogDescription>
          Kullanıcı adını belirleyin. Geçici parola işlem sonunda gösterilir.
        </DialogDescription>
      </DialogHeader>
      <form action={action} className="space-y-4">
        <input type="hidden" name="personId" value={personId} />
        <input type="hidden" name="portal" value={portal} />
        {studentProfileId ? (
          <input
            type="hidden"
            name="studentProfileId"
            value={studentProfileId}
          />
        ) : null}
        {state.status !== "success" ? (
          <div>
            <Label htmlFor={`${portal}-${personId}-username`}>Kullanıcı adı</Label>
            <Input
              id={`${portal}-${personId}-username`}
              name="username"
              placeholder="ornek.kullanici"
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.username)}
              className="mt-2"
            />
            {state.fieldErrors?.username ? (
              <p className="mt-2 text-xs text-danger-foreground">
                {state.fieldErrors.username}
              </p>
            ) : null}
          </div>
        ) : null}
        <AccountActionAlert state={state} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {state.status === "success" ? "Kapat" : "İptal"}
          </Button>
          {state.status !== "success" ? (
            <Button type="submit" disabled={pending}>
              {pending ? "Kaydediliyor..." : "Hesap oluştur"}
            </Button>
          ) : null}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ResetPasswordDialogContent({
  accountId,
  personId,
  onOpenChange,
}: {
  accountId: string;
  personId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    resetPersonAccountPasswordAction,
    initialAccountState,
  );

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state.message, state.status]);

  return (
    <DialogContent className="max-w-md p-5">
      <DialogHeader>
        <DialogTitle>Parolayı sıfırla</DialogTitle>
        <DialogDescription>
          Yeni geçici parola yalnızca bu işlem tamamlandığında gösterilir.
        </DialogDescription>
      </DialogHeader>
      <form action={action} className="space-y-4">
        <input type="hidden" name="personAccountId" value={accountId} />
        <input type="hidden" name="personId" value={personId} />
        <AccountActionAlert state={state} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {state.status === "success" ? "Kapat" : "İptal"}
          </Button>
          {state.status !== "success" ? (
            <Button type="submit" disabled={pending}>
              {pending ? "İşleniyor..." : "Parolayı sıfırla"}
            </Button>
          ) : null}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function SuspendAccountDialogContent({
  accountId,
  personId,
  onOpenChange,
}: {
  accountId: string;
  personId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    suspendPersonAccountAction,
    initialAccountState,
  );

  useEffect(() => {
    if (state.status !== "success" || !state.message) return;
    toast.success(state.message);
    onOpenChange(false);
  }, [onOpenChange, state.message, state.status]);

  return (
    <DialogContent className="max-w-md p-5">
      <DialogHeader>
        <DialogTitle>Hesabı askıya al</DialogTitle>
        <DialogDescription>
          Kullanıcı bu işlemden sonra hesabıyla giriş yapamaz.
        </DialogDescription>
      </DialogHeader>
      <form action={action} className="space-y-4">
        <input type="hidden" name="personAccountId" value={accountId} />
        <input type="hidden" name="personId" value={personId} />
        <AccountActionAlert state={state} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            İptal
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "İşleniyor..." : "Hesabı askıya al"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

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
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  return (
    <div className="rounded-lg bg-muted/35 p-3">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {existingAccount
              ? `Kullanıcı adı: ${existingAccount.username ?? "Tanımlı değil"}`
              : "Bu kişi için henüz giriş hesabı yok."}
          </p>
        </div>
        {existingAccount ? (
          <Badge variant={existingAccount.suspendedAt ? "danger" : "success"}>
            {existingAccount.suspendedAt ? "Askıda" : existingAccount.status}
          </Badge>
        ) : null}
      </div>

      {!canManage ? null : (
        <>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            {!existingAccount && portal !== "SCHOOL_ADMIN" ? (
              <DialogTrigger asChild>
                <Button type="button" size="sm" className="mt-3">
                  <Plus aria-hidden />
                  Hesap oluştur
                </Button>
              </DialogTrigger>
            ) : null}
            {createOpen ? (
              <CreateAccountDialogContent
                portal={portal}
                personId={personId}
                studentProfileId={studentProfileId}
                onOpenChange={setCreateOpen}
              />
            ) : null}
          </Dialog>

          {existingAccount ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                <DialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    <KeyRound aria-hidden />
                    Parolayı sıfırla
                  </Button>
                </DialogTrigger>
                {resetOpen ? (
                  <ResetPasswordDialogContent
                    accountId={existingAccount.id}
                    personId={personId}
                    onOpenChange={setResetOpen}
                  />
                ) : null}
              </Dialog>
              <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
                {!existingAccount.suspendedAt ? (
                  <DialogTrigger asChild>
                    <Button type="button" size="sm" variant="outline">
                      <ShieldX aria-hidden />
                      Askıya al
                    </Button>
                  </DialogTrigger>
                ) : null}
                {suspendOpen ? (
                  <SuspendAccountDialogContent
                    accountId={existingAccount.id}
                    personId={personId}
                    onOpenChange={setSuspendOpen}
                  />
                ) : null}
              </Dialog>
              {existingAccount.mustChangePassword ? (
                <Badge variant="warning">İlk girişte parola değişecek</Badge>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
