"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  Camera,
  CircleDollarSign,
  GraduationCap,
  History,
  LayoutDashboard,
  Pencil,
  Plus,
  ShieldCheck,
  UserCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  addStudentEnrollment,
  addPreviousEducation,
  addGuardian,
  archivePreviousEducation,
  changeStudentStatus,
  setFinancialGuardian,
  setPrimaryGuardian,
  updateStudentDetails,
  uploadStudentPhoto,
} from "@/app/(school-admin)/students/actions";
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
import { Dock, type DockItemData } from "@/components/ui/dock";
import { formatMessage } from "@/i18n/format";
import { HTML_LOCALES, type Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type {
  StudentField,
  StudentState,
} from "@/lib/student-validation";
import type {
  GuardianCandidate,
  StudentRegistrationContext,
  StudentDetailRecord,
} from "@/server/students/students";
import type { StudentFinanceContractSummary } from "@/server/finance/finance";

const initialState: StudentState = {};

type StudentDetailTab =
  | "overview"
  | "personal"
  | "academic"
  | "guardians"
  | "finance"
  | "access";

function studentTabHref(studentId: string, tab: StudentDetailTab) {
  return `/students/${studentId}?tab=${tab}`;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function SummaryMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 min-w-0 text-base font-semibold text-foreground">
        {value}
      </div>
      {note ? (
        <div className="mt-1 truncate text-xs text-muted-foreground">{note}</div>
      ) : null}
    </div>
  );
}

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

function useCloseOnSuccess(
  state: StudentState,
  onOpenChange: (open: boolean) => void,
) {
  useEffect(() => {
    if (state.status !== "success" || !state.message) return;

    toast.success(state.message);
    onOpenChange(false);
  }, [onOpenChange, state.message, state.status]);
}

function useInlineActionToast(state: StudentState) {
  useEffect(() => {
    if (!state.status || !state.message) return;

    if (state.status === "success") toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.status]);
}

function Definition({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{children || "—"}</dd>
    </div>
  );
}

function formatMoney(value: string, currencyCode: string, locale: Locale) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return `${value} ${currencyCode}`;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
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
  selected,
  messages,
}: {
  studentId: string;
  relationshipId: string;
  selected: boolean;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const [state, formAction, pending] = useActionState(
    setPrimaryGuardian,
    initialState,
  );
  useInlineActionToast(state);
  if (selected) return null;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="studentProfileId" value={studentId} />
      <input type="hidden" name="relationshipId" value={relationshipId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <UserCheck aria-hidden />
        {pending ? messages.common.processing : messages.students.makePrimary}
      </Button>
    </form>
  );
}

function FinancialGuardianButton({
  studentId,
  relationshipId,
  selected,
  messages,
}: {
  studentId: string;
  relationshipId: string;
  selected: boolean;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const [state, formAction, pending] = useActionState(
    setFinancialGuardian,
    initialState,
  );
  useInlineActionToast(state);
  if (selected) return null;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="studentProfileId" value={studentId} />
      <input type="hidden" name="relationshipId" value={relationshipId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending
          ? messages.common.processing
          : messages.students.makeFinancialResponsible}
      </Button>
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
        <Button size="sm">
          <Plus aria-hidden />
          {text.addGuardian}
        </Button>
      </DialogTrigger>
      {open && (
        <AddGuardianForm
          studentId={studentId}
          candidates={candidates}
          messages={messages}
          onOpenChange={setOpen}
        />
      )}
    </Dialog>
  );
}

