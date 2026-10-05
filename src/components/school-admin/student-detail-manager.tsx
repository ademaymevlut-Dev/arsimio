"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useState, type ReactNode } from "react";
import { ArrowLeft, Plus, UserCheck } from "lucide-react";
import {
  addPreviousEducation,
  addGuardian,
  archivePreviousEducation,
  changeStudentStatus,
  setFinancialGuardian,
  setPrimaryGuardian,
  updateStudentDetails,
  uploadStudentPhoto,
} from "@/app/(school-admin)/students/actions";
import { PageHeader } from "@/components/admin/page-header";
import { PersonAccountPanel } from "@/components/school-admin/person-account-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatMessage } from "@/i18n/format";
import { HTML_LOCALES, type Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type {
  StudentField,
  StudentState,
} from "@/lib/student-validation";
import type {
  GuardianCandidate,
  StudentDetailRecord,
} from "@/server/students/students";

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

function ActionAlert({ state }: { state: StudentState }) {
  if (!state.status || !state.message) return null;
  return (
    <Alert
      role={state.status === "error" ? "alert" : "status"}
      variant={state.status === "error" ? "danger" : "success"}
    >
      <AlertDescription className="mt-0">{state.message}</AlertDescription>
    </Alert>
  );
}

function Definition({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{children || "—"}</dd>
    </div>
  );
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(HTML_LOCALES[locale], {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function PrimaryGuardianButton({
  studentId,
  relationshipId,
  messages,
}: {
  studentId: string;
  relationshipId: string;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const [state, formAction, pending] = useActionState(
    setPrimaryGuardian,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="studentProfileId" value={studentId} />
      <input type="hidden" name="relationshipId" value={relationshipId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <UserCheck aria-hidden />
        {pending ? messages.common.processing : messages.students.makePrimary}
      </Button>
      {state.status === "error" && state.message && (
        <p role="alert" className="max-w-48 text-xs text-danger-foreground">
          {state.message}
        </p>
      )}
    </form>
  );
}

function FinancialGuardianButton({
  studentId,
  relationshipId,
  messages,
}: {
  studentId: string;
  relationshipId: string;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const [state, formAction, pending] = useActionState(
    setFinancialGuardian,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="studentProfileId" value={studentId} />
      <input type="hidden" name="relationshipId" value={relationshipId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending
          ? messages.common.processing
          : messages.students.makeFinancialResponsible}
      </Button>
      {state.status === "error" && state.message && (
        <p role="alert" className="max-w-48 text-xs text-danger-foreground">
          {state.message}
        </p>
      )}
    </form>
  );
}

function candidateLabel(
  candidate: GuardianCandidate,
  messages: AppDictionary["students"],
) {
  if (candidate.role === "STUDENT" && candidate.studentNumber)
    return `${candidate.fullName} — ${formatMessage(messages.studentRoleHint, {
      number: candidate.studentNumber,
    })}`;
  if (candidate.role === "GUARDIAN")
    return `${candidate.fullName} — ${formatMessage(messages.guardianRoleHint, {
      count: candidate.childCount,
    })}`;
  return `${candidate.fullName} — ${candidate.contact ?? messages.personRoleHint}`;
}

function AddGuardianDialog({
  studentId,
  candidates,
  messages,
}: {
  studentId: string;
  candidates: GuardianCandidate[];
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const [open, setOpen] = useState(false);
  const text = messages.students;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden />
          {text.addGuardian}
        </Button>
      </DialogTrigger>
      {open && (
        <AddGuardianDialogContent
          studentId={studentId}
          candidates={candidates}
          messages={messages}
          onClose={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}

function AddGuardianDialogContent({
  studentId,
  candidates,
  messages,
  onClose,
}: {
  studentId: string;
  candidates: GuardianCandidate[];
  messages: Pick<AppDictionary, "common" | "students">;
  onClose: () => void;
}) {
  const [formVersion, setFormVersion] = useState(0);

  return (
    <AddGuardianForm
      key={formVersion}
      studentId={studentId}
      candidates={candidates}
      messages={messages}
      onClose={onClose}
      onAddAnother={() => setFormVersion((version) => version + 1)}
    />
  );
}

function AddGuardianForm({
  studentId,
  candidates,
  messages,
  onClose,
  onAddAnother,
}: {
  studentId: string;
  candidates: GuardianCandidate[];
  messages: Pick<AppDictionary, "common" | "students">;
  onClose: () => void;
  onAddAnother: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [state, formAction, pending] = useActionState(addGuardian, initialState);
  const text = messages.students;

  return (
    <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{text.addGuardian}</DialogTitle>
          <DialogDescription>{text.guardiansDescription}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="studentProfileId" value={studentId} />
          <input type="hidden" name="mode" value={mode} />

          <fieldset>
            <legend className="text-sm font-medium">{text.guardianMode}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "existing" ? "default" : "outline"}
                aria-pressed={mode === "existing"}
                disabled={pending || candidates.length === 0}
                onClick={() => setMode("existing")}
              >
                {text.existingPerson}
              </Button>
              <Button
                type="button"
                variant={mode === "new" ? "default" : "outline"}
                aria-pressed={mode === "new"}
                disabled={pending}
                onClick={() => setMode("new")}
              >
                {text.newPerson}
              </Button>
            </div>
          </fieldset>

          {mode === "existing" ? (
            <div>
              <Label htmlFor="guardian-person">{text.selectPerson}</Label>
              <NativeSelect
                id="guardian-person"
                name="guardianPersonId"
                defaultValue=""
                required
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.guardianPersonId)}
                className="mt-2 h-12"
              >
                <option value="" disabled>
                  {text.selectPerson}
                </option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidateLabel(candidate, text)}
                  </option>
                ))}
              </NativeSelect>
              <FieldError
                state={state}
                field="guardianPersonId"
                id="guardian-person-error"
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="guardian-first-name">{text.firstName}</Label>
                <Input
                  id="guardian-first-name"
                  name="firstName"
                  autoComplete="given-name"
                  maxLength={100}
                  required
                  disabled={pending}
                  aria-invalid={Boolean(state.fieldErrors?.firstName)}
                  className="mt-2"
                />
                <FieldError
                  state={state}
                  field="firstName"
                  id="guardian-first-name-error"
                />
              </div>
              <div>
                <Label htmlFor="guardian-middle-name">{text.middleName}</Label>
                <Input
                  id="guardian-middle-name"
                  name="middleName"
                  autoComplete="additional-name"
                  maxLength={100}
                  disabled={pending}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="guardian-last-name">{text.lastName}</Label>
                <Input
                  id="guardian-last-name"
                  name="lastName"
                  autoComplete="family-name"
                  maxLength={100}
                  required
                  disabled={pending}
                  aria-invalid={Boolean(state.fieldErrors?.lastName)}
                  className="mt-2"
                />
                <FieldError
                  state={state}
                  field="lastName"
                  id="guardian-last-name-error"
                />
              </div>
              <div>
                <Label htmlFor="guardian-phone">{text.phone}</Label>
                <Input
                  id="guardian-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={50}
                  disabled={pending}
                  aria-invalid={Boolean(state.fieldErrors?.phone)}
                  className="mt-2"
                />
                <FieldError state={state} field="phone" id="guardian-phone-error" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="guardian-email">{text.email}</Label>
                <Input
                  id="guardian-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={320}
                  disabled={pending}
                  aria-invalid={Boolean(state.fieldErrors?.email)}
                  className="mt-2"
                />
                <FieldError state={state} field="email" id="guardian-email-error" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {text.contactOptional}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="guardian-occupation">{text.occupation}</Label>
              <Input
                id="guardian-occupation"
                name="occupation"
                maxLength={150}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.occupation)}
                className="mt-2"
              />
              <FieldError
                state={state}
                field="occupation"
                id="guardian-occupation-error"
              />
            </div>
            <div>
              <Label htmlFor="guardian-note">{text.guardianNote}</Label>
              <Input
                id="guardian-note"
                name="guardianNote"
                maxLength={500}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.guardianNote)}
                className="mt-2"
              />
              <FieldError
                state={state}
                field="guardianNote"
                id="guardian-note-error"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="guardian-relationship">{text.relationship}</Label>
            <NativeSelect
              id="guardian-relationship"
              name="relationshipType"
              defaultValue="MOTHER"
              required
              disabled={pending}
              className="mt-2 h-12"
            >
              <option value="MOTHER">{text.mother}</option>
              <option value="FATHER">{text.father}</option>
            </NativeSelect>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <Checkbox name="isLegalGuardian" defaultChecked disabled={pending} />
              {text.legalGuardian}
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <Checkbox name="isPrimaryContact" disabled={pending} />
              {text.makePrimaryOnCreate}
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <Checkbox name="isFinancialResponsible" disabled={pending} />
              {text.makeFinancialResponsibleOnCreate}
            </label>
          </div>

          <ActionAlert state={state} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {state.status === "success"
                ? messages.common.close
                : messages.common.cancel}
            </Button>
            {state.status !== "success" && (
              <Button type="submit" disabled={pending}>
                {pending ? messages.common.saving : text.addGuardian}
              </Button>
            )}
            {state.status === "success" && (
              <Button type="button" onClick={onAddAnother}>
                <Plus aria-hidden />
                {text.addAnotherGuardian}
              </Button>
            )}
          </DialogFooter>
        </form>
    </DialogContent>
  );
}

function StudentPhotoCard({
  student,
  canManageStudent,
  locale,
  messages,
}: {
  student: StudentDetailRecord;
  canManageStudent: boolean;
  locale: Locale;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const [state, formAction, pending] = useActionState(
    uploadStudentPhoto,
    initialState,
  );
  const text = messages.students;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{text.photoTitle}</CardTitle>
        <CardDescription>{text.photoDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          {student.person.photoUrl ? (
            <Image
              src={student.person.photoUrl}
              alt={student.person.fullName}
              width={112}
              height={112}
              className="size-28 rounded-xl border object-cover"
            />
          ) : (
            <div className="flex size-28 items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground">
              {text.noPhoto}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            <p>{text.photoHelp}</p>
            {student.person.photoUpdatedAt && (
              <p className="mt-1">
                {formatDate(student.person.photoUpdatedAt.slice(0, 10), locale)}
              </p>
            )}
          </div>
        </div>
        {canManageStudent && (
          <form
            action={formAction}
            encType="multipart/form-data"
            className="space-y-3"
          >
            <input type="hidden" name="studentProfileId" value={student.id} />
            <div>
              <Label htmlFor="student-photo">{text.photo}</Label>
              <Input
                id="student-photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.photo)}
                className="mt-2"
              />
              <FieldError state={state} field="photo" id="student-photo-error" />
            </div>
            <ActionAlert state={state} />
            <Button type="submit" disabled={pending}>
              {pending ? messages.common.saving : text.uploadPhoto}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function StudentDetailsCard({
  student,
  canManageStudent,
  messages,
}: {
  student: StudentDetailRecord;
  canManageStudent: boolean;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const [state, formAction, pending] = useActionState(
    updateStudentDetails,
    initialState,
  );
  const text = messages.students;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{text.addressInformation}</CardTitle>
        <CardDescription>{text.addressDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="studentProfileId" value={student.id} />
          <input type="hidden" name="revision" value={student.revision} />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="detail-residence-city">{text.residenceCity}</Label>
              <Input
                id="detail-residence-city"
                name="residenceCity"
                defaultValue={student.residenceCity ?? ""}
                maxLength={120}
                disabled={pending || !canManageStudent}
                aria-invalid={Boolean(state.fieldErrors?.residenceCity)}
                className="mt-2"
              />
              <FieldError
                state={state}
                field="residenceCity"
                id="detail-residence-city-error"
              />
            </div>
            <div>
              <Label htmlFor="detail-neighborhood">{text.neighborhood}</Label>
              <Input
                id="detail-neighborhood"
                name="neighborhood"
                defaultValue={student.neighborhood ?? ""}
                maxLength={120}
                disabled={pending || !canManageStudent}
                aria-invalid={Boolean(state.fieldErrors?.neighborhood)}
                className="mt-2"
              />
              <FieldError
                state={state}
                field="neighborhood"
                id="detail-neighborhood-error"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="detail-address-line">{text.addressLine}</Label>
              <Textarea
                id="detail-address-line"
                name="addressLine"
                defaultValue={student.addressLine ?? ""}
                maxLength={500}
                disabled={pending || !canManageStudent}
                aria-invalid={Boolean(state.fieldErrors?.addressLine)}
                className="mt-2"
              />
              <FieldError
                state={state}
                field="addressLine"
                id="detail-address-line-error"
              />
            </div>
          </div>
          <div className="space-y-4 rounded-lg border p-4">
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                name="hasSpecialCondition"
                defaultChecked={student.hasSpecialCondition}
                disabled={pending || !canManageStudent}
              />
              {text.hasSpecialCondition}
            </label>
            <div>
              <Label htmlFor="detail-special-condition-note">
                {text.specialConditionNote}
              </Label>
              <Textarea
                id="detail-special-condition-note"
                name="specialConditionNote"
                defaultValue={student.specialConditionNote ?? ""}
                maxLength={1000}
                disabled={pending || !canManageStudent}
                aria-invalid={Boolean(state.fieldErrors?.specialConditionNote)}
                className="mt-2"
              />
              <FieldError
                state={state}
                field="specialConditionNote"
                id="detail-special-condition-note-error"
              />
            </div>
            <div>
              <Label htmlFor="detail-internal-note">{text.internalNote}</Label>
              <Textarea
                id="detail-internal-note"
                name="internalNote"
                defaultValue={student.internalNote ?? ""}
                maxLength={1000}
                disabled={pending || !canManageStudent}
                aria-invalid={Boolean(state.fieldErrors?.internalNote)}
                className="mt-2"
              />
              <FieldError
                state={state}
                field="internalNote"
                id="detail-internal-note-error"
              />
            </div>
          </div>
          <ActionAlert state={state} />
          {canManageStudent && (
            <Button type="submit" disabled={pending}>
              {pending ? messages.common.saving : text.saveStudentDetails}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function PreviousEducationArchiveButton({
  studentId,
  previousEducationId,
  messages,
}: {
  studentId: string;
  previousEducationId: string;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const [state, formAction, pending] = useActionState(
    archivePreviousEducation,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="studentProfileId" value={studentId} />
      <input
        type="hidden"
        name="previousEducationId"
        value={previousEducationId}
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending
          ? messages.common.processing
          : messages.students.archivePreviousEducation}
      </Button>
      {state.status === "error" && state.message && (
        <p role="alert" className="text-xs text-danger-foreground">
          {state.message}
        </p>
      )}
    </form>
  );
}

function PreviousEducationCard({
  student,
  canManageStudent,
  messages,
}: {
  student: StudentDetailRecord;
  canManageStudent: boolean;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const [state, formAction, pending] = useActionState(
    addPreviousEducation,
    initialState,
  );
  const text = messages.students;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{text.previousEducationTitle}</CardTitle>
        <CardDescription>{text.previousEducationDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {student.previousEducationRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {text.previousEducationEmpty}
          </p>
        ) : (
          <div className="space-y-3">
            {student.previousEducationRecords.map((record) => (
              <article key={record.id} className="rounded-lg border p-4">
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <Definition label={text.gradeLevelText}>
                    {record.gradeLevelText ?? "—"}
                  </Definition>
                  <Definition label={text.academicYearText}>
                    {record.academicYearText ?? "—"}
                  </Definition>
                  <Definition label={text.schoolName}>
                    {record.schoolName ?? "—"}
                  </Definition>
                  <Definition label={text.successText}>
                    {record.successText ?? "—"}
                  </Definition>
                  <Definition label={text.transportText}>
                    {record.transportText ?? "—"}
                  </Definition>
                  <Definition label={text.discountText}>
                    {record.discountText ?? "—"}
                  </Definition>
                </div>
                {record.note && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {record.note}
                  </p>
                )}
                {canManageStudent && (
                  <div className="mt-4 border-t pt-4">
                    <PreviousEducationArchiveButton
                      studentId={student.id}
                      previousEducationId={record.id}
                      messages={messages}
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {canManageStudent && (
          <form action={formAction} className="space-y-4 rounded-lg border p-4">
            <input type="hidden" name="studentProfileId" value={student.id} />
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="previous-grade-level">{text.gradeLevelText}</Label>
                <Input
                  id="previous-grade-level"
                  name="gradeLevelText"
                  maxLength={50}
                  disabled={pending}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="previous-academic-year">
                  {text.academicYearText}
                </Label>
                <Input
                  id="previous-academic-year"
                  name="academicYearText"
                  maxLength={50}
                  disabled={pending}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="previous-school-name">{text.schoolName}</Label>
                <Input
                  id="previous-school-name"
                  name="schoolName"
                  maxLength={200}
                  disabled={pending}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="previous-success">{text.successText}</Label>
                <Input
                  id="previous-success"
                  name="successText"
                  maxLength={100}
                  disabled={pending}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="previous-transport">{text.transportText}</Label>
                <Input
                  id="previous-transport"
                  name="transportText"
                  maxLength={100}
                  disabled={pending}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="previous-discount">{text.discountText}</Label>
                <Input
                  id="previous-discount"
                  name="discountText"
                  maxLength={100}
                  disabled={pending}
                  className="mt-2"
                />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="previous-note">{text.previousEducationNote}</Label>
                <Textarea
                  id="previous-note"
                  name="note"
                  maxLength={500}
                  disabled={pending}
                  aria-invalid={Boolean(state.fieldErrors?.previousEducation)}
                  className="mt-2"
                />
                <FieldError
                  state={state}
                  field="previousEducation"
                  id="previous-education-error"
                />
              </div>
            </div>
            <ActionAlert state={state} />
            <Button type="submit" disabled={pending}>
              {pending ? messages.common.saving : text.addPreviousEducation}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function StudentStatusDialog({
  student,
  defaultEffectiveOn,
  messages,
}: {
  student: StudentDetailRecord;
  defaultEffectiveOn: string;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    changeStudentStatus,
    initialState,
  );
  const text = messages.students;
  const inactive = student.status === "ACTIVE";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={inactive ? "warning" : "outline"}>
          {inactive ? text.markInactive : text.reactivate}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {inactive ? text.markInactive : text.reactivate}
          </DialogTitle>
          <DialogDescription>{text.lifecycleDescription}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="studentProfileId" value={student.id} />
          <input type="hidden" name="revision" value={student.revision} />
          <input
            type="hidden"
            name="transition"
            value={inactive ? "inactive" : "reactivate"}
          />
          <div>
            <Label htmlFor="student-effective-date">{text.effectiveDate}</Label>
            <Input
              id="student-effective-date"
              name="effectiveOn"
              type="date"
              defaultValue={defaultEffectiveOn}
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.effectiveOn)}
              className="mt-2"
            />
            <FieldError
              state={state}
              field="effectiveOn"
              id="student-effective-date-error"
            />
          </div>
          {inactive && (
            <>
              <div>
                <Label htmlFor="student-exit-reason">{text.exitReason}</Label>
                <NativeSelect
                  id="student-exit-reason"
                  name="exitReason"
                  defaultValue="UNKNOWN"
                  required
                  disabled={pending}
                  className="mt-2 h-12"
                >
                  <option value="FAMILY_RELOCATION">{text.familyRelocation}</option>
                  <option value="COST">{text.cost}</option>
                  <option value="OTHER_SCHOOL">{text.otherSchool}</option>
                  <option value="OTHER">{text.other}</option>
                  <option value="UNKNOWN">{text.unknown}</option>
                </NativeSelect>
                <FieldError
                  state={state}
                  field="exitReason"
                  id="student-exit-reason-error"
                />
              </div>
              <Alert variant="warning">
                <AlertDescription className="mt-0">
                  {text.inactiveWarning}
                </AlertDescription>
              </Alert>
            </>
          )}
          <div>
            <Label htmlFor="student-status-note">{text.note}</Label>
            <Textarea
              id="student-status-note"
              name="note"
              maxLength={500}
              disabled={pending}
              className="mt-2"
            />
          </div>
          <ActionAlert state={state} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {state.status === "success"
                ? messages.common.close
                : messages.common.cancel}
            </Button>
            {state.status !== "success" && (
              <Button
                type="submit"
                variant={inactive ? "warning" : "default"}
                disabled={pending}
              >
                {pending
                  ? messages.common.processing
                  : inactive
                    ? text.markInactive
                    : text.reactivate}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StudentDetailManager({
  student,
  candidates,
  canManageStudent,
  canReadGuardians,
  canManageGuardians,
  canManageAccounts,
  defaultEffectiveOn,
  locale,
  messages,
}: {
  student: StudentDetailRecord;
  candidates: GuardianCandidate[];
  canManageStudent: boolean;
  canReadGuardians: boolean;
  canManageGuardians: boolean;
  canManageAccounts: boolean;
  defaultEffectiveOn: string;
  locale: Locale;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const text = messages.students;
  const statusLabels: Record<StudentDetailRecord["status"], string> = {
    ACTIVE: text.active,
    INACTIVE: text.inactive,
    GRADUATED: text.graduated,
    WITHDRAWN: text.withdrawn,
    TRANSFERRED: text.transferred,
  };
  const statusVariant =
    student.status === "ACTIVE"
      ? "success"
      : student.status === "INACTIVE"
        ? "warning"
        : student.status === "GRADUATED"
          ? "info"
          : "danger";
  const eventLabels: Record<string, string> = {
    ACTIVATED: text.eventActivated,
    INACTIVATED: text.eventInactivated,
    REACTIVATED: text.eventReactivated,
    TRANSFERRED_OUT: text.eventTransferred,
    WITHDRAWN: text.eventWithdrawn,
    GRADUATED: text.eventGraduated,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={text.eyebrow}
        title={student.person.fullName}
        description={formatMessage(text.detailDescription, {
          number: student.studentNumber,
        })}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/students">
                <ArrowLeft aria-hidden />
                {text.backToStudents}
              </Link>
            </Button>
            {canManageStudent && student.status !== "GRADUATED" && (
              <StudentStatusDialog
                student={student}
                defaultEffectiveOn={defaultEffectiveOn}
                messages={messages}
              />
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>{text.profileTitle}</CardTitle>
            <CardDescription>{text.profileDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Definition label={text.studentNumber}>
                <span className="font-mono">{student.studentNumber}</span>
              </Definition>
              <Definition label={messages.common.status}>
                <Badge
                  variant={statusVariant}
                >
                  {statusLabels[student.status]}
                </Badge>
              </Definition>
              <Definition label={text.admittedOn}>
                {formatDate(student.admittedOn, locale)}
              </Definition>
              <Definition label={text.birthDate}>
                {formatDate(student.person.birthDate, locale)}
              </Definition>
              <Definition label={text.birthPlace}>
                {student.person.birthPlace ?? "—"}
              </Definition>
              <Definition label={text.nationality}>
                {student.person.nationality ?? "—"}
              </Definition>
              <Definition label={text.sex}>
                {student.person.sex === "MALE"
                  ? text.male
                  : student.person.sex === "FEMALE"
                    ? text.female
                    : text.notSpecified}
              </Definition>
              {student.person.identities.map((identity) => (
                <Definition key={identity.type} label={text.identityInformation}>
                  {formatMessage(text.identityMasked, {
                    lastFour: identity.lastFour,
                  })}
                </Definition>
              ))}
            </dl>
            <div className="mt-6">
              <PersonAccountPanel
                title="Ogrenci giris hesabi"
                portal="STUDENT"
                personId={student.person.id}
                studentProfileId={student.id}
                existingAccount={student.person.account}
                canManage={canManageAccounts}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>{text.lifecycleTitle}</CardTitle>
            <CardDescription>{text.lifecycleDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {student.lifecycleEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{text.noHistory}</p>
            ) : (
              <ol className="space-y-4">
                {student.lifecycleEvents.map((event) => (
                  <li key={event.id} className="border-l-2 border-primary/25 pl-4">
                    <p className="font-medium">
                      {eventLabels[event.type] ?? event.type}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(event.effectiveOn, locale)}
                    </p>
                    {event.note && <p className="mt-2 text-sm">{event.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <StudentPhotoCard
          student={student}
          canManageStudent={canManageStudent}
          locale={locale}
          messages={messages}
        />
        <StudentDetailsCard
          student={student}
          canManageStudent={canManageStudent}
          messages={messages}
        />
      </div>

      <PreviousEducationCard
        student={student}
        canManageStudent={canManageStudent}
        messages={messages}
      />

      {canReadGuardians && <Card>
        <CardHeader className="border-b">
          <CardTitle>{text.enrollmentTitle}</CardTitle>
          <CardDescription>{text.enrollmentDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {student.enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="space-y-5">
              {student.enrollments.map((enrollment) => (
                <section
                  key={enrollment.id}
                  className="rounded-lg border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium">{enrollment.academicYear}</h3>
                    <Badge
                      variant={enrollment.status === "ACTIVE" ? "success" : "outline"}
                    >
                      {enrollment.status === "ACTIVE"
                        ? text.enrollmentActive
                        : enrollment.status}
                    </Badge>
                  </div>
                  <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <Definition label={text.enrolledOn}>
                      {formatDate(enrollment.enrolledOn, locale)}
                    </Definition>
                    <Definition label={text.endedOn}>
                      {enrollment.endedOn
                        ? formatDate(enrollment.endedOn, locale)
                        : text.current}
                    </Definition>
                  </dl>
                  <div className="mt-4 space-y-2">
                    {enrollment.placements.map((placement) => (
                      <div
                        key={placement.id}
                        className="flex flex-col justify-between gap-1 rounded-lg bg-muted/40 px-3 py-2 sm:flex-row sm:items-center"
                      >
                        <span className="font-medium">{placement.classSection}</span>
                        <span className="text-xs text-muted-foreground">
                          {text.placementDates}: {formatDate(placement.validFrom, locale)} –{" "}
                          {placement.validTo
                            ? formatDate(placement.validTo, locale)
                            : text.current}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <CardTitle>{text.guardiansTitle}</CardTitle>
              <CardDescription className="mt-1">
                {text.guardiansDescription}
              </CardDescription>
            </div>
            {canManageGuardians && (
              <AddGuardianDialog
                studentId={student.id}
                candidates={candidates}
                messages={messages}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {student.guardians.length === 0 ? (
            <div className="py-6 text-center">
              <p className="font-medium">{text.noGuardians}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {text.noGuardiansDescription}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {student.guardians.map((guardian) => (
                <article key={guardian.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{guardian.fullName}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {guardian.relationshipType === "MOTHER"
                          ? text.mother
                          : text.father}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {guardian.isPrimaryContact && (
                        <Badge variant="success">{text.primary}</Badge>
                      )}
                      {guardian.isFinancialResponsible && (
                        <Badge variant="info">{text.financialResponsible}</Badge>
                      )}
                      {guardian.isLegalGuardian && (
                        <Badge variant="outline">{text.legalGuardian}</Badge>
                      )}
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <Definition label={text.phone}>{guardian.phone ?? "—"}</Definition>
                    <Definition label={text.email}>{guardian.email ?? "—"}</Definition>
                    <Definition label={text.occupation}>
                      {guardian.occupation ?? "—"}
                    </Definition>
                    <Definition label={text.guardianNote}>
                      {guardian.note ?? "—"}
                    </Definition>
                  </dl>
                  {canManageGuardians &&
                    (!guardian.isPrimaryContact ||
                      !guardian.isFinancialResponsible) && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                      {!guardian.isPrimaryContact && (
                        <PrimaryGuardianButton
                          studentId={student.id}
                          relationshipId={guardian.id}
                          messages={messages}
                        />
                      )}
                      {!guardian.isFinancialResponsible && (
                        <FinancialGuardianButton
                          studentId={student.id}
                          relationshipId={guardian.id}
                          messages={messages}
                        />
                      )}
                    </div>
                  )}
                  <div className="mt-4 border-t pt-4">
                    <PersonAccountPanel
                      title="Veli giris hesabi"
                      portal="GUARDIAN"
                      personId={guardian.personId}
                      studentProfileId={student.id}
                      existingAccount={guardian.account}
                      canManage={canManageAccounts}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
