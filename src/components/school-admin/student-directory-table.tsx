"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import type { StudentStatus } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type { StudentDirectoryRecord } from "@/server/students/students";
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

const ALL_CLASSES = "__all_classes__";
const UNASSIGNED_CLASS = "__unassigned_class__";

type PageSize = 20 | 50 | "all";
type StatusFilter = StudentStatus | "ALL";
type PaginationItem = number | "start-ellipsis" | "end-ellipsis";

function StudentPhotoPlaceholder({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "mx-auto flex size-11 items-center justify-center rounded-lg bg-primary/8 text-primary",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 48 48" className="size-8" fill="none">
        <path
          d="M14 18.5c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10-10-4.5-10-10Z"
          fill="currentColor"
          opacity=".18"
        />
        <path
          d="M8.5 39.5c1.7-6.9 7.8-11 15.5-11s13.8 4.1 15.5 11"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="m10 12 14-6 14 6-14 6-14-6Z"
          fill="currentColor"
        />
        <path
          d="M34 14.2v7.3"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="34" cy="23.5" r="2" fill="currentColor" />
      </svg>
    </span>
  );
}

function pageItems(totalPages: number, currentPage: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "end-ellipsis", totalPages];
  }

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

function statusBadgeVariant(status: StudentStatus) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "INACTIVE") return "warning" as const;
  if (status === "GRADUATED") return "info" as const;
  return "danger" as const;
}

