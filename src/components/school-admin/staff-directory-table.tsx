"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import type { EmploymentStatus } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type { StaffDirectoryRecord } from "@/server/staff/staff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type PageSize = 20 | 50 | "all";
type StatusFilter = EmploymentStatus | "ALL";
type PaginationItem = number | "start-ellipsis" | "end-ellipsis";
type FilterLayout = "compact" | "menu";

const ALL_DEPARTMENTS = "__all_departments__";

function pageItems(totalPages: number, currentPage: number): PaginationItem[] {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "end-ellipsis", totalPages];
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "start-ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [
    1,
    "start-ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "end-ellipsis",
    totalPages,
  ];
}

function filterButtonClass(active: boolean, layout: FilterLayout) {
  return cn(
    "rounded-md font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
    layout === "menu"
      ? "w-full px-3 py-2 text-left text-xs"
      : "px-2.5 py-1.5 text-[11px]",
    active
      ? "bg-primary text-primary-foreground"
      : layout === "menu"
        ? "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary"
        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
  );
}

function StatusButtons({
  selected,
  onSelect,
  layout = "compact",
  text,
}: {
  selected: StatusFilter;
  onSelect: (status: EmploymentStatus) => void;
  layout?: FilterLayout;
  text: AppDictionary["staff"];
}) {
  const options: Array<{ value: EmploymentStatus; label: string }> = [
    { value: "ACTIVE", label: text.active },
    { value: "ON_LEAVE", label: text.onLeave },
    { value: "ENDED", label: text.ended },
  ];

  return (
    <div
      className={layout === "menu" ? "grid gap-1.5" : "flex flex-wrap gap-1.5"}
      role="group"
      aria-label={text.statusFilterLabel}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={selected === option.value}
          onClick={() => onSelect(option.value)}
          className={cn(
            filterButtonClass(selected === option.value, layout),
            selected === option.value && option.value === "ACTIVE"
              ? "bg-success text-success-foreground"
              : undefined,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DepartmentButtons({
  departments,
  selected,
  onSelect,
  layout = "compact",
  text,
}: {
  departments: string[];
  selected: string;
  onSelect: (department: string) => void;
  layout?: FilterLayout;
  text: AppDictionary["staff"];
}) {
  return (
    <div
      className={layout === "menu" ? "grid gap-1.5" : "flex flex-wrap gap-1.5"}
      role="group"
      aria-label={text.departmentFilterLabel}
    >
      {departments.map((department) => (
        <button
          key={department}
          type="button"
          aria-pressed={selected === department}
          onClick={() => onSelect(department)}
          className={cn(
            filterButtonClass(selected === department, layout),
            selected !== department &&
              layout === "compact" &&
              "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
          )}
        >
          {department}
        </button>
      ))}
    </div>
  );
}

function statusVariant(status: EmploymentStatus) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "ON_LEAVE") return "warning" as const;
  return "outline" as const;
}

export function StaffDirectoryTable({
  staff,
  initialQuery,
  initialStatus,
  canManage,
  canReadCatalog,
  locale,
  messages,
}: {
  staff: StaffDirectoryRecord[];
  initialQuery?: string;
  initialStatus?: EmploymentStatus;
  canManage: boolean;
  canReadCatalog: boolean;
  locale: Locale;
  messages: Pick<AppDictionary, "common" | "staff">;
}) {
  const text = messages.staff;
  const [query, setQuery] = useState(initialQuery ?? "");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState<StatusFilter>(initialStatus ?? "ALL");
  const [department, setDepartment] = useState(ALL_DEPARTMENTS);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [page, setPage] = useState(1);
  const departments = useMemo(
    () =>
      Array.from(new Set(staff.map((person) => person.department))).sort(
        (left, right) => left.localeCompare(right, locale),
      ),
    [locale, staff],
  );
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase(locale);
  const filteredStaff = useMemo(
    () =>
      staff.filter((person) => {
        if (status !== "ALL" && person.status !== status) return false;
        if (department !== ALL_DEPARTMENTS && person.department !== department)
          return false;
        if (!normalizedQuery) return true;

        return [
          person.fullName,
          person.staffNumber,
          person.department,
          person.position,
          person.teacherTitle,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(normalizedQuery);
      }),
    [department, locale, normalizedQuery, staff, status],
  );
  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleStaff =
    pageSize === "all"
      ? filteredStaff
      : filteredStaff.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize,
        );
  const firstRecord =
    filteredStaff.length === 0
      ? 0
      : pageSize === "all"
        ? 1
        : (currentPage - 1) * pageSize + 1;
  const lastRecord =
    pageSize === "all"
      ? filteredStaff.length
      : Math.min(currentPage * pageSize, filteredStaff.length);
  const activeFilterCount =
    Number(status !== "ALL") + Number(department !== ALL_DEPARTMENTS);
  const statusLabels: Record<EmploymentStatus, string> = {
    ACTIVE: text.active,
    ON_LEAVE: text.onLeave,
    ENDED: text.ended,
  };

  function toggleStatus(nextStatus: EmploymentStatus) {
    setStatus((current) => (current === nextStatus ? "ALL" : nextStatus));
    setPage(1);
  }

  function toggleDepartment(nextDepartment: string) {
    setDepartment((current) =>
      current === nextDepartment ? ALL_DEPARTMENTS : nextDepartment,
    );
    setPage(1);
  }

  return (
    <section
      className="-mt-3 overflow-hidden rounded-xl bg-card sm:-mt-4"
      aria-label={text.listTitle}
    >
      <div className="flex flex-col justify-between gap-3 border-b-2 border-accent/70 px-4 py-3 sm:flex-row sm:items-center">
        <h1 className="text-base font-semibold text-foreground">{text.listTitle}</h1>
        <div className="flex flex-wrap gap-2">
          {canReadCatalog ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/staff/settings">
                <Settings2 aria-hidden />
                {text.catalogSettings}
              </Link>
            </Button>
          ) : null}
          {canManage ? (
            <Button asChild size="sm">
              <Link href="/staff/new">
                <Plus aria-hidden />
                {text.newStaff}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-b px-4 py-2.5 sm:grid sm:grid-cols-[minmax(0,1fr)_260px] sm:items-start sm:gap-4">
        <div className="hidden min-w-0 space-y-2 sm:block">
          <StatusButtons selected={status} onSelect={toggleStatus} text={text} />
          <DepartmentButtons
            departments={departments}
            selected={department}
            onSelect={toggleDepartment}
            text={text}
          />
        </div>

        <details className="group order-2 rounded-lg bg-muted/55 sm:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <ListFilter className="size-3.5 text-primary" aria-hidden />
              {text.filters}
              {activeFilterCount > 0 ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </span>
            <ChevronDown
              className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="space-y-3 border-t px-3 py-3">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {text.statusLabel}
              </p>
              <StatusButtons
                selected={status}
                onSelect={toggleStatus}
                layout="menu"
                text={text}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {text.department}
              </p>
              <DepartmentButtons
                departments={departments}
                selected={department}
                onSelect={toggleDepartment}
                layout="menu"
                text={text}
              />
            </div>
          </div>
        </details>

        <label className="relative order-1 block w-full sm:order-none sm:col-start-2 sm:row-start-1">
          <span className="sr-only">{text.searchLabel}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={text.searchPlaceholder}
            className="h-8 bg-card pl-8 text-xs shadow-none"
          />
        </label>
      </div>

      {visibleStaff.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-primary/8 text-primary">
            <BriefcaseBusiness className="size-6" aria-hidden />
          </span>
          <p className="mt-4 font-medium text-foreground">
            {staff.length === 0 ? text.noStaff : text.noFilterResults}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {staff.length === 0
              ? text.noStaffDescription
              : text.noFilterResultsDescription}
          </p>
        </div>
      ) : (
        <Table className="text-xs">
          <TableHeader className="bg-card text-[11px]">
            <TableRow className="border-b">
              <TableHead className="h-8 w-16 px-3 text-center">
                {text.photoColumn}
              </TableHead>
              <TableHead className="h-8 px-3">{text.staffMember}</TableHead>
              <TableHead className="h-8 px-3">{text.department}</TableHead>
              <TableHead className="h-8 px-3">{text.position}</TableHead>
              <TableHead className="h-8 px-3">{text.teacher}</TableHead>
              <TableHead className="h-8 px-3">{text.statusLabel}</TableHead>
              <TableHead className="h-8 w-24 px-3 text-right">
                <span className="sr-only">{messages.common.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y-0">
            {visibleStaff.map((person, index) => (
              <TableRow
                key={person.id}
                className={cn(
                  index % 2 === 1 ? "bg-muted/55" : "bg-card",
                  "hover:bg-primary/5 focus-within:bg-primary/5",
                )}
              >
                <TableCell className="px-3 py-1.5 text-center">
                  {person.photoUrl ? (
                    <Image
                      src={person.photoUrl}
                      alt={person.fullName}
                      width={44}
                      height={44}
                      className="mx-auto size-9 rounded-lg object-cover transition-transform duration-200 hover:scale-[1.18]"
                    />
                  ) : (
                    <span className="mx-auto flex size-9 items-center justify-center rounded-lg bg-primary/8 text-primary">
                      <BriefcaseBusiness className="size-5" aria-hidden />
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  <Link
                    href={`/staff/${person.id}`}
                    className="font-semibold text-foreground outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {person.fullName}
                  </Link>
                  <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                    {person.staffNumber}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-1.5 text-muted-foreground">
                  {person.department}
                </TableCell>
                <TableCell className="px-3 py-1.5 text-muted-foreground">
                  {person.position}
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  {person.teacherTitle ?? "—"}
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  <Badge variant={statusVariant(person.status)}>
                    {statusLabels[person.status]}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-1.5 text-right">
                  <Button asChild size="xs">
                    <Link href={`/staff/${person.id}`}>
                      {text.openDetail}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex flex-col justify-between gap-2.5 border-t px-4 py-2.5 sm:flex-row sm:items-center">
        <p className="text-[11px] text-muted-foreground">
          {text.paginationSummary
            .replace("{from}", String(firstRecord))
            .replace("{to}", String(lastRecord))
            .replace("{count}", String(filteredStaff.length))}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{text.rowsPerPage}</span>
            <NativeSelect
              value={String(pageSize)}
              onChange={(event) => {
                const value = event.target.value;
                setPageSize(value === "all" ? "all" : value === "50" ? 50 : 20);
                setPage(1);
              }}
              className="h-7 w-18 px-2 text-[11px]"
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="all">{text.allRows}</option>
            </NativeSelect>
          </label>
          {filteredStaff.length > 0 && pageSize !== "all" ? (
            <nav className="flex items-center gap-0.5" aria-label={text.paginationLabel}>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                aria-label={text.previousPage}
              >
                <ChevronLeft aria-hidden />
              </Button>
              {pageItems(totalPages, currentPage).map((item) =>
                typeof item === "number" ? (
                  <Button
                    key={item}
                    type="button"
                    variant={item === currentPage ? "default" : "ghost"}
                    size="icon-xs"
                    onClick={() => setPage(item)}
                    aria-current={item === currentPage ? "page" : undefined}
                    aria-label={text.pageLabel.replace("{page}", String(item))}
                  >
                    {item}
                  </Button>
                ) : (
                  <span
                    key={item}
                    className="flex size-6 items-center justify-center text-[11px] text-muted-foreground"
                    aria-hidden
                  >
                    …
                  </span>
                ),
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                aria-label={text.nextPage}
              >
                <ChevronRight aria-hidden />
              </Button>
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  );
}
