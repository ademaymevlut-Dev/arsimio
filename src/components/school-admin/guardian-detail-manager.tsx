"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CircleDollarSign,
  Pencil,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  archiveGuardian,
  updateGuardian,
} from "@/app/(school-admin)/guardians/actions";
import { suspendPersonAccountAction } from "@/app/(school-admin)/accounts/actions";
import { PersonAccountPanel } from "@/components/school-admin/person-account-panel";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type { AccountState } from "@/lib/account-validation";
import type { GuardianField, GuardianState } from "@/lib/guardian-validation";
import type { GuardianDetailRecord } from "@/server/accounts/accounts";
import type { StudentFinanceContractSummary } from "@/server/finance/finance";

const initialGuardianState: GuardianState = {};
const initialAccountState: AccountState = {};

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toLocaleUpperCase();
}

function Definition({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

function ActionAlert({ state }: { state: GuardianState | AccountState }) {
  if (!state.status || !state.message) return null;
  return (
    <Alert
      variant={state.status === "error" ? "danger" : "success"}
      role={state.status === "error" ? "alert" : "status"}
      className="p-3"
    >
      {state.message}
    </Alert>
  );
}

function FieldError({
  state,
  field,
}: {
  state: GuardianState;
  field: GuardianField;
}) {
  const message = state.fieldErrors?.[field];
  return message ? (
    <p className="mt-1 text-xs text-danger-foreground">{message}</p>
  ) : null;
}

function EditGuardianDialog({
  guardian,
  text,
  common,
}: {
  guardian: GuardianDetailRecord;
  text: AppDictionary["guardians"];
  common: AppDictionary["common"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Pencil aria-hidden />
          {text.editGuardian}
        </Button>
      </DialogTrigger>
      {open ? (
        <EditGuardianDialogContent
          guardian={guardian}
          text={text}
          common={common}
          onOpenChange={setOpen}
        />
      ) : null}
    </Dialog>
  );
}

function EditGuardianDialogContent({
  guardian,
  text,
  common,
  onOpenChange,
}: {
  guardian: GuardianDetailRecord;
  text: AppDictionary["guardians"];
  common: AppDictionary["common"];
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    updateGuardian,
    initialGuardianState,
  );

  useEffect(() => {
    if (state.status !== "success" || !state.message) return;
    toast.success(state.message);
    onOpenChange(false);
  }, [onOpenChange, state.message, state.status]);

  return (
    <DialogContent className="max-w-xl p-5">
      <DialogHeader>
        <DialogTitle>{text.editTitle}</DialogTitle>
        <DialogDescription>{text.editDescription}</DialogDescription>
      </DialogHeader>
      <form action={action} className="space-y-4">
        <input type="hidden" name="personId" value={guardian.personId} />
        <input type="hidden" name="revision" value={guardian.revision} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="guardian-first-name">{text.firstName}</Label>
            <Input
              id="guardian-first-name"
              name="firstName"
              defaultValue={guardian.firstName}
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.firstName)}
              className="mt-1.5"
            />
            <FieldError state={state} field="firstName" />
          </div>
          <div>
            <Label htmlFor="guardian-middle-name">{text.middleName}</Label>
            <Input
              id="guardian-middle-name"
              name="middleName"
              defaultValue={guardian.middleName ?? ""}
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.middleName)}
              className="mt-1.5"
            />
            <FieldError state={state} field="middleName" />
          </div>
          <div>
            <Label htmlFor="guardian-last-name">{text.lastName}</Label>
            <Input
              id="guardian-last-name"
              name="lastName"
              defaultValue={guardian.lastName}
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.lastName)}
              className="mt-1.5"
            />
            <FieldError state={state} field="lastName" />
          </div>
          <div>
            <Label htmlFor="guardian-occupation">{text.occupation}</Label>
            <Input
              id="guardian-occupation"
              name="occupation"
              defaultValue={guardian.occupation ?? ""}
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.occupation)}
              className="mt-1.5"
            />
            <FieldError state={state} field="occupation" />
          </div>
          <div>
            <Label htmlFor="guardian-phone">{text.phone}</Label>
            <Input
              id="guardian-phone"
              name="phone"
              type="tel"
              defaultValue={guardian.phone ?? ""}
              autoComplete="tel"
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.phone)}
              className="mt-1.5"
            />
            <FieldError state={state} field="phone" />
          </div>
          <div>
            <Label htmlFor="guardian-email">{text.email}</Label>
            <Input
              id="guardian-email"
              name="email"
              type="email"
              defaultValue={guardian.email ?? ""}
              autoComplete="email"
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.email)}
              className="mt-1.5"
            />
            <FieldError state={state} field="email" />
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
            {common.cancel}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? common.saving : text.saveGuardian}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function DeactivateGuardianDialog({
  accountId,
  personId,
  text,
  common,
}: {
  accountId: string | null;
  personId: string;
  text: AppDictionary["guardians"];
  common: AppDictionary["common"];
}) {
  const [open, setOpen] = useState(false);
  if (!accountId) {
    return (
      <Button
        type="button"
        size="sm"
        variant="warning"
        disabled
        title={text.deactivateUnavailable}
      >
        <ShieldX aria-hidden />
        {text.deactivateGuardian}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="warning">
          <ShieldX aria-hidden />
          {text.deactivateGuardian}
        </Button>
      </DialogTrigger>
      {open ? (
        <DeactivateGuardianDialogContent
          accountId={accountId}
          personId={personId}
          text={text}
          common={common}
          onOpenChange={setOpen}
        />
      ) : null}
    </Dialog>
  );
}

function DeactivateGuardianDialogContent({
  accountId,
  personId,
  text,
  common,
  onOpenChange,
}: {
  accountId: string;
  personId: string;
  text: AppDictionary["guardians"];
  common: AppDictionary["common"];
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
        <DialogTitle>{text.deactivateTitle}</DialogTitle>
        <DialogDescription>{text.deactivateDescription}</DialogDescription>
      </DialogHeader>
      <form action={action} className="space-y-4">
        <input type="hidden" name="personAccountId" value={accountId} />
        <input type="hidden" name="personId" value={personId} />
        <ActionAlert state={state} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {common.cancel}
          </Button>
          <Button type="submit" variant="warning" disabled={pending}>
            {pending ? common.processing : text.deactivateConfirm}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function DeleteGuardianDialog({
  guardian,
  text,
  common,
}: {
  guardian: GuardianDetailRecord;
  text: AppDictionary["guardians"];
  common: AppDictionary["common"];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    archiveGuardian,
    initialGuardianState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status !== "success" || !state.message) return;
    toast.success(state.message);
    router.replace("/guardians");
    router.refresh();
  }, [router, state.message, state.status]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="danger">
          <Trash2 aria-hidden />
          {text.deleteGuardian}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-5">
        <DialogHeader>
          <DialogTitle>{text.deleteTitle}</DialogTitle>
          <DialogDescription>{text.deleteDescription}</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="personId" value={guardian.personId} />
          <input type="hidden" name="revision" value={guardian.revision} />
          <Alert variant="warning" className="p-3">
            {text.deleteWarning}
          </Alert>
          <ActionAlert state={state} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {common.cancel}
            </Button>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? common.processing : text.deleteConfirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GuardianDetailManager({
  guardian,
  canManageGuardian,
  canManageAccounts,
  canReadFinance,
  financeContracts,
  messages,
}: {
  guardian: GuardianDetailRecord;
  canManageGuardian: boolean;
  canManageAccounts: boolean;
  canReadFinance: boolean;
  financeContracts: StudentFinanceContractSummary[];
  messages: Pick<AppDictionary, "common" | "guardians" | "finance">;
}) {
  const text = messages.guardians;
  const primaryChildren = guardian.children.filter(
    (child) => child.isPrimaryContact,
  ).length;
  const activeAccountId =
    canManageAccounts && guardian.account && !guardian.account.suspendedAt
      ? guardian.account.id
      : null;

  return (
    <div className="space-y-3">
      <section className="rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-semibold text-primary sm:size-16">
              {initials(guardian.firstName, guardian.lastName)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-primary">
                {text.detailEyebrow}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {guardian.fullName}
                </h1>
                {guardian.account ? (
                  <Badge
                    variant={guardian.account.suspendedAt ? "danger" : "success"}
                  >
                    {guardian.account.suspendedAt
                      ? text.suspendedAccount
                      : text.activeAccount}
                  </Badge>
                ) : (
                  <Badge variant="outline">{text.noAccount}</Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {text.detailDescription}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {text.children}: {guardian.children.length}
                </span>
                <span>
                  {text.primary}: {primaryChildren}
                </span>
                {guardian.phone ? <span>{guardian.phone}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href="/guardians">
                <ArrowLeft aria-hidden />
                {text.backToGuardians}
              </Link>
            </Button>
            {canManageGuardian ? (
              <EditGuardianDialog
                guardian={guardian}
                text={text}
                common={messages.common}
              />
            ) : null}
            {canManageAccounts ? (
              <DeactivateGuardianDialog
                accountId={activeAccountId}
                personId={guardian.personId}
                text={text}
                common={messages.common}
              />
            ) : null}
            {canManageGuardian ? (
              <DeleteGuardianDialog
                guardian={guardian}
                text={text}
                common={messages.common}
              />
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
        <div className="space-y-3">
          <Card size="sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4 text-primary" aria-hidden />
                {text.information}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Definition label={text.firstName}>{guardian.firstName}</Definition>
                <Definition label={text.middleName}>
                  {guardian.middleName ?? "—"}
                </Definition>
                <Definition label={text.lastName}>{guardian.lastName}</Definition>
                <Definition label={text.phone}>{guardian.phone ?? "—"}</Definition>
                <Definition label={text.email}>{guardian.email ?? "—"}</Definition>
                <Definition label={text.occupation}>
                  {guardian.occupation ?? "—"}
                </Definition>
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="size-4 text-primary" aria-hidden />
                {text.childrenTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {guardian.children.map((child) => (
                <article
                  key={child.relationshipId}
                  className="flex flex-col justify-between gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {child.fullName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {text.childNumber.replace("{number}", child.studentNumber)} ·{" "}
                      {child.classSection ?? "—"} · {child.academicYear ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{child.relationshipType}</Badge>
                    {child.isPrimaryContact ? (
                      <Badge variant="success">{text.primary}</Badge>
                    ) : null}
                    <Button asChild size="xs">
                      <Link href={`/students/${child.studentProfileId}`}>
                        {text.goToStudent}
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>

          {canReadFinance ? (
            <Card size="sm">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <CircleDollarSign className="size-4 text-primary" aria-hidden />
                  {text.financeTitle}
                </CardTitle>
                <CardDescription>
                  {messages.finance.guardianContractsDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {financeContracts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {messages.finance.noContracts}
                  </p>
                ) : (
                  financeContracts.map((contract) => (
                    <article
                      key={contract.id}
                      className="flex flex-col justify-between gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {contract.displayNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {contract.student.fullName} · {messages.finance.remaining}:{" "}
                          {contract.totals.remainingBalance} {contract.currencyCode}
                        </p>
                      </div>
                      <Button asChild size="xs" variant="outline">
                        <Link href={`/finance?contractId=${contract.id}`}>
                          {messages.finance.viewFinance}
                        </Link>
                      </Button>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card size="sm" className="self-start">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              {text.accountTitle}
            </CardTitle>
            <CardDescription>{text.accountDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <PersonAccountPanel
              title={text.accountTitle}
              portal="GUARDIAN"
              personId={guardian.personId}
              existingAccount={guardian.account}
              canManage={canManageAccounts}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
