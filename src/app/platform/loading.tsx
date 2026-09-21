import { Skeleton } from "@/components/ui/skeleton";

export default function PlatformLoading() {
  return (
    <div
      role="status"
      aria-label="Okul kayıtları yükleniyor"
      className="space-y-6"
    >
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <span className="sr-only">Okul kayıtları yükleniyor…</span>
    </div>
  );
}
