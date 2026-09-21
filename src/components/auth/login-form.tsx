"use client";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn } from "@/app/login/actions";
import type { AppDictionary } from "@/i18n/dictionaries/types";

export function LoginForm({
  platform,
  messages,
}: {
  platform: boolean;
  messages: AppDictionary["auth"];
}) {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="identifier" className="text-sm font-medium">
          {platform ? messages.email : messages.username}
        </label>
        <Input
          id="identifier"
          name="identifier"
          type={platform ? "email" : "text"}
          autoComplete="username"
          required
          autoCapitalize="none"
          spellCheck={false}
          maxLength={platform ? 320 : 64}
          placeholder={
            platform ? messages.emailPlaceholder : messages.usernamePlaceholder
          }
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          {messages.password}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={12}
          maxLength={128}
        />
      </div>
      {state.error && (
        <Alert variant="danger" role="alert">
          <AlertDescription className="mt-0">{state.error}</AlertDescription>
        </Alert>
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
        {messages.signIn}
        {!pending && <ArrowRight className="size-4" aria-hidden />}
      </Button>
    </form>
  );
}
