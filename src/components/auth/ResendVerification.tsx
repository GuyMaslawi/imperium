"use client";

import { useActionState } from "react";
import {
  resendVerificationEmail,
  type AccountActionState,
} from "@/server/actions/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function ResendVerification() {
  const [state, action] = useActionState<AccountActionState, FormData>(
    resendVerificationEmail,
    {}
  );

  return (
    <form action={action} className="space-y-3">
      <FormMessage error={state.error} success={state.success} />
      <SubmitButton className="w-full" pendingText="שולח...">
        שלח לי קישור חדש
      </SubmitButton>
    </form>
  );
}
