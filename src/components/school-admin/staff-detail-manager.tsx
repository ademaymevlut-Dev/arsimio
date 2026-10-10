"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  FileText,
  GraduationCap,
  IdCard,
  Pencil,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveEmploymentCompensationAction,
  saveEmploymentContractAction,
  saveEmploymentLeaveAction,
  saveStaffHrProfileAction,
  saveTeacherProfileAction,
  transitionEmploymentAction,
  uploadStaffPhotoAction,
} from "@/app/(school-admin)/staff/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dock, type DockItemData } from "@/components/ui/dock";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { HTML_LOCALES, type Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { formatMessage } from "@/i18n/format";
import type { StaffField, StaffState } from "@/lib/staff-validation";
import { PersonAccountPanel } from "./person-account-panel";

type StaffMessages = Pick<AppDictionary, "common" | "staff">;
type StaffDetailTab =
  | "overview"
  | "profile"
  | "contracts"
  | "salary"
  | "leave"
  | "teaching"
  | "account";

type ContractRecord = {
  id: string;
  templateId: string | null;
  templateTitle: string | null;
  contractNumber: string;
  type:
    | "INDEFINITE"
    | "FIXED_TERM"
    | "PART_TIME"
    | "SERVICE"
    | "INTERN"
    | "OTHER";
  status: "ACTIVE" | "ENDED" | "CANCELLED";
  startedOn: string;
  endedOn: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  revision: string;
};

type CompensationRecord = {
  id: string;
  amount: string;
  currencyCode: string;
  amountKind: "GROSS" | "NET";
  payType: "MONTHLY" | "HOURLY" | "DAILY" | "LESSON" | "OTHER";
  status: "ACTIVE" | "ENDED" | "CANCELLED";
  startedOn: string;
  endedOn: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  revision: string;
};

type LeaveRecord = {
  id: string;
  kind:
    | "ANNUAL"
    | "SICK"
    | "UNPAID"
    | "MATERNITY"
    | "ADMINISTRATIVE"
    | "OTHER";
  status: "PLANNED" | "APPROVED" | "CANCELLED";
  startedOn: string;
  endedOn: string;
  dayCount: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  revision: string;
};

type StaffDetail = {
  id: string;
  revision: string;
  staffNumber: string;
  status: string;
  type: string;
  hiredOn: string;
  endedOn: string | null;
  exitReason: string | null;
  note: string | null;
  personId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  photoUpdatedAt: string | null;
  contracts: ContractRecord[];
  contractTemplates: {
    id: string;
    code: string;
    title: string;
    locale: string;
  }[];
  compensations: CompensationRecord[];
  leaves: LeaveRecord[];
  identities: {
    id: string;
    type: "NATIONAL_ID" | "PASSPORT";
    countryCode: string | null;
    lastFour: string;
  }[];
  hrProfile: {
    residenceCity: string | null;
    neighborhood: string | null;
    addressLine: string | null;
    emergencyContactName: string | null;
    emergencyContactRelation: string | null;
    emergencyContactPhone: string | null;
    internalNote: string | null;
  } | null;
  department: string;
  position: string;
  teacherProfile: {
    category: "CLASSROOM" | "BRANCH";
    title: string;
    titleTranslations: { tr: string; sq: string; en: string };
    status: "ACTIVE" | "INACTIVE";
    note: string | null;
    subjectIds: string[];
    subjects: { id: string; name: string }[];
  } | null;
  teacherAccount: {
    id: string;
    username: string | null;
    status: string;
    mustChangePassword: boolean;
    suspendedAt: string | null;
  } | null;
  subjects: { id: string; name: string; track: string }[];
  lifecycleEvents: {
    id: string;
    type: string;
    effectiveOn: string;
    exitReason: string | null;
    note: string | null;
  }[];
};

const initialState: StaffState = {};

function staffTabHref(employmentId: string, tab: StaffDetailTab) {
  return `/staff/${employmentId}?tab=${tab}`;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(HTML_LOCALES[locale], {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatMoney(value: string, currencyCode: string, locale: Locale) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currencyCode}`;
  try {
    return new Intl.NumberFormat(HTML_LOCALES[locale], {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${value} ${currencyCode}`;
  }
}

function useCloseOnSuccess(
  state: StaffState,
  setOpen: (open: boolean) => void,
) {
  useEffect(() => {
    if (state.status !== "success" || !state.message) return;
    toast.success(state.message);
    setOpen(false);
  }, [setOpen, state.message, state.status]);
}

function FieldError({
  state,
  field,
  id,
}: {
  state: StaffState;
  field: StaffField;
  id: string;
}) {
  const message = state.fieldErrors?.[field];
  return message ? (
    <p id={id} className="mt-1 text-xs text-danger-foreground">
      {message}
    </p>
  ) : null;
}

function ActionAlert({ state }: { state: StaffState }) {
  if (!state.status || !state.message) return null;
  return (
    <Alert
      role={state.status === "error" ? "alert" : "status"}
      variant={state.status === "error" ? "danger" : "success"}
    >
      {state.message}
    </Alert>
  );
}

