"use client";

import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import { openSupportChat } from "@/components/support/SupportChat";

/**
 * "Stuck? talk to us" — the line that turns a dead end into a conversation.
 *
 * Rendered directly under whatever just failed (a rejected login, a registration
 * that would not go through, a verification mail that never arrived), because
 * that is the moment somebody decides whether to try again or to leave. It opens
 * the support dock with the failure already written into the box, so the first
 * message says something useful even from a person who has run out of patience.
 *
 * `error` is passed straight through rather than re-derived: the visitor sees
 * exactly what we will read, which is both honest and the only way the draft can
 * be edited before it is sent.
 */
export function SupportPrompt({
  /** What the form told the visitor, when something specific went wrong. */
  error,
  /** Which screen this is, for the first line of the ticket. */
  where,
  className = "",
}: {
  error?: string;
  where: string;
  className?: string;
}) {
  const t = useT();

  const prefill = error
    ? t('נתקעתי ב{where}. ההודעה שקיבלתי: "{error}"', { where, error })
    : t("נתקעתי ב{where} ואני צריך עזרה.", { where });

  return (
    <p className={`text-center text-xs text-zinc-500 ${className}`}>
      {t("משהו לא עובד?")}{" "}
      <button
        type="button"
        onClick={() => openSupportChat({ prefill })}
        className="inline-flex items-center gap-1 font-semibold text-gold transition-colors hover:text-gold-bright"
      >
        <Icon name="chat" size={13} />
        {t("דבר איתנו בצ׳אט")}
      </button>
    </p>
  );
}
