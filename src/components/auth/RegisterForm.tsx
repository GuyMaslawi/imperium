"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthState } from "@/server/actions/auth";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";

export function RegisterForm() {
  const [state, action] = useActionState<AuthState, FormData>(register, {});

  return (
    <form action={action} className="space-y-4">
      <h2 className="text-xl font-bold text-zinc-100">הקמת אימפריה חדשה</h2>
      <Input
        label="השם שלך"
        name="name"
        type="text"
        required
        minLength={2}
        maxLength={40}
        placeholder="למשל: דוד"
      />
      <Input
        label="שם האימפריה"
        name="empireName"
        type="text"
        required
        minLength={2}
        maxLength={40}
        placeholder="למשל: ממלכת הברזל"
      />
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
        minLength={6}
        autoComplete="new-password"
        placeholder="לפחות 6 תווים"
        dir="ltr"
      />
      <FormMessage error={state.error} />
      <SubmitButton className="w-full" pendingText="מקים אימפריה...">
        הקם אימפריה <Icon name="crown" size={16} className="inline-block align-text-bottom" />
      </SubmitButton>
      <p className="text-center text-sm text-zinc-400">
        כבר יש לך אימפריה?{" "}
        <Link href="/login" className="font-semibold text-gold hover:text-gold-bright">
          התחבר
        </Link>
      </p>
    </form>
  );
}
