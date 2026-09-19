import { getTenantContext } from "@/server/tenancy/context";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function Page() {
  await getTenantContext();
  return (
    <main className="m-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Bu alana erişiminiz yok</h1>
      <p className="my-6 text-muted-foreground">
        Hesabınızın bu alanda aktif bir yetkisi bulunmuyor. Okul yönetiminizle
        iletişime geçin veya farklı bir hesapla giriş yapın.
      </p>
      <form action={signOut}>
        <Button variant="outline">Çıkış yap</Button>
      </form>
    </main>
  );
}
