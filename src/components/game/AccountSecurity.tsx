"use client";

import { useActionState } from "react";
import {
  changePassword,
  signOutEverywhere,
  type AccountActionState,
} from "@/server/actions/auth";
import { CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";

/**
 * Account security panel: rotate the password, and revoke every session.
 *
 * `hasPassword` is false for Google-only accounts, which have no current
 * password to verify — the form is hidden rather than shown and rejected.
 */
export function AccountSecurity({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState<AccountActionState, FormData>(
    changePassword,
    {}
  );

  const t = useT();
  return (
    <>
      {hasPassword && (
        <div className="panel rounded-xl p-4">
          <CardTitle icon="🔑">{t("שינוי סיסמה")}</CardTitle>
          <p className="mb-4 text-sm text-zinc-400">
            {t("שינוי הסיסמה מנתק את כל המכשירים האחרים המחוברים לחשבון.")}
          </p>
          <form action={action} className="space-y-4">
            <Input
              label={t("סיסמה נוכחית")}
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              dir="ltr"
            />
            <Input
              label={t("סיסמה חדשה")}
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={t("לפחות 8 תווים")}
              dir="ltr"
            />
            <FormMessage error={state.error} success={state.success} />
            <SubmitButton className="w-full" pendingText={t("מעדכן...")}>
              {t("עדכן סיסמה")}
            </SubmitButton>
          </form>
        </div>
      )}

      <div className="panel rounded-xl p-4">
        <CardTitle icon="🛡️">{t("אבטחת החשבון")}</CardTitle>
        <p className="mb-4 text-sm text-zinc-400">
          {t("חושד שמישהו אחר נכנס לחשבון שלך? ניתוק מכל המכשירים מבטל מיד כל התחברות קיימת, בכל מכשיר, כולל זה — תצטרך להתחבר מחדש.")}
        </p>
        <form action={signOutEverywhere}>
          <button
            type="submit"
            className="btn btn-ghost px-4 py-2 text-sm text-red-400"
          >
            <Icon
              name="logout"
              size={16}
              className="inline-block align-text-bottom"
            />{" "}
            {t("נתק מכל המכשירים")}
          </button>
        </form>
      </div>
    </>
  );
}
