"use client";

import { useActionState } from "react";
import {
  resendVerificationEmail,
  type AccountActionState,
} from "@/server/actions/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { SupportPrompt } from "@/components/support/SupportPrompt";
import { useT } from "@/i18n/client";

export function ResendVerification() {
  const [state, action] = useActionState<AccountActionState, FormData>(
    resendVerificationEmail,
    {}
  );

  const t = useT();
  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        <FormMessage error={state.error} success={state.success} />
        <SubmitButton className="w-full" pendingText={t("שולח...")}>
          {t("שלח לי קישור חדש")}
        </SubmitButton>
      </form>
      {/* The dead end this screen is famous for: the second link does not arrive
          either, because the address has a typo in it or the mail is being
          filed as spam. Neither is something the visitor can fix from here —
          both are ninety seconds of work for whoever reads the ticket. */}
      <SupportPrompt where={t("אימות האימייל")} error={state.error} />
    </div>
  );
}
