import { Badge } from "@/components/ui/badge";

const labels: Record<string, string> = {
  ACTIVE: "Aktif",
  DRAFT: "Taslak",
  SUSPENDED: "Askıda",
  ARCHIVED: "Arşiv",
  VERIFIED: "Doğrulanmış",
  PENDING: "Bekliyor",
  FAILED: "Doğrulanamadı",
  DISABLED: "Devre dışı",
};

export function SchoolStatus({ status }: { status: string }) {
  const positive = status === "ACTIVE" || status === "VERIFIED";
  const variant = positive
    ? "success"
    : status === "FAILED"
      ? "danger"
      : status === "SUSPENDED" || status === "PENDING"
        ? "warning"
        : status === "DRAFT"
          ? "info"
          : "secondary";
  return (
    <Badge variant={variant} className="h-auto gap-1.5 px-2.5 py-1 text-[11px]">
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {labels[status] ?? status}
    </Badge>
  );
}
