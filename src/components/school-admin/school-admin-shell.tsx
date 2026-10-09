"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarRange,
  ChevronDown,
  CreditCard,
  FileText,
  LibraryBig,
  ListTree,
  LayoutDashboard,
  LogOut,
  Menu,
  GraduationCap,
  Settings,
  UserRoundCheck,
  UserRoundCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { readableForeground, schoolInitials } from "@/lib/school-branding";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { formatMessage } from "@/i18n/format";
import type { Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";

type NavigationItem = {
  group: string;
  href: string;
  label: string;
  icon: LucideIcon;
  permission: string;
  settings?: boolean;
};

function createNavigation(messages: AppDictionary["shell"]): NavigationItem[] {
  return [
    {
      group: messages.general,
      href: "/dashboard",
      label: messages.overview,
      icon: LayoutDashboard,
      permission: "dashboard.read",
    },
    {
      group: messages.settings,
      href: "/academics/years",
      label: messages.academicYears,
      icon: CalendarRange,
      permission: "academics.read",
      settings: true,
    },
    {
      group: messages.settings,
      href: "/academics/structure",
      label: messages.academicStructure,
      icon: LibraryBig,
      permission: "academics.read",
      settings: true,
    },
    {
      group: messages.settings,
      href: "/academics/timetable",
      label: messages.weeklySchedule,
      icon: BookOpenCheck,
      permission: "teaching.schedule.read",
      settings: true,
    },
    {
      group: messages.people,
      href: "/students",
      label: messages.students,
      icon: GraduationCap,
      permission: "students.read",
    },
    {
      group: messages.people,
      href: "/guardians",
      label: messages.guardians,
      icon: UsersRound,
      permission: "guardians.read",
    },
    {
      group: messages.people,
      href: "/staff",
      label: messages.staff,
      icon: BriefcaseBusiness,
      permission: "hr.staff.read",
    },
    {
      group: messages.settings,
      href: "/staff/settings",
      label: messages.staffCatalog,
      icon: ListTree,
      permission: "hr.catalog.read",
      settings: true,
    },
    {
      group: messages.contracts,
      href: "/finance",
      label: messages.finance,
      icon: CreditCard,
      permission: "finance.contracts.read",
    },
    {
      group: messages.contracts,
      href: "/contracts/templates",
      label: messages.contractTemplates,
      icon: FileText,
      permission: "hr.contracts.read",
    },
    {
      group: messages.people,
      href: "/teachers",
      label: messages.teachers,
      icon: UserRoundCheck,
      permission: "teachers.read",
    },
    {
      group: messages.people,
      href: "/accounts",
      label: messages.accounts,
      icon: UserRoundCog,
      permission: "accounts.read",
    },
  ];
}

function navigationItemIsActive(href: string, pathname: string) {
  const onStaffCatalog =
    pathname === "/staff/settings" || pathname.startsWith("/staff/settings/");
  if (href === "/dashboard") return pathname === href;
  if (href === "/staff") {
    return (
      pathname === "/staff" ||
      (pathname.startsWith("/staff/") && !onStaffCatalog)
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({
  item,
  pathname,
  mobile,
  nested = false,
}: {
  item: NavigationItem;
  pathname: string;
  mobile: boolean;
  nested?: boolean;
}) {
  const active = navigationItemIsActive(item.href, pathname);
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        nested ? "px-3 py-2 text-xs" : "px-3 py-2.5 text-sm",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {item.label}
    </Link>
  );

  return mobile ? <SheetClose asChild>{link}</SheetClose> : link;
}

function Navigation({
  items,
  pathname,
  mobile = false,
  label,
  settingsLabel,
}: {
  items: NavigationItem[];
  pathname: string;
  mobile?: boolean;
  label: string;
  settingsLabel: string;
}) {
  const primaryItems = items.filter((item) => !item.settings);
  const settingsItems = items.filter((item) => item.settings);
  const groups = [...new Set(primaryItems.map((item) => item.group))];
  const settingsActive = settingsItems.some((item) =>
    navigationItemIsActive(item.href, pathname),
  );

  return (
    <nav aria-label={label}>
      {groups.map((group, groupIndex) => (
        <div key={group} className={cn(groupIndex > 0 && "mt-7")}>
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
            {group}
          </p>
          <div className="space-y-1">
            {primaryItems
              .filter((item) => item.group === group)
              .map((item) => (
                <NavigationLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  mobile={mobile}
                />
              ))}
          </div>
        </div>
      ))}
      {settingsItems.length > 0 ? (
        <details
          key={settingsActive ? pathname : "settings"}
          open={settingsActive ? true : undefined}
          className="group mt-7"
        >
          <summary
            aria-current={settingsActive ? "page" : undefined}
            className={cn(
              "flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden",
              settingsActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Settings className="size-4" aria-hidden />
            <span className="flex-1">{settingsLabel}</span>
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-1 space-y-1 pl-4">
            {settingsItems.map((item) => (
              <NavigationLink
                key={item.href}
                item={item}
                pathname={pathname}
                mobile={mobile}
                nested
              />
            ))}
          </div>
        </details>
      ) : null}
    </nav>
  );
}

function SchoolBrand({
  schoolName,
  primaryColor,
  messages,
}: {
  schoolName: string;
  primaryColor: string;
  messages: AppDictionary["shell"];
}) {
  return (
    <Link
      href="/dashboard"
      className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={formatMessage(messages.homeLabel, { name: schoolName })}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
        style={{
          backgroundColor: primaryColor,
          color: readableForeground(primaryColor),
        }}
        aria-hidden
      >
        {schoolInitials(schoolName)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-foreground">
          {schoolName}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {messages.schoolManagement}
        </span>
      </span>
    </Link>
  );
}

export function SchoolAdminShell({
  schoolName,
  hostname,
  primaryColor,
  userLabel,
  username,
  permissions,
  locale,
  messages,
  children,
}: {
  schoolName: string;
  hostname: string;
  primaryColor: string;
  userLabel: string;
  username: string | null;
  permissions: string[];
  locale: Locale;
  messages: Pick<AppDictionary, "language" | "shell">;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const navigation = createNavigation(messages.shell);
  const allowed = new Set(permissions);
  const items = navigation.filter((item) => allowed.has(item.permission));
  const section =
    items.find(({ href }) =>
      href === "/dashboard" ? pathname === href : pathname.startsWith(href),
    )?.label ?? messages.shell.schoolManagement;

  return (
    <div className="min-h-svh bg-background lg:p-5">
      <a
        href="#school-admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        {messages.shell.skipToContent}
      </a>
      <div className="mx-auto min-h-svh w-full max-w-[1400px] bg-background lg:grid lg:min-h-[calc(100svh-2.5rem)] lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="hidden bg-background p-5 lg:flex lg:flex-col">
          <SchoolBrand
            schoolName={schoolName}
            primaryColor={primaryColor}
            messages={messages.shell}
          />
          <div className="mt-9">
            <Navigation
              items={items}
              pathname={pathname}
              label={messages.shell.navigationLabel}
              settingsLabel={messages.shell.settings}
            />
          </div>
        </aside>
        <div className="min-w-0 bg-background">
          <header className="flex h-14 items-center justify-between gap-3 bg-background px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="lg:hidden"
                    aria-label={messages.shell.openMenu}
                  >
                    <Menu aria-hidden />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle className="sr-only">
                      {messages.shell.menuTitle}
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      {messages.shell.menuDescription}
                    </SheetDescription>
                  </SheetHeader>
                  <SchoolBrand
                    schoolName={schoolName}
                    primaryColor={primaryColor}
                    messages={messages.shell}
                  />
                  <div className="mt-9">
                    <Navigation
                      items={items}
                      pathname={pathname}
                      label={messages.shell.navigationLabel}
                      settingsLabel={messages.shell.settings}
                      mobile
                    />
                  </div>
                  <div className="mt-7 border-t pt-5 xl:hidden">
                    <LanguageSwitcher
                      locale={locale}
                      messages={messages.language}
                      compact
                      instant
                    />
                  </div>
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{section}</p>
                <p className="mt-0.5 hidden truncate text-[11px] text-muted-foreground sm:block">
                  {hostname}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden xl:block">
                <LanguageSwitcher
                  locale={locale}
                  messages={messages.language}
                  compact
                  instant
                />
              </div>
              <span className="hidden text-right sm:block">
                <span className="block text-xs font-medium">{userLabel}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {username ?? messages.shell.schoolAccount}
                </span>
              </span>
              <form action={signOut}>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <LogOut aria-hidden />
                  <span className="hidden sm:inline">{messages.shell.signOut}</span>
                </Button>
              </form>
            </div>
          </header>
          <main
            id="school-admin-content"
            className="min-h-[calc(100svh-3.5rem)] px-4 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-9"
          >
            {children}
          </main>
          <footer className="mx-4 flex flex-wrap justify-between gap-2 py-5 text-xs text-muted-foreground sm:mx-6 lg:mx-8">
            <span>Arsimio · {schoolName}</span>
            <span>{messages.shell.secureManagement}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
