"use client";

import { useActionState, useState } from "react";
import { createEmploymentAction } from "@/app/(school-admin)/staff/actions";
import type { StaffState } from "@/lib/staff-validation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type Option = { id: string; name: string; code?: string; hint?: string };
type PersonOption = { id: string; fullName: string; hint?: string };

export function StaffRegistrationForm({
  departments,
  positions,
  people,
  defaultHiredOn,
}: {
  departments: Option[];
  positions: Option[];
  people: PersonOption[];
  defaultHiredOn: string;
}) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [state, action, pending] = useActionState<StaffState, FormData>(
    createEmploymentAction,
    {},
  );

  return (
    <form action={action} className="space-y-6 rounded-xl border bg-card p-5">
      <div className="space-y-2">
        <Label>Kayit yontemi</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["new", "Yeni kisi + personel"],
            ["existing", "Mevcut kisiyi personel yap"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="mode"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value as "new" | "existing")}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {mode === "existing" ? (
        <div className="space-y-2">
          <Label htmlFor="personId">Mevcut kisi</Label>
          <NativeSelect id="personId" name="personId" required>
            <option value="">Kisi secin</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.fullName}
                {person.hint ? ` — ${person.hint}` : ""}
              </option>
            ))}
          </NativeSelect>
          {state.fieldErrors?.personId ? (
            <p className="text-xs text-danger-foreground">
              {state.fieldErrors.personId}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Ad</Label>
            <Input id="firstName" name="firstName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Soyad</Label>
            <Input id="lastName" name="lastName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="middleName">Ikinci ad</Label>
            <Input id="middleName" name="middleName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" name="email" type="email" />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hiredOn">Ise giris tarihi</Label>
          <Input
            id="hiredOn"
            name="hiredOn"
            type="date"
            defaultValue={defaultHiredOn}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="employmentType">Calisma turu</Label>
          <NativeSelect id="employmentType" name="employmentType" required>
            <option value="FULL_TIME">Tam zamanli</option>
            <option value="PART_TIME">Yari zamanli</option>
            <option value="FIXED_TERM">Sureli sozlesme</option>
            <option value="CONTRACTOR">Sozlesmeli hizmet</option>
            <option value="INTERN">Stajyer</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="departmentId">Departman</Label>
          <NativeSelect id="departmentId" name="departmentId" required>
            <option value="">Departman secin</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="positionId">Pozisyon</Label>
          <NativeSelect id="positionId" name="positionId" required>
            <option value="">Pozisyon secin</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="note">Not</Label>
          <Textarea id="note" name="note" rows={3} />
        </div>
      </div>

      {state.status ? (
        <Alert variant={state.status === "error" ? "danger" : "success"}>
          {state.message}
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        Personel kaydini olustur
      </Button>
    </form>
  );
}
