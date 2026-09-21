"use client";

import {
  createContext,
  useContext,
  useActionState,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Archive,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  LockKeyhole,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  changeAcademicCalendarStatus,
  saveAcademicTerm,
  saveAcademicYear,
} from "@/app/(school-admin)/academics/years/actions";
import { DataTableShell, TableEmptyState } from "@/components/admin/data-table-shell";
import { PageHeader } from "@/components/admin/page-header";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AcademicCalendarField,
  AcademicCalendarState,
  AcademicEntity,
  AcademicTransition,
} from "@/lib/academic-calendar-validation";
import { cn } from "@/lib/utils";
import { HTML_LOCALES, type Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { formatMessage } from "@/i18n/format";
import type {
  AcademicTermRecord,
  AcademicYearRecord,
} from "@/server/academics/academic-calendar";

const initialActionState: AcademicCalendarState = {};
type AcademicI18nContextValue = {
  locale: Locale;
  messages: Pick<AppDictionary, "common" | "academics">;
};

const AcademicI18nContext = createContext<AcademicI18nContextValue | null>(null);

function useAcademicI18n() {
  const value = useContext(AcademicI18nContext);
  if (!value) throw new Error("Academic i18n context is missing.");
  return value;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(HTML_LOCALES[locale], {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function StatusBadge({
  status,
}: {
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
}) {
  const { messages } = useAcademicI18n();
  const statusPresentation = {
    DRAFT: { label: messages.academics.statusDraft, variant: "secondary" as const },
    ACTIVE: { label: messages.academics.statusActive, variant: "success" as const },
    CLOSED: { label: messages.academics.statusClosed, variant: "info" as const },
    ARCHIVED: { label: messages.academics.statusArchived, variant: "outline" as const },
  };
  const presentation = statusPresentation[status];
  return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
}

function FieldError({
  state,
  field,
  id,
}: {
  state: AcademicCalendarState;
  field: AcademicCalendarField;
  id: string;
}) {
  const error = state.fieldErrors?.[field];
  if (!error) return null;
  return (
    <p id={id} className="mt-2 text-xs text-danger-foreground">
      {error}
    </p>
  );
}

function ActionAlert({ state }: { state: AcademicCalendarState }) {
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

function YearFormContent({
  year,
  onClose,
}: {
  year?: AcademicYearRecord;
  onClose: () => void;
}) {
  const { messages } = useAcademicI18n();
  const academic = messages.academics;
  const common = messages.common;
  const [state, action, pending] = useActionState(
    saveAcademicYear,
    initialActionState,
  );

  const prefix = year ? `year-${year.id}` : "new-year";
  return (
    <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {year ? academic.editYear : academic.newYear}
          </DialogTitle>
          <DialogDescription>
            {academic.yearFormDescription}
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={year?.id ?? "new"} />
          <input
            type="hidden"
            name="revision"
            value={year?.revision ?? "new"}
          />
          <div>
            <Label htmlFor={`${prefix}-name`}>{academic.yearName}</Label>
            <Input
              id={`${prefix}-name`}
              name="name"
              defaultValue={year?.name}
              placeholder="2026 / 2027"
              minLength={2}
              maxLength={40}
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.name)}
              aria-describedby={
                state.fieldErrors?.name ? `${prefix}-name-error` : undefined
              }
              className="mt-2"
            />
            <FieldError
              state={state}
              field="name"
              id={`${prefix}-name-error`}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${prefix}-start`}>{common.startDate}</Label>
              <Input
                id={`${prefix}-start`}
                name="startDate"
                type="date"
                defaultValue={year?.startDate}
                required
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.startDate)}
                aria-describedby={
                  state.fieldErrors?.startDate
                    ? `${prefix}-start-error`
                    : undefined
                }
                className="mt-2"
              />
              <FieldError
                state={state}
                field="startDate"
                id={`${prefix}-start-error`}
              />
            </div>
            <div>
              <Label htmlFor={`${prefix}-end`}>{common.endDate}</Label>
              <Input
                id={`${prefix}-end`}
                name="endDate"
                type="date"
                defaultValue={year?.endDate}
                required
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.endDate)}
                aria-describedby={
                  state.fieldErrors?.endDate
                    ? `${prefix}-end-error`
                    : undefined
                }
                className="mt-2"
              />
              <FieldError
                state={state}
                field="endDate"
                id={`${prefix}-end-error`}
              />
            </div>
          </div>
          <ActionAlert state={state} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {state.status === "success" ? common.close : common.cancel}
            </Button>
            {state.status !== "success" && (
              <Button type="submit" disabled={pending}>
                {pending
                  ? common.saving
                  : year
                    ? common.save
                    : academic.createDraft}
              </Button>
            )}
          </DialogFooter>
        </form>
    </DialogContent>
  );
}

function YearFormDialog({
  year,
  trigger,
}: {
  year?: AcademicYearRecord;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {open && (
        <YearFormContent year={year} onClose={() => setOpen(false)} />
      )}
    </Dialog>
  );
}

function TermFormContent({
  year,
  term,
  onClose,
}: {
  year: AcademicYearRecord;
  term?: AcademicTermRecord;
  onClose: () => void;
}) {
  const { messages } = useAcademicI18n();
  const academic = messages.academics;
  const common = messages.common;
  const [state, action, pending] = useActionState(
    saveAcademicTerm,
    initialActionState,
  );

  const prefix = term ? `term-${term.id}` : `new-term-${year.id}`;
  const defaultSequence =
    term?.sequence ??
    Math.max(0, ...year.terms.map(({ sequence }) => sequence)) + 1;
  return (
    <DialogContent>
        <DialogHeader>
          <DialogTitle>{term ? academic.editTerm : academic.newTerm}</DialogTitle>
          <DialogDescription>
            {formatMessage(academic.termFormDescription, { year: year.name })}
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={term?.id ?? "new"} />
          <input
            type="hidden"
            name="revision"
            value={term?.revision ?? "new"}
          />
          <input type="hidden" name="academicYearId" value={year.id} />
          <div>
            <p className="text-sm font-medium">{academic.termName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {academic.translationsHelp}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {([
              ["Tr", academic.termNameTr, academic.termPlaceholderTr, "tr"],
              ["Sq", academic.termNameSq, academic.termPlaceholderSq, "sq"],
              ["En", academic.termNameEn, academic.termPlaceholderEn, "en"],
            ] as const).map(([suffix, label, placeholder, locale]) => {
              const field = `name${suffix}` as "nameTr" | "nameSq" | "nameEn";
              return (
              <div key={locale}>
              <Label htmlFor={`${prefix}-name-${locale}`}>{label}</Label>
              <Input
                id={`${prefix}-name-${locale}`}
                name={field}
                defaultValue={term?.names[locale]}
                placeholder={placeholder}
                minLength={2}
                maxLength={100}
                required
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.[field])}
                aria-describedby={
                  state.fieldErrors?.[field]
                    ? `${prefix}-name-${locale}-error`
                    : undefined
                }
                className="mt-2"
              />
              <FieldError
                state={state}
                field={field}
                id={`${prefix}-name-${locale}-error`}
              />
              </div>
              );
            })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[120px_1fr_1fr]">
            <div>
              <Label htmlFor={`${prefix}-sequence`}>{common.sequence}</Label>
              <Input
                id={`${prefix}-sequence`}
                name="sequence"
                type="number"
                min={1}
                max={20}
                defaultValue={defaultSequence}
                required
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.sequence)}
                aria-describedby={
                  state.fieldErrors?.sequence
                    ? `${prefix}-sequence-error`
                    : undefined
                }
                className="mt-2"
              />
              <FieldError
                state={state}
                field="sequence"
                id={`${prefix}-sequence-error`}
              />
            </div>
            <div>
              <Label htmlFor={`${prefix}-start`}>{common.startDate}</Label>
              <Input
                id={`${prefix}-start`}
                name="startDate"
                type="date"
                min={year.startDate}
                max={year.endDate}
                defaultValue={term?.startDate ?? year.startDate}
                required
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.startDate)}
                aria-describedby={
                  state.fieldErrors?.startDate
                    ? `${prefix}-start-error`
                    : undefined
                }
                className="mt-2"
              />
              <FieldError
                state={state}
                field="startDate"
                id={`${prefix}-start-error`}
              />
            </div>
            <div>
              <Label htmlFor={`${prefix}-end`}>{common.endDate}</Label>
              <Input
                id={`${prefix}-end`}
                name="endDate"
                type="date"
                min={year.startDate}
                max={year.endDate}
                defaultValue={term?.endDate ?? year.endDate}
                required
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.endDate)}
                aria-describedby={
                  state.fieldErrors?.endDate
                    ? `${prefix}-end-error`
                    : undefined
                }
                className="mt-2"
              />
              <FieldError
                state={state}
                field="endDate"
                id={`${prefix}-end-error`}
              />
            </div>
          </div>
          <ActionAlert state={state} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {state.status === "success" ? common.close : common.cancel}
            </Button>
            {state.status !== "success" && (
              <Button type="submit" disabled={pending}>
                {pending
                  ? common.saving
                  : term
                    ? common.save
                    : academic.createTerm}
              </Button>
            )}
          </DialogFooter>
        </form>
    </DialogContent>
  );
}

function TermFormDialog({
  year,
  term,
  trigger,
}: {
  year: AcademicYearRecord;
  term?: AcademicTermRecord;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {open && (
        <TermFormContent
          year={year}
          term={term}
          onClose={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}

type LifecycleContentProps = {
  entity: AcademicEntity;
  transition: AcademicTransition;
  id: string;
  revision: string;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "default" | "success" | "danger";
};

function LifecycleContent({
  entity,
  transition,
  id,
  revision,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
}: LifecycleContentProps) {
  const { messages } = useAcademicI18n();
  const [state, action, pending] = useActionState(
    changeAcademicCalendarStatus,
    initialActionState,
  );

  return (
    <AlertDialogContent>
        <form action={action} className="contents">
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="transition" value={transition} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="revision" value={revision} />
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <ActionAlert state={state} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {state.status === "success"
                ? messages.common.close
                : messages.common.cancel}
            </AlertDialogCancel>
            {state.status !== "success" && (
              <Button
                type="submit"
                disabled={pending}
                variant={
                  confirmVariant === "success"
                    ? "success"
                    : confirmVariant === "danger"
                      ? "danger"
                      : "default"
                }
              >
                {pending ? messages.common.processing : confirmLabel}
              </Button>
            )}
          </AlertDialogFooter>
        </form>
    </AlertDialogContent>
  );
}

function LifecycleDialog({
  trigger,
  ...props
}: LifecycleContentProps & { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      {open && <LifecycleContent {...props} />}
    </AlertDialog>
  );
}

function YearActions({
  year,
  canManage,
}: {
  year: AcademicYearRecord;
  canManage: boolean;
}) {
  const { messages } = useAcademicI18n();
  const academic = messages.academics;
  const common = messages.common;
  if (!canManage)
    return (
      <span className="text-xs text-muted-foreground">{common.readOnly}</span>
    );
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {year.status === "DRAFT" && (
        <YearFormDialog
          key={year.revision}
          year={year}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil aria-hidden /> {common.edit}
            </Button>
          }
        />
      )}
      {year.status === "DRAFT" && year.terms.some((term) => term.status !== "ARCHIVED") && (
        <LifecycleDialog
          entity="year"
          transition="activate"
          id={year.id}
          revision={year.revision}
          title={formatMessage(academic.activateYearTitle, { name: year.name })}
          description={academic.activateYearDescription}
          confirmLabel={common.activate}
          confirmVariant="success"
          trigger={
            <Button variant="success" size="sm">
              <CalendarCheck2 aria-hidden /> {common.activate}
            </Button>
          }
        />
      )}
      {year.status === "ACTIVE" && (
        <LifecycleDialog
          entity="year"
          transition="close"
          id={year.id}
          revision={year.revision}
          title={formatMessage(academic.closeYearTitle, { name: year.name })}
          description={academic.closeYearDescription}
          confirmLabel={academic.closeYear}
          trigger={
            <Button variant="outline" size="sm">
              <LockKeyhole aria-hidden /> {common.close}
            </Button>
          }
        />
      )}
      {(year.status === "DRAFT" || year.status === "CLOSED") && (
        <LifecycleDialog
          entity="year"
          transition="archive"
          id={year.id}
          revision={year.revision}
          title={formatMessage(academic.archiveYearTitle, { name: year.name })}
          description={academic.archiveYearDescription}
          confirmLabel={common.archive}
          confirmVariant="danger"
          trigger={
            <Button variant="ghost" size="sm">
              <Archive aria-hidden /> {common.archive}
            </Button>
          }
        />
      )}
      {year.status === "ARCHIVED" && (
        <LifecycleDialog
          entity="year"
          transition="restore"
          id={year.id}
          revision={year.revision}
          title={formatMessage(academic.restoreYearTitle, { name: year.name })}
          description={academic.restoreYearDescription}
          confirmLabel={academic.restoreDraft}
          trigger={
            <Button variant="outline" size="sm">
              <RotateCcw aria-hidden /> {common.restore}
            </Button>
          }
        />
      )}
    </div>
  );
}

function TermActions({
  year,
  term,
  canManage,
}: {
  year: AcademicYearRecord;
  term: AcademicTermRecord;
  canManage: boolean;
}) {
  const { messages } = useAcademicI18n();
  const academic = messages.academics;
  const common = messages.common;
  if (!canManage)
    return (
      <span className="text-xs text-muted-foreground">{common.readOnly}</span>
    );
  if (year.status !== "DRAFT")
    return (
      <span className="text-xs text-muted-foreground">
        {academic.termLifecycleWithYear}
      </span>
    );
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {term.status === "DRAFT" && (
        <TermFormDialog
          key={term.revision}
          year={year}
          term={term}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil aria-hidden /> {common.edit}
            </Button>
          }
        />
      )}
      {term.status === "DRAFT" && (
        <LifecycleDialog
          entity="term"
          transition="archive"
          id={term.id}
          revision={term.revision}
          title={formatMessage(academic.archiveTermTitle, { name: term.name })}
          description={academic.archiveTermDescription}
          confirmLabel={common.archive}
          confirmVariant="danger"
          trigger={
            <Button variant="ghost" size="sm">
              <Archive aria-hidden /> {common.archive}
            </Button>
          }
        />
      )}
      {term.status === "ARCHIVED" && (
        <LifecycleDialog
          entity="term"
          transition="restore"
          id={term.id}
          revision={term.revision}
          title={formatMessage(academic.restoreTermTitle, { name: term.name })}
          description={academic.restoreTermDescription}
          confirmLabel={academic.restoreDraft}
          trigger={
            <Button variant="outline" size="sm">
              <RotateCcw aria-hidden /> {common.restore}
            </Button>
          }
        />
      )}
    </div>
  );
}

export function AcademicCalendarManager({
  schoolName,
  years,
  selectedYearId,
  canManage,
  locale,
  messages,
}: {
  schoolName: string;
  years: AcademicYearRecord[];
  selectedYearId: string | null;
  canManage: boolean;
  locale: Locale;
  messages: Pick<AppDictionary, "common" | "academics">;
}) {
  const academic = messages.academics;
  const common = messages.common;
  const selectedYear =
    years.find((year) => year.id === selectedYearId) ?? null;
  const activeYear = years.find((year) => year.status === "ACTIVE") ?? null;
  const visibleYearCount = years.filter(
    (year) => year.status !== "ARCHIVED",
  ).length;

  return (
    <AcademicI18nContext.Provider value={{ locale, messages }}>
    <div className="space-y-8">
      <PageHeader
        eyebrow={academic.eyebrow}
        title={academic.title}
        description={formatMessage(academic.description, { name: schoolName })}
        actions={
          canManage ? (
            <YearFormDialog
              trigger={
                <Button size="lg">
                  <Plus aria-hidden /> {academic.newYear}
                </Button>
              }
            />
          ) : undefined
        }
      />

      <section
        className="grid gap-4 md:grid-cols-3"
        aria-label={academic.summaryLabel}
      >
        <Card className="py-5">
          <CardContent>
            <CalendarCheck2 className="size-5 text-primary" aria-hidden />
            <p className="mt-5 text-xs text-muted-foreground">
              {academic.activeYear}
            </p>
            <p className="mt-2 text-lg font-medium">
              {activeYear?.name ?? academic.notActive}
            </p>
          </CardContent>
        </Card>
        <Card className="py-5">
          <CardContent>
            <CalendarDays className="size-5 text-primary" aria-hidden />
            <p className="mt-5 text-xs text-muted-foreground">
              {academic.nonArchivedYears}
            </p>
            <p className="mt-2 text-lg font-medium">{visibleYearCount}</p>
          </CardContent>
        </Card>
        <Card className="py-5">
          <CardContent>
            <CalendarClock className="size-5 text-primary" aria-hidden />
            <p className="mt-5 text-xs text-muted-foreground">
              {academic.selectedYearTerms}
            </p>
            <p className="mt-2 text-lg font-medium">
              {selectedYear?.terms.filter((term) => term.status !== "ARCHIVED").length ?? 0}
            </p>
          </CardContent>
        </Card>
      </section>

      <DataTableShell
        title={academic.yearsTitle}
        description={academic.yearsDescription}
        footer={formatMessage(academic.yearsFooter, { count: years.length })}
      >
        {years.length ? (
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">{academic.yearColumn}</TableHead>
                <TableHead scope="col">{common.dateRange}</TableHead>
                <TableHead scope="col">{academic.termColumn}</TableHead>
                <TableHead scope="col">{common.status}</TableHead>
                <TableHead scope="col" className="text-right">
                  {common.actions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((year) => {
                const selected = year.id === selectedYear?.id;
                return (
                  <TableRow
                    key={year.id}
                    className={cn(
                      year.status === "ARCHIVED" && "opacity-65",
                      selected && "bg-primary/5",
                    )}
                  >
                    <TableCell>
                      <Button asChild variant="link" className="h-auto p-0 font-semibold">
                        <Link href={`/academics/years?year=${year.id}`}>
                          {year.name}
                        </Link>
                      </Button>
                      {selected && (
                        <span className="mt-1 block text-[11px] text-primary">
                          {academic.showingTerms}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(year.startDate, locale)} –{" "}
                      {formatDate(year.endDate, locale)}
                    </TableCell>
                    <TableCell>
                      {year.terms.filter((term) => term.status !== "ARCHIVED").length}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={year.status} />
                    </TableCell>
                    <TableCell>
                      <YearActions year={year} canManage={canManage} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <TableEmptyState
            title={academic.noYears}
            description={academic.noYearsDescription}
            action={
              canManage ? (
                <YearFormDialog
                  trigger={
                    <Button>
                      <Plus aria-hidden /> {academic.createFirstYear}
                    </Button>
                  }
                />
              ) : undefined
            }
          />
        )}
      </DataTableShell>

      {selectedYear ? (
        <DataTableShell
          title={formatMessage(academic.termsTitle, {
            name: selectedYear.name,
          })}
          description={academic.termsDescription}
          toolbar={
            canManage && selectedYear.status === "DRAFT" ? (
              <TermFormDialog
                year={selectedYear}
                trigger={
                  <Button variant="outline">
                    <Plus aria-hidden /> {academic.newTerm}
                  </Button>
                }
              />
            ) : undefined
          }
          footer={formatMessage(academic.termsFooter, {
            count: selectedYear.terms.length,
          })}
        >
          {selectedYear.terms.length ? (
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">{common.sequence}</TableHead>
                  <TableHead scope="col">{academic.termColumn}</TableHead>
                  <TableHead scope="col">{common.dateRange}</TableHead>
                  <TableHead scope="col">{common.status}</TableHead>
                  <TableHead scope="col" className="text-right">
                    {common.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedYear.terms.map((term) => (
                  <TableRow
                    key={term.id}
                    className={cn(term.status === "ARCHIVED" && "opacity-65")}
                  >
                    <TableCell className="font-mono text-xs">{term.sequence}</TableCell>
                    <TableCell className="font-medium">{term.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(term.startDate, locale)} –{" "}
                      {formatDate(term.endDate, locale)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={term.status} />
                    </TableCell>
                    <TableCell>
                      <TermActions year={selectedYear} term={term} canManage={canManage} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <TableEmptyState
              title={academic.noTerms}
              description={
                selectedYear.status === "DRAFT"
                  ? academic.noTermsDraft
                  : academic.noTermsOther
              }
              action={
                canManage && selectedYear.status === "DRAFT" ? (
                  <TermFormDialog
                    year={selectedYear}
                    trigger={
                      <Button variant="outline">
                        <Plus aria-hidden /> {academic.createFirstTerm}
                      </Button>
                    }
                  />
                ) : undefined
              }
            />
          )}
        </DataTableShell>
      ) : (
        years.length > 0 && (
          <Alert variant="info">
            <CheckCircle2 aria-hidden />
            <AlertDescription>
              {academic.selectYear}
            </AlertDescription>
          </Alert>
        )
      )}
    </div>
    </AcademicI18nContext.Provider>
  );
}
