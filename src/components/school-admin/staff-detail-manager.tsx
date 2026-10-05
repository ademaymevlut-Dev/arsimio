"use client";

import Image from "next/image";
import { useActionState } from "react";
import {
  saveEmploymentCompensationAction,
  saveEmploymentContractAction,
  saveStaffHrProfileAction,
  saveTeacherProfileAction,
  transitionEmploymentAction,
  uploadStaffPhotoAction,
} from "@/app/(school-admin)/staff/actions";
import type { StaffField, StaffState } from "@/lib/staff-validation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { HTML_LOCALES, type Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { formatMessage } from "@/i18n/format";
import { PersonAccountPanel } from "./person-account-panel";

type StaffMessages = AppDictionary["staff"];
const initialState: StaffState = {};

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
    <p id={id} className="mt-2 text-xs text-danger-foreground">
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
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  photoUpdatedAt: string | null;
  contracts: {
    id: string;
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
  }[];
  compensations: {
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
  }[];
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

export function StaffDetailManager({
  staff,
  canManageStaff,
  canManageTeachers,
  canManageAccounts,
  canReadContracts,
  canManageContracts,
  canReadCompensations,
  canManageCompensations,
  canManageIdentity,
  identityProtectionReady,
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
  canManageIdentity: boolean;
  identityProtectionReady: boolean;
  defaultEffectiveOn: string;
  locale: Locale;
  messages: StaffMessages;
}) {
  const [transitionState, transitionAction, transitionPending] = useActionState<
    StaffState,
    FormData
  >(transitionEmploymentAction, {});
  const [teacherState, teacherAction, teacherPending] = useActionState<
    StaffState,
    FormData
  >(saveTeacherProfileAction, {});
  const [photoState, photoAction, photoPending] = useActionState<
    StaffState,
    FormData
  >(uploadStaffPhotoAction, initialState);
  const [hrProfileState, hrProfileAction, hrProfilePending] = useActionState<
    StaffState,
    FormData
  >(saveStaffHrProfileAction, initialState);
  const [contractState, contractAction, contractPending] = useActionState<
    StaffState,
    FormData
  >(saveEmploymentContractAction, initialState);
  const [compensationState, compensationAction, compensationPending] =
    useActionState<StaffState, FormData>(
      saveEmploymentCompensationAction,
      initialState,
    );
  function employmentStatusLabel(value: string) {
    if (value === "ACTIVE") return messages.active;
    if (value === "ON_LEAVE") return messages.onLeave;
    if (value === "ENDED") return messages.ended;
    return value;
  }
  function identityTypeLabel(value: "NATIONAL_ID" | "PASSPORT") {
    return value === "PASSPORT" ? messages.passport : messages.nationalId;
  }
  function contractTypeLabel(value: StaffDetail["contracts"][number]["type"]) {
    const labels = {
      INDEFINITE: messages.contractTypeIndefinite,
      FIXED_TERM: messages.contractTypeFixedTerm,
      PART_TIME: messages.contractTypePartTime,
      SERVICE: messages.contractTypeService,
      INTERN: messages.contractTypeIntern,
      OTHER: messages.contractTypeOther,
    };
    return labels[value] ?? value;
  }
  function contractStatusLabel(
    value: StaffDetail["contracts"][number]["status"],
  ) {
    const labels = {
      ACTIVE: messages.contractStatusActive,
      ENDED: messages.contractStatusEnded,
      CANCELLED: messages.contractStatusCancelled,
    };
    return labels[value] ?? value;
  }
  function compensationAmountKindLabel(
    value: StaffDetail["compensations"][number]["amountKind"],
  ) {
    const labels = {
      GROSS: messages.amountKindGross,
      NET: messages.amountKindNet,
    };
    return labels[value] ?? value;
  }
  function compensationPayTypeLabel(
    value: StaffDetail["compensations"][number]["payType"],
  ) {
    const labels = {
      MONTHLY: messages.payTypeMonthly,
      HOURLY: messages.payTypeHourly,
      DAILY: messages.payTypeDaily,
      LESSON: messages.payTypeLesson,
      OTHER: messages.payTypeOther,
    };
    return labels[value] ?? value;
  }
  function compensationStatusLabel(
    value: StaffDetail["compensations"][number]["status"],
  ) {
    const labels = {
      ACTIVE: messages.compensationStatusActive,
      ENDED: messages.compensationStatusEnded,
      CANCELLED: messages.compensationStatusCancelled,
    };
    return labels[value] ?? value;
  }
  const hrProfile = staff.hrProfile;
  const activeContract =
    staff.contracts.find((contract) => contract.status === "ACTIVE") ?? null;
  const activeCompensation =
    staff.compensations.find((compensation) => compensation.status === "ACTIVE") ??
    null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
                {messages.staffMember.toUpperCase()} #{staff.staffNumber}
              </p>
              <CardTitle className="mt-2">{staff.fullName}</CardTitle>
            </div>
            <Badge
              variant={
                staff.status === "ACTIVE"
                  ? "success"
                  : staff.status === "ON_LEAVE"
                    ? "warning"
                    : "outline"
              }
            >
              {employmentStatusLabel(staff.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">
                {messages.department}
              </dt>
              <dd className="mt-1 font-medium">{staff.department}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {messages.position}
              </dt>
              <dd className="mt-1 font-medium">{staff.position}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {messages.hiredOn}
              </dt>
              <dd className="mt-1 font-medium">{staff.hiredOn}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{messages.phone}</dt>
              <dd className="mt-1 font-medium">{staff.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{messages.email}</dt>
              <dd className="mt-1 font-medium">{staff.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{messages.note}</dt>
              <dd className="mt-1 font-medium">{staff.note ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {canReadContracts ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{messages.contractsTitle}</CardTitle>
            <CardDescription>{messages.contractsDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{messages.activeContract}</p>
              {activeContract ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">
                      {messages.contractNumber}
                    </span>
                    <p className="font-medium">{activeContract.contractNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {messages.contractType}
                    </span>
                    <p className="font-medium">
                      {contractTypeLabel(activeContract.type)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {messages.contractStartedOn}
                    </span>
                    <p className="font-medium">
                      {formatDate(activeContract.startedOn, locale)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {messages.contractEndedOn}
                    </span>
                    <p className="font-medium">
                      {formatDate(activeContract.endedOn, locale)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  {messages.noActiveContract}
                </p>
              )}
            </div>

            {canManageContracts ? (
              <form
                action={contractAction}
                className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2"
              >
                <input type="hidden" name="employmentId" value={staff.id} />
                <div className="space-y-2">
                  <Label htmlFor="newContractNumber">
                    {messages.contractNumber}
                  </Label>
                  <Input
                    id="newContractNumber"
                    name="contractNumber"
                    disabled={contractPending}
                    aria-invalid={Boolean(contractState.fieldErrors?.contractNumber)}
                    required
                  />
                  <FieldError
                    state={contractState}
                    field="contractNumber"
                    id="new-contract-number-error"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newContractType">{messages.contractType}</Label>
                  <NativeSelect
                    id="newContractType"
                    name="contractType"
                    disabled={contractPending}
                    defaultValue="FIXED_TERM"
                  >
                    <option value="INDEFINITE">
                      {messages.contractTypeIndefinite}
                    </option>
                    <option value="FIXED_TERM">
                      {messages.contractTypeFixedTerm}
                    </option>
                    <option value="PART_TIME">
                      {messages.contractTypePartTime}
                    </option>
                    <option value="SERVICE">{messages.contractTypeService}</option>
                    <option value="INTERN">{messages.contractTypeIntern}</option>
                    <option value="OTHER">{messages.contractTypeOther}</option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newContractStatus">
                    {messages.contractStatus}
                  </Label>
                  <NativeSelect
                    id="newContractStatus"
                    name="contractStatus"
                    disabled={contractPending}
                    defaultValue="ACTIVE"
                  >
                    <option value="ACTIVE">
                      {messages.contractStatusActive}
                    </option>
                    <option value="ENDED">{messages.contractStatusEnded}</option>
                    <option value="CANCELLED">
                      {messages.contractStatusCancelled}
                    </option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newContractStartedOn">
                    {messages.contractStartedOn}
                  </Label>
                  <Input
                    id="newContractStartedOn"
                    name="contractStartedOn"
                    type="date"
                    defaultValue={defaultEffectiveOn}
                    disabled={contractPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newContractEndedOn">
                    {messages.contractEndedOn}
                  </Label>
                  <Input
                    id="newContractEndedOn"
                    name="contractEndedOn"
                    type="date"
                    disabled={contractPending}
                  />
                  <FieldError
                    state={contractState}
                    field="contractEndedOn"
                    id="new-contract-ended-on-error"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="newContractNote">{messages.contractNote}</Label>
                  <Textarea
                    id="newContractNote"
                    name="contractNote"
                    rows={3}
                    disabled={contractPending}
                  />
                </div>
                <div className="space-y-3 sm:col-span-2">
                  <ActionAlert state={contractState} />
                  <Button type="submit" disabled={contractPending}>
                    {messages.saveContract}
                  </Button>
                </div>
              </form>
            ) : null}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                {messages.contractHistory}
              </h3>
              {staff.contracts.length ? (
                staff.contracts.map((contract) => (
                  <details key={contract.id} className="rounded-lg border p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      {contract.contractNumber} · {contractTypeLabel(contract.type)} ·{" "}
                      {contractStatusLabel(contract.status)}
                    </summary>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">
                          {messages.contractStartedOn}
                        </span>
                        <p>{formatDate(contract.startedOn, locale)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {messages.contractEndedOn}
                        </span>
                        <p>{formatDate(contract.endedOn, locale)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {messages.updatedAt}
                        </span>
                        <p>{formatDate(contract.updatedAt.slice(0, 10), locale)}</p>
                      </div>
                      <div className="sm:col-span-4">
                        <span className="text-muted-foreground">
                          {messages.contractNote}
                        </span>
                        <p>{contract.note ?? "—"}</p>
                      </div>
                    </div>
                    {canManageContracts ? (
                      <form
                        action={contractAction}
                        className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2"
                      >
                        <input type="hidden" name="employmentId" value={staff.id} />
                        <input type="hidden" name="contractId" value={contract.id} />
                        <input
                          type="hidden"
                          name="revision"
                          value={contract.revision}
                        />
                        <div className="space-y-2">
                          <Label htmlFor={`contractNumber-${contract.id}`}>
                            {messages.contractNumber}
                          </Label>
                          <Input
                            id={`contractNumber-${contract.id}`}
                            name="contractNumber"
                            defaultValue={contract.contractNumber}
                            disabled={contractPending}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`contractType-${contract.id}`}>
                            {messages.contractType}
                          </Label>
                          <NativeSelect
                            id={`contractType-${contract.id}`}
                            name="contractType"
                            defaultValue={contract.type}
                            disabled={contractPending}
                          >
                            <option value="INDEFINITE">
                              {messages.contractTypeIndefinite}
                            </option>
                            <option value="FIXED_TERM">
                              {messages.contractTypeFixedTerm}
                            </option>
                            <option value="PART_TIME">
                              {messages.contractTypePartTime}
                            </option>
                            <option value="SERVICE">
                              {messages.contractTypeService}
                            </option>
                            <option value="INTERN">
                              {messages.contractTypeIntern}
                            </option>
                            <option value="OTHER">
                              {messages.contractTypeOther}
                            </option>
                          </NativeSelect>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`contractStatus-${contract.id}`}>
                            {messages.contractStatus}
                          </Label>
                          <NativeSelect
                            id={`contractStatus-${contract.id}`}
                            name="contractStatus"
                            defaultValue={contract.status}
                            disabled={contractPending}
                          >
                            <option value="ACTIVE">
                              {messages.contractStatusActive}
                            </option>
                            <option value="ENDED">
                              {messages.contractStatusEnded}
                            </option>
                            <option value="CANCELLED">
                              {messages.contractStatusCancelled}
                            </option>
                          </NativeSelect>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`contractStartedOn-${contract.id}`}>
                            {messages.contractStartedOn}
                          </Label>
                          <Input
                            id={`contractStartedOn-${contract.id}`}
                            name="contractStartedOn"
                            type="date"
                            defaultValue={contract.startedOn}
                            disabled={contractPending}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`contractEndedOn-${contract.id}`}>
                            {messages.contractEndedOn}
                          </Label>
                          <Input
                            id={`contractEndedOn-${contract.id}`}
                            name="contractEndedOn"
                            type="date"
                            defaultValue={contract.endedOn ?? ""}
                            disabled={contractPending}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor={`contractNote-${contract.id}`}>
                            {messages.contractNote}
                          </Label>
                          <Textarea
                            id={`contractNote-${contract.id}`}
                            name="contractNote"
                            defaultValue={contract.note ?? ""}
                            rows={3}
                            disabled={contractPending}
                          />
                        </div>
                        <Button type="submit" disabled={contractPending}>
                          {messages.updateContract}
                        </Button>
                      </form>
                    ) : null}
                  </details>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {messages.noContracts}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {canReadCompensations ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{messages.compensationTitle}</CardTitle>
            <CardDescription>{messages.compensationDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{messages.activeCompensation}</p>
              {activeCompensation ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-5">
                  <div>
                    <span className="text-muted-foreground">
                      {messages.compensationAmount}
                    </span>
                    <p className="font-medium">
                      {formatMoney(
                        activeCompensation.amount,
                        activeCompensation.currencyCode,
                        locale,
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {messages.compensationAmountKind}
                    </span>
                    <p className="font-medium">
                      {compensationAmountKindLabel(activeCompensation.amountKind)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {messages.compensationPayType}
                    </span>
                    <p className="font-medium">
                      {compensationPayTypeLabel(activeCompensation.payType)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {messages.compensationStartedOn}
                    </span>
                    <p className="font-medium">
                      {formatDate(activeCompensation.startedOn, locale)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {messages.compensationEndedOn}
                    </span>
                    <p className="font-medium">
                      {formatDate(activeCompensation.endedOn, locale)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  {messages.noActiveCompensation}
                </p>
              )}
            </div>

            {canManageCompensations ? (
              <form
                action={compensationAction}
                className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2"
              >
                <input type="hidden" name="employmentId" value={staff.id} />
                <div className="space-y-2">
                  <Label htmlFor="newCompensationAmount">
                    {messages.compensationAmount}
                  </Label>
                  <Input
                    id="newCompensationAmount"
                    name="compensationAmount"
                    inputMode="decimal"
                    placeholder="320.37"
                    disabled={compensationPending}
                    aria-invalid={Boolean(
                      compensationState.fieldErrors?.compensationAmount,
                    )}
                    required
                  />
                  <FieldError
                    state={compensationState}
                    field="compensationAmount"
                    id="new-compensation-amount-error"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCompensationCurrency">
                    {messages.compensationCurrency}
                  </Label>
                  <Input
                    id="newCompensationCurrency"
                    name="compensationCurrency"
                    defaultValue="EUR"
                    maxLength={3}
                    disabled={compensationPending}
                    aria-invalid={Boolean(
                      compensationState.fieldErrors?.compensationCurrency,
                    )}
                    required
                  />
                  <FieldError
                    state={compensationState}
                    field="compensationCurrency"
                    id="new-compensation-currency-error"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCompensationAmountKind">
                    {messages.compensationAmountKind}
                  </Label>
                  <NativeSelect
                    id="newCompensationAmountKind"
                    name="compensationAmountKind"
                    defaultValue="GROSS"
                    disabled={compensationPending}
                  >
                    <option value="GROSS">{messages.amountKindGross}</option>
                    <option value="NET">{messages.amountKindNet}</option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCompensationPayType">
                    {messages.compensationPayType}
                  </Label>
                  <NativeSelect
                    id="newCompensationPayType"
                    name="compensationPayType"
                    defaultValue="MONTHLY"
                    disabled={compensationPending}
                  >
                    <option value="MONTHLY">{messages.payTypeMonthly}</option>
                    <option value="HOURLY">{messages.payTypeHourly}</option>
                    <option value="DAILY">{messages.payTypeDaily}</option>
                    <option value="LESSON">{messages.payTypeLesson}</option>
                    <option value="OTHER">{messages.payTypeOther}</option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCompensationStatus">
                    {messages.compensationStatus}
                  </Label>
                  <NativeSelect
                    id="newCompensationStatus"
                    name="compensationStatus"
                    defaultValue="ACTIVE"
                    disabled={compensationPending}
                  >
                    <option value="ACTIVE">
                      {messages.compensationStatusActive}
                    </option>
                    <option value="ENDED">{messages.compensationStatusEnded}</option>
                    <option value="CANCELLED">
                      {messages.compensationStatusCancelled}
                    </option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCompensationStartedOn">
                    {messages.compensationStartedOn}
                  </Label>
                  <Input
                    id="newCompensationStartedOn"
                    name="compensationStartedOn"
                    type="date"
                    defaultValue={defaultEffectiveOn}
                    disabled={compensationPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCompensationEndedOn">
                    {messages.compensationEndedOn}
                  </Label>
                  <Input
                    id="newCompensationEndedOn"
                    name="compensationEndedOn"
                    type="date"
                    disabled={compensationPending}
                  />
                  <FieldError
                    state={compensationState}
                    field="compensationEndedOn"
                    id="new-compensation-ended-on-error"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="newCompensationNote">
                    {messages.compensationNote}
                  </Label>
                  <Textarea
                    id="newCompensationNote"
                    name="compensationNote"
                    rows={3}
                    disabled={compensationPending}
                  />
                </div>
                <div className="space-y-3 sm:col-span-2">
                  <ActionAlert state={compensationState} />
                  <Button type="submit" disabled={compensationPending}>
                    {messages.saveCompensation}
                  </Button>
                </div>
              </form>
            ) : null}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                {messages.compensationHistory}
              </h3>
              {staff.compensations.length ? (
                staff.compensations.map((compensation) => (
                  <details key={compensation.id} className="rounded-lg border p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      {formatMoney(
                        compensation.amount,
                        compensation.currencyCode,
                        locale,
                      )}{" "}
                      · {compensationPayTypeLabel(compensation.payType)} ·{" "}
                      {compensationStatusLabel(compensation.status)}
                    </summary>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">
                          {messages.compensationAmountKind}
                        </span>
                        <p>{compensationAmountKindLabel(compensation.amountKind)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {messages.compensationStartedOn}
                        </span>
                        <p>{formatDate(compensation.startedOn, locale)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {messages.compensationEndedOn}
                        </span>
                        <p>{formatDate(compensation.endedOn, locale)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {messages.updatedAt}
                        </span>
                        <p>
                          {formatDate(
                            compensation.updatedAt.slice(0, 10),
                            locale,
                          )}
                        </p>
                      </div>
                      <div className="sm:col-span-4">
                        <span className="text-muted-foreground">
                          {messages.compensationNote}
                        </span>
                        <p>{compensation.note ?? "—"}</p>
                      </div>
                    </div>
                    {canManageCompensations ? (
                      <form
                        action={compensationAction}
                        className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2"
                      >
                        <input type="hidden" name="employmentId" value={staff.id} />
                        <input
                          type="hidden"
                          name="compensationId"
                          value={compensation.id}
                        />
                        <input
                          type="hidden"
                          name="revision"
                          value={compensation.revision}
                        />
                        <div className="space-y-2">
                          <Label htmlFor={`compensationAmount-${compensation.id}`}>
                            {messages.compensationAmount}
                          </Label>
                          <Input
                            id={`compensationAmount-${compensation.id}`}
                            name="compensationAmount"
                            inputMode="decimal"
                            defaultValue={compensation.amount}
                            disabled={compensationPending}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`compensationCurrency-${compensation.id}`}
                          >
                            {messages.compensationCurrency}
                          </Label>
                          <Input
                            id={`compensationCurrency-${compensation.id}`}
                            name="compensationCurrency"
                            defaultValue={compensation.currencyCode}
                            maxLength={3}
                            disabled={compensationPending}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`compensationAmountKind-${compensation.id}`}
                          >
                            {messages.compensationAmountKind}
                          </Label>
                          <NativeSelect
                            id={`compensationAmountKind-${compensation.id}`}
                            name="compensationAmountKind"
                            defaultValue={compensation.amountKind}
                            disabled={compensationPending}
                          >
                            <option value="GROSS">{messages.amountKindGross}</option>
                            <option value="NET">{messages.amountKindNet}</option>
                          </NativeSelect>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`compensationPayType-${compensation.id}`}
                          >
                            {messages.compensationPayType}
                          </Label>
                          <NativeSelect
                            id={`compensationPayType-${compensation.id}`}
                            name="compensationPayType"
                            defaultValue={compensation.payType}
                            disabled={compensationPending}
                          >
                            <option value="MONTHLY">
                              {messages.payTypeMonthly}
                            </option>
                            <option value="HOURLY">{messages.payTypeHourly}</option>
                            <option value="DAILY">{messages.payTypeDaily}</option>
                            <option value="LESSON">{messages.payTypeLesson}</option>
                            <option value="OTHER">{messages.payTypeOther}</option>
                          </NativeSelect>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`compensationStatus-${compensation.id}`}
                          >
                            {messages.compensationStatus}
                          </Label>
                          <NativeSelect
                            id={`compensationStatus-${compensation.id}`}
                            name="compensationStatus"
                            defaultValue={compensation.status}
                            disabled={compensationPending}
                          >
                            <option value="ACTIVE">
                              {messages.compensationStatusActive}
                            </option>
                            <option value="ENDED">
                              {messages.compensationStatusEnded}
                            </option>
                            <option value="CANCELLED">
                              {messages.compensationStatusCancelled}
                            </option>
                          </NativeSelect>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`compensationStartedOn-${compensation.id}`}
                          >
                            {messages.compensationStartedOn}
                          </Label>
                          <Input
                            id={`compensationStartedOn-${compensation.id}`}
                            name="compensationStartedOn"
                            type="date"
                            defaultValue={compensation.startedOn}
                            disabled={compensationPending}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`compensationEndedOn-${compensation.id}`}>
                            {messages.compensationEndedOn}
                          </Label>
                          <Input
                            id={`compensationEndedOn-${compensation.id}`}
                            name="compensationEndedOn"
                            type="date"
                            defaultValue={compensation.endedOn ?? ""}
                            disabled={compensationPending}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor={`compensationNote-${compensation.id}`}>
                            {messages.compensationNote}
                          </Label>
                          <Textarea
                            id={`compensationNote-${compensation.id}`}
                            name="compensationNote"
                            defaultValue={compensation.note ?? ""}
                            rows={3}
                            disabled={compensationPending}
                          />
                        </div>
                        <Button type="submit" disabled={compensationPending}>
                          {messages.updateCompensation}
                        </Button>
                      </form>
                    ) : null}
                  </details>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {messages.noCompensations}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.staffPhotoTitle}</CardTitle>
          <CardDescription>{messages.staffPhotoDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            {staff.photoUrl ? (
              <Image
                src={staff.photoUrl}
                alt={staff.fullName}
                width={112}
                height={112}
                className="size-28 rounded-xl border object-cover"
              />
            ) : (
              <div className="flex size-28 items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground">
                {messages.noStaffPhoto}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              <p>{messages.staffPhotoHelp}</p>
              {staff.photoUpdatedAt ? (
                <p className="mt-1">
                  {formatDate(staff.photoUpdatedAt.slice(0, 10), locale)}
                </p>
              ) : null}
            </div>
          </div>
          {canManageStaff ? (
            <form
              action={photoAction}
              encType="multipart/form-data"
              className="space-y-3"
            >
              <input type="hidden" name="employmentId" value={staff.id} />
              <div>
                <Label htmlFor="staff-photo">{messages.staffPhoto}</Label>
                <Input
                  id="staff-photo"
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  disabled={photoPending}
                  aria-invalid={Boolean(photoState.fieldErrors?.photo)}
                  className="mt-2"
                />
                <FieldError state={photoState} field="photo" id="staff-photo-error" />
              </div>
              <ActionAlert state={photoState} />
              <Button type="submit" disabled={photoPending}>
                {photoPending ? messages.uploadingStaffPhoto : messages.uploadStaffPhoto}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.hrProfileTitle}</CardTitle>
          <CardDescription>{messages.hrProfileDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{messages.identityInformation}</p>
            {staff.identities.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {staff.identities.map((identity) => (
                  <Badge key={identity.id} variant="outline">
                    {identityTypeLabel(identity.type)} ·{" "}
                    {formatMessage(messages.identityMasked, {
                      lastFour: identity.lastFour,
                    })}
                    {identity.countryCode ? ` · ${identity.countryCode}` : ""}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-muted-foreground">
                {messages.noIdentityRecord}
              </p>
            )}
          </div>

          {canManageStaff ? (
            <form action={hrProfileAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="employmentId" value={staff.id} />
              <input type="hidden" name="revision" value={staff.revision} />
              <div className="space-y-2 sm:col-span-2">
                <h3 className="text-sm font-semibold">
                  {messages.addressInformation}
                </h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffResidenceCity">
                  {messages.residenceCity}
                </Label>
                <Input
                  id="staffResidenceCity"
                  name="residenceCity"
                  defaultValue={hrProfile?.residenceCity ?? ""}
                  aria-invalid={Boolean(hrProfileState.fieldErrors?.residenceCity)}
                  disabled={hrProfilePending}
                />
                <FieldError
                  state={hrProfileState}
                  field="residenceCity"
                  id="staff-residence-city-error"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffNeighborhood">{messages.neighborhood}</Label>
                <Input
                  id="staffNeighborhood"
                  name="neighborhood"
                  defaultValue={hrProfile?.neighborhood ?? ""}
                  aria-invalid={Boolean(hrProfileState.fieldErrors?.neighborhood)}
                  disabled={hrProfilePending}
                />
                <FieldError
                  state={hrProfileState}
                  field="neighborhood"
                  id="staff-neighborhood-error"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staffAddressLine">{messages.addressLine}</Label>
                <Textarea
                  id="staffAddressLine"
                  name="addressLine"
                  defaultValue={hrProfile?.addressLine ?? ""}
                  rows={3}
                  aria-invalid={Boolean(hrProfileState.fieldErrors?.addressLine)}
                  disabled={hrProfilePending}
                />
                <FieldError
                  state={hrProfileState}
                  field="addressLine"
                  id="staff-address-line-error"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <h3 className="text-sm font-semibold">
                  {messages.emergencyContactTitle}
                </h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">
                  {messages.emergencyContactName}
                </Label>
                <Input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  defaultValue={hrProfile?.emergencyContactName ?? ""}
                  aria-invalid={Boolean(
                    hrProfileState.fieldErrors?.emergencyContactName,
                  )}
                  disabled={hrProfilePending}
                />
                <FieldError
                  state={hrProfileState}
                  field="emergencyContactName"
                  id="staff-emergency-name-error"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelation">
                  {messages.emergencyContactRelation}
                </Label>
                <Input
                  id="emergencyContactRelation"
                  name="emergencyContactRelation"
                  defaultValue={hrProfile?.emergencyContactRelation ?? ""}
                  aria-invalid={Boolean(
                    hrProfileState.fieldErrors?.emergencyContactRelation,
                  )}
                  disabled={hrProfilePending}
                />
                <FieldError
                  state={hrProfileState}
                  field="emergencyContactRelation"
                  id="staff-emergency-relation-error"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">
                  {messages.emergencyContactPhone}
                </Label>
                <Input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  defaultValue={hrProfile?.emergencyContactPhone ?? ""}
                  aria-invalid={Boolean(
                    hrProfileState.fieldErrors?.emergencyContactPhone,
                  )}
                  disabled={hrProfilePending}
                />
                <FieldError
                  state={hrProfileState}
                  field="emergencyContactPhone"
                  id="staff-emergency-phone-error"
                />
              </div>

              {canManageIdentity && identityProtectionReady ? (
                <>
                  <div className="space-y-2 sm:col-span-2">
                    <h3 className="text-sm font-semibold">
                      {messages.identityInformation}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {messages.identityHelp}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staffIdentityType">
                      {messages.identityType}
                    </Label>
                    <NativeSelect
                      id="staffIdentityType"
                      name="identityType"
                      defaultValue="NATIONAL_ID"
                      disabled={hrProfilePending}
                    >
                      <option value="NATIONAL_ID">{messages.nationalId}</option>
                      <option value="PASSPORT">{messages.passport}</option>
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staffIdentityCountry">
                      {messages.identityCountry}
                    </Label>
                    <Input
                      id="staffIdentityCountry"
                      name="identityCountry"
                      placeholder="XK"
                      maxLength={2}
                      aria-invalid={Boolean(
                        hrProfileState.fieldErrors?.identityCountry,
                      )}
                      disabled={hrProfilePending}
                    />
                    <FieldError
                      state={hrProfileState}
                      field="identityCountry"
                      id="staff-identity-country-error"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="staffIdentityValue">
                      {messages.identityValue}
                    </Label>
                    <Input
                      id="staffIdentityValue"
                      name="identityValue"
                      autoComplete="off"
                      aria-invalid={Boolean(
                        hrProfileState.fieldErrors?.identityValue,
                      )}
                      disabled={hrProfilePending}
                    />
                    <FieldError
                      state={hrProfileState}
                      field="identityValue"
                      id="staff-identity-value-error"
                    />
                  </div>
                </>
              ) : canManageIdentity ? (
                <Alert className="sm:col-span-2" variant="danger">
                  {messages.identityUnavailable}
                </Alert>
              ) : null}

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staffInternalNote">{messages.internalNote}</Label>
                <Textarea
                  id="staffInternalNote"
                  name="internalNote"
                  defaultValue={hrProfile?.internalNote ?? ""}
                  rows={3}
                  aria-invalid={Boolean(hrProfileState.fieldErrors?.internalNote)}
                  disabled={hrProfilePending}
                />
                <FieldError
                  state={hrProfileState}
                  field="internalNote"
                  id="staff-internal-note-error"
                />
              </div>
              <div className="space-y-3 sm:col-span-2">
                <ActionAlert state={hrProfileState} />
                <Button type="submit" disabled={hrProfilePending}>
                  {messages.saveHrProfile}
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">
                  {messages.residenceCity}
                </dt>
                <dd className="mt-1 font-medium">
                  {hrProfile?.residenceCity ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {messages.emergencyContactName}
                </dt>
                <dd className="mt-1 font-medium">
                  {hrProfile?.emergencyContactName ?? "—"}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {canManageStaff ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{messages.statusAction}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={transitionAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="employmentId" value={staff.id} />
              <input type="hidden" name="revision" value={staff.revision} />
              <div className="space-y-2">
                <Label htmlFor="transition">{messages.action}</Label>
                <NativeSelect id="transition" name="transition" required>
                  <option value="on_leave">{messages.onLeaveAction}</option>
                  <option value="reactivate">{messages.reactivateAction}</option>
                  <option value="end">{messages.endAction}</option>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveOn">{messages.effectiveDate}</Label>
                <Input
                  id="effectiveOn"
                  name="effectiveOn"
                  type="date"
                  defaultValue={defaultEffectiveOn}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitReason">{messages.reason}</Label>
                <NativeSelect id="exitReason" name="exitReason">
                  <option value="">{messages.selectReason}</option>
                  <option value="MATERNITY_LEAVE">
                    {messages.maternityLeave}
                  </option>
                  <option value="RESIGNED">{messages.resigned}</option>
                  <option value="TERMINATED">{messages.terminated}</option>
                  <option value="CONTRACT_ENDED">{messages.contractEnded}</option>
                  <option value="HEALTH">{messages.health}</option>
                  <option value="RELOCATION">{messages.relocation}</option>
                  <option value="OTHER">{messages.other}</option>
                  <option value="UNKNOWN">{messages.unknown}</option>
                </NativeSelect>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="transitionNote">{messages.note}</Label>
                <Textarea id="transitionNote" name="note" rows={3} />
              </div>
              {transitionState.status ? (
                <Alert
                  className="sm:col-span-2"
                  variant={transitionState.status === "error" ? "danger" : "success"}
                >
                  {transitionState.message}
                </Alert>
              ) : null}
              <Button type="submit" disabled={transitionPending}>
                {messages.saveStatus}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.teacherProfile}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {canManageTeachers ? (
            <form action={teacherAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="employmentId" value={staff.id} />
              <div className="space-y-2">
                <Label htmlFor="category">{messages.teacherType}</Label>
                <NativeSelect
                  id="category"
                  name="category"
                  defaultValue={staff.teacherProfile?.category ?? "BRANCH"}
                >
                  <option value="CLASSROOM">{messages.classroomTeacher}</option>
                  <option value="BRANCH">{messages.branchTeacher}</option>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherStatus">{messages.teacherStatus}</Label>
                <NativeSelect
                  id="teacherStatus"
                  name="teacherStatus"
                  defaultValue={staff.teacherProfile?.status ?? "ACTIVE"}
                >
                  <option value="ACTIVE">{messages.active}</option>
                  <option value="INACTIVE">{messages.onLeave}</option>
                </NativeSelect>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  {messages.titleTranslationsHelp}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleTr">{messages.titleTr}</Label>
                <Input
                  id="titleTr"
                  name="titleTr"
                  defaultValue={staff.teacherProfile?.titleTranslations.tr ?? ""}
                  placeholder={messages.titleTrPlaceholder}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleSq">{messages.titleSq}</Label>
                <Input
                  id="titleSq"
                  name="titleSq"
                  defaultValue={staff.teacherProfile?.titleTranslations.sq ?? ""}
                  placeholder={messages.titleSqPlaceholder}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="titleEn">{messages.titleEn}</Label>
                <Input
                  id="titleEn"
                  name="titleEn"
                  defaultValue={staff.teacherProfile?.titleTranslations.en ?? ""}
                  placeholder={messages.titleEnPlaceholder}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{messages.subjectCapabilities}</Label>
                <div className="grid max-h-64 gap-2 overflow-auto rounded-lg border bg-background p-3 sm:grid-cols-2">
                  {staff.subjects.map((subject) => (
                    <label key={subject.id} className="flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="subjectIds"
                        value={subject.id}
                        defaultChecked={staff.teacherProfile?.subjectIds.includes(
                          subject.id,
                        )}
                      />
                      {subject.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="teacherNote">{messages.teacherNote}</Label>
                <Textarea
                  id="teacherNote"
                  name="note"
                  defaultValue={staff.teacherProfile?.note ?? ""}
                  rows={3}
                />
              </div>
              {teacherState.status ? (
                <Alert
                  className="sm:col-span-2"
                  variant={teacherState.status === "error" ? "danger" : "success"}
                >
                  {teacherState.message}
                </Alert>
              ) : null}
              <Button type="submit" disabled={teacherPending}>
                {messages.saveTeacherProfile}
              </Button>
            </form>
          ) : staff.teacherProfile ? (
            <div className="space-y-2 text-sm">
              <p>{staff.teacherProfile.title}</p>
              <p className="text-muted-foreground">
                {staff.teacherProfile.subjects.map((s) => s.name).join(", ") ||
                  messages.noSubjectCapabilities}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {messages.noTeacherProfile}
            </p>
          )}

          {staff.teacherProfile ? (
            <PersonAccountPanel
              title={messages.teacherAccount}
              portal="TEACHER"
              personId={staff.personId}
              existingAccount={staff.teacherAccount}
              canManage={canManageAccounts}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.staffHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {staff.lifecycleEvents.map((event) => (
              <div key={event.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {event.effectiveOn} · {event.type}
                  {event.exitReason ? ` · ${event.exitReason}` : ""}
                </p>
                {event.note ? (
                  <p className="mt-1 text-muted-foreground">{event.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
