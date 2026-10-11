"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ListFilter,
  Search,
  UsersRound,
} from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type { TeacherDirectoryRecord } from "@/server/staff/staff";
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
type StatusFilter = TeacherDirectoryRecord["status"] | "ALL";
type CategoryFilter = TeacherDirectoryRecord["category"] | "ALL";
type PaginationItem = number | "start-ellipsis" | "end-ellipsis";

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

function FilterButton({
  active,
  children,
  onClick,
  menu = false,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  menu?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        menu ? "w-full px-3 py-2 text-left text-xs" : "px-2.5 py-1.5 text-[11px]",
        active
          ? "bg-primary text-primary-foreground"
          : menu
            ? "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary"
            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function TeacherFilters({
  status,
  category,
  setStatus,
  setCategory,
  text,
  menu = false,
}: {
  status: StatusFilter;
  category: CategoryFilter;
  setStatus: (value: StatusFilter) => void;
  setCategory: (value: CategoryFilter) => void;
  text: AppDictionary["staff"];
  menu?: boolean;
}) {
  return (
    <div className={cn(menu ? "space-y-3" : "flex flex-wrap gap-1.5")}>
      <div
        className={cn(menu ? "grid gap-1.5" : "flex flex-wrap gap-1.5")}
        role="group"
        aria-label={text.teacherStatusFilterLabel}
      >
        {(["ACTIVE", "INACTIVE"] as const).map((value) => (
          <FilterButton
            key={value}
            active={status === value}
            menu={menu}
            onClick={() => setStatus(status === value ? "ALL" : value)}
          >
            {value === "ACTIVE" ? text.active : text.passiveAssignment}
          </FilterButton>
        ))}
      </div>
      <div
        className={cn(menu ? "grid gap-1.5" : "flex flex-wrap gap-1.5")}
        role="group"
        aria-label={text.teacherTypeFilterLabel}
      >
        {(["CLASSROOM", "BRANCH"] as const).map((value) => (
          <FilterButton
            key={value}
            active={category === value}
            menu={menu}
            onClick={() => setCategory(category === value ? "ALL" : value)}
          >
            {value === "CLASSROOM" ? text.classroomTeacher : text.branchTeacher}
          </FilterButton>
        ))}
      </div>
    </div>
  );
}

function teacherStatus(
  teacher: TeacherDirectoryRecord,
  text: AppDictionary["staff"],
) {
  if (teacher.status !== "ACTIVE")
    return { label: text.passiveAssignment, variant: "outline" as const };
  if (teacher.employmentStatus === "ACTIVE")
    return { label: text.active, variant: "success" as const };
  if (teacher.employmentStatus === "ON_LEAVE")
    return { label: text.onLeave, variant: "warning" as const };
  return { label: text.ended, variant: "outline" as const };
}

export function TeacherDirectoryTable({
  teachers,
  initialQuery,
  locale,
  messages,
}: {
  teachers: TeacherDirectoryRecord[];
  initialQuery?: string;
  locale: Locale;
  messages: Pick<AppDictionary, "common" | "staff">;
}) {
  const text = messages.staff;
  const [query, setQuery] = useState(initialQuery ?? "");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatusState] = useState<StatusFilter>("ALL");
  const [category, setCategoryState] = useState<CategoryFilter>("ALL");
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [page, setPage] = useState(1);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase(locale);

  function setStatus(value: StatusFilter) {
    setStatusState(value);
    setPage(1);
  }

  function setCategory(value: CategoryFilter) {
    setCategoryState(value);
    setPage(1);
  }

  const filteredTeachers = useMemo(
    () =>
      teachers.filter((teacher) => {
        if (status !== "ALL" && teacher.status !== status) return false;
        if (category !== "ALL" && teacher.category !== category) return false;
        if (!normalizedQuery) return true;
        return [
          teacher.fullName,
          teacher.staffNumber,
          teacher.title,
          teacher.department,
          teacher.position,
          ...teacher.subjects,
        ]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(normalizedQuery);
      }),
    [category, locale, normalizedQuery, status, teachers],
  );
  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleTeachers =
    pageSize === "all"
      ? filteredTeachers
      : filteredTeachers.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize,
        );
  const firstRecord =
    filteredTeachers.length === 0
      ? 0
      : pageSize === "all"
        ? 1
        : (currentPage - 1) * pageSize + 1;
  const lastRecord =
    pageSize === "all"
      ? filteredTeachers.length
      : Math.min(currentPage * pageSize, filteredTeachers.length);
  const activeFilterCount = Number(status !== "ALL") + Number(category !== "ALL");

  return (
    <section
      className="-mt-3 overflow-hidden rounded-xl bg-card sm:-mt-4"
      aria-label={text.teachersListTitle}
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-accent/70 px-4 py-3">
        <h1 className="text-base font-semibold text-foreground">
          {text.teachersListTitle}
        </h1>
        <Button asChild size="sm">
          <Link href="/staff">
            <UsersRound aria-hidden />
            {text.goToStaff}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 border-b px-4 py-2.5 sm:grid sm:grid-cols-[minmax(0,1fr)_280px] sm:items-start sm:gap-4">
        <div className="hidden sm:block">
          <TeacherFilters
            status={status}
            category={category}
            setStatus={setStatus}
            setCategory={setCategory}
            text={text}
          />
        </div>

        <details className="group order-2 rounded-lg bg-muted/55 sm:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <ListFilter className="size-3.5 text-primary" aria-hidden />
              {text.filters}
              {activeFilterCount ? (
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
          <div className="border-t px-3 py-3">
            <TeacherFilters
              status={status}
              category={category}
              setStatus={setStatus}
              setCategory={setCategory}
              text={text}
              menu
            />
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
            placeholder={text.teacherSearchPlaceholder}
            className="h-8 bg-card pl-8 text-xs shadow-none"
          />
        </label>
      </div>

      {visibleTeachers.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-primary/8 text-primary">
            <GraduationCap className="size-6" aria-hidden />
          </span>
          <p className="mt-4 font-medium text-foreground">
            {teachers.length === 0 ? text.noTeachers : text.noTeacherFilterResults}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {teachers.length === 0
              ? text.noTeachersDescription
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
              <TableHead className="h-8 px-3">{text.teacher}</TableHead>
              <TableHead className="h-8 px-3">{text.titleColumn}</TableHead>
              <TableHead className="h-8 px-3">{text.typeColumn}</TableHead>
              <TableHead className="h-8 px-3">{text.subjects}</TableHead>
              <TableHead className="h-8 px-3">{text.statusLabel}</TableHead>
              <TableHead className="h-8 w-24 px-3 text-right">
                <span className="sr-only">{messages.common.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y-0">
            {visibleTeachers.map((teacher, index) => {
              const statusInfo = teacherStatus(teacher, text);
              return (
                <TableRow
                  key={teacher.id}
                  className={cn(
                    index % 2 === 1 ? "bg-muted/55" : "bg-card",
                    "hover:bg-primary/5 focus-within:bg-primary/5",
                  )}
                >
                  <TableCell className="px-3 py-1.5 text-center">
                    {teacher.photoUrl ? (
                      <Image
                        src={teacher.photoUrl}
                        alt={teacher.fullName}
                        width={44}
                        height={44}
                        className="mx-auto size-9 rounded-lg object-cover transition-transform duration-200 hover:scale-[1.18]"
                      />
                    ) : (
                      <span className="mx-auto flex size-9 items-center justify-center rounded-lg bg-primary/8 text-primary">
                        <GraduationCap className="size-5" aria-hidden />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    <Link
                      href={`/teachers/${teacher.id}`}
                      className="font-semibold text-foreground outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {teacher.fullName}
                    </Link>
                    <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                      {teacher.staffNumber}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-muted-foreground">
                    {teacher.title}
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    {teacher.category === "CLASSROOM"
                      ? text.classroomTeacher
                      : text.branchTeacher}
                  </TableCell>
                  <TableCell className="max-w-72 px-3 py-1.5 text-muted-foreground">
                    <span className="line-clamp-2">
                      {teacher.subjects.length ? teacher.subjects.join(", ") : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-right">
                    <Button asChild size="xs">
                      <Link href={`/teachers/${teacher.id}`}>
                        {text.openDetail}
                        <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <div className="flex flex-col justify-between gap-2.5 border-t px-4 py-2.5 sm:flex-row sm:items-center">
        <p className="text-[11px] text-muted-foreground">
          {text.paginationSummary
            .replace("{from}", String(firstRecord))
            .replace("{to}", String(lastRecord))
            .replace("{count}", String(filteredTeachers.length))}
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
          {filteredTeachers.length > 0 && pageSize !== "all" ? (
            <nav className="flex items-center gap-0.5" aria-label={text.teacherPaginationLabel}>
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
