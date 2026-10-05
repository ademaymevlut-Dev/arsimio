"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createStudent } from "@/app/(school-admin)/students/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type {
  StudentField,
  StudentState,
} from "@/lib/student-validation";
import type { StudentRegistrationContext } from "@/server/students/students";

const initialState: StudentState = {};

function FieldError({
  state,
  field,
  id,
}: {
  state: StudentState;
  field: StudentField;
  id: string;
}) {
  const message = state.fieldErrors?.[field];
  return message ? (
    <p id={id} className="mt-2 text-xs text-danger-foreground">
      {message}
    </p>
  ) : null;
}

export function StudentRegistrationForm({
  context,
  defaultAdmittedOn,
  canManageIdentity,
  identityProtectionReady,
  messages,
}: {
  context: StudentRegistrationContext;
  defaultAdmittedOn: string;
  canManageIdentity: boolean;
  identityProtectionReady: boolean;
  messages: Pick<AppDictionary, "common" | "students" | "studentServer">;
}) {
  const [state, formAction, pending] = useActionState(
    createStudent,
    initialState,
  );
  const text = messages.students;
  const year = context.academicYear!;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="academicYearId" value={year.id} />

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{text.personalInformation}</CardTitle>
          <CardDescription>{text.personalDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="student-first-name">{text.firstName}</Label>
            <Input
              id="student-first-name"
              name="firstName"
              autoComplete="given-name"
              maxLength={100}
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.firstName)}
              aria-describedby={
                state.fieldErrors?.firstName
                  ? "student-first-name-error"
                  : undefined
              }
              className="mt-2"
            />
            <FieldError
              state={state}
              field="firstName"
              id="student-first-name-error"
            />
          </div>
          <div>
            <Label htmlFor="student-middle-name">{text.middleName}</Label>
            <Input
              id="student-middle-name"
              name="middleName"
              autoComplete="additional-name"
              maxLength={100}
              disabled={pending}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="student-last-name">{text.lastName}</Label>
            <Input
              id="student-last-name"
              name="lastName"
              autoComplete="family-name"
              maxLength={100}
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.lastName)}
              aria-describedby={
                state.fieldErrors?.lastName
                  ? "student-last-name-error"
                  : undefined
              }
              className="mt-2"
            />
            <FieldError
              state={state}
              field="lastName"
              id="student-last-name-error"
            />
          </div>
          <div>
            <Label htmlFor="student-birth-date">{text.birthDate}</Label>
            <Input
              id="student-birth-date"
              name="birthDate"
              type="date"
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.birthDate)}
              aria-describedby={
                state.fieldErrors?.birthDate
                  ? "student-birth-date-error"
                  : undefined
              }
              className="mt-2"
            />
            <FieldError
              state={state}
              field="birthDate"
              id="student-birth-date-error"
            />
          </div>
          <div>
            <Label htmlFor="student-birth-place">{text.birthPlace}</Label>
            <Input
              id="student-birth-place"
              name="birthPlace"
              maxLength={150}
              disabled={pending}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="student-nationality">{text.nationality}</Label>
            <Input
              id="student-nationality"
              name="nationality"
              maxLength={100}
              disabled={pending}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="student-sex">{text.sex}</Label>
            <NativeSelect
              id="student-sex"
              name="sex"
              defaultValue=""
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.sex)}
              className="mt-2 h-12"
            >
              <option value="">{text.notSpecified}</option>
              <option value="MALE">{text.male}</option>
              <option value="FEMALE">{text.female}</option>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{text.addressInformation}</CardTitle>
          <CardDescription>{text.addressDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="student-residence-city">{text.residenceCity}</Label>
            <Input
              id="student-residence-city"
              name="residenceCity"
              maxLength={120}
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.residenceCity)}
              className="mt-2"
            />
            <FieldError
              state={state}
              field="residenceCity"
              id="student-residence-city-error"
            />
          </div>
          <div>
            <Label htmlFor="student-neighborhood">{text.neighborhood}</Label>
            <Input
              id="student-neighborhood"
              name="neighborhood"
              maxLength={120}
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.neighborhood)}
              className="mt-2"
            />
            <FieldError
              state={state}
              field="neighborhood"
              id="student-neighborhood-error"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="student-address-line">{text.addressLine}</Label>
            <Textarea
              id="student-address-line"
              name="addressLine"
              maxLength={500}
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.addressLine)}
              className="mt-2"
            />
            <FieldError
              state={state}
              field="addressLine"
              id="student-address-line-error"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{text.administrativeInformation}</CardTitle>
          <CardDescription>{text.specialCondition}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <Checkbox name="hasSpecialCondition" disabled={pending} />
            {text.hasSpecialCondition}
          </label>
          <div>
            <Label htmlFor="student-special-condition-note">
              {text.specialConditionNote}
            </Label>
            <Textarea
              id="student-special-condition-note"
              name="specialConditionNote"
              maxLength={1000}
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.specialConditionNote)}
              className="mt-2"
            />
            <FieldError
              state={state}
              field="specialConditionNote"
              id="student-special-condition-note-error"
            />
          </div>
          <div>
            <Label htmlFor="student-internal-note">{text.internalNote}</Label>
            <Textarea
              id="student-internal-note"
              name="internalNote"
              maxLength={1000}
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.internalNote)}
              className="mt-2"
            />
            <FieldError
              state={state}
              field="internalNote"
              id="student-internal-note-error"
            />
          </div>
        </CardContent>
      </Card>

      {canManageIdentity && !identityProtectionReady && (
        <Alert variant="warning">
          <AlertDescription className="mt-0">
            {messages.studentServer.identityUnavailable}
          </AlertDescription>
        </Alert>
      )}

      {canManageIdentity && identityProtectionReady && <Card>
        <CardHeader className="border-b">
          <CardTitle>{text.identityInformation}</CardTitle>
          <CardDescription>{text.identityHelp}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-[1fr_2fr_1fr]">
          <div>
            <Label htmlFor="student-identity-type">{text.identityType}</Label>
            <NativeSelect
              id="student-identity-type"
              name="identityType"
              defaultValue="NATIONAL_ID"
              disabled={pending}
              className="mt-2 h-12"
            >
              <option value="NATIONAL_ID">{text.nationalId}</option>
              <option value="PASSPORT">{text.passport}</option>
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="student-identity-value">{text.identityValue}</Label>
            <Input
              id="student-identity-value"
              name="identityValue"
              maxLength={40}
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.identityValue)}
              aria-describedby={
                state.fieldErrors?.identityValue
                  ? "student-identity-value-error"
                  : undefined
              }
              className="mt-2"
            />
            <FieldError
              state={state}
              field="identityValue"
              id="student-identity-value-error"
            />
          </div>
          <div>
            <Label htmlFor="student-identity-country">
              {text.identityCountry}
            </Label>
            <Input
              id="student-identity-country"
              name="identityCountry"
              maxLength={2}
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.identityCountry)}
              aria-describedby={
                state.fieldErrors?.identityCountry
                  ? "student-identity-country-error"
                  : undefined
              }
              className="mt-2 uppercase"
            />
            <FieldError
              state={state}
              field="identityCountry"
              id="student-identity-country-error"
            />
          </div>
        </CardContent>
      </Card>}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{text.enrollmentInformation}</CardTitle>
          <CardDescription>{text.enrollmentDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <div>
            <Label htmlFor="student-year">{text.academicYear}</Label>
            <Input
              id="student-year"
              value={year.name}
              readOnly
              disabled
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="student-class-section">{text.classSection}</Label>
            <NativeSelect
              id="student-class-section"
              name="classSectionId"
              defaultValue=""
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.classSectionId)}
              aria-describedby={
                state.fieldErrors?.classSectionId
                  ? "student-class-section-error"
                  : undefined
              }
              className="mt-2 h-12"
            >
              <option value="" disabled>
                {text.noClassSection}
              </option>
              {context.classSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError
              state={state}
              field="classSectionId"
              id="student-class-section-error"
            />
          </div>
          <div>
            <Label htmlFor="student-admitted-on">{text.admittedOn}</Label>
            <Input
              id="student-admitted-on"
              name="admittedOn"
              type="date"
              min={year.startDate}
              max={year.endDate}
              defaultValue={defaultAdmittedOn}
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.admittedOn)}
              aria-describedby={
                state.fieldErrors?.admittedOn
                  ? "student-admitted-on-error"
                  : undefined
              }
              className="mt-2"
            />
            <FieldError
              state={state}
              field="admittedOn"
              id="student-admitted-on-error"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/students">{messages.common.cancel}</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? messages.common.saving : text.createStudent}
          </Button>
        </CardFooter>
      </Card>

      {state.status === "error" && state.message && (
        <Alert role="alert" variant="danger">
          <AlertDescription className="mt-0">{state.message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
