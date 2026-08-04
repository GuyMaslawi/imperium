"use client";

import { useActionState } from "react";
import {
  createEmpireForCurrentUser,
  type AuthState,
} from "@/server/actions/auth";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";
import { HeroClassPicker } from "@/components/auth/HeroClassPicker";
import { useT } from "@/i18n/client";

export function OnboardingForm({ userName }: { userName: string }) {
  const [state, action] = useActionState<AuthState, FormData>(
    createEmpireForCurrentUser,
    {}
  );

  const t = useT();
  return (
    <form action={action} className="space-y-4">
      <h2 className="text-xl font-bold text-zinc-100">
        {t("ברוך הבא, {name}", { name: userName })}
      </h2>
      <p className="text-sm text-zinc-400">
        {t("עוד צעד אחד — בחר שם לאימפריה ואת הגיבור שיוביל אותה לקרב.")}
      </p>
      <Input
        label={t("שם האימפריה")}
        name="empireName"
        type="text"
        required
        minLength={2}
        maxLength={40}
        placeholder={t("למשל: ממלכת הברזל")}
        autoFocus
      />
      <HeroClassPicker />
      <FormMessage error={state.error} />
      <SubmitButton className="w-full" pendingText={t("מקים אימפריה...")}>
        {t("הקם אימפריה")}{" "}
        <Icon name="crown" size={16} className="inline-block align-text-bottom" />
      </SubmitButton>
    </form>
  );
}
