"use client";

import { useActionState } from "react";
import type { ActionState } from "@/server/actions/game";
import { buyVip } from "@/server/actions/vip";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/game/format";
import { VIP_COST, VIP_LABEL, VIP_PERKS } from "@/lib/game/vip";
import { useLocale, useT } from "@/i18n/client";

/**
 * The pass, on the diamond shop's own screen — the widest card there, and the
 * only permanent thing sold in it.
 *
 * It says what it is *not* out loud. Every other card on this page changes the
 * game's numbers (production, plunder immunity, turns), so a 1000-diamond item
 * with a crown on it invites exactly the wrong assumption; the line about
 * "חיסכון בלחיצות בלבד" is there to be read before the purchase, not after it.
 */
export function VipCard({
  diamonds,
  vipSince,
}: {
  diamonds: number;
  /** ISO stamp of when the pass was bought, or null for a player without it. */
  vipSince: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const [state, action] = useActionState<ActionState, FormData>(buyVip, {});
  const owned = vipSince != null;

  return (
    <section className="panel-gold rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
          <Icon name="crown" size={20} className="text-crimson-bright" />
          {VIP_LABEL}
          <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-black text-gold-bright">
            VIP
          </span>
        </h2>
        {owned ? (
          <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            {t("ברשותך מאז")}{" "}
            <span className="nums" dir="ltr">
              {formatDate(new Date(vipSince), locale)}
            </span>
          </span>
        ) : (
          <span className="text-[11px] text-zinc-500">
            רכישה חד־פעמית · לא פג תוקף · חיסכון בלחיצות בלבד
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-zinc-300">
        פותח את כפתורי ״הכל״ שכבר קיימים במשחק — בבנק, במחסנים ובמכרות — ואת
        כפתור ״מפקדה״ בסרגל העליון שמפעיל אותם מכל מסך. אין כאן פעולה חדשה: כל
        מצב שהם מגיעים אליו, אפשר להגיע אליו גם ידנית. לא נותן משאבים, לא נותן
        עוצמה ולא מגן על האימפריה.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {VIP_PERKS.map((perk) => (
          <div key={perk.title} className="panel-inset flex gap-2.5 rounded-lg p-3">
            <Icon
              name={perk.icon}
              size={18}
              className="mt-0.5 shrink-0 text-crimson-bright"
            />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gold-bright">
                {perk.title}
              </span>
              <span className="block text-[11px] leading-snug text-zinc-400">
                {perk.desc}
              </span>
            </span>
          </div>
        ))}
      </div>

      {owned ? (
        <p className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-400">
          <Icon name="crown" size={16} />
          הפעולות המהירות פתוחות — פתח את ״מפקדה״ בסרגל העליון
        </p>
      ) : (
        <form className="mt-4">
          <SubmitButton
            className="btn btn-gold w-full px-4 py-2.5 font-black"
            formAction={action}
            disabled={diamonds < VIP_COST}
            pendingText="רוכש..."
          >
            <span className="flex items-center justify-center gap-1.5">
              <Icon name="crown" size={16} />
              רכוש {VIP_LABEL} ·
              <span className="nums inline-flex items-center gap-1" dir="ltr">
                {VIP_COST}
                <Icon name="diamond" size={14} className="text-cyan-100" />
              </span>
            </span>
          </SubmitButton>
        </form>
      )}

      <div className="mt-3">
        <FormMessage error={state.error} success={owned ? undefined : state.success} />
      </div>
    </section>
  );
}
