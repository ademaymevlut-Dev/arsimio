"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  Check,
  Circle,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
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

const navigation = [
  {
    href: "/dashboard",
    label: "Genel bakış",
    icon: LayoutDashboard,
    permission: "dashboard.read",
  },
];

const setupSteps = [
  { label: "Yönetici hesabı", ready: true },
  { label: "Öğretim yılı ve dönem", ready: false },
  { label: "Sınıflar ve dersler", ready: false },
];

function Navigation({
  items,
  pathname,
  mobile = false,
}: {
  items: typeof navigation;
  pathname: string;
  mobile?: boolean;
}) {
  return (
    <nav aria-label="Okul yönetimi menüsü" className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard"
            ? pathname === href
            : pathname.startsWith(href);
        const link = (
          <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
        return mobile ? (
          <SheetClose asChild key={href}>
            {link}
          </SheetClose>
        ) : (
          <div key={href}>{link}</div>
        );
      })}
    </nav>
  );
}

function SchoolBrand({
  schoolName,
  primaryColor,
}: {
  schoolName: string;
  primaryColor: string;
}) {
  return (
    <Link
      href="/dashboard"
      className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${schoolName} yönetim ana sayfası`}
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
          Okul yönetimi
        </span>
      </span>
    </Link>
  );
}

function SetupStatus() {
  return (
    <div className="rounded-xl border bg-background/60 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <BookOpenCheck className="size-4 text-primary" aria-hidden />
        Kurulum durumu
      </p>
      <div className="mt-4 space-y-3">
        {setupSteps.map((step) => (
          <div
            key={step.label}
            className="flex items-center gap-2.5 text-xs text-muted-foreground"
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                step.ready
                  ? "bg-success text-success-foreground"
                  : "border bg-card",
              )}
            >
              {step.ready ? (
                <Check className="size-3" aria-hidden />
              ) : (
                <Circle className="size-2 fill-current" aria-hidden />
              )}
            </span>
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SchoolAdminShell({
  schoolName,
  hostname,
  primaryColor,
  userLabel,
  username,
  roleNames,
  permissions,
  children,
}: {
  schoolName: string;
  hostname: string;
  primaryColor: string;
  userLabel: string;
  username: string | null;
  roleNames: string[];
  permissions: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const allowed = new Set(permissions);
  const items = navigation.filter((item) => allowed.has(item.permission));
  const section =
    items.find(({ href }) =>
      href === "/dashboard" ? pathname === href : pathname.startsWith(href),
    )?.label ?? "Okul yönetimi";

  return (
    <div className="min-h-svh bg-background lg:p-5">
      <a
        href="#school-admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        İçeriğe geç
      </a>
      <div className="mx-auto min-h-svh w-full max-w-[1400px] bg-card lg:grid lg:min-h-[calc(100svh-2.5rem)] lg:grid-cols-[252px_minmax(0,1fr)] lg:rounded-2xl lg:border lg:shadow-sm">
        <aside className="hidden border-r bg-sidebar p-5 lg:flex lg:flex-col lg:rounded-l-2xl">
          <SchoolBrand schoolName={schoolName} primaryColor={primaryColor} />
          <p className="mt-9 mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
            GENEL
          </p>
          <Navigation items={items} pathname={pathname} />
          <div className="mt-8">
            <SetupStatus />
          </div>
          <div className="mt-auto border-t pt-5">
            <div className="flex items-center gap-3 px-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{userLabel}</p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {roleNames.join(" · ") || "Okul kullanıcısı"}
                </p>
              </div>
            </div>
          </div>
        </aside>
        <div className="min-w-0 bg-background/65 lg:rounded-r-2xl">
          <header className="flex h-18 items-center justify-between gap-4 border-b bg-card px-4 sm:px-6 lg:rounded-tr-2xl lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Okul menüsünü aç"
                  >
                    <Menu aria-hidden />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle className="sr-only">Okul menüsü</SheetTitle>
                    <SheetDescription className="sr-only">
                      Okul yönetimi sayfaları ve kurulum durumu
                    </SheetDescription>
                  </SheetHeader>
                  <SchoolBrand
                    schoolName={schoolName}
                    primaryColor={primaryColor}
                  />
                  <p className="mt-9 mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
                    GENEL
                  </p>
                  <Navigation items={items} pathname={pathname} mobile />
                  <div className="mt-8">
                    <SetupStatus />
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
            <div className="flex items-center gap-3">
              <span className="hidden text-right sm:block">
                <span className="block text-xs font-medium">{userLabel}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {username ?? "Okul hesabı"}
                </span>
              </span>
              <form action={signOut}>
                <Button variant="ghost" className="text-muted-foreground">
                  <LogOut aria-hidden />
                  <span className="hidden sm:inline">Çıkış yap</span>
                </Button>
              </form>
            </div>
          </header>
          <main
            id="school-admin-content"
            className="min-h-[calc(100svh-4.5rem)] px-4 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-9"
          >
            {children}
          </main>
          <footer className="mx-4 flex flex-wrap justify-between gap-2 border-t py-5 text-xs text-muted-foreground sm:mx-6 lg:mx-8">
            <span>Arsimio · {schoolName}</span>
            <span>Güvenli okul yönetimi</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