function AddGuardianForm({
  studentId,
  candidates,
  messages,
  onOpenChange,
}: {
  studentId: string;
  candidates: GuardianCandidate[];
  messages: Pick<AppDictionary, "common" | "students">;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [state, formAction, pending] = useActionState(addGuardian, initialState);
  const text = messages.students;
  useCloseOnSuccess(state, onOpenChange);

  return (
    <DialogContent className="max-w-2xl gap-4 p-5">
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
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {messages.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? messages.common.saving : text.addGuardian}
            </Button>
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
  const [open, setOpen] = useState(false);
  const text = messages.students;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card size="sm">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{text.photoTitle}</CardTitle>
              <CardDescription className="mt-1">
                {text.photoDescription}
              </CardDescription>
            </div>
            {canManageStudent && student.person.photoUrl ? (
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Camera aria-hidden />
                  {text.changePhoto}
                </Button>
              </DialogTrigger>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {student.person.photoUrl ? (
            <div className="flex items-center gap-3">
            <Image
              src={student.person.photoUrl}
              alt={student.person.fullName}
              width={96}
              height={96}
              className="size-24 rounded-xl object-cover"
            />
              <div className="text-xs text-muted-foreground">
                <p>{text.photoHelp}</p>
                {student.person.photoUpdatedAt ? (
                  <p className="mt-1">
                    {formatDate(
                      student.person.photoUpdatedAt.slice(0, 10),
                      locale,
                    )}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-lg bg-muted/45 p-4 text-center">
              <Camera className="size-7 text-muted-foreground" aria-hidden />
              <p className="mt-2 text-sm text-muted-foreground">{text.noPhoto}</p>
              {canManageStudent ? (
                <DialogTrigger asChild>
                  <Button size="sm" className="mt-3">
                    {text.uploadPhoto}
                  </Button>
                </DialogTrigger>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
      {open ? (
        <StudentPhotoDialogContent
          studentId={student.id}
          messages={messages}
          onOpenChange={setOpen}
        />
      ) : null}
    </Dialog>
  );
}

function StudentPhotoDialogContent({
  studentId,
  messages,
  onOpenChange,
}: {
  studentId: string;
  messages: Pick<AppDictionary, "common" | "students">;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    uploadStudentPhoto,
    initialState,
  );
  const text = messages.students;
  useCloseOnSuccess(state, onOpenChange);

  return (
    <DialogContent className="max-w-md p-5">
      <DialogHeader>
        <DialogTitle>{text.uploadPhoto}</DialogTitle>
        <DialogDescription>{text.photoHelp}</DialogDescription>
      </DialogHeader>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="studentProfileId" value={studentId} />
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
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {messages.common.cancel}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? messages.common.saving : text.uploadPhoto}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
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
  const [open, setOpen] = useState(false);
  const text = messages.students;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card size="sm">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{text.addressInformation}</CardTitle>
              <CardDescription className="mt-1">
                {text.addressDescription}
              </CardDescription>
            </div>
            {canManageStudent ? (
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Pencil aria-hidden />
                  {text.editDetails}
                </Button>
              </DialogTrigger>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            <Definition label={text.residenceCity}>
              {student.residenceCity ?? "—"}
            </Definition>
            <Definition label={text.neighborhood}>
              {student.neighborhood ?? "—"}
            </Definition>
            <div className="sm:col-span-2">
              <Definition label={text.addressLine}>
                {student.addressLine ?? "—"}
              </Definition>
            </div>
            <Definition label={text.specialCondition}>
              {student.hasSpecialCondition ? text.hasSpecialCondition : "—"}
            </Definition>
            <Definition label={text.specialConditionNote}>
              {student.specialConditionNote ?? "—"}
            </Definition>
            <div className="sm:col-span-2">
              <Definition label={text.internalNote}>
                {student.internalNote ?? "—"}
              </Definition>
            </div>
          </dl>
        </CardContent>
      </Card>
      {open ? (
        <StudentDetailsDialogContent
          student={student}
          messages={messages}
          onOpenChange={setOpen}
        />
      ) : null}
    </Dialog>
  );
}

function StudentDetailsDialogContent({
  student,
  messages,
  onOpenChange,
}: {
  student: StudentDetailRecord;
  messages: Pick<AppDictionary, "common" | "students">;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateStudentDetails,
    initialState,
  );
  const text = messages.students;
  useCloseOnSuccess(state, onOpenChange);

  return (
    <DialogContent className="max-w-2xl gap-4 p-5">
      <DialogHeader>
        <DialogTitle>{text.editDetails}</DialogTitle>
        <DialogDescription>{text.addressDescription}</DialogDescription>
      </DialogHeader>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="studentProfileId" value={student.id} />
        <input type="hidden" name="revision" value={student.revision} />
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="detail-residence-city">{text.residenceCity}</Label>
            <Input
              id="detail-residence-city"
              name="residenceCity"
              defaultValue={student.residenceCity ?? ""}
              maxLength={120}
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.residenceCity)}
              className="mt-1.5 h-9"
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
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.neighborhood)}
              className="mt-1.5 h-9"
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
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.addressLine)}
              className="mt-1.5 min-h-16"
            />
            <FieldError
              state={state}
              field="addressLine"
              id="detail-address-line-error"
            />
          </div>
        </div>
        <div className="space-y-3 rounded-lg bg-muted/40 p-3">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              name="hasSpecialCondition"
              defaultChecked={student.hasSpecialCondition}
              disabled={pending}
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
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.specialConditionNote)}
              className="mt-1.5 min-h-16"
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
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.internalNote)}
              className="mt-1.5 min-h-16"
            />
            <FieldError
              state={state}
              field="internalNote"
              id="detail-internal-note-error"
            />
          </div>
        </div>
        <ActionAlert state={state} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {messages.common.cancel}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? messages.common.saving : text.saveStudentDetails}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
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
  useInlineActionToast(state);
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
  const [open, setOpen] = useState(false);
  const text = messages.students;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card size="sm">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{text.previousEducationTitle}</CardTitle>
              <CardDescription className="mt-1">
                {text.previousEducationDescription}
              </CardDescription>
            </div>
            {canManageStudent ? (
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus aria-hidden />
                  {text.addPreviousEducation}
                </Button>
              </DialogTrigger>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {student.previousEducationRecords.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                {text.previousEducationEmpty}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {student.previousEducationRecords.map((record) => (
                <article key={record.id} className="rounded-lg bg-muted/35 p-3">
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
                  {record.note ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {record.note}
                    </p>
                  ) : null}
                  {canManageStudent ? (
                    <div className="mt-3 border-t pt-3">
                      <PreviousEducationArchiveButton
                        studentId={student.id}
                        previousEducationId={record.id}
                        messages={messages}
                      />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {open ? (
        <PreviousEducationDialogContent
          studentId={student.id}
          messages={messages}
          onOpenChange={setOpen}
        />
      ) : null}
    </Dialog>
  );
}

function PreviousEducationDialogContent({
  studentId,
  messages,
  onOpenChange,
}: {
  studentId: string;
  messages: Pick<AppDictionary, "common" | "students">;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    addPreviousEducation,
    initialState,
  );
  const text = messages.students;
  useCloseOnSuccess(state, onOpenChange);

  return (
    <DialogContent className="max-w-3xl p-5">
      <DialogHeader>
        <DialogTitle>{text.addPreviousEducation}</DialogTitle>
        <DialogDescription>{text.previousEducationDescription}</DialogDescription>
      </DialogHeader>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="studentProfileId" value={studentId} />
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
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {messages.common.cancel}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? messages.common.saving : text.addPreviousEducation}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
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
  useCloseOnSuccess(state, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={inactive ? "warning" : "outline"}>
          {inactive ? text.markInactive : text.reactivate}
        </Button>
      </DialogTrigger>
      <DialogContent className="p-5">
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
              {messages.common.cancel}
            </Button>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StudentLifecycleCard({
  student,
  locale,
  eventLabels,
  messages,
  limit,
}: {
  student: StudentDetailRecord;
  locale: Locale;
  eventLabels: Record<string, string>;
  messages: Pick<AppDictionary, "students">;
  limit?: number;
}) {
  const events = limit
    ? student.lifecycleEvents.slice(0, limit)
    : student.lifecycleEvents;
  const text = messages.students;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>{text.lifecycleTitle}</CardTitle>
        <CardDescription>{text.lifecycleDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{text.noHistory}</p>
        ) : (
          <ol className="space-y-4">
            {events.map((event) => (
              <li key={event.id} className="border-l-2 border-primary/25 pl-4">
                <p className="font-medium">
                  {eventLabels[event.type] ?? event.type}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(event.effectiveOn, locale)}
                </p>
                {event.note ? <p className="mt-2 text-sm">{event.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function StudentEnrollmentCard({
  student,
  canManageStudent,
  registrationContext,
  locale,
  messages,
}: {
  student: StudentDetailRecord;
  canManageStudent: boolean;
  registrationContext: StudentRegistrationContext;
  locale: Locale;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const [open, setOpen] = useState(false);
  const text = messages.students;
  const activeYear = registrationContext.academicYear;
  const hasActiveYearEnrollment = activeYear
    ? student.enrollments.some(
        (enrollment) => enrollment.academicYearId === activeYear.id,
      )
    : false;
  const defaultAdmittedOn =
    activeYear &&
    student.admittedOn >= activeYear.startDate &&
    student.admittedOn <= activeYear.endDate
      ? student.admittedOn
      : (activeYear?.startDate ?? student.admittedOn);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card size="sm">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{text.enrollmentTitle}</CardTitle>
              <CardDescription className="mt-1">
                {text.enrollmentDescription}
              </CardDescription>
            </div>
            {canManageStudent &&
            !hasActiveYearEnrollment &&
            activeYear &&
            registrationContext.classSections.length > 0 ? (
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus aria-hidden />
                  {text.addEnrollment}
                </Button>
              </DialogTrigger>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {student.enrollments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {text.noEnrollmentRecords}
            </p>
          ) : (
            <div className="space-y-2">
              {student.enrollments.map((enrollment) => (
                <section
                  key={enrollment.id}
                  className="rounded-lg bg-muted/35 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">{enrollment.academicYear}</h3>
                    <Badge
                      variant={
                        enrollment.status === "ACTIVE" ? "success" : "outline"
                      }
                    >
                      {enrollment.status === "ACTIVE"
                        ? text.enrollmentActive
                        : enrollment.status}
                    </Badge>
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <Definition label={text.enrolledOn}>
                      {formatDate(enrollment.enrolledOn, locale)}
                    </Definition>
                    <Definition label={text.endedOn}>
                      {enrollment.endedOn
                        ? formatDate(enrollment.endedOn, locale)
                        : text.current}
                    </Definition>
                  </dl>
                  <div className="mt-3 space-y-1.5">
                    {enrollment.placements.map((placement) => (
                      <div
                        key={placement.id}
                        className="flex flex-col justify-between gap-1 rounded-md bg-background px-3 py-2 sm:flex-row sm:items-center"
                      >
                        <span className="font-medium">
                          {placement.classSection}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {text.placementDates}:{" "}
                          {formatDate(placement.validFrom, locale)} –{" "}
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

          {canManageStudent &&
          !hasActiveYearEnrollment &&
          (!activeYear || registrationContext.classSections.length === 0) ? (
            <Alert variant="info">
              <AlertDescription>
                {text.noRegistrationOptionsDescription}
                <Button asChild variant="link" className="ml-2 h-auto p-0">
                  <Link href="/academics/structure">{text.goToStructure}</Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      {open && activeYear ? (
        <StudentEnrollmentDialogContent
          studentId={student.id}
          registrationContext={registrationContext}
          defaultAdmittedOn={defaultAdmittedOn}
          messages={messages}
          onOpenChange={setOpen}
        />
      ) : null}
    </Dialog>
  );
}

function StudentEnrollmentDialogContent({
  studentId,
  registrationContext,
  defaultAdmittedOn,
  messages,
  onOpenChange,
}: {
  studentId: string;
  registrationContext: StudentRegistrationContext;
  defaultAdmittedOn: string;
  messages: Pick<AppDictionary, "common" | "students">;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    addStudentEnrollment,
    initialState,
  );
  const text = messages.students;
  const activeYear = registrationContext.academicYear;
  useCloseOnSuccess(state, onOpenChange);

  if (!activeYear) return null;

  return (
    <DialogContent className="max-w-2xl p-5">
      <DialogHeader>
        <DialogTitle>{text.addEnrollment}</DialogTitle>
        <DialogDescription>{text.enrollmentDescription}</DialogDescription>
      </DialogHeader>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="studentProfileId" value={studentId} />
        <input type="hidden" name="academicYearId" value={activeYear.id} />
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="student-enrollment-year">{text.academicYear}</Label>
            <Input
              id="student-enrollment-year"
              value={activeYear.name}
              disabled
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="student-enrollment-class">
              {text.classSection}
            </Label>
            <NativeSelect
              id="student-enrollment-class"
              name="classSectionId"
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.classSectionId)}
              className="mt-2"
              defaultValue={registrationContext.classSections[0]?.id}
            >
              {registrationContext.classSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError
              state={state}
              field="classSectionId"
              id="student-enrollment-class-error"
            />
          </div>
          <div>
            <Label htmlFor="student-enrollment-date">{text.admittedOn}</Label>
            <Input
              id="student-enrollment-date"
              name="admittedOn"
              type="date"
              min={activeYear.startDate}
              max={activeYear.endDate}
              defaultValue={defaultAdmittedOn}
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.admittedOn)}
              className="mt-2"
            />
            <FieldError
              state={state}
              field="admittedOn"
              id="student-enrollment-date-error"
            />
          </div>
        </div>
        <ActionAlert state={state} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {messages.common.cancel}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? messages.common.saving : text.addEnrollment}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function StudentGuardiansCard({
  student,
  candidates,
  canManageGuardians,
  canManageAccounts,
  messages,
}: {
  student: StudentDetailRecord;
  candidates: GuardianCandidate[];
  canManageGuardians: boolean;
  canManageAccounts: boolean;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const text = messages.students;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <CardTitle>{text.guardiansTitle}</CardTitle>
            <CardDescription className="mt-1">
              {text.guardiansDescription}
            </CardDescription>
          </div>
          {canManageGuardians ? (
            <AddGuardianDialog
              studentId={student.id}
              candidates={candidates}
              messages={messages}
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {student.guardians.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-medium">{text.noGuardians}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {text.noGuardiansDescription}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {student.guardians.map((guardian) => (
              <article key={guardian.id} className="rounded-lg bg-muted/35 p-3">
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
                    {guardian.isPrimaryContact ? (
                      <Badge variant="success">{text.primary}</Badge>
                    ) : null}
                    {guardian.isFinancialResponsible ? (
                      <Badge variant="info">{text.financialResponsible}</Badge>
                    ) : null}
                    {guardian.isLegalGuardian ? (
                      <Badge variant="outline">{text.legalGuardian}</Badge>
                    ) : null}
                  </div>
                </div>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <Definition label={text.phone}>{guardian.phone ?? "—"}</Definition>
                  <Definition label={text.email}>{guardian.email ?? "—"}</Definition>
                  <Definition label={text.occupation}>
                    {guardian.occupation ?? "—"}
                  </Definition>
                  <Definition label={text.guardianNote}>
                    {guardian.note ?? "—"}
                  </Definition>
                </dl>
                {canManageGuardians ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 empty:hidden">
                    <PrimaryGuardianButton
                      studentId={student.id}
                      relationshipId={guardian.id}
                      selected={guardian.isPrimaryContact}
                      messages={messages}
                    />
                    <FinancialGuardianButton
                      studentId={student.id}
                      relationshipId={guardian.id}
                      selected={guardian.isFinancialResponsible}
                      messages={messages}
                    />
                  </div>
                ) : null}
                <div className="mt-3 border-t pt-3">
                  <PersonAccountPanel
                    title={text.guardianAccountTitle}
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
  );
}

function StudentFinanceContractsCard({
  financeContracts,
  locale,
  messages,
}: {
  financeContracts: StudentFinanceContractSummary[];
  locale: Locale;
  messages: Pick<AppDictionary, "finance">;
}) {
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>{messages.finance.studentContractsTitle}</CardTitle>
        <CardDescription>
          {messages.finance.studentContractsDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {financeContracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {messages.finance.noContractsDescription}
          </p>
        ) : (
          <div className="space-y-3">
            {financeContracts.map((contract) => (
              <div
                key={contract.id}
                className="flex flex-col justify-between gap-3 rounded-lg bg-muted/35 p-3 md:flex-row md:items-center"
              >
                <div>
                  <p className="font-medium">{contract.displayNumber}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {contract.responsibleGuardian.fullName} ·{" "}
                    {messages.finance.remaining}:{" "}
                    {formatMoney(
                      contract.totals.remainingBalance,
                      contract.currencyCode,
                      locale,
                    )}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/finance?contractId=${contract.id}`}>
                    {messages.finance.viewFinance}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StudentDetailManager({
  student,
  candidates,
  canManageStudent,
  canReadGuardians,
  canManageGuardians,
  canManageAccounts,
  canReadFinance,
  financeContracts,
  registrationContext,
  defaultEffectiveOn,
  initialTab,
  locale,
  messages,
}: {
  student: StudentDetailRecord;
  candidates: GuardianCandidate[];
  canManageStudent: boolean;
  canReadGuardians: boolean;
  canManageGuardians: boolean;
  canManageAccounts: boolean;
  canReadFinance: boolean;
  financeContracts: StudentFinanceContractSummary[];
  registrationContext: StudentRegistrationContext;
  defaultEffectiveOn: string;
  initialTab?: string;
  locale: Locale;
  messages: Pick<AppDictionary, "common" | "students" | "finance">;
}) {
  const text = messages.students;
  const activeEnrollment =
    student.enrollments.find((enrollment) => enrollment.status === "ACTIVE") ??
    student.enrollments[0] ??
    null;
  const activePlacement =
    activeEnrollment?.placements.find((placement) => !placement.validTo) ??
    activeEnrollment?.placements[0] ??
    null;
  const primaryGuardian =
    student.guardians.find((guardian) => guardian.isPrimaryContact) ?? null;
  const financialGuardian =
    student.guardians.find((guardian) => guardian.isFinancialResponsible) ?? null;
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
  const navigation: Array<{
    value: StudentDetailTab;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
  }> = [
    { value: "overview", label: text.overviewTab, icon: LayoutDashboard },
    { value: "personal", label: text.profileTab, icon: UserRound },
    { value: "academic", label: text.academicTab, icon: GraduationCap },
    ...(canReadGuardians
      ? [
          {
            value: "guardians" as const,
            label: text.parentsTab,
            icon: UsersRound,
            count: student.guardians.length,
          },
        ]
      : []),
    ...(canReadFinance
      ? [
          {
            value: "finance" as const,
            label: text.financeTab,
            icon: CircleDollarSign,
            count: financeContracts.length,
          },
        ]
      : []),
    { value: "access", label: text.accountTab, icon: ShieldCheck },
  ];
  const activeTab = navigation.some((item) => item.value === initialTab)
    ? (initialTab as StudentDetailTab)
    : "overview";
  const dockItems: DockItemData[] = navigation.map(
    ({ value, label, icon: Icon, count }) => ({
      id: value,
      href: studentTabHref(student.id, value),
      icon: <Icon aria-hidden />,
      label,
      active: value === activeTab,
      badge: count,
    }),
  );

  return (
    <div className="space-y-3">
      <section className="rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {student.person.photoUrl ? (
              <Image
                src={student.person.photoUrl}
                alt={student.person.fullName}
                width={72}
                height={72}
                priority
                className="size-14 shrink-0 rounded-lg object-cover sm:size-16"
              />
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-semibold text-primary sm:size-16">
                {initials(student.person.firstName, student.person.lastName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-primary">
                {text.eyebrow}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {student.person.fullName}
                </h1>
                <Badge variant={statusVariant}>
                  {statusLabels[student.status]}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatMessage(text.detailDescription, {
                  number: student.studentNumber,
                })}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {text.academicYear}: {activeEnrollment?.academicYear ?? "—"}
                </span>
                <span>
                  {text.classSection}: {activePlacement?.classSection ?? "—"}
                </span>
                {primaryGuardian ? (
                  <span>
                    {text.primaryGuardian}: {primaryGuardian.fullName}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href="/students">
                <ArrowLeft aria-hidden />
                {text.backToStudents}
              </Link>
            </Button>
            {canManageStudent && student.status !== "GRADUATED" ? (
              <StudentStatusDialog
                student={student}
                defaultEffectiveOn={defaultEffectiveOn}
                messages={messages}
              />
            ) : null}
          </div>
        </div>
      </section>

      <Dock items={dockItems} label={text.detailNavigation} />

      <section
        aria-label={navigation.find((item) => item.value === activeTab)?.label}
        className="min-w-0 space-y-3 lg:max-h-[calc(100svh-17rem)] lg:min-h-[430px] lg:overflow-y-auto lg:pr-1"
      >
          {activeTab === "overview" ? (
            <>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <SummaryMetric
                  icon={<BookOpenCheck className="size-4" aria-hidden />}
                  label={text.academicYear}
                  value={activeEnrollment?.academicYear ?? "—"}
                  note={activePlacement?.classSection ?? text.noClassSection}
                />
                <SummaryMetric
                  icon={<UsersRound className="size-4" aria-hidden />}
                  label={text.guardiansTitle}
                  value={student.guardians.length}
                  note={primaryGuardian?.fullName ?? text.noPrimaryGuardian}
                />
                <SummaryMetric
                  icon={<ShieldCheck className="size-4" aria-hidden />}
                  label={text.studentAccountTitle}
                  value={
                    student.person.account?.username ?? text.noStudentAccount
                  }
                  note={student.person.account?.status}
                />
                {canReadFinance ? (
                  <SummaryMetric
                    icon={<CircleDollarSign className="size-4" aria-hidden />}
                    label={messages.finance.studentContractsTitle}
                    value={financeContracts.length}
                    note={financeContracts[0]?.displayNumber}
                  />
                ) : (
                  <SummaryMetric
                    icon={<History className="size-4" aria-hidden />}
                    label={text.admittedOn}
                    value={formatDate(student.admittedOn, locale)}
                  />
                )}
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
                <Card size="sm">
                  <CardHeader className="border-b">
                    <CardTitle>{text.recordOverview}</CardTitle>
                    <CardDescription>{text.profileDescription}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Definition label={text.studentNumber}>
                        <span className="font-mono">{student.studentNumber}</span>
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
                      <Definition label={text.residenceCity}>
                        {student.residenceCity ?? "—"}
                      </Definition>
                      <Definition label={text.financialResponsible}>
                        {financialGuardian?.fullName ?? "—"}
                      </Definition>
                    </dl>
                    {student.hasSpecialCondition ? (
                      <Alert variant="warning">
                        <AlertDescription className="mt-0">
                          <span className="font-medium">
                            {text.specialCondition}:
                          </span>{" "}
                          {student.specialConditionNote ?? text.hasSpecialCondition}
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </CardContent>
                </Card>
                <StudentLifecycleCard
                  student={student}
                  locale={locale}
                  eventLabels={eventLabels}
                  messages={messages}
                  limit={4}
                />
              </div>
            </>
          ) : null}

          {activeTab === "personal" ? (
            <>
              <Card size="sm">
                <CardHeader className="border-b">
                  <CardTitle>{text.personalInformation}</CardTitle>
                  <CardDescription>{text.personalDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <Definition label={text.firstName}>
                      {student.person.firstName}
                    </Definition>
                    <Definition label={text.middleName}>
                      {student.person.middleName ?? "—"}
                    </Definition>
                    <Definition label={text.lastName}>
                      {student.person.lastName}
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
                      <Definition
                        key={identity.type}
                        label={text.identityInformation}
                      >
                        {formatMessage(text.identityMasked, {
                          lastFour: identity.lastFour,
                        })}
                      </Definition>
                    ))}
                  </dl>
                </CardContent>
              </Card>
              <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
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
            </>
          ) : null}

          {activeTab === "academic" ? (
            <>
              <StudentEnrollmentCard
                student={student}
                canManageStudent={canManageStudent}
                registrationContext={registrationContext}
                locale={locale}
                messages={messages}
              />
              <PreviousEducationCard
                student={student}
                canManageStudent={canManageStudent}
                messages={messages}
              />
            </>
          ) : null}

          {activeTab === "guardians" && canReadGuardians ? (
            <StudentGuardiansCard
              student={student}
              candidates={candidates}
              canManageGuardians={canManageGuardians}
              canManageAccounts={canManageAccounts}
              messages={messages}
            />
          ) : null}

          {activeTab === "finance" && canReadFinance ? (
            <StudentFinanceContractsCard
              financeContracts={financeContracts}
              locale={locale}
              messages={messages}
            />
          ) : null}

          {activeTab === "access" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
              <Card size="sm">
                <CardHeader className="border-b">
                  <CardTitle>{text.studentAccountTitle}</CardTitle>
                  <CardDescription>{text.studentAccountDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  <PersonAccountPanel
                    title={text.studentAccountTitle}
                    portal="STUDENT"
                    personId={student.person.id}
                    studentProfileId={student.id}
                    existingAccount={student.person.account}
                    canManage={canManageAccounts}
                  />
                </CardContent>
              </Card>
              <StudentLifecycleCard
                student={student}
                locale={locale}
                eventLabels={eventLabels}
                messages={messages}
              />
            </div>
          ) : null}
      </section>
    </div>
  );
}
