import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HTML_LOCALES, normalizeLocale } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";
import { getTenantContext } from "@/server/tenancy/context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Arsimio",
    template: "%s | Arsimio",
  },
  description: "Modern okul yönetim platformu.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tenant = await getTenantContext();
  const fallback =
    tenant.kind === "school"
      ? normalizeLocale(tenant.school.defaultLocale)
      : undefined;
  const locale = await getRequestLocale(fallback);
  return (
    <html
      lang={HTML_LOCALES[locale]}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
