import { requireSchoolPermission } from "@/server/authorization/guards";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const { user, tenant, membership } =
    await requireSchoolPermission("dashboard.read");
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="flex items-center justify-between gap-4 border-b pb-6">
        <h1 className="text-2xl font-semibold">{tenant.school.name}</h1>
        <form action={signOut}>
          <Button variant="outline">Çıkış yap</Button>
        </form>
      </header>
      <h2 className="mt-12 text-3xl font-semibold">Hoş geldiniz</h2>
      <p className="mt-4 text-muted-foreground">{user.email}</p>
      <p className="mt-2 text-sm">
        {membership.roles.map((r) => r.role.name).join(" · ")}
      </p>
      <p className="mt-8 rounded-xl border p-6 text-sm text-muted-foreground">
        Okul hesabınız hazır. Eğitim modülleri henüz kullanıma açılmadı.
      </p>
    </main>
  );
}