export function StudentDirectoryTable({
  students,
  initialStatus,
  initialQuery,
  canManage,
  locale,
  messages,
}: {
  students: StudentDirectoryRecord[];
  initialStatus?: StudentStatus;
  initialQuery?: string;
  canManage: boolean;
  locale: Locale;
  messages: Pick<AppDictionary, "common" | "students">;
}) {
  const text = messages.students;
  const [query, setQuery] = useState(initialQuery ?? "");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState<StatusFilter>(initialStatus ?? "ALL");
  const [classSection, setClassSection] = useState(ALL_CLASSES);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [page, setPage] = useState(1);

  const statusLabels: Record<StudentStatus, string> = {
    ACTIVE: text.active,
    INACTIVE: text.inactive,
    GRADUATED: text.graduated,
    WITHDRAWN: text.withdrawn,
    TRANSFERRED: text.transferred,
  };
  const statusOptions: Array<{ value: StudentStatus; label: string }> = [
    { value: "ACTIVE", label: text.active },
    { value: "INACTIVE", label: text.inactive },
    { value: "GRADUATED", label: text.graduated },
    { value: "WITHDRAWN", label: text.withdrawn },
    { value: "TRANSFERRED", label: text.transferred },
  ];
  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students.flatMap((student) =>
            student.classSection ? [student.classSection] : [],
          ),
        ),
      ).sort((left, right) => left.localeCompare(right, locale)),
    [locale, students],
  );
  const hasUnassignedStudents = students.some((student) => !student.classSection);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase(locale);
  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        if (status !== "ALL" && student.status !== status) return false;
        if (
          classSection !== ALL_CLASSES &&
          (classSection === UNASSIGNED_CLASS
            ? student.classSection !== null
            : student.classSection !== classSection)
        ) {
          return false;
        }
        if (!normalizedQuery) return true;

        return [
          student.fullName,
          student.studentNumber,
          student.classSection,
          student.primaryGuardian,
          student.primaryGuardianPhone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(normalizedQuery);
      }),
    [classSection, locale, normalizedQuery, status, students],
  );
  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleStudents =
    pageSize === "all"
      ? filteredStudents
      : filteredStudents.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize,
        );
  const firstRecord =
    filteredStudents.length === 0
      ? 0
      : pageSize === "all"
        ? 1
        : (currentPage - 1) * pageSize + 1;
  const lastRecord =
    pageSize === "all"
      ? filteredStudents.length
      : Math.min(currentPage * pageSize, filteredStudents.length);

  return (
    <section
      className="-mt-3 overflow-hidden rounded-xl bg-card sm:-mt-4"
      aria-label={text.listTitle}
    >
      <div className="flex flex-col justify-between gap-3 border-b-2 border-accent/70 px-4 py-3 sm:flex-row sm:items-center">
        <h2 className="text-base font-semibold text-foreground">{text.listTitle}</h2>
        {canManage ? (
          <Button asChild>
            <Link href="/students/new">{text.newStudent}</Link>
          </Button>
        ) : null}
      </div>

      <div className="space-y-2 px-4 py-2.5">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label={text.statusFilterLabel}
        >
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => {
                setStatus((current) =>
                  current === option.value ? "ALL" : option.value,
                );
                setPage(1);
              }}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                status === option.value
                  ? option.value === "ACTIVE"
                    ? "bg-success text-success-foreground"
                    : "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label={text.classFilterLabel}
        >
          {classOptions.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={classSection === option}
              onClick={() => {
                setClassSection((current) =>
                  current === option ? ALL_CLASSES : option,
                );
                setPage(1);
              }}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                classSection === option
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/80",
              )}
            >
              {option}
            </button>
          ))}
          {hasUnassignedStudents ? (
            <button
              type="button"
              aria-pressed={classSection === UNASSIGNED_CLASS}
              onClick={() => {
                setClassSection((current) =>
                  current === UNASSIGNED_CLASS
                    ? ALL_CLASSES
                    : UNASSIGNED_CLASS,
                );
                setPage(1);
              }}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                classSection === UNASSIGNED_CLASS
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/80",
              )}
            >
              {text.unassignedClass}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col justify-between gap-2.5 border-y bg-muted/20 px-4 py-2 sm:flex-row sm:items-center">
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{text.rowsPerPage}</span>
          <NativeSelect
            value={String(pageSize)}
            onChange={(event) => {
              const value = event.target.value;
              setPageSize(value === "all" ? "all" : value === "50" ? 50 : 20);
              setPage(1);
            }}
            className="h-8 w-20 px-2 text-xs"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="all">{text.allRows}</option>
          </NativeSelect>
        </label>
        <label className="relative block w-full sm:max-w-[260px]">
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

      {visibleStudents.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <StudentPhotoPlaceholder />
          <p className="mt-4 font-medium text-foreground">
            {students.length === 0 ? text.noStudents : text.noFilterResults}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {students.length === 0
              ? text.noStudentsDescription
              : text.noFilterResultsDescription}
          </p>
        </div>
      ) : (
        <Table className="text-xs">
          <TableHeader className="bg-card text-[11px]">
            <TableRow className="border-b">
              <TableHead className="h-8 w-16 px-3">{text.photoColumn}</TableHead>
              <TableHead className="h-8 px-3">{text.student}</TableHead>
              <TableHead className="h-8 px-3">{text.classSection}</TableHead>
              <TableHead className="h-8 px-3">{text.primaryGuardian}</TableHead>
              <TableHead className="h-8 px-3">{text.primaryGuardianPhone}</TableHead>
              <TableHead className="h-8 px-3">{messages.common.status}</TableHead>
              <TableHead className="h-8 w-24 px-3 text-right">
                <span className="sr-only">{messages.common.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y-0">
            {visibleStudents.map((student, index) => (
              <TableRow
                key={student.id}
                className={cn(index % 2 === 1 && "bg-muted/35")}
              >
                <TableCell className="px-3 py-1.5">
                  <div className="mx-auto flex size-10 items-center justify-center transition-transform duration-200 ease-out hover:scale-[1.18] motion-reduce:transform-none">
                    {student.photoUrl ? (
                      <Image
                        src={student.photoUrl}
                        alt={student.fullName}
                        width={36}
                        height={36}
                        className="size-9 rounded-md object-cover"
                      />
                    ) : (
                      <StudentPhotoPlaceholder className="size-9 rounded-md [&_svg]:size-7" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  <Link
                    href={`/students/${student.id}`}
                    className="font-semibold text-foreground outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {student.fullName}
                  </Link>
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  {student.classSection ?? text.noClassSection}
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  {student.primaryGuardian ?? text.noPrimaryGuardian}
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  {student.primaryGuardianPhone ?? "—"}
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  <Badge variant={statusBadgeVariant(student.status)}>
                    {statusLabels[student.status]}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-1.5 text-right">
                  <Button asChild size="xs">
                    <Link href={`/students/${student.id}`}>
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
            .replace("{count}", String(filteredStudents.length))}
        </p>
        {filteredStudents.length > 0 && pageSize !== "all" ? (
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
    </section>
  );
}
