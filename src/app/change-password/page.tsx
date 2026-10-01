import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { portalStartPath } from "@/server/accounts/accounts-service";
import { getAppUser } from "@/server/auth/user";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getAppUser();
  if (!user) redirect("/login");
  if (!user.account?.mustChangePassword)
    redirect(portalStartPath(user.account?.portal));

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <section className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
          GECICI PAROLA
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Yeni parola belirleyin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hesabiniz gecici parola ile acildi. En az 8 karakterli yeni
          parolanizi belirledikten sonra tekrar giris yapacaksiniz.
        </p>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </section>
    </main>
  );
}
