import { Skeleton } from "@/components/ui/skeleton";

export default function SchoolAdminLoading() {
  return (
    <div
      role="status"
      aria-label="Okul yönetimi yükleniyor"
      className="space-y-6"
    >
      <Skeleton className="h-9 w-52" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <span className="sr-only">Okul yönetimi yükleniyor…</span>
    </div>
  );
}

