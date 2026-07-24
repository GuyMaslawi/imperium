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

export function OnboardingForm({ userName }: { userName: string }) {
  const [state, action] = useActionState<AuthState, FormData>(
    createEmpireForCurrentUser,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <h2 className="text-xl font-bold text-zinc-100">
        ברוך הבא, {userName}
      </h2>
      <p className="text-sm text-zinc-400">
        עוד צעד אחד — בחר שם לאימפריה שלך כדי להתחיל לשחק.
      </p>
      <Input
        label="שם האימפריה"
        name="empireName"
        type="text"
        required
        minLength={2}
        maxLength={40}
        placeholder="למשל: ממלכת הברזל"
        autoFocus
      />
      <FormMessage error={state.error} />
      <SubmitButton className="w-full" pendingText="מקים אימפריה...">
        הקם אימפריה{" "}
        <Icon name="crown" size={16} className="inline-block align-text-bottom" />
      </SubmitButton>
    </form>
  );
}
