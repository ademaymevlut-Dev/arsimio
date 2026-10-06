"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Plus } from "lucide-react";
import {
  saveStudentFinanceContractAction,
  saveStudentFinanceContractItemAction,
  saveStudentFinanceInstallmentPlanAction,
  saveStudentFinancePaymentAction,
} from "@/app/(school-admin)/finance/actions";
import { DataTableShell, TableEmptyState } from "@/components/admin/data-table-shell";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type { FinanceState } from "@/lib/finance-validation";
import type {
  StudentFinanceContext,
  StudentFinanceContractDetail,
  StudentFinanceContractSummary,
  StudentFinanceOverview,
} from "@/server/finance/finance";

const initialState: FinanceState = {};

const itemKinds = [
  "TUITION",
  "MEAL",
  "TRANSPORT",
  "UNIFORM",
  "BOOK_MATERIAL",
  "EXAM_ACTIVITY",
  "OTHER",
  "LATE_FEE",
] as const;

type FinanceMessages = AppDictionary["finance"];

function StateAlert({ state }: { state: FinanceState }) {
  if (!state.status || !state.message) return null;
  return (
    <Alert variant={state.status === "error" ? "danger" : "success"}>
      {state.message}
    </Alert>
  );
}

function FieldError({
  state,
  field,
}: {
  state: FinanceState;
  field: keyof NonNullable<FinanceState["fieldErrors"]>;
}) {
  const message = state.fieldErrors?.[field];
  return message ? <p className="text-xs text-danger-foreground">{message}</p> : null;
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "danger"
            ? "mt-2 text-xl font-semibold text-danger-foreground"
            : tone === "success"
              ? "mt-2 text-xl font-semibold text-success-foreground"
              : "mt-2 text-xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Hidden({ name, value }: { name: string; value: string | number }) {
  return <input type="hidden" name={name} value={value} />;
}