function Definition({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
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
    <Card size="sm">
      <CardContent className="space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <span className="text-primary">{icon}</span>
          {label}
        </div>
        <p className="truncate text-lg font-semibold text-foreground">{value}</p>
        {note ? (
          <p className="truncate text-xs text-muted-foreground">{note}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function employmentStatusLabel(value: string, text: StaffMessages["staff"]) {
  if (value === "ACTIVE") return text.active;
  if (value === "ON_LEAVE") return text.onLeave;
  if (value === "ENDED") return text.ended;
  return value;
}

function employmentTypeLabel(value: string, text: StaffMessages["staff"]) {
  if (value === "FULL_TIME") return text.fullTime;
  if (value === "PART_TIME") return text.partTime;
  if (value === "FIXED_TERM") return text.fixedTerm;
  if (value === "CONTRACTOR") return text.contractor;
  if (value === "INTERN") return text.intern;
  return value;
}

function contractTypeLabel(
  value: ContractRecord["type"],
  text: StaffMessages["staff"],
) {
  const labels: Record<ContractRecord["type"], string> = {
    INDEFINITE: text.contractTypeIndefinite,
    FIXED_TERM: text.contractTypeFixedTerm,
    PART_TIME: text.contractTypePartTime,
    SERVICE: text.contractTypeService,
    INTERN: text.contractTypeIntern,
    OTHER: text.contractTypeOther,
  };
  return labels[value];
}

function contractStatusLabel(
  value: ContractRecord["status"],
  text: StaffMessages["staff"],
) {
  const labels: Record<ContractRecord["status"], string> = {
    ACTIVE: text.contractStatusActive,
    ENDED: text.contractStatusEnded,
    CANCELLED: text.contractStatusCancelled,
  };
  return labels[value];
}

function compensationAmountKindLabel(
  value: CompensationRecord["amountKind"],
  text: StaffMessages["staff"],
) {
  return value === "GROSS" ? text.amountKindGross : text.amountKindNet;
}

function compensationPayTypeLabel(
  value: CompensationRecord["payType"],
  text: StaffMessages["staff"],
) {
  const labels: Record<CompensationRecord["payType"], string> = {
    MONTHLY: text.payTypeMonthly,
    HOURLY: text.payTypeHourly,
    DAILY: text.payTypeDaily,
    LESSON: text.payTypeLesson,
    OTHER: text.payTypeOther,
  };
  return labels[value];
}

function compensationStatusLabel(
  value: CompensationRecord["status"],
  text: StaffMessages["staff"],
) {
  const labels: Record<CompensationRecord["status"], string> = {
    ACTIVE: text.compensationStatusActive,
    ENDED: text.compensationStatusEnded,
    CANCELLED: text.compensationStatusCancelled,
  };
  return labels[value];
}

function leaveKindLabel(
  value: LeaveRecord["kind"],
  text: StaffMessages["staff"],
) {
  const labels: Record<LeaveRecord["kind"], string> = {
    ANNUAL: text.leaveKindAnnual,
    SICK: text.leaveKindSick,
    UNPAID: text.leaveKindUnpaid,
    MATERNITY: text.leaveKindMaternity,
    ADMINISTRATIVE: text.leaveKindAdministrative,
    OTHER: text.leaveKindOther,
  };
  return labels[value];
}

function leaveStatusLabel(
  value: LeaveRecord["status"],
  text: StaffMessages["staff"],
) {
  const labels: Record<LeaveRecord["status"], string> = {
    PLANNED: text.leaveStatusPlanned,
    APPROVED: text.leaveStatusApproved,
    CANCELLED: text.leaveStatusCancelled,
  };
  return labels[value];
}

function identityTypeLabel(
  value: "NATIONAL_ID" | "PASSPORT",
  text: StaffMessages["staff"],
) {
  return value === "PASSPORT" ? text.passport : text.nationalId;
}

function StatusDialog({
  staff,
  defaultEffectiveOn,
  messages,
}: {
  staff: StaffDetail;
  defaultEffectiveOn: string;
  messages: StaffMessages;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    transitionEmploymentAction,
    initialState,
  );
  useCloseOnSuccess(state, setOpen);
  const text = messages.staff;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Pencil aria-hidden />
          {text.statusAction}
        </Button>
      </DialogTrigger>
      {open ? (
        <DialogContent className="max-w-xl p-5">
          <DialogHeader>
            <DialogTitle>{text.statusAction}</DialogTitle>
            <DialogDescription>{text.detailDescription}</DialogDescription>
          </DialogHeader>
          <form action={action} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="employmentId" value={staff.id} />
            <input type="hidden" name="revision" value={staff.revision} />
            <div className="space-y-2">
              <Label htmlFor="staff-transition">{text.action}</Label>
              <NativeSelect
                id="staff-transition"
                name="transition"
                disabled={pending}
                required
              >
                <option value="on_leave">{text.onLeaveAction}</option>
                <option value="reactivate">{text.reactivateAction}</option>
                <option value="end">{text.endAction}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-effective-on">{text.effectiveDate}</Label>
              <Input
                id="staff-effective-on"
                name="effectiveOn"
                type="date"
                defaultValue={defaultEffectiveOn}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-exit-reason">{text.reason}</Label>
              <NativeSelect
                id="staff-exit-reason"
                name="exitReason"
                disabled={pending}
              >
                <option value="">{text.selectReason}</option>
                <option value="MATERNITY_LEAVE">{text.maternityLeave}</option>
                <option value="RESIGNED">{text.resigned}</option>
                <option value="TERMINATED">{text.terminated}</option>
                <option value="CONTRACT_ENDED">{text.contractEnded}</option>
                <option value="HEALTH">{text.health}</option>
                <option value="RELOCATION">{text.relocation}</option>
                <option value="OTHER">{text.other}</option>
                <option value="UNKNOWN">{text.unknown}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="staff-transition-note">{text.note}</Label>
              <Textarea
                id="staff-transition-note"
                name="note"
                rows={3}
                disabled={pending}
              />
            </div>
            <div className="space-y-3 sm:col-span-2">
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
                <Button type="submit" disabled={pending}>
                  {pending ? messages.common.processing : text.saveStatus}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function PhotoCard({
  staff,
  canManage,
  messages,
}: {
  staff: StaffDetail;
  canManage: boolean;
  messages: StaffMessages;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    uploadStaffPhotoAction,
    initialState,
  );
  useCloseOnSuccess(state, setOpen);
  const text = messages.staff;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card size="sm">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{text.staffPhotoTitle}</CardTitle>
              <CardDescription className="mt-1">
                {text.staffPhotoDescription}
              </CardDescription>
            </div>
            {canManage ? (
              <DialogTrigger asChild>
                <Button type="button" size="sm">
                  {staff.photoUrl ? <Pencil aria-hidden /> : <Plus aria-hidden />}
                  {text.uploadStaffPhoto}
                </Button>
              </DialogTrigger>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {staff.photoUrl ? (
            <Image
              src={staff.photoUrl}
              alt={staff.fullName}
              width={320}
              height={320}
              className="mx-auto aspect-square w-full max-w-56 rounded-xl object-cover"
            />
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center rounded-xl bg-muted/45 text-center">
              <UserRound className="size-10 text-primary" aria-hidden />
              <p className="mt-3 text-sm font-medium">{text.noStaffPhoto}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {text.staffPhotoHelp}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {open ? (
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <DialogTitle>{text.uploadStaffPhoto}</DialogTitle>
            <DialogDescription>{text.staffPhotoHelp}</DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <input type="hidden" name="employmentId" value={staff.id} />
            <div>
              <Label htmlFor="staff-photo">{text.staffPhoto}</Label>
              <Input
                id="staff-photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={pending}
                className="mt-2"
                required
              />
              <FieldError state={state} field="photo" id="staff-photo-error" />
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
              <Button type="submit" disabled={pending}>
                {pending ? text.uploadingStaffPhoto : text.uploadStaffPhoto}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function HrProfileCard({
  staff,
  canManageStaff,
  canManageIdentity,
  identityProtectionReady,
  messages,
}: {
  staff: StaffDetail;
  canManageStaff: boolean;
  canManageIdentity: boolean;
  identityProtectionReady: boolean;
  messages: StaffMessages;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    saveStaffHrProfileAction,
    initialState,
  );
  useCloseOnSuccess(state, setOpen);
  const text = messages.staff;
  const profile = staff.hrProfile;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card size="sm">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{text.hrProfileTitle}</CardTitle>
              <CardDescription className="mt-1">
                {text.hrProfileDescription}
              </CardDescription>
            </div>
            {canManageStaff ? (
              <DialogTrigger asChild>
                <Button type="button" size="sm">
                  <Pencil aria-hidden />
                  {text.editHrProfile}
                </Button>
              </DialogTrigger>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Definition label={text.residenceCity}>
              {profile?.residenceCity ?? "—"}
            </Definition>
            <Definition label={text.neighborhood}>
              {profile?.neighborhood ?? "—"}
            </Definition>
            <Definition label={text.emergencyContactName}>
              {profile?.emergencyContactName ?? "—"}
            </Definition>
            <Definition label={text.emergencyContactRelation}>
              {profile?.emergencyContactRelation ?? "—"}
            </Definition>
            <Definition label={text.emergencyContactPhone}>
              {profile?.emergencyContactPhone ?? "—"}
            </Definition>
            <Definition label={text.internalNote}>
              {profile?.internalNote ?? "—"}
            </Definition>
          </dl>
          <div className="rounded-lg bg-muted/35 p-3 text-sm">
            <p className="font-medium">{text.identityInformation}</p>
            {staff.identities.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {staff.identities.map((identity) => (
                  <Badge key={identity.id} variant="outline">
                    {identityTypeLabel(identity.type, text)} ·{" "}
                    {formatMessage(text.identityMasked, {
                      lastFour: identity.lastFour,
                    })}
                    {identity.countryCode ? ` · ${identity.countryCode}` : ""}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-muted-foreground">
                {text.noIdentityRecord}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      {open ? (
        <DialogContent className="max-w-3xl p-5">
          <DialogHeader>
            <DialogTitle>{text.editHrProfile}</DialogTitle>
            <DialogDescription>{text.hrProfileDescription}</DialogDescription>
          </DialogHeader>
          <form action={action} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="employmentId" value={staff.id} />
            <input type="hidden" name="revision" value={staff.revision} />
            <div className="space-y-2">
              <Label htmlFor="staff-residence-city">{text.residenceCity}</Label>
              <Input
                id="staff-residence-city"
                name="residenceCity"
                defaultValue={profile?.residenceCity ?? ""}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.residenceCity)}
              />
              <FieldError
                state={state}
                field="residenceCity"
                id="staff-residence-city-error"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-neighborhood">{text.neighborhood}</Label>
              <Input
                id="staff-neighborhood"
                name="neighborhood"
                defaultValue={profile?.neighborhood ?? ""}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.neighborhood)}
              />
              <FieldError
                state={state}
                field="neighborhood"
                id="staff-neighborhood-error"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="staff-address-line">{text.addressLine}</Label>
              <Textarea
                id="staff-address-line"
                name="addressLine"
                defaultValue={profile?.addressLine ?? ""}
                rows={2}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.addressLine)}
              />
              <FieldError
                state={state}
                field="addressLine"
                id="staff-address-line-error"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-emergency-name">
                {text.emergencyContactName}
              </Label>
              <Input
                id="staff-emergency-name"
                name="emergencyContactName"
                defaultValue={profile?.emergencyContactName ?? ""}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.emergencyContactName)}
              />
              <FieldError
                state={state}
                field="emergencyContactName"
                id="staff-emergency-name-error"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-emergency-relation">
                {text.emergencyContactRelation}
              </Label>
              <Input
                id="staff-emergency-relation"
                name="emergencyContactRelation"
                defaultValue={profile?.emergencyContactRelation ?? ""}
                disabled={pending}
                aria-invalid={Boolean(
                  state.fieldErrors?.emergencyContactRelation,
                )}
              />
              <FieldError
                state={state}
                field="emergencyContactRelation"
                id="staff-emergency-relation-error"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-emergency-phone">
                {text.emergencyContactPhone}
              </Label>
              <Input
                id="staff-emergency-phone"
                name="emergencyContactPhone"
                defaultValue={profile?.emergencyContactPhone ?? ""}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.emergencyContactPhone)}
              />
              <FieldError
                state={state}
                field="emergencyContactPhone"
                id="staff-emergency-phone-error"
              />
            </div>
            {canManageIdentity && identityProtectionReady ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="staff-identity-type">{text.identityType}</Label>
                  <NativeSelect
                    id="staff-identity-type"
                    name="identityType"
                    defaultValue="NATIONAL_ID"
                    disabled={pending}
                  >
                    <option value="NATIONAL_ID">{text.nationalId}</option>
                    <option value="PASSPORT">{text.passport}</option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-identity-country">
                    {text.identityCountry}
                  </Label>
                  <Input
                    id="staff-identity-country"
                    name="identityCountry"
                    placeholder="XK"
                    maxLength={2}
                    disabled={pending}
                    aria-invalid={Boolean(state.fieldErrors?.identityCountry)}
                  />
                  <FieldError
                    state={state}
                    field="identityCountry"
                    id="staff-identity-country-error"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="staff-identity-value">{text.identityValue}</Label>
                  <Input
                    id="staff-identity-value"
                    name="identityValue"
                    autoComplete="off"
                    disabled={pending}
                    aria-invalid={Boolean(state.fieldErrors?.identityValue)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {text.identityHelp}
                  </p>
                  <FieldError
                    state={state}
                    field="identityValue"
                    id="staff-identity-value-error"
                  />
                </div>
              </>
            ) : canManageIdentity ? (
              <Alert className="sm:col-span-2" variant="danger">
                {text.identityUnavailable}
              </Alert>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="staff-internal-note">{text.internalNote}</Label>
              <Textarea
                id="staff-internal-note"
                name="internalNote"
                defaultValue={profile?.internalNote ?? ""}
                rows={2}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.internalNote)}
              />
              <FieldError
                state={state}
                field="internalNote"
                id="staff-internal-note-error"
              />
            </div>
            <div className="space-y-3 sm:col-span-2">
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
                <Button type="submit" disabled={pending}>
                  {pending ? messages.common.saving : text.saveHrProfile}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function ContractDialog({
  staff,
  record,
  defaultEffectiveOn,
  messages,
}: {
  staff: StaffDetail;
  record?: ContractRecord;
  defaultEffectiveOn: string;
  messages: StaffMessages;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    saveEmploymentContractAction,
    initialState,
  );
  useCloseOnSuccess(state, setOpen);
  const text = messages.staff;
  const prefix = record ? `contract-${record.id}` : "new-contract";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size={record ? "xs" : "sm"} variant={record ? "outline" : "default"}>
          {record ? <Pencil aria-hidden /> : <Plus aria-hidden />}
          {record ? messages.common.edit : text.newContractRecord}
        </Button>
      </DialogTrigger>
      {open ? (
        <DialogContent className="max-w-2xl p-5">
          <DialogHeader>
            <DialogTitle>
              {record ? text.updateContract : text.newContractRecord}
            </DialogTitle>
            <DialogDescription>{text.contractsDescription}</DialogDescription>
          </DialogHeader>
          <form action={action} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="employmentId" value={staff.id} />
            {record ? (
              <>
                <input type="hidden" name="contractId" value={record.id} />
                <input type="hidden" name="revision" value={record.revision} />
              </>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${prefix}-template`}>{text.contractTemplate}</Label>
              <NativeSelect
                id={`${prefix}-template`}
                name="contractTemplateId"
                defaultValue={record?.templateId ?? ""}
                disabled={pending}
              >
                <option value="">{text.noContractTemplate}</option>
                {staff.contractTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} · {template.code} · {template.locale.toUpperCase()}
                  </option>
                ))}
                {record?.templateId &&
                !staff.contractTemplates.some(
                  (template) => template.id === record.templateId,
                ) ? (
                  <option value={record.templateId}>
                    {record.templateTitle ?? text.archived}
                  </option>
                ) : null}
              </NativeSelect>
              <FieldError
                state={state}
                field="contractTemplateId"
                id={`${prefix}-template-error`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-number`}>{text.contractNumber}</Label>
              <Input
                id={`${prefix}-number`}
                name="contractNumber"
                defaultValue={record?.contractNumber ?? ""}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.contractNumber)}
                required
              />
              <FieldError
                state={state}
                field="contractNumber"
                id={`${prefix}-number-error`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-type`}>{text.contractType}</Label>
              <NativeSelect
                id={`${prefix}-type`}
                name="contractType"
                defaultValue={record?.type ?? "FIXED_TERM"}
                disabled={pending}
              >
                <option value="INDEFINITE">{text.contractTypeIndefinite}</option>
                <option value="FIXED_TERM">{text.contractTypeFixedTerm}</option>
                <option value="PART_TIME">{text.contractTypePartTime}</option>
                <option value="SERVICE">{text.contractTypeService}</option>
                <option value="INTERN">{text.contractTypeIntern}</option>
                <option value="OTHER">{text.contractTypeOther}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-status`}>{text.contractStatus}</Label>
              <NativeSelect
                id={`${prefix}-status`}
                name="contractStatus"
                defaultValue={record?.status ?? "ACTIVE"}
                disabled={pending}
              >
                <option value="ACTIVE">{text.contractStatusActive}</option>
                <option value="ENDED">{text.contractStatusEnded}</option>
                <option value="CANCELLED">{text.contractStatusCancelled}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-started-on`}>
                {text.contractStartedOn}
              </Label>
              <Input
                id={`${prefix}-started-on`}
                name="contractStartedOn"
                type="date"
                defaultValue={record?.startedOn ?? defaultEffectiveOn}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-ended-on`}>
                {text.contractEndedOn}
              </Label>
              <Input
                id={`${prefix}-ended-on`}
                name="contractEndedOn"
                type="date"
                defaultValue={record?.endedOn ?? ""}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.contractEndedOn)}
              />
              <FieldError
                state={state}
                field="contractEndedOn"
                id={`${prefix}-ended-on-error`}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${prefix}-note`}>{text.contractNote}</Label>
              <Textarea
                id={`${prefix}-note`}
                name="contractNote"
                defaultValue={record?.note ?? ""}
                rows={3}
                disabled={pending}
              />
            </div>
            <div className="space-y-3 sm:col-span-2">
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
                <Button type="submit" disabled={pending}>
                  {pending
                    ? messages.common.saving
                    : record
                      ? text.updateContract
                      : text.saveContract}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function ContractsSection({
  staff,
  canManage,
  defaultEffectiveOn,
  locale,
  messages,
}: {
  staff: StaffDetail;
  canManage: boolean;
  defaultEffectiveOn: string;
  locale: Locale;
  messages: StaffMessages;
}) {
  const text = messages.staff;
  const active =
    staff.contracts.find((contract) => contract.status === "ACTIVE") ?? null;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{text.contractsTitle}</CardTitle>
            <CardDescription className="mt-1">
              {text.contractsDescription}
            </CardDescription>
          </div>
          {canManage ? (
            <ContractDialog
              staff={staff}
              defaultEffectiveOn={defaultEffectiveOn}
              messages={messages}
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {text.activeContract}
          </p>
          {active ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold">{active.contractNumber}</span>
              <span>{contractTypeLabel(active.type, text)}</span>
              <span className="text-muted-foreground">
                {formatDate(active.startedOn, locale)} –{" "}
                {formatDate(active.endedOn, locale)}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {text.noActiveContract}
            </p>
          )}
        </div>
        {staff.contracts.length ? (
          <div className="space-y-2">
            {staff.contracts.map((contract, index) => (
              <div
                key={contract.id}
                className={index % 2 === 1 ? "rounded-lg bg-muted/55 p-3" : "rounded-lg bg-muted/25 p-3"}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{contract.contractNumber}</p>
                      <Badge
                        variant={contract.status === "ACTIVE" ? "success" : "outline"}
                      >
                        {contractStatusLabel(contract.status, text)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {contractTypeLabel(contract.type, text)} ·{" "}
                      {formatDate(contract.startedOn, locale)} –{" "}
                      {formatDate(contract.endedOn, locale)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {contract.templateTitle ?? text.noContractTemplate}
                      {contract.note ? ` · ${contract.note}` : ""}
                    </p>
                  </div>
                  {canManage ? (
                    <ContractDialog
                      staff={staff}
                      record={contract}
                      defaultEffectiveOn={defaultEffectiveOn}
                      messages={messages}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/30 px-4 py-8 text-center">
            <FileText className="mx-auto size-7 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">{text.noContracts}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompensationDialog({
  staff,
  record,
  defaultEffectiveOn,
  messages,
}: {
  staff: StaffDetail;
  record?: CompensationRecord;
  defaultEffectiveOn: string;
  messages: StaffMessages;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    saveEmploymentCompensationAction,
    initialState,
  );
  useCloseOnSuccess(state, setOpen);
  const text = messages.staff;
  const prefix = record ? `compensation-${record.id}` : "new-compensation";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size={record ? "xs" : "sm"} variant={record ? "outline" : "default"}>
          {record ? <Pencil aria-hidden /> : <Plus aria-hidden />}
          {record ? messages.common.edit : text.newCompensationRecord}
        </Button>
      </DialogTrigger>
      {open ? (
        <DialogContent className="max-w-2xl p-5">
          <DialogHeader>
            <DialogTitle>
              {record ? text.updateCompensation : text.newCompensationRecord}
            </DialogTitle>
            <DialogDescription>{text.compensationDescription}</DialogDescription>
          </DialogHeader>
          <form action={action} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="employmentId" value={staff.id} />
            {record ? (
              <>
                <input
                  type="hidden"
                  name="compensationId"
                  value={record.id}
                />
                <input type="hidden" name="revision" value={record.revision} />
              </>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-amount`}>{text.compensationAmount}</Label>
              <Input
                id={`${prefix}-amount`}
                name="compensationAmount"
                inputMode="decimal"
                defaultValue={record?.amount ?? ""}
                placeholder="320.37"
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.compensationAmount)}
                required
              />
              <FieldError
                state={state}
                field="compensationAmount"
                id={`${prefix}-amount-error`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-currency`}>
                {text.compensationCurrency}
              </Label>
              <Input
                id={`${prefix}-currency`}
                name="compensationCurrency"
                defaultValue={record?.currencyCode ?? "EUR"}
                maxLength={3}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.compensationCurrency)}
                required
              />
              <FieldError
                state={state}
                field="compensationCurrency"
                id={`${prefix}-currency-error`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-kind`}>
                {text.compensationAmountKind}
              </Label>
              <NativeSelect
                id={`${prefix}-kind`}
                name="compensationAmountKind"
                defaultValue={record?.amountKind ?? "GROSS"}
                disabled={pending}
              >
                <option value="GROSS">{text.amountKindGross}</option>
                <option value="NET">{text.amountKindNet}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-pay-type`}>
                {text.compensationPayType}
              </Label>
              <NativeSelect
                id={`${prefix}-pay-type`}
                name="compensationPayType"
                defaultValue={record?.payType ?? "MONTHLY"}
                disabled={pending}
              >
                <option value="MONTHLY">{text.payTypeMonthly}</option>
                <option value="HOURLY">{text.payTypeHourly}</option>
                <option value="DAILY">{text.payTypeDaily}</option>
                <option value="LESSON">{text.payTypeLesson}</option>
                <option value="OTHER">{text.payTypeOther}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-status`}>
                {text.compensationStatus}
              </Label>
              <NativeSelect
                id={`${prefix}-status`}
                name="compensationStatus"
                defaultValue={record?.status ?? "ACTIVE"}
                disabled={pending}
              >
                <option value="ACTIVE">{text.compensationStatusActive}</option>
                <option value="ENDED">{text.compensationStatusEnded}</option>
                <option value="CANCELLED">
                  {text.compensationStatusCancelled}
                </option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-started-on`}>
                {text.compensationStartedOn}
              </Label>
              <Input
                id={`${prefix}-started-on`}
                name="compensationStartedOn"
                type="date"
                defaultValue={record?.startedOn ?? defaultEffectiveOn}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-ended-on`}>
                {text.compensationEndedOn}
              </Label>
              <Input
                id={`${prefix}-ended-on`}
                name="compensationEndedOn"
                type="date"
                defaultValue={record?.endedOn ?? ""}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.compensationEndedOn)}
              />
              <FieldError
                state={state}
                field="compensationEndedOn"
                id={`${prefix}-ended-on-error`}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${prefix}-note`}>{text.compensationNote}</Label>
              <Textarea
                id={`${prefix}-note`}
                name="compensationNote"
                defaultValue={record?.note ?? ""}
                rows={3}
                disabled={pending}
              />
            </div>
            <div className="space-y-3 sm:col-span-2">
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
                <Button type="submit" disabled={pending}>
                  {pending
                    ? messages.common.saving
                    : record
                      ? text.updateCompensation
                      : text.saveCompensation}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function CompensationSection({
  staff,
  canManage,
  defaultEffectiveOn,
  locale,
  messages,
}: {
  staff: StaffDetail;
  canManage: boolean;
  defaultEffectiveOn: string;
  locale: Locale;
  messages: StaffMessages;
}) {
  const text = messages.staff;
  const active =
    staff.compensations.find((record) => record.status === "ACTIVE") ?? null;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{text.compensationTitle}</CardTitle>
            <CardDescription className="mt-1">
              {text.compensationDescription}
            </CardDescription>
          </div>
          {canManage ? (
            <CompensationDialog
              staff={staff}
              defaultEffectiveOn={defaultEffectiveOn}
              messages={messages}
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {text.activeCompensation}
          </p>
          {active ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold">
                {formatMoney(active.amount, active.currencyCode, locale)}
              </span>
              <span>{compensationAmountKindLabel(active.amountKind, text)}</span>
              <span>{compensationPayTypeLabel(active.payType, text)}</span>
              <span className="text-muted-foreground">
                {formatDate(active.startedOn, locale)}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {text.noActiveCompensation}
            </p>
          )}
        </div>
        {staff.compensations.length ? (
          <div className="space-y-2">
            {staff.compensations.map((record, index) => (
              <div
                key={record.id}
                className={index % 2 === 1 ? "rounded-lg bg-muted/55 p-3" : "rounded-lg bg-muted/25 p-3"}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {formatMoney(record.amount, record.currencyCode, locale)}
                      </p>
                      <Badge
                        variant={record.status === "ACTIVE" ? "success" : "outline"}
                      >
                        {compensationStatusLabel(record.status, text)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {compensationAmountKindLabel(record.amountKind, text)} ·{" "}
                      {compensationPayTypeLabel(record.payType, text)} ·{" "}
                      {formatDate(record.startedOn, locale)} –{" "}
                      {formatDate(record.endedOn, locale)}
                    </p>
                    {record.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {record.note}
                      </p>
                    ) : null}
                  </div>
                  {canManage ? (
                    <CompensationDialog
                      staff={staff}
                      record={record}
                      defaultEffectiveOn={defaultEffectiveOn}
                      messages={messages}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/30 px-4 py-8 text-center">
            <CircleDollarSign
              className="mx-auto size-7 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-3 text-sm text-muted-foreground">
              {text.noCompensations}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LeaveDialog({
  staff,
  record,
  defaultEffectiveOn,
  messages,
}: {
  staff: StaffDetail;
  record?: LeaveRecord;
  defaultEffectiveOn: string;
  messages: StaffMessages;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    saveEmploymentLeaveAction,
    initialState,
  );
  useCloseOnSuccess(state, setOpen);
  const text = messages.staff;
  const prefix = record ? `leave-${record.id}` : "new-leave";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size={record ? "xs" : "sm"} variant={record ? "outline" : "default"}>
          {record ? <Pencil aria-hidden /> : <Plus aria-hidden />}
          {record ? messages.common.edit : text.newLeaveRecord}
        </Button>
      </DialogTrigger>
      {open ? (
        <DialogContent className="max-w-2xl p-5">
          <DialogHeader>
            <DialogTitle>
              {record ? text.updateLeave : text.newLeaveRecord}
            </DialogTitle>
            <DialogDescription>{text.leaveDescription}</DialogDescription>
          </DialogHeader>
          <form action={action} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="employmentId" value={staff.id} />
            {record ? (
              <>
                <input type="hidden" name="leaveId" value={record.id} />
                <input type="hidden" name="revision" value={record.revision} />
              </>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-kind`}>{text.leaveKind}</Label>
              <NativeSelect
                id={`${prefix}-kind`}
                name="leaveKind"
                defaultValue={record?.kind ?? "ANNUAL"}
                disabled={pending}
              >
                <option value="ANNUAL">{text.leaveKindAnnual}</option>
                <option value="SICK">{text.leaveKindSick}</option>
                <option value="UNPAID">{text.leaveKindUnpaid}</option>
                <option value="MATERNITY">{text.leaveKindMaternity}</option>
                <option value="ADMINISTRATIVE">
                  {text.leaveKindAdministrative}
                </option>
                <option value="OTHER">{text.leaveKindOther}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-status`}>{text.leaveStatus}</Label>
              <NativeSelect
                id={`${prefix}-status`}
                name="leaveStatus"
                defaultValue={record?.status ?? "APPROVED"}
                disabled={pending}
              >
                <option value="PLANNED">{text.leaveStatusPlanned}</option>
                <option value="APPROVED">{text.leaveStatusApproved}</option>
                <option value="CANCELLED">{text.leaveStatusCancelled}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-started-on`}>
                {text.leaveStartedOn}
              </Label>
              <Input
                id={`${prefix}-started-on`}
                name="leaveStartedOn"
                type="date"
                defaultValue={record?.startedOn ?? defaultEffectiveOn}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-ended-on`}>{text.leaveEndedOn}</Label>
              <Input
                id={`${prefix}-ended-on`}
                name="leaveEndedOn"
                type="date"
                defaultValue={record?.endedOn ?? defaultEffectiveOn}
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.leaveEndedOn)}
                required
              />
              <FieldError
                state={state}
                field="leaveEndedOn"
                id={`${prefix}-ended-on-error`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-day-count`}>{text.leaveDayCount}</Label>
              <Input
                id={`${prefix}-day-count`}
                name="leaveDayCount"
                inputMode="decimal"
                defaultValue={record?.dayCount ?? ""}
                placeholder="1"
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.leaveDayCount)}
              />
              <FieldError
                state={state}
                field="leaveDayCount"
                id={`${prefix}-day-count-error`}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${prefix}-note`}>{text.leaveNote}</Label>
              <Textarea
                id={`${prefix}-note`}
                name="leaveNote"
                defaultValue={record?.note ?? ""}
                rows={3}
                disabled={pending}
              />
            </div>
            <div className="space-y-3 sm:col-span-2">
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
                <Button type="submit" disabled={pending}>
                  {pending
                    ? messages.common.saving
                    : record
                      ? text.updateLeave
                      : text.saveLeave}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function LeavesSection({
  staff,
  canManage,
  defaultEffectiveOn,
  locale,
  messages,
}: {
  staff: StaffDetail;
  canManage: boolean;
  defaultEffectiveOn: string;
  locale: Locale;
  messages: StaffMessages;
}) {
  const text = messages.staff;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{text.leaveTitle}</CardTitle>
            <CardDescription className="mt-1">
              {text.leaveDescription}
            </CardDescription>
          </div>
          {canManage ? (
            <LeaveDialog
              staff={staff}
              defaultEffectiveOn={defaultEffectiveOn}
              messages={messages}
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {staff.leaves.length ? (
          <div className="space-y-2">
            {staff.leaves.map((record, index) => (
              <div
                key={record.id}
                className={index % 2 === 1 ? "rounded-lg bg-muted/55 p-3" : "rounded-lg bg-muted/25 p-3"}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {leaveKindLabel(record.kind, text)}
                      </p>
                      <Badge
                        variant={record.status === "APPROVED" ? "success" : record.status === "PLANNED" ? "warning" : "outline"}
                      >
                        {leaveStatusLabel(record.status, text)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(record.startedOn, locale)} –{" "}
                      {formatDate(record.endedOn, locale)} · {record.dayCount}{" "}
                      {text.leaveDayCount.toLocaleLowerCase()}
                    </p>
                    {record.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {record.note}
                      </p>
                    ) : null}
                  </div>
                  {canManage ? (
                    <LeaveDialog
                      staff={staff}
                      record={record}
                      defaultEffectiveOn={defaultEffectiveOn}
                      messages={messages}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/30 px-4 py-8 text-center">
            <CalendarDays
              className="mx-auto size-7 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-3 text-sm text-muted-foreground">{text.noLeaves}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeacherSection({
  staff,
  canManageTeachers,
  messages,
}: {
  staff: StaffDetail;
  canManageTeachers: boolean;
  messages: StaffMessages;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    saveTeacherProfileAction,
    initialState,
  );
  useCloseOnSuccess(state, setOpen);
  const text = messages.staff;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card size="sm">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{text.teacherProfile}</CardTitle>
              <CardDescription className="mt-1">
                {text.titleTranslationsHelp}
              </CardDescription>
            </div>
            {canManageTeachers ? (
              <DialogTrigger asChild>
                <Button type="button" size="sm">
                  {staff.teacherProfile ? <Pencil aria-hidden /> : <Plus aria-hidden />}
                  {text.editTeacherProfile}
                </Button>
              </DialogTrigger>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {staff.teacherProfile ? (
            <div className="space-y-4">
              <dl className="grid gap-4 sm:grid-cols-3">
                <Definition label={text.teacherType}>
                  {staff.teacherProfile.category === "CLASSROOM"
                    ? text.classroomTeacher
                    : text.branchTeacher}
                </Definition>
                <Definition label={text.teacherStatus}>
                  <Badge
                    variant={
                      staff.teacherProfile.status === "ACTIVE"
                        ? "success"
                        : "outline"
                    }
                  >
                    {staff.teacherProfile.status === "ACTIVE"
                      ? text.active
                      : text.onLeave}
                  </Badge>
                </Definition>
                <Definition label={text.teacherProfile}>
                  {staff.teacherProfile.title}
                </Definition>
              </dl>
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {text.subjectCapabilities}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {staff.teacherProfile.subjects.length ? (
                    staff.teacherProfile.subjects.map((subject) => (
                      <Badge key={subject.id} variant="outline">
                        {subject.name}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {text.noSubjectCapabilities}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/30 px-4 py-8 text-center">
              <GraduationCap
                className="mx-auto size-7 text-muted-foreground"
                aria-hidden
              />
              <p className="mt-3 text-sm text-muted-foreground">
                {text.noTeacherProfile}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {open ? (
        <DialogContent className="max-w-3xl p-5">
          <DialogHeader>
            <DialogTitle>{text.editTeacherProfile}</DialogTitle>
            <DialogDescription>{text.titleTranslationsHelp}</DialogDescription>
          </DialogHeader>
          <form action={action} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="employmentId" value={staff.id} />
            <div className="space-y-2">
              <Label htmlFor="teacher-category">{text.teacherType}</Label>
              <NativeSelect
                id="teacher-category"
                name="category"
                defaultValue={staff.teacherProfile?.category ?? "BRANCH"}
                disabled={pending}
              >
                <option value="CLASSROOM">{text.classroomTeacher}</option>
                <option value="BRANCH">{text.branchTeacher}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-status">{text.teacherStatus}</Label>
              <NativeSelect
                id="teacher-status"
                name="teacherStatus"
                defaultValue={staff.teacherProfile?.status ?? "ACTIVE"}
                disabled={pending}
              >
                <option value="ACTIVE">{text.active}</option>
                <option value="INACTIVE">{text.onLeave}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-title-tr">{text.titleTr}</Label>
              <Input
                id="teacher-title-tr"
                name="titleTr"
                defaultValue={staff.teacherProfile?.titleTranslations.tr ?? ""}
                placeholder={text.titleTrPlaceholder}
                disabled={pending}
                required
              />
              <FieldError state={state} field="titleTr" id="teacher-title-tr-error" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-title-sq">{text.titleSq}</Label>
              <Input
                id="teacher-title-sq"
                name="titleSq"
                defaultValue={staff.teacherProfile?.titleTranslations.sq ?? ""}
                placeholder={text.titleSqPlaceholder}
                disabled={pending}
                required
              />
              <FieldError state={state} field="titleSq" id="teacher-title-sq-error" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="teacher-title-en">{text.titleEn}</Label>
              <Input
                id="teacher-title-en"
                name="titleEn"
                defaultValue={staff.teacherProfile?.titleTranslations.en ?? ""}
                placeholder={text.titleEnPlaceholder}
                disabled={pending}
                required
              />
              <FieldError state={state} field="titleEn" id="teacher-title-en-error" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{text.subjectCapabilities}</Label>
              <div className="grid max-h-52 gap-2 overflow-y-auto rounded-lg bg-muted/35 p-3 sm:grid-cols-2">
                {staff.subjects.map((subject) => (
                  <label key={subject.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="subjectIds"
                      value={subject.id}
                      defaultChecked={staff.teacherProfile?.subjectIds.includes(
                        subject.id,
                      )}
                      disabled={pending}
                    />
                    {subject.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="teacher-note">{text.teacherNote}</Label>
              <Textarea
                id="teacher-note"
                name="note"
                defaultValue={staff.teacherProfile?.note ?? ""}
                rows={3}
                disabled={pending}
              />
            </div>
            <div className="space-y-3 sm:col-span-2">
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
                <Button type="submit" disabled={pending}>
                  {pending ? messages.common.saving : text.saveTeacherProfile}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function HistoryCard({
  staff,
  messages,
  limit,
}: {
  staff: StaffDetail;
  messages: StaffMessages;
  limit?: number;
}) {
  const events = limit ? staff.lifecycleEvents.slice(0, limit) : staff.lifecycleEvents;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>{messages.staff.staffHistory}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length ? (
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className="rounded-lg bg-muted/35 p-3 text-sm">
                <p className="font-medium">
                  {event.effectiveOn} · {event.type}
                  {event.exitReason ? ` · ${event.exitReason}` : ""}
                </p>
                {event.note ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {messages.staff.noHistory}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function StaffDetailManager({
  staff,
  canManageStaff,
  canManageTeachers,
  canManageAccounts,
  canReadContracts,
  canManageContracts,
  canReadCompensations,
  canManageCompensations,
  canReadLeaves,
  canManageLeaves,
  canManageIdentity,
  identityProtectionReady,
  initialTab,
  defaultEffectiveOn,
  locale,
  messages,
}: {
  staff: StaffDetail;
  canManageStaff: boolean;
  canManageTeachers: boolean;
  canManageAccounts: boolean;
  canReadContracts: boolean;
  canManageContracts: boolean;
  canReadCompensations: boolean;
  canManageCompensations: boolean;
  canReadLeaves: boolean;
  canManageLeaves: boolean;
  canManageIdentity: boolean;
  identityProtectionReady: boolean;
  initialTab?: string;
  defaultEffectiveOn: string;
  locale: Locale;
  messages: StaffMessages;
}) {
  const text = messages.staff;
  const activeContract =
    staff.contracts.find((contract) => contract.status === "ACTIVE") ?? null;
  const activeCompensation =
    staff.compensations.find((record) => record.status === "ACTIVE") ?? null;
  const statusVariant =
    staff.status === "ACTIVE"
      ? "success"
      : staff.status === "ON_LEAVE"
        ? "warning"
        : "outline";
  const navigation: Array<{
    value: StaffDetailTab;
    label: string;
    icon: typeof BriefcaseBusiness;
    count?: number;
  }> = [
    { value: "overview", label: text.overviewTab, icon: BriefcaseBusiness },
    { value: "profile", label: text.profileTab, icon: IdCard },
    ...(canReadContracts
      ? [
          {
            value: "contracts" as const,
            label: text.contractsTitle,
            icon: FileText,
            count: staff.contracts.length || undefined,
          },
        ]
      : []),
    ...(canReadCompensations
      ? [
          {
            value: "salary" as const,
            label: text.salaryTab,
            icon: CircleDollarSign,
            count: staff.compensations.length || undefined,
          },
        ]
      : []),
    ...(canReadLeaves
      ? [
          {
            value: "leave" as const,
            label: text.leaveTab,
            icon: CalendarDays,
            count: staff.leaves.length || undefined,
          },
        ]
      : []),
    { value: "teaching", label: text.teachingTab, icon: GraduationCap },
    { value: "account", label: text.staffAccountTab, icon: ShieldCheck },
  ];
  const activeTab = navigation.some((item) => item.value === initialTab)
    ? (initialTab as StaffDetailTab)
    : "overview";
  const dockItems: DockItemData[] = navigation.map(
    ({ value, label, icon: Icon, count }) => ({
      id: value,
      href: staffTabHref(staff.id, value),
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
            {staff.photoUrl ? (
              <Image
                src={staff.photoUrl}
                alt={staff.fullName}
                width={72}
                height={72}
                priority
                className="size-14 shrink-0 rounded-lg object-cover sm:size-16"
              />
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-semibold text-primary sm:size-16">
                {initials(staff.firstName, staff.lastName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-primary">
                {text.detailEyebrow}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {staff.fullName}
                </h1>
                <Badge variant={statusVariant}>
                  {employmentStatusLabel(staff.status, text)}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {text.staffNumber}: {staff.staffNumber}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{staff.department}</span>
                <span>{staff.position}</span>
                <span>
                  {text.hiredOn}: {formatDate(staff.hiredOn, locale)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href="/staff">
                <ArrowLeft aria-hidden />
                {text.backToStaff}
              </Link>
            </Button>
            {canManageStaff ? (
              <StatusDialog
                staff={staff}
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
                icon={<BriefcaseBusiness className="size-4" aria-hidden />}
                label={text.employmentType}
                value={employmentTypeLabel(staff.type, text)}
                note={staff.department}
              />
              <SummaryMetric
                icon={<FileText className="size-4" aria-hidden />}
                label={text.activeContract}
                value={activeContract?.contractNumber ?? "—"}
                note={
                  activeContract
                    ? contractTypeLabel(activeContract.type, text)
                    : text.noActiveContract
                }
              />
              <SummaryMetric
                icon={<CircleDollarSign className="size-4" aria-hidden />}
                label={text.activeCompensation}
                value={
                  activeCompensation
                    ? formatMoney(
                        activeCompensation.amount,
                        activeCompensation.currencyCode,
                        locale,
                      )
                    : "—"
                }
                note={
                  activeCompensation
                    ? compensationPayTypeLabel(activeCompensation.payType, text)
                    : text.noActiveCompensation
                }
              />
              <SummaryMetric
                icon={<BookOpenCheck className="size-4" aria-hidden />}
                label={text.teacherProfile}
                value={staff.teacherProfile?.title ?? "—"}
                note={staff.position}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
              <Card size="sm">
                <CardHeader className="border-b">
                  <CardTitle>{text.recordOverview}</CardTitle>
                  <CardDescription>{text.detailDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Definition label={text.staffNumber}>
                      <span className="font-mono">{staff.staffNumber}</span>
                    </Definition>
                    <Definition label={text.department}>
                      {staff.department}
                    </Definition>
                    <Definition label={text.position}>{staff.position}</Definition>
                    <Definition label={text.hiredOn}>
                      {formatDate(staff.hiredOn, locale)}
                    </Definition>
                    <Definition label={text.phone}>{staff.phone ?? "—"}</Definition>
                    <Definition label={text.email}>{staff.email ?? "—"}</Definition>
                    <Definition label={text.note}>{staff.note ?? "—"}</Definition>
                  </dl>
                </CardContent>
              </Card>
              <HistoryCard staff={staff} messages={messages} limit={4} />
            </div>
          </>
        ) : null}

        {activeTab === "profile" ? (
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <PhotoCard
              staff={staff}
              canManage={canManageStaff}
              messages={messages}
            />
            <HrProfileCard
              staff={staff}
              canManageStaff={canManageStaff}
              canManageIdentity={canManageIdentity}
              identityProtectionReady={identityProtectionReady}
              messages={messages}
            />
          </div>
        ) : null}

        {activeTab === "contracts" && canReadContracts ? (
          <ContractsSection
            staff={staff}
            canManage={canManageContracts}
            defaultEffectiveOn={defaultEffectiveOn}
            locale={locale}
            messages={messages}
          />
        ) : null}

        {activeTab === "salary" && canReadCompensations ? (
          <CompensationSection
            staff={staff}
            canManage={canManageCompensations}
            defaultEffectiveOn={defaultEffectiveOn}
            locale={locale}
            messages={messages}
          />
        ) : null}

        {activeTab === "leave" && canReadLeaves ? (
          <LeavesSection
            staff={staff}
            canManage={canManageLeaves}
            defaultEffectiveOn={defaultEffectiveOn}
            locale={locale}
            messages={messages}
          />
        ) : null}

        {activeTab === "teaching" ? (
          <TeacherSection
            staff={staff}
            canManageTeachers={canManageTeachers}
            messages={messages}
          />
        ) : null}

        {activeTab === "account" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <Card size="sm">
              <CardHeader className="border-b">
                <CardTitle>{text.teacherAccount}</CardTitle>
                <CardDescription>{text.detailDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                {staff.teacherProfile ? (
                  <PersonAccountPanel
                    title={text.teacherAccount}
                    portal="TEACHER"
                    personId={staff.personId}
                    existingAccount={staff.teacherAccount}
                    canManage={canManageAccounts}
                  />
                ) : (
                  <div className="rounded-lg bg-muted/30 px-4 py-8 text-center">
                    <ShieldCheck
                      className="mx-auto size-7 text-muted-foreground"
                      aria-hidden
                    />
                    <p className="mt-3 text-sm text-muted-foreground">
                      {text.noTeacherProfile}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <HistoryCard staff={staff} messages={messages} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
