"use client";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, registerBootstrap } from "@/app/login/actions";

export function LoginForm({ bootstrap = false }: { bootstrap?: boolean }) {
  const [state, action, pending] = useActionState(
    bootstrap ? registerBootstrap : signIn,
    {},
  );
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          E-posta adresi
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={320}
          placeholder="ad@okulunuz.edu"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Parola
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={bootstrap ? "new-password" : "current-password"}
          required
          minLength={bootstrap ? 12 : 8}
          maxLength={128}
          aria-describedby={bootstrap ? "password-help" : undefined}
        />
        {bootstrap && (
          <p id="password-help" className="text-sm text-muted-foreground">
            En az 12 karakter kullanın. GitHub/Vercel parolanızı kullanmayın.
          </p>
        )}
      </div>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className="rounded-lg border border-primary/30 p-3 text-sm"
        >
          {state.message}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        size="lg"
        className="h-12 w-full"
      >
        {pending && (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        )}
        {bootstrap ? "Hesabımı oluştur" : "Giriş yap"}
        {!pending && <ArrowRight className="size-4" aria-hidden />}
      </Button>
    </form>
  );
}
