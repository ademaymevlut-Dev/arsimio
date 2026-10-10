"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Search,
  UsersRound,
} from "lucide-react";
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
import type { Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { cn } from "@/lib/utils";
import type { GuardianDirectoryRecord } from "@/server/accounts/accounts";

type PageSize = 20 | 50 | "all";
type ChildCountFilter = number | "ALL";
type PrimaryFilter = "ALL" | "PRIMARY" | "EMPTY";
type PaginationItem = number | "start-ellipsis" | "end-ellipsis";
type FilterLayout = "compact" | "menu";

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

function FilterButtons({
  childCounts,
  childCount,
  primary,
  setChildCount,
  setPrimary,
  layout = "compact",
  text,
}: {
  childCounts: number[];
  childCount: ChildCountFilter;
  primary: PrimaryFilter;
  setChildCount: (value: ChildCountFilter) => void;
  setPrimary: (value: PrimaryFilter) => void;
  layout?: FilterLayout;
  text: AppDictionary["guardians"];
}) {
  return (
    <div className={layout === "menu" ? "space-y-3" : "flex flex-wrap gap-1.5"}>
      <div
        className={layout === "menu" ? "grid gap-1.5" : "flex flex-wrap gap-1.5"}
        role="group"
        aria-label={text.childCountFilter}
      >
        {childCounts.map((count) => (
          <button
            key={count}
            type="button"
            aria-pressed={childCount === count}
            onClick={() => setChildCount(childCount === count ? "ALL" : count)}
            className={filterButtonClass(childCount === count, layout)}
          >
            {text.childCount.replace("{count}", String(count))}
          </button>
        ))}
      </div>
      <div
        className={layout === "menu" ? "grid gap-1.5" : "flex flex-wrap gap-1.5"}
        role="group"
        aria-label={text.primaryFilter}
      >
        {(
          [
            ["PRIMARY", text.primary],
            ["EMPTY", text.emptyPrimary],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={primary === value}
            onClick={() => setPrimary(primary === value ? "ALL" : value)}
            className={filterButtonClass(primary === value, layout)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GuardianDirectoryTable({
  guardians,
  initialQuery,
  locale,
  messages,
}: {
  guardians: GuardianDirectoryRecord[];
  initialQuery?: string;
  locale: Locale;
  messages: Pick<AppDictionary, "common" | "guardians">;
}) {
  const text = messages.guardians;
  const [query, setQuery] = useState(initialQuery ?? "");
  const deferredQuery = useDeferredValue(query);
  const [childCount, setChildCountState] = useState<ChildCountFilter>("ALL");
  const [primary, setPrimaryState] = useState<PrimaryFilter>("ALL");
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [page, setPage] = useState(1);
  const childCounts = useMemo(
    () =>
      Array.from(new Set(guardians.map((guardian) => guardian.childCount))).sort(
        (left, right) => left - right,
      ),
    [guardians],
  );
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase(locale);
  const filteredGuardians = useMemo(
    () =>
      guardians.filter((guardian) => {
        if (childCount !== "ALL" && guardian.childCount !== childCount)
          return false;
        if (primary === "PRIMARY" && guardian.primaryChildCount === 0)
          return false;
        if (primary === "EMPTY" && guardian.primaryChildCount > 0) return false;
        if (!normalizedQuery) return true;
        return [
          guardian.fullName,
          guardian.phone,
          guardian.email,
          guardian.account?.username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(normalizedQuery);
      }),
    [childCount, guardians, locale, normalizedQuery, primary],
  );
  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredGuardians.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleGuardians =
    pageSize === "all"
      ? filteredGuardians
      : filteredGuardians.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize,
        );
  const firstRecord =
    filteredGuardians.length === 0
      ? 0
      : pageSize === "all"
        ? 1
        : (currentPage - 1) * pageSize + 1;
  const lastRecord =
    pageSize === "all"
      ? filteredGuardians.length
      : Math.min(currentPage * pageSize, filteredGuardians.length);
  const activeFilterCount =
    Number(childCount !== "ALL") + Number(primary !== "ALL");

  function setChildCount(value: ChildCountFilter) {
    setChildCountState(value);
    setPage(1);
  }

  function setPrimary(value: PrimaryFilter) {
    setPrimaryState(value);
    setPage(1);
  }

  return (
    <section
      className="-mt-3 overflow-hidden rounded-xl bg-card sm:-mt-4"
      aria-label={text.listTitle}
    >
      <div className="border-b-2 border-accent/70 px-4 py-3">
        <h1 className="text-base font-semibold text-foreground">
          {text.listTitle}
        </h1>
      </div>

      <div className="flex flex-col gap-2 border-b px-4 py-2.5 sm:grid sm:grid-cols-[minmax(0,1fr)_260px] sm:items-start sm:gap-4">
        <div className="hidden min-w-0 sm:block">
          <FilterButtons
            childCounts={childCounts}
            childCount={childCount}
            primary={primary}
            setChildCount={setChildCount}
            setPrimary={setPrimary}
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
          <div className="border-t px-3 py-3">
            <FilterButtons
              childCounts={childCounts}
              childCount={childCount}
              primary={primary}
              setChildCount={setChildCount}
              setPrimary={setPrimary}
              layout="menu"
              text={text}
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
            placeholder={text.searchPlaceholder}
            className="h-8 bg-card pl-8 text-xs shadow-none"
          />
        </label>
      </div>

      {visibleGuardians.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-primary/8 text-primary">
            <UsersRound className="size-6" aria-hidden />
          </span>
          <p className="mt-4 font-medium text-foreground">
            {guardians.length === 0 ? text.noGuardians : text.noFilterResults}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {guardians.length === 0
              ? text.noGuardiansDescription
              : text.noFilterResultsDescription}
          </p>
        </div>
      ) : (
        <Table className="text-xs">
          <TableHeader className="bg-card text-[11px]">
            <TableRow className="border-b">
              <TableHead className="h-8 px-3">{text.guardian}</TableHead>
              <TableHead className="h-8 px-3">{text.contact}</TableHead>
              <TableHead className="h-8 px-3">{text.children}</TableHead>
              <TableHead className="h-8 px-3">{text.account}</TableHead>
              <TableHead className="h-8 w-24 px-3 text-right">
                <span className="sr-only">{messages.common.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y-0">
            {visibleGuardians.map((guardian, index) => (
              <TableRow
                key={guardian.personId}
                className={cn(
                  index % 2 === 1 ? "bg-muted/55" : "bg-card",
                  "hover:bg-primary/5 focus-within:bg-primary/5",
                )}
              >
                <TableCell className="px-3 py-1.5">
                  <Link
                    href={`/guardians/${guardian.personId}`}
                    className="font-semibold text-foreground outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {guardian.fullName}
                  </Link>
                </TableCell>
                <TableCell className="px-3 py-1.5 text-muted-foreground">
                  <span className="block">{guardian.phone ?? "—"}</span>
                  <span className="block">{guardian.email ?? "—"}</span>
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  <span>{guardian.childCount}</span>
                  {guardian.primaryChildCount > 0 ? (
                    <Badge className="ml-2" variant="success">
                      {guardian.primaryChildCount} {text.primary}
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  {guardian.account ? (
                    <Badge
                      variant={guardian.account.suspendedAt ? "danger" : "success"}
                    >
                      {guardian.account.username ?? guardian.account.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{text.noAccount}</Badge>
                  )}
                </TableCell>
                <TableCell className="px-3 py-1.5 text-right">
                  <Button asChild size="xs">
                    <Link href={`/guardians/${guardian.personId}`}>
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
            .replace("{count}", String(filteredGuardians.length))}
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
          {filteredGuardians.length > 0 && pageSize !== "all" ? (
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
