"use client";

import { useActionState } from "react";
import { changeTemporaryPassword } from "@/app/change-password/actions";
import type { AccountState } from "@/lib/account-validation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    changeTemporaryPassword,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      {state.status === "error" ? (
        <Alert variant="danger" role="alert">
          {state.message}
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="password">Yeni parola</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
        {state.fieldErrors?.password ? (
          <p className="text-xs text-danger-foreground">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwordConfirmation">Yeni parola tekrar</Label>
        <Input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
        {state.fieldErrors?.passwordConfirmation ? (
          <p className="text-xs text-danger-foreground">
            {state.fieldErrors.passwordConfirmation}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Kaydediliyor..." : "Parolayi kaydet"}
      </Button>
    </form>
  );
}
