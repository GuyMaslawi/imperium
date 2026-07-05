"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/server/actions/auth";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function LoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(login, {});

  return (
    <form action={action} className="space-y-4">
      <h2 className="text-xl font-bold text-zinc-100">התחברות</h2>
      <Input
        label="אימייל"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        dir="ltr"
      />
      <Input
        label="סיסמה"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="••••••••"
        dir="ltr"
      />
      <FormMessage error={state.error} />
      <SubmitButton className="w-full" pendingText="מתחבר...">
        התחבר למשחק
      </SubmitButton>
      <p className="text-center text-sm text-zinc-400">
        עדיין אין לך אימפריה?{" "}
        <Link href="/register" className="font-semibold text-gold hover:text-gold-bright">
          הירשם עכשיו
        </Link>
      </p>
    </form>
  );
}
