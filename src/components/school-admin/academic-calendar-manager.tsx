"use client";

import {
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
  CircleDot,
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
import type {
  AcademicTermRecord,
  AcademicYearRecord,
} from "@/server/academics/academic-calendar";

const initialActionState: AcademicCalendarState = {};
const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const statusPresentation = {
  DRAFT: { label: "Taslak", variant: "secondary" as const },
  ACTIVE: { label: "Aktif", variant: "success" as const },
  CLOSED: { label: "Kapalı", variant: "info" as const },
  ARCHIVED: { label: "Arşiv", variant: "outline" as const },
};

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function StatusBadge({ status }: { status: keyof typeof statusPresentation }) {
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
  const [state, action, pending] = useActionState(
    saveAcademicYear,
    initialActionState,
  );

  const prefix = year ? `year-${year.id}` : "new-year";
  return (
    <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {year ? "Öğretim yılını düzenle" : "Yeni öğretim yılı"}
          </DialogTitle>
          <DialogDescription>
            Öğretim yılı taslak olarak kaydedilir. Etkinleştirmeden önce en az
            bir dönem eklenmelidir.
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
            <Label htmlFor={`${prefix}-name`}>Öğretim yılı adı</Label>
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
              <Label htmlFor={`${prefix}-start`}>Başlangıç tarihi</Label>
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
              <Label htmlFor={`${prefix}-end`}>Bitiş tarihi</Label>
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
              {state.status === "success" ? "Kapat" : "Vazgeç"}
            </Button>
            {state.status !== "success" && (
              <Button type="submit" disabled={pending}>
                {pending
                  ? "Kaydediliyor…"
                  : year
                    ? "Değişiklikleri kaydet"
                    : "Taslak oluştur"}
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
          <DialogTitle>{term ? "Dönemi düzenle" : "Yeni dönem"}</DialogTitle>
          <DialogDescription>
            {year.name} içindeki dönemler tarih olarak çakışamaz ve yıl
            aralığının dışına çıkamaz.
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
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div>
              <Label htmlFor={`${prefix}-name`}>Dönem adı</Label>
              <Input
                id={`${prefix}-name`}
                name="name"
                defaultValue={term?.name}
                placeholder="1. Dönem"
                minLength={2}
                maxLength={100}
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
            <div>
              <Label htmlFor={`${prefix}-sequence`}>Sıra</Label>
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
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${prefix}-start`}>Başlangıç tarihi</Label>
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
              <Label htmlFor={`${prefix}-end`}>Bitiş tarihi</Label>
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
              {state.status === "success" ? "Kapat" : "Vazgeç"}
            </Button>
            {state.status !== "success" && (
              <Button type="submit" disabled={pending}>
                {pending
                  ? "Kaydediliyor…"
                  : term
                    ? "Değişiklikleri kaydet"
                    : "Dönem oluştur"}
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
              {state.status === "success" ? "Kapat" : "Vazgeç"}
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
                {pending ? "İşleniyor…" : confirmLabel}
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
  if (!canManage) return <span className="text-xs text-muted-foreground">Salt okunur</span>;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {year.status === "DRAFT" && (
        <YearFormDialog
          key={year.revision}
          year={year}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil aria-hidden /> Düzenle
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
          title={`${year.name} etkinleştirilsin mi?`}
          description="Okulda başka bir aktif öğretim yılı varsa dönemleriyle birlikte kapatılır. Bu yıl aktif akademik bağlam olur."
          confirmLabel="Etkinleştir"
          confirmVariant="success"
          trigger={
            <Button variant="success" size="sm">
              <CalendarCheck2 aria-hidden /> Etkinleştir
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
          title={`${year.name} kapatılsın mı?`}
          description="Aktif dönem de kapatılır. Geçmiş kayıtlar korunur; yıl yeniden etkinleştirilmez."
          confirmLabel="Yılı kapat"
          trigger={
            <Button variant="outline" size="sm">
              <LockKeyhole aria-hidden /> Kapat
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
          title={`${year.name} arşivlensin mi?`}
          description="Yıl ve arşivlenmemiş dönemleri listede geçmiş kayıt olarak kalır. Etkin yıl önce kapatılmalıdır."
          confirmLabel="Arşivle"
          confirmVariant="danger"
          trigger={
            <Button variant="ghost" size="sm">
              <Archive aria-hidden /> Arşivle
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
          title={`${year.name} geri alınsın mı?`}
          description="Yıl taslak olur. Arşivlenmiş dönemler otomatik geri alınmaz; gerekli dönemleri ayrı ayrı seçebilirsiniz."
          confirmLabel="Taslağa geri al"
          trigger={
            <Button variant="outline" size="sm">
              <RotateCcw aria-hidden /> Geri al
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
  if (!canManage) return <span className="text-xs text-muted-foreground">Salt okunur</span>;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {year.status === "DRAFT" && term.status === "DRAFT" && (
        <TermFormDialog
          key={term.revision}
          year={year}
          term={term}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil aria-hidden /> Düzenle
            </Button>
          }
        />
      )}
      {year.status === "ACTIVE" && term.status === "DRAFT" && (
        <LifecycleDialog
          entity="term"
          transition="activate"
          id={term.id}
          revision={term.revision}
          title={`${term.name} etkinleştirilsin mi?`}
          description="Bu yılda başka bir aktif dönem varsa otomatik kapatılır."
          confirmLabel="Dönemi etkinleştir"
          confirmVariant="success"
          trigger={
            <Button variant="success" size="sm">
              <CircleDot aria-hidden /> Etkinleştir
            </Button>
          }
        />
      )}
      {term.status === "ACTIVE" && (
        <LifecycleDialog
          entity="term"
          transition="close"
          id={term.id}
          revision={term.revision}
          title={`${term.name} kapatılsın mı?`}
          description="Dönem kapalı duruma alınır ve geçmiş kayıtları korunur."
          confirmLabel="Dönemi kapat"
          trigger={
            <Button variant="outline" size="sm">
              <LockKeyhole aria-hidden /> Kapat
            </Button>
          }
        />
      )}
      {(term.status === "DRAFT" || term.status === "CLOSED") && (
        <LifecycleDialog
          entity="term"
          transition="archive"
          id={term.id}
          revision={term.revision}
          title={`${term.name} arşivlensin mi?`}
          description="Dönem kalıcı olarak silinmez; geçmiş kayıt olarak korunur."
          confirmLabel="Arşivle"
          confirmVariant="danger"
          trigger={
            <Button variant="ghost" size="sm">
              <Archive aria-hidden /> Arşivle
            </Button>
          }
        />
      )}
      {year.status === "DRAFT" && term.status === "ARCHIVED" && (
        <LifecycleDialog
          entity="term"
          transition="restore"
          id={term.id}
          revision={term.revision}
          title={`${term.name} geri alınsın mı?`}
          description="Dönem taslak olur. Tarih çakışması varsa işlem reddedilir."
          confirmLabel="Taslağa geri al"
          trigger={
            <Button variant="outline" size="sm">
              <RotateCcw aria-hidden /> Geri al
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
}: {
  schoolName: string;
  years: AcademicYearRecord[];
  selectedYearId: string | null;
  canManage: boolean;
}) {
  const selectedYear =
    years.find((year) => year.id === selectedYearId) ?? null;
  const activeYear = years.find((year) => year.status === "ACTIVE") ?? null;
  const visibleYearCount = years.filter(
    (year) => year.status !== "ARCHIVED",
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AKADEMİK YAPI"
        title="Öğretim yılları ve dönemler"
        description={`${schoolName} için akademik takvimin temelini kurun. Önce yılı ve dönemleri taslak olarak hazırlayın, ardından doğru kaydı etkinleştirin.`}
        actions={
          canManage ? (
            <YearFormDialog
              trigger={
                <Button size="lg">
                  <Plus aria-hidden /> Yeni öğretim yılı
                </Button>
              }
            />
          ) : undefined
        }
      />

      <section className="grid gap-4 md:grid-cols-3" aria-label="Akademik takvim özeti">
        <Card className="py-5">
          <CardContent>
            <CalendarCheck2 className="size-5 text-primary" aria-hidden />
            <p className="mt-5 text-xs text-muted-foreground">Aktif öğretim yılı</p>
            <p className="mt-2 text-lg font-medium">
              {activeYear?.name ?? "Henüz etkin değil"}
            </p>
          </CardContent>
        </Card>
        <Card className="py-5">
          <CardContent>
            <CalendarDays className="size-5 text-primary" aria-hidden />
            <p className="mt-5 text-xs text-muted-foreground">Arşiv dışı yıl</p>
            <p className="mt-2 text-lg font-medium">{visibleYearCount}</p>
          </CardContent>
        </Card>
        <Card className="py-5">
          <CardContent>
            <CalendarClock className="size-5 text-primary" aria-hidden />
            <p className="mt-5 text-xs text-muted-foreground">Seçili yılın dönemleri</p>
            <p className="mt-2 text-lg font-medium">
              {selectedYear?.terms.filter((term) => term.status !== "ARCHIVED").length ?? 0}
            </p>
          </CardContent>
        </Card>
      </section>

      <DataTableShell
        title="Öğretim yılları"
        description="Bir yılı seçerek dönemlerini yönetin. Okulda aynı anda yalnız bir öğretim yılı aktif olabilir."
        footer={`${years.length} öğretim yılı gösteriliyor`}
      >
        {years.length ? (
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Öğretim yılı</TableHead>
                <TableHead scope="col">Tarih aralığı</TableHead>
                <TableHead scope="col">Dönem</TableHead>
                <TableHead scope="col">Durum</TableHead>
                <TableHead scope="col" className="text-right">İşlemler</TableHead>
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
                        <span className="mt-1 block text-[11px] text-primary">Dönemleri gösteriliyor</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(year.startDate)} – {formatDate(year.endDate)}
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
            title="Henüz öğretim yılı yok"
            description="İlk öğretim yılını taslak olarak oluşturun; ardından dönemlerini ekleyip yılı etkinleştirin."
            action={
              canManage ? (
                <YearFormDialog
                  trigger={
                    <Button>
                      <Plus aria-hidden /> İlk öğretim yılını oluştur
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
          title={`${selectedYear.name} dönemleri`}
          description="Sıra ve tarihler ders, kayıt ve program modüllerinin dönem bağlamını oluşturacak."
          toolbar={
            canManage && selectedYear.status === "DRAFT" ? (
              <TermFormDialog
                year={selectedYear}
                trigger={
                  <Button variant="outline">
                    <Plus aria-hidden /> Yeni dönem
                  </Button>
                }
              />
            ) : undefined
          }
          footer={`${selectedYear.terms.length} dönem gösteriliyor`}
        >
          {selectedYear.terms.length ? (
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Sıra</TableHead>
                  <TableHead scope="col">Dönem</TableHead>
                  <TableHead scope="col">Tarih aralığı</TableHead>
                  <TableHead scope="col">Durum</TableHead>
                  <TableHead scope="col" className="text-right">İşlemler</TableHead>
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
                      {formatDate(term.startDate)} – {formatDate(term.endDate)}
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
              title="Bu yıl için dönem yok"
              description={
                selectedYear.status === "DRAFT"
                  ? "Öğretim yılını etkinleştirmeden önce en az bir dönem oluşturun."
                  : "Bu kayıt dönem içermiyor. Yaşam döngüsü durumunu kontrol edin."
              }
              action={
                canManage && selectedYear.status === "DRAFT" ? (
                  <TermFormDialog
                    year={selectedYear}
                    trigger={
                      <Button variant="outline">
                        <Plus aria-hidden /> İlk dönemi oluştur
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
              Dönemleri görmek için tablodan bir öğretim yılı seçin.
            </AlertDescription>
          </Alert>
        )
      )}
    </div>
  );
}
