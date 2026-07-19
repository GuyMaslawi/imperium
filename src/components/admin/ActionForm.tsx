"use client";

import { useActionState, type ReactNode } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import type { AdminActionState } from "@/server/actions/admin";

type Action = (
  prev: AdminActionState,
  formData: FormData
) => Promise<AdminActionState>;

/**
 * Thin client wrapper around a server admin action: renders the passed fields,
 * a submit button, and the resulting success/error message. Optionally guards
 * the submit behind a native confirm() dialog for destructive actions.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitVariant = "primary",
  confirm,
  className = "",
  submitClassName = "",
}: {
  action: Action;
  children?: ReactNode;
  submitLabel: string;
  submitVariant?: "primary" | "secondary" | "danger";
  confirm?: string;
  className?: string;
  submitClassName?: string;
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(
    action,
    {}
  );

  return (
    <form
      action={formAction}
      className={`space-y-3 ${className}`}
      onSubmit={
        confirm
          ? (e) => {
              if (!window.confirm(confirm)) e.preventDefault();
            }
          : undefined
      }
    >
      {children}
      <SubmitButton variant={submitVariant} className={submitClassName}>
        {submitLabel}
      </SubmitButton>
      <FormMessage error={state.error} success={state.success} />
    </form>
  );
}
