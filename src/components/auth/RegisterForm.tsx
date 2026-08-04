"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthState } from "@/server/actions/auth";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";
import { GoogleSignInButton, AuthDivider } from "@/components/auth/GoogleSignInButton";
import { HeroClassPicker } from "@/components/auth/HeroClassPicker";
import { useT } from "@/i18n/client";

export function RegisterForm() {
  const [state, action] = useActionState<AuthState, FormData>(register, {});

  const t = useT();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-zinc-100">{t("הקמת אימפריה חדשה")}</h2>
      <GoogleSignInButton />
      <AuthDivider />
      <form action={action} className="space-y-4">
      <Input
        label={t("השם שלך")}
        name="name"
        type="text"
        required
        minLength={2}
        maxLength={40}
        placeholder={t("למשל: דוד")}
      />
      <Input
        label={t("שם האימפריה")}
        name="empireName"
        type="text"
        required
        minLength={2}
        maxLength={40}
        placeholder={t("למשל: ממלכת הברזל")}
      />
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
        minLength={8}
        autoComplete="new-password"
        placeholder={t("לפחות 8 תווים")}
        dir="ltr"
      />
      <HeroClassPicker />
      <FormMessage error={state.error} />
        <SubmitButton className="w-full" pendingText={t("מקים אימפריה...")}>
          {t("הקם אימפריה")}{" "}
          <Icon name="crown" size={16} className="inline-block align-text-bottom" />
        </SubmitButton>
      </form>
      <p className="text-center text-sm text-zinc-400">
        {t("כבר יש לך אימפריה?")}{" "}
        <Link href="/login" className="font-semibold text-gold hover:text-gold-bright">
          {t("התחבר")}
        </Link>
      </p>
    </div>
  );
}