function money(value: string, currencyCode: string, locale: Locale) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return `${value} ${currencyCode}`;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function dateLabel(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function statusBadge(status: string, messages: FinanceMessages) {
  if (status === "ACTIVE")
    return <Badge variant="success">{messages.statusActive}</Badge>;
  if (status === "DRAFT")
    return <Badge variant="warning">{messages.statusDraft}</Badge>;
  if (status === "CANCELLED")
    return <Badge variant="danger">{messages.statusCancelled}</Badge>;
  if (status === "ARCHIVED")
    return <Badge variant="outline">{messages.statusArchived}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type FinanceOverviewLine = StudentFinanceOverview["debtors"][number];

function guardianContact(line: FinanceOverviewLine) {
  return (
    line.responsibleGuardian.phone ??
    line.responsibleGuardian.email ??
    "—"
  );
}

function FinanceOverviewTable({
  title,
  description,
  emptyTitle,
  lines,
  locale,
  messages,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  lines: FinanceOverviewLine[];
  locale: Locale;
  messages: FinanceMessages;
}) {
  return (
    <DataTableShell
      title={title}
      description={description}
      footer={`${lines.length} ${messages.records}`}
    >
      {lines.length === 0 ? (
        <TableEmptyState title={emptyTitle} description={description} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{messages.protocolNumber}</TableHead>
              <TableHead>{messages.student}</TableHead>
              <TableHead>{messages.responsibleGuardian}</TableHead>
              <TableHead>{messages.dueDate}</TableHead>
              <TableHead>{messages.amount}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow
                key={`${line.contractId}-${line.label}-${line.dueDate ?? "balance"}`}
              >
                <TableCell>
                  <Link
                    href={`/finance?contractId=${line.contractId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {line.displayNumber}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {line.label}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{line.student.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    No: {line.student.studentNumber}
                  </p>
                </TableCell>
                <TableCell>
                  <p>{line.responsibleGuardian.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {messages.contact}: {guardianContact(line)}
                  </p>
                </TableCell>
                <TableCell>
                  {line.dueDate ? dateLabel(line.dueDate, locale) : "—"}
                </TableCell>
                <TableCell>
                  {money(line.amount, line.currencyCode, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataTableShell>
  );
}

function FinanceOverview({
  overview,
  locale,
  messages,
}: {
  overview: StudentFinanceOverview;
  locale: Locale;
  messages: FinanceMessages;
}) {
  return (
    <Section
      title={messages.overviewTitle}
      description={messages.overviewDescription}
    >
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
        <StatCard
          label={messages.activeContracts}
          value={String(overview.totals.activeContractCount)}
        />
        <StatCard
          label={messages.grossTotal}
          value={money(overview.totals.grossTotal, overview.currencyCode, locale)}
        />
        <StatCard
          label={messages.discountTotal}
          value={money(
            overview.totals.discountTotal,
            overview.currencyCode,
            locale,
          )}
        />
        <StatCard
          label={messages.netTotal}
          value={money(overview.totals.netTotal, overview.currencyCode, locale)}
        />
        <StatCard
          label={messages.totalPaid}
          value={money(overview.totals.totalPaid, overview.currencyCode, locale)}
          tone="success"
        />
        <StatCard
          label={messages.remaining}
          value={money(
            overview.totals.remainingBalance,
            overview.currencyCode,
            locale,
          )}
          tone="danger"
        />
        <StatCard
          label={messages.overpaid}
          value={money(
            overview.totals.overpaidAmount,
            overview.currencyCode,
            locale,
          )}
        />
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold">{messages.managementOutputs}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {messages.managementOutputsDescription}
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <FinanceOverviewTable
            title={messages.debtorsTitle}
            description={messages.debtorsDescription}
            emptyTitle={messages.noDebtors}
            lines={overview.debtors}
            locale={locale}
            messages={messages}
          />
          <FinanceOverviewTable
            title={messages.overdueDuesTitle}
            description={messages.overdueDuesDescription}
            emptyTitle={messages.noOverdueDues}
            lines={overview.overdueDues}
            locale={locale}
            messages={messages}
          />
          <FinanceOverviewTable
            title={messages.upcomingDuesTitle}
            description={messages.upcomingDuesDescription}
            emptyTitle={messages.noUpcomingDues}
            lines={overview.upcomingDues}
            locale={locale}
            messages={messages}
          />
        </div>
      </div>
    </Section>
  );
}

function ContractForm({
  context,
  today,
  messages,
}: {
  context: StudentFinanceContext;
  today: string;
  messages: FinanceMessages;
}) {
  const [state, action, pending] = useActionState<FinanceState, FormData>(
    saveStudentFinanceContractAction,
    initialState,
  );
  const [studentId, setStudentId] = useState(context.students[0]?.id ?? "");
  const selectedStudent = useMemo(
    () => context.students.find((student) => student.id === studentId),
    [context.students, studentId],
  );
  const guardians = selectedStudent?.guardians ?? [];
  const defaultGuardian =
    guardians.find((guardian) => guardian.isFinancialResponsible) ??
    guardians.find((guardian) => guardian.isPrimaryContact) ??
    guardians[0];

  return (
    <Section title={messages.createContractTitle} description={messages.createContractDescription}>
      <form action={action} className="space-y-4">
        <StateAlert state={state} />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="finance-student">{messages.student}</Label>
            <NativeSelect
              id="finance-student"
              name="studentProfileId"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              disabled={pending || context.students.length === 0}
              required
            >
              {context.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.studentNumber} · {student.fullName}
                </option>
              ))}
            </NativeSelect>
            <FieldError state={state} field="studentProfileId" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finance-guardian">{messages.responsibleGuardian}</Label>
            <NativeSelect
              id="finance-guardian"
              name="responsibleGuardianRelationshipId"
              defaultValue={defaultGuardian?.relationshipId ?? ""}
              key={studentId}
              disabled={pending || guardians.length === 0}
              required
            >
              {guardians.length === 0 ? (
                <option value="">{messages.noGuardian}</option>
              ) : (
                guardians.map((guardian) => (
                  <option key={guardian.relationshipId} value={guardian.relationshipId}>
                    {guardian.fullName}
                    {guardian.isFinancialResponsible
                      ? ` · ${messages.financialResponsible}`
                      : ""}
                  </option>
                ))
              )}
            </NativeSelect>
            <FieldError state={state} field="responsibleGuardianRelationshipId" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finance-year">{messages.academicYear}</Label>
            <NativeSelect
              id="finance-year"
              name="academicYearId"
              disabled={pending || context.academicYears.length === 0}
              required
            >
              {context.academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError state={state} field="academicYearId" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finance-protocol">{messages.protocolNumber}</Label>
            <Input
              id="finance-protocol"
              name="protocolNumber"
              placeholder="161/17"
              disabled={pending}
              required
            />
            <FieldError state={state} field="protocolNumber" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finance-issued-on">{messages.issuedOn}</Label>
            <Input
              id="finance-issued-on"
              name="issuedOn"
              type="date"
              defaultValue={today}
              disabled={pending}
              required
            />
            <FieldError state={state} field="issuedOn" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finance-status">{messages.status}</Label>
            <NativeSelect
              id="finance-status"
              name="contractStatus"
              defaultValue="ACTIVE"
              disabled={pending}
            >
              <option value="DRAFT">{messages.statusDraft}</option>
              <option value="ACTIVE">{messages.statusActive}</option>
              <option value="CANCELLED">{messages.statusCancelled}</option>
            </NativeSelect>
          </div>
          <Hidden name="currencyCode" value="EUR" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending || guardians.length === 0}>
            <Plus aria-hidden />
            {pending ? messages.processing : messages.createContract}
          </Button>
        </div>
      </form>
    </Section>
  );
}

function ContractList({
  contracts,
  selectedContractId,
  locale,
  messages,
}: {
  contracts: StudentFinanceContractSummary[];
  selectedContractId: string | null;
  locale: Locale;
  messages: FinanceMessages;
}) {
  return (
    <DataTableShell
      title={messages.listTitle}
      description={messages.listDescription}
      footer={`${contracts.length} ${messages.records}`}
    >
      {contracts.length === 0 ? (
        <TableEmptyState
          title={messages.noContracts}
          description={messages.noContractsDescription}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{messages.protocolNumber}</TableHead>
              <TableHead>{messages.student}</TableHead>
              <TableHead>{messages.responsibleGuardian}</TableHead>
              <TableHead>{messages.remaining}</TableHead>
              <TableHead>{messages.status}</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">{messages.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow
                key={contract.id}
                className={
                  selectedContractId === contract.id ? "bg-primary/5" : undefined
                }
              >
                <TableCell>
                  <Link
                    href={`/finance?contractId=${contract.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {contract.displayNumber}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dateLabel(contract.issuedOn, locale)}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{contract.student.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    No: {contract.student.studentNumber}
                  </p>
                </TableCell>
                <TableCell>
                  <p>{contract.responsibleGuardian.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {contract.responsibleGuardian.phone ??
                      contract.responsibleGuardian.email ??
                      "—"}
                  </p>
                </TableCell>
                <TableCell>
                  {money(
                    contract.totals.remainingBalance,
                    contract.currencyCode,
                    locale,
                  )}
                </TableCell>
                <TableCell>{statusBadge(contract.status, messages)}</TableCell>
                <TableCell>
                  <Button asChild size="icon" variant="ghost">
                    <Link href={`/finance?contractId=${contract.id}`}>
                      <ArrowRight aria-hidden />
                      <span className="sr-only">{messages.viewContract}</span>
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataTableShell>
  );
}

function CostDetails({
  contract,
  messages,
  locale,
  canManage,
}: {
  contract: StudentFinanceContractDetail;
  messages: FinanceMessages;
  locale: Locale;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState<FinanceState, FormData>(
    saveStudentFinanceContractItemAction,
    initialState,
  );
  return (
    <div className="space-y-5">
      {canManage && (
        <form action={action} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-6">
          <Hidden name="contractId" value={contract.id} />
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="item-kind">{messages.itemKind}</Label>
            <NativeSelect id="item-kind" name="itemKind" disabled={pending}>
              {itemKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {messages.itemKindLabels[kind]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="item-description">{messages.itemDescription}</Label>
            <Input id="item-description" name="itemDescription" disabled={pending} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gross-amount">{messages.grossAmount}</Label>
            <Input id="gross-amount" name="grossAmount" inputMode="decimal" disabled={pending} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discount-rate">{messages.discountRate}</Label>
            <Input id="discount-rate" name="discountRate" inputMode="decimal" defaultValue="0" disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-sort">{messages.sortOrder}</Label>
            <Input id="item-sort" name="sortOrder" type="number" min={0} defaultValue={0} disabled={pending} />
          </div>
          <div className="space-y-2 lg:col-span-4">
            <Label htmlFor="item-note">{messages.note}</Label>
            <Input id="item-note" name="itemNote" disabled={pending} />
          </div>
          <Hidden name="itemStatus" value="ACTIVE" />
          <div className="flex items-end justify-end lg:col-span-1">
            <Button type="submit" disabled={pending}>
              {pending ? messages.processing : messages.addItem}
            </Button>
          </div>
          <div className="lg:col-span-6">
            <StateAlert state={state} />
          </div>
        </form>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{messages.itemKind}</TableHead>
            <TableHead>{messages.itemDescription}</TableHead>
            <TableHead>{messages.grossAmount}</TableHead>
            <TableHead>{messages.discountRate}</TableHead>
            <TableHead>{messages.netAmount}</TableHead>
            <TableHead>{messages.status}</TableHead>
            <TableHead className="w-24">{messages.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contract.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                {messages.noItems}
              </TableCell>
            </TableRow>
          ) : (
            contract.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{messages.itemKindLabels[item.kind]}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>{money(item.grossAmount, contract.currencyCode, locale)}</TableCell>
                <TableCell>{item.discountRate}%</TableCell>
                <TableCell>{money(item.netAmount, contract.currencyCode, locale)}</TableCell>
                <TableCell>{statusBadge(item.status, messages)}</TableCell>
                <TableCell>
                  {canManage && item.status === "ACTIVE" ? (
                    <form action={action}>
                      <Hidden name="contractId" value={contract.id} />
                      <Hidden name="itemId" value={item.id} />
                      <Hidden name="revision" value={item.revision} />
                      <Hidden name="itemKind" value={item.kind} />
                      <Hidden name="itemDescription" value={item.description} />
                      <Hidden name="grossAmount" value={item.grossAmount} />
                      <Hidden name="discountRate" value={item.discountRate} />
                      <Hidden name="itemStatus" value="ARCHIVED" />
                      <Hidden name="sortOrder" value={item.sortOrder} />
                      <Hidden name="itemNote" value={item.note ?? ""} />
                      <Button type="submit" size="sm" variant="outline" disabled={pending}>
                        {messages.archive}
                      </Button>
                    </form>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function InstallmentPlan({
  contract,
  messages,
  locale,
  today,
  canManage,
}: {
  contract: StudentFinanceContractDetail;
  messages: FinanceMessages;
  locale: Locale;
  today: string;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState<FinanceState, FormData>(
    saveStudentFinanceInstallmentPlanAction,
    initialState,
  );
  return (
    <div className="space-y-5">
      {canManage && (
        <form action={action} className="grid gap-3 rounded-lg border p-4 md:grid-cols-5">
          <Hidden name="contractId" value={contract.id} />
          <div className="space-y-2">
            <Label htmlFor="plan-total">{messages.planTotalAmount}</Label>
            <Input
              id="plan-total"
              name="planTotalAmount"
              inputMode="decimal"
              defaultValue={contract.totals.totalDebt}
              disabled={pending}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="down-payment">{messages.downPaymentAmount}</Label>
            <Input
              id="down-payment"
              name="downPaymentAmount"
              inputMode="decimal"
              defaultValue="0"
              disabled={pending}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="down-payment-date">{messages.downPaymentDueDate}</Label>
            <Input id="down-payment-date" name="downPaymentDueDate" type="date" defaultValue={today} disabled={pending} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="installment-count">{messages.installmentCount}</Label>
            <Input id="installment-count" name="installmentCount" type="number" min={1} max={60} defaultValue={10} disabled={pending} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="first-due-date">{messages.firstDueDate}</Label>
            <Input id="first-due-date" name="firstDueDate" type="date" defaultValue={today} disabled={pending} required />
          </div>
          <div className="md:col-span-5">
            <StateAlert state={state} />
          </div>
          <div className="flex justify-end md:col-span-5">
            <Button type="submit" disabled={pending}>
              {pending ? messages.processing : messages.generatePlan}
            </Button>
          </div>
        </form>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{messages.sequence}</TableHead>
            <TableHead>{messages.installmentLabel}</TableHead>
            <TableHead>{messages.dueDate}</TableHead>
            <TableHead>{messages.amount}</TableHead>
            <TableHead>{messages.status}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contract.installments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                {messages.noInstallments}
              </TableCell>
            </TableRow>
          ) : (
            contract.installments.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.sequence}</TableCell>
                <TableCell>{line.label}</TableCell>
                <TableCell>{dateLabel(line.dueDate, locale)}</TableCell>
                <TableCell>{money(line.amount, contract.currencyCode, locale)}</TableCell>
                <TableCell>{statusBadge(line.status, messages)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function Payments({
  contract,
  messages,
  locale,
  today,
  canManage,
}: {
  contract: StudentFinanceContractDetail;
  messages: FinanceMessages;
  locale: Locale;
  today: string;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState<FinanceState, FormData>(
    saveStudentFinancePaymentAction,
    initialState,
  );
  const submittedValues = state.status === "error" ? state.values : undefined;
  return (
    <div className="space-y-5">
      {canManage && (
        <form action={action} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[180px_180px_1fr_auto] md:items-end">
          <Hidden name="contractId" value={contract.id} />
          <div className="space-y-2">
            <Label htmlFor="payment-date">{messages.paidOn}</Label>
            <Input
              id="payment-date"
              name="paidOn"
              type="date"
              defaultValue={submittedValues?.paidOn ?? today}
              disabled={pending}
              required
            />
            <FieldError state={state} field="paidOn" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-amount">{messages.paymentAmount}</Label>
            <Input
              id="payment-amount"
              name="paymentAmount"
              inputMode="decimal"
              defaultValue={submittedValues?.paymentAmount ?? ""}
              placeholder="500 veya 500,00"
              disabled={pending}
              required
            />
            <FieldError state={state} field="paymentAmount" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-description">{messages.paymentDescription}</Label>
            <Input
              id="payment-description"
              name="paymentDescription"
              defaultValue={submittedValues?.paymentDescription ?? ""}
              disabled={pending}
            />
            <FieldError state={state} field="paymentDescription" />
          </div>
          <Hidden name="paymentStatus" value="ACTIVE" />
          <Button type="submit" disabled={pending}>
            {pending ? messages.processing : messages.addPayment}
          </Button>
          <div className="md:col-span-4">
            <StateAlert state={state} />
          </div>
        </form>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{messages.paidOn}</TableHead>
            <TableHead>{messages.paymentDescription}</TableHead>
            <TableHead>{messages.paymentAmount}</TableHead>
            <TableHead>{messages.status}</TableHead>
            <TableHead className="w-24">{messages.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contract.payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                {messages.noPayments}
              </TableCell>
            </TableRow>
          ) : (
            contract.payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{dateLabel(payment.paidOn, locale)}</TableCell>
                <TableCell>{payment.description}</TableCell>
                <TableCell>{money(payment.amount, contract.currencyCode, locale)}</TableCell>
                <TableCell>{statusBadge(payment.status, messages)}</TableCell>
                <TableCell>
                  {canManage && payment.status === "ACTIVE" ? (
                    <form action={action}>
                      <Hidden name="contractId" value={contract.id} />
                      <Hidden name="paymentId" value={payment.id} />
                      <Hidden name="revision" value={payment.revision} />
                      <Hidden name="paidOn" value={payment.paidOn} />
                      <Hidden name="paymentAmount" value={payment.amount} />
                      <Hidden name="paymentDescription" value={payment.description} />
                      <Hidden name="paymentStatus" value="ARCHIVED" />
                      <Button type="submit" size="sm" variant="outline" disabled={pending}>
                        {messages.archive}
                      </Button>
                    </form>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ContractDetail({
  contract,
  messages,
  locale,
  today,
  canManageContracts,
  canManagePayments,
}: {
  contract: StudentFinanceContractDetail | null;
  messages: FinanceMessages;
  locale: Locale;
  today: string;
  canManageContracts: boolean;
  canManagePayments: boolean;
}) {
  if (!contract)
    return (
      <Section title={messages.detailTitle} description={messages.selectContractDescription}>
        <p className="text-sm text-muted-foreground">{messages.selectContract}</p>
      </Section>
    );

  return (
    <Section
      title={contract.displayNumber}
      description={`${contract.student.fullName} · ${contract.responsibleGuardian.fullName}`}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          label={messages.totalDebt}
          value={money(contract.totals.totalDebt, contract.currencyCode, locale)}
        />
        <StatCard
          label={messages.totalPaid}
          value={money(contract.totals.totalPaid, contract.currencyCode, locale)}
          tone="success"
        />
        <StatCard
          label={messages.remaining}
          value={money(contract.totals.remainingBalance, contract.currencyCode, locale)}
          tone="danger"
        />
        <StatCard
          label={messages.overpaid}
          value={money(contract.totals.overpaidAmount, contract.currencyCode, locale)}
        />
      </div>

      <Tabs defaultValue="items" className="mt-6">
        <TabsList>
          <TabsTrigger value="items">{messages.costDetails}</TabsTrigger>
          <TabsTrigger value="installments">{messages.installments}</TabsTrigger>
          <TabsTrigger value="payments">{messages.payments}</TabsTrigger>
        </TabsList>
        <TabsContent value="items">
          <CostDetails
            contract={contract}
            messages={messages}
            locale={locale}
            canManage={canManageContracts}
          />
        </TabsContent>
        <TabsContent value="installments">
          <InstallmentPlan
            contract={contract}
            messages={messages}
            locale={locale}
            today={today}
            canManage={canManageContracts}
          />
        </TabsContent>
        <TabsContent value="payments">
          <Payments
            contract={contract}
            messages={messages}
            locale={locale}
            today={today}
            canManage={canManagePayments}
          />
        </TabsContent>
      </Tabs>
    </Section>
  );
}

export function StudentFinanceManager({
  context,
  contracts,
  overview,
  selectedContract,
  selectedContractId,
  today,
  locale,
  messages,
  canManageContracts,
  canManagePayments,
}: {
  context: StudentFinanceContext;
  contracts: StudentFinanceContractSummary[];
  overview: StudentFinanceOverview;
  selectedContract: StudentFinanceContractDetail | null;
  selectedContractId: string | null;
  today: string;
  locale: Locale;
  messages: FinanceMessages;
  canManageContracts: boolean;
  canManagePayments: boolean;
}) {
  return (
    <div className="space-y-6">
      <FinanceOverview overview={overview} locale={locale} messages={messages} />
      {canManageContracts && (
        <ContractForm context={context} today={today} messages={messages} />
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.35fr)]">
        <ContractList
          contracts={contracts}
          selectedContractId={selectedContractId}
          locale={locale}
          messages={messages}
        />
        <ContractDetail
          contract={selectedContract}
          messages={messages}
          locale={locale}
          today={today}
          canManageContracts={canManageContracts}
          canManagePayments={canManagePayments}
        />
      </div>
    </div>
  );
}
