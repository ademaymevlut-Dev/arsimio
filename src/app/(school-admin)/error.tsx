"use client";

import { Button } from "@/components/ui/button";

export default function SchoolAdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded-xl border bg-card px-6 py-12 text-center">
      <h1 className="text-xl font-semibold">Okul yönetimi yüklenemedi</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Bağlantı geçici olarak kesilmiş olabilir. Lütfen tekrar deneyin.
      </p>
      <Button className="mt-6" onClick={reset}>
        Tekrar dene
      </Button>
    </section>
  );
}

