"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  schoolInitials,
  readableForeground,
  resolveBranding,
} from "@/lib/school-branding";
import { SchoolStatus } from "./school-status";

export type DirectorySchool = {
  id: string;
  name: string;
  slug: string;
  status: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  domains: { hostname: string; status: string }[];
  hasLogo: boolean;
  members: number;
};

export function SchoolDirectory({ schools }: { schools: DirectorySchool[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const normalized = query.trim().toLocaleLowerCase("tr");
  const visible = schools.filter(
    (school) =>
      (status === "all" || school.status === status) &&
      [
        school.name,
        school.slug,
        ...school.domains.map((domain) => domain.hostname),
      ].some((value) => value.toLocaleLowerCase("tr").includes(normalized)),
  );
  return (
    <section
      aria-label="Okul listesi"
      className="overflow-hidden rounded-xl border bg-card"
    >
      <div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Okul veya domain ara"
            placeholder="Okul veya domain ara…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <NativeSelect
          aria-label="Okul durumuna göre filtrele"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-9 sm:w-auto"
        >
          <option value="all">Tüm durumlar</option>
          <option value="ACTIVE">Aktif</option>
          <option value="DRAFT">Taslak</option>
          <option value="SUSPENDED">Askıda</option>
          <option value="ARCHIVED">Arşiv</option>
        </NativeSelect>
      </div>
      <div
        className="relative overflow-x-auto"
        role="region"
        aria-label="Yatay kaydırılabilir okul tablosu"
        tabIndex={0}
      >
        <table className="w-full min-w-[730px] text-left text-sm">
          <caption className="sr-only">
            Okulların domain, marka ve erişim durumu
          </caption>
          <thead className="bg-muted/25 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                Okul
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Domain
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Marka kimliği
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Durum
              </th>
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">İşlemler</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map((school) => {
              const colors = resolveBranding(school);
              return (
                <tr key={school.id} className="hover:bg-muted/20">
                  <th scope="row" className="px-5 py-6 font-normal">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
                        style={{
                          backgroundColor: colors.primaryColor,
                          color: readableForeground(colors.primaryColor),
                        }}
                        aria-hidden
                      >
                        {schoolInitials(school.name)}
                      </span>
                      <div>
                        <Link
                          href={`/platform/schools/${school.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {school.name}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {school.members} aktif üyelik
                        </p>
                      </div>
                    </div>
                  </th>
                  <td className="px-5 py-6">
                    {school.domains.length ? (
                      school.domains.map((domain) => (
                        <div key={domain.hostname} className="mb-1 last:mb-0">
                          <span className="text-xs">{domain.hostname}</span>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {domain.status === "VERIFIED"
                              ? "Doğrulanmış domain"
                              : "Domain kurulumu bekleniyor"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground">
                        Domain tanımlanmamış
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-6">
                    <div className="flex gap-1.5" aria-label="Marka renkleri">
                      {Object.values(colors).map((color, index) => (
                        <span
                          key={index}
                          className="size-4 rounded-full border border-input"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {school.hasLogo
                        ? "Logo kaydı var"
                        : "Logo henüz eklenmedi"}
                    </p>
                  </td>
                  <td className="px-5 py-6">
                    <SchoolStatus status={school.status} />
                  </td>
                  <td className="px-5 py-6 text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={`${school.name} okulunu yönet`}
                        >
                          <Link href={`/platform/schools/${school.id}`}>
                            <ArrowRight aria-hidden />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {school.name} okulunu yönet
                      </TooltipContent>
                    </Tooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <div className="px-5 py-14 text-center">
          <Building2
            className="mx-auto mb-3 size-7 text-muted-foreground"
            aria-hidden
          />
          <p className="font-medium">
            {schools.length
              ? "Aramanıza uygun okul bulunamadı"
              : "Henüz okul kaydı yok"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {schools.length
              ? "Aramayı veya durum filtresini değiştirebilirsiniz."
              : "Okul kurulumu tamamlandığında kayıtlar burada görünür."}
          </p>
          {schools.length > 0 && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            >
              Filtreleri temizle
            </Button>
          )}
        </div>
      )}
      <p
        className="border-t px-5 py-3 text-xs text-muted-foreground"
        aria-live="polite"
      >
        {schools.length} okuldan {visible.length} tanesi gösteriliyor
      </p>
    </section>
  );
}
