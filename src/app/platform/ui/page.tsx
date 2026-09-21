import { DesignSystemPreview } from "@/components/platform/design-system-preview";
import { requirePlatformPermission } from "@/server/authorization/guards";

export default async function PlatformUiPage() {
  await requirePlatformPermission("platform.schools.read");
  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-primary">
          TASARIM SİSTEMİ
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">
          Aynı dil. Her ekranda.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6">
          Eski HorizonEdu paletiyle yalnızca açık tema. Renkleri ve ortak arayüz
          bileşenlerini burada inceleyin; örnekler okul kayıtlarını değiştirmez.
        </p>
      </header>
      <DesignSystemPreview />
    </div>
  );
}
