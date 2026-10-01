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
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { formatMessage } from "@/i18n/format";

type Option = { id: string; name: string; code?: string; hint?: string };
type PersonOption = {
  id: string;
  fullName: string;
  studentNumber: string | null;
  isGuardian: boolean;
};
type StaffMessages = AppDictionary["staff"];

export function StaffRegistrationForm({
  departments,
  positions,
  people,
  defaultHiredOn,
  messages,
}: {
  departments: Option[];
  positions: Option[];
  people: PersonOption[];
  defaultHiredOn: string;
  messages: StaffMessages;
}) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [state, action, pending] = useActionState<StaffState, FormData>(
    createEmploymentAction,
    {},
  );
  function personHint(person: PersonOption) {
    return [
      person.studentNumber
        ? formatMessage(messages.studentHint, { number: person.studentNumber })
        : null,
      person.isGuardian ? messages.guardianHint : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <form action={action} className="space-y-6 rounded-xl border bg-card p-5">
      <div className="space-y-2">
        <Label>{messages.registrationMethod}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["new", messages.createNewPersonEmployment],
            ["existing", messages.linkExistingPerson],
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
          <Label htmlFor="personId">{messages.existingPerson}</Label>
          <NativeSelect id="personId" name="personId" required>
            <option value="">{messages.selectPerson}</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.fullName}
                {personHint(person) ? ` — ${personHint(person)}` : ""}
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
            <Label htmlFor="firstName">{messages.firstName}</Label>
            <Input id="firstName" name="firstName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{messages.lastName}</Label>
            <Input id="lastName" name="lastName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="middleName">{messages.middleName}</Label>
            <Input id="middleName" name="middleName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{messages.phone}</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">{messages.email}</Label>
            <Input id="email" name="email" type="email" />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hiredOn">{messages.hiredOn}</Label>
          <Input
            id="hiredOn"
            name="hiredOn"
            type="date"
            defaultValue={defaultHiredOn}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="employmentType">{messages.employmentType}</Label>
          <NativeSelect id="employmentType" name="employmentType" required>
            <option value="FULL_TIME">{messages.fullTime}</option>
            <option value="PART_TIME">{messages.partTime}</option>
            <option value="FIXED_TERM">{messages.fixedTerm}</option>
            <option value="CONTRACTOR">{messages.contractor}</option>
            <option value="INTERN">{messages.intern}</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="departmentId">{messages.department}</Label>
          <NativeSelect id="departmentId" name="departmentId" required>
            <option value="">{messages.selectDepartment}</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="positionId">{messages.position}</Label>
          <NativeSelect id="positionId" name="positionId" required>
            <option value="">{messages.selectPosition}</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="note">{messages.note}</Label>
          <Textarea id="note" name="note" rows={3} />
        </div>
      </div>

      {state.status ? (
        <Alert variant={state.status === "error" ? "danger" : "success"}>
          {state.message}
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        {messages.createStaff}
      </Button>
    </form>
  );
}
