"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  Compass,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/platform", label: "Genel bakış", icon: LayoutDashboard },
  { href: "/platform/schools", label: "Okullar ve domainler", icon: Building2 },
  { href: "/platform/ui", label: "UI Kit", icon: Palette },
];

export function PlatformShell({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const section =
    navigation.find(({ href }) =>
      href === "/platform" ? pathname === href : pathname.startsWith(href),
    )?.label ?? "Platform";
  function links(mobile = false) {
    return navigation.map(({ href, label, icon: Icon }) => {
      const active =
        href === "/platform" ? pathname === href : pathname.startsWith(href);
      return (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            mobile && "whitespace-nowrap",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      );
    });
  }
  return (
    <div className="min-h-svh flex-1 bg-background text-foreground">
      <a
        href="#platform-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        İçeriğe geç
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto border-r bg-sidebar px-5 py-7 lg:flex">
        <Link
          href="/platform"
          className="flex w-fit items-center gap-2.5 px-2 text-2xl font-semibold tracking-tight"
          aria-label="Arsimio ana sayfa"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="size-6" aria-hidden />
          </span>
          arsimio
          <span className="mb-3 size-1.5 rounded-full bg-primary" />
        </Link>
        <div className="mt-9 rounded-xl border bg-background/40 p-3.5">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
            ÇALIŞMA ALANI
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-primary" aria-hidden />
            Platform yönetimi
          </p>
        </div>
        <p className="mt-8 mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
          YÖNETİM
        </p>
        <nav aria-label="Platform menüsü" className="space-y-1">
          {links()}
        </nav>
        <div className="mt-8 border-t px-3 pt-6">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
            SONRAKİ AŞAMA
          </p>
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <CreditCard className="size-4" aria-hidden />
            <span>Anlaşmalar ve ödemeler</span>
          </div>
          <p className="mt-2 pl-7 text-xs text-muted-foreground">
            Henüz kullanıma açık değil
          </p>
        </div>
        <div className="mt-auto pt-12">
          <div className="rounded-xl border bg-primary/5 p-4">
            <p className="text-sm font-medium">Her okul, kendi kimliğiyle.</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Okul bilgileri, domainler ve marka renkleri tek merkezde.
            </p>
            <Link
              href="/platform/schools"
              className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary"
            >
              Okulları yönet <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t pt-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              SA
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium">Süper Admin</p>
              <p
                className="mt-1 truncate text-xs text-muted-foreground"
                title={email}
              >
                {email}
              </p>
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0 lg:pl-64">
        <header className="flex h-20 items-center justify-between gap-4 border-b px-5 sm:px-8 xl:px-10">
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <span className="font-semibold lg:hidden">arsimio</span>
            <span className="hidden text-muted-foreground sm:inline">
              Platform
            </span>
            <span className="text-muted-foreground/50" aria-hidden>
              /
            </span>
            <span className="truncate">{section}</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-primary" />
              Süper Admin
            </span>
            <form action={signOut}>
              <Button variant="ghost" className="text-muted-foreground">
                <LogOut aria-hidden />
                <span>Çıkış yap</span>
              </Button>
            </form>
          </div>
        </header>
        <nav
          aria-label="Mobil platform menüsü"
          className="flex gap-1 overflow-x-auto border-b px-4 py-2 lg:hidden"
        >
          {links(true)}
        </nav>
        <main
          id="platform-content"
          className="mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-8 sm:py-10 xl:px-10"
        >
          {children}
        </main>
        <footer className="mx-5 flex flex-wrap justify-between gap-2 border-t py-5 text-xs text-muted-foreground sm:mx-8 xl:mx-10">
          <span>Arsimio · Platform yönetimi</span>
          <span>Okula özel kimlik. Ortak yönetim altyapısı.</span>
        </footer>
      </div>
    </div>
  );
}
