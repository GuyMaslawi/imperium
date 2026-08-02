"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { DiscordLink } from "@/components/ui/DiscordLink";
import { claimDiscordReward } from "@/server/actions/community";
import { DISCORD_JOIN_DIAMONDS } from "@/lib/community";

/**
 * The welcome purse on /game/community: open the channel, then collect.
 *
 * Two separate controls rather than one button that does both, because they are
 * two different promises. The link opens Discord; the button pays. Nothing
 * verifies that the first happened before the second — there is no bot on the
 * other side — and the copy says so instead of implying a check that does not
 * exist. What keeps that honest is the size of the purse, not a guard: see
 * DISCORD_JOIN_DIAMONDS.
 *
 * The claim itself is idempotent on the server (one guarded UPDATE), so a
 * double-click, a stale tab or a replayed POST all pay exactly once — the
 * disabled state here is courtesy, not enforcement.
 */
export function DiscordJoin({
  url,
  claimed,
}: {
  url: string | null;
  /** Already collected — the purse is spent, and the card says so. */
  claimed: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(claimed);
  const [error, setError] = useState<string | null>(null);

  const claim = () => {
    setError(null);
    startTransition(async () => {
      const result = await claimDiscordReward();
      // "already collected" is not an error to read: it arrives from a second
      // tab or the losing half of a double click, and the truthful answer to it
      // is the collected state.
      if (result.ok || result.alreadyClaimed) setDone(true);
      else setError(result.error ?? "אירעה שגיאה");
    });
  };

  return (
    <div className="panel-gold rounded-xl p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
        <Icon name="gift" size={20} className="text-crimson-bright" />
        מתנת הצטרפות
      </h2>

      <p className="text-sm leading-relaxed text-bone/90">
        פעם אחת בלבד, לכל אימפריה:{" "}
        <b className="nums text-cyan-300">{DISCORD_JOIN_DIAMONDS}</b> יהלומים על
        הצטרפות לערוץ. אנחנו לא בודקים — סומכים עליכם, ולכן גם הסכום צנוע.
      </p>

      {done ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm font-bold text-emerald-300">
          <Icon name="check" size={18} />
          המתנה נאספה. תודה שהצטרפת — נתראה בערוץ.
        </p>
      ) : !url ? (
        <p className="mt-4 rounded-lg border border-border-subtle bg-black/30 px-4 py-3 text-sm text-zinc-400">
          המתנה תיפתח לאיסוף ברגע שהערוץ יעלה לאוויר.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <DiscordLink url={url} variant="pill" label="1. פתחו את הערוץ" />
            <button
              type="button"
              onClick={claim}
              disabled={pending}
              className="btn btn-gold px-5 py-2 text-sm disabled:opacity-60"
            >
              {pending ? "אוסף…" : `2. אספו ${DISCORD_JOIN_DIAMONDS} יהלומים`}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm font-bold text-red-400">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
