"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/server/actions/auth";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { GoogleSignInButton, AuthDivider } from "@/components/auth/GoogleSignInButton";
import { useT } from "@/i18n/client";

export function LoginForm({
  /**
   * Whether signing up is possible at all. False between seasons: `/register`
   * redirects to `/season` while the game is shut (see server/seasonGuard.ts),
   * so offering the link would send a new player to a dead end from the one
   * screen that is trying to explain what is going on.
   */
  canRegister = true,
}: {
  canRegister?: boolean;
}) {
  const t = useT();
  const [state, action] = useActionState<AuthState, FormData>(login, {});

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-zinc-100">{t("התחברות")}</h2>
      <GoogleSignInButton />
      <AuthDivider />
      <form action={action} className="space-y-4">
      <Input
        label={t("אימייל")}
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        dir="ltr"
      />
      <Input
        label={t("סיסמה")}
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="••••••••"
        dir="ltr"
      />
      <FormMessage error={state.error} />
        <SubmitButton className="w-full" pendingText={t("מתחבר...")}>
          {t("התחבר למשחק")}
        </SubmitButton>
      </form>
      {canRegister && (
        <p className="text-center text-sm text-zinc-400">
          {t("עדיין אין לך אימפריה?")}{" "}
          <Link href="/register" className="font-semibold text-gold hover:text-gold-bright">
            {t("הירשם עכשיו")}
          </Link>
        </p>
      )}
    </div>
  );
}
