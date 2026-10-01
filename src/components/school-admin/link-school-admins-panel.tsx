"use client";

import { useActionState } from "react";
import { linkExistingSchoolAdminsAction } from "@/app/(school-admin)/accounts/actions";
import type { AccountState } from "@/lib/account-validation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function LinkSchoolAdminsPanel() {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    linkExistingSchoolAdminsAction,
    {},
  );
  return (
    <form action={action} className="space-y-3 rounded-lg border bg-background p-4">
      <div>
        <h2 className="font-medium">Mevcut Okul Admin hesaplari</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kisi baglantisi olmayan eski admin hesaplari icin PersonAccount olusturur.
          Ayni isimde kisi varsa otomatik eslestirmez.
        </p>
      </div>
      {state.status ? (
        <Alert variant={state.status === "error" ? "danger" : "success"}>
          {state.message}
        </Alert>
      ) : null}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Kontrol ediliyor..." : "Eski adminleri bagla"}
      </Button>
    </form>
  );
}
