"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { reviveHeroWithDiamonds } from "@/server/actions/diamondShop";
import type { ActionState } from "@/server/actions/game";
import { HERO_REVIVE_COST } from "@/lib/game/diamondShop";
import { HERO_REVIVE_HOURS } from "@/lib/game/hero";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

/** "12:34" — minutes:seconds, the only shape an under-an-hour wait needs. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * The fallen-hero banner: what death costs, how long it lasts, and the one way
 * to cut it short. Shown on the hero page while health is zero.
 *
 * The countdown runs in SERVER time (the same trick as UpdateTimers): client
 * clocks drift, so we measure the offset once against the server's own stamp.
 * When it reaches zero the page refreshes and the server — not this component —
 * performs the revival through the lazy game clock.
 */
export function HeroRevive({
  serverNow,
  reviveAt,
  diamonds,
}: {
  serverNow: number;
  /** Epoch ms at which the hero rises by himself. */
  reviveAt: number;
  diamonds: number;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionState, FormData>(
    reviveHeroWithDiamonds,
    {}
  );
  const [now, setNow] = useState(serverNow);
  const skewRef = useRef(0);

  useEffect(() => {
    skewRef.current = serverNow - Date.now();
  }, [serverNow]);

  useEffect(() => {
    const tick = () => setNow(Date.now() + skewRef.current);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = reviveAt - now;
  const expired = remaining <= 0;

  // The hour is up — refresh so the server raises him, and keep retrying in
  // case of a hiccup, exactly like the update timers do.
  useEffect(() => {
    if (!expired) return;
    const timeout = setTimeout(() => router.refresh(), 1000);
    const retry = setInterval(() => router.refresh(), 4000);
    return () => {
      clearTimeout(timeout);
      clearInterval(retry);
    };
  }, [expired, router]);

  return (
    <div className="rounded-2xl border border-red-500/60 bg-gradient-to-b from-red-950/60 to-transparent p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="flex items-center gap-2 text-sm font-black text-red-300">
          <span aria-hidden className="text-lg">💀</span> הגיבור שלך נפל בקרב
        </h3>
        <span className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-black/50 px-2.5 py-1 text-xs font-bold text-red-200">
          קם לתחייה בעוד
          <span className="tabular-nums text-red-100" dir="ltr">
            {expired ? "…" : formatCountdown(remaining)}
          </span>
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-300">
        כל עוד הוא מת, <b className="text-red-300">אף אחד מהבונוסים שלו אינו פועל</b> —
        הנקודות שהקצית, החפצים שהוא לובש ובונוס המחלקה מושבתים לחלוטין: הצבא שלך נלחם
        בלעדיו, והמכרות מייצרים בלעדיו. הוא יקום מעצמו כעבור {HERO_REVIVE_HOURS === 1 ? "שעה" : `${HERO_REVIVE_HOURS} שעות`} —
        או מיד, תמורת יהלומים.
      </p>

      <form className="mt-3">
        <SubmitButton
          className="btn btn-gold w-full px-4 py-2 text-sm sm:w-auto"
          formAction={formAction}
          disabled={diamonds < HERO_REVIVE_COST}
          pendingText="מחייה..."
        >
          <span className="inline-flex items-center gap-1.5">
            החייאה מיידית ל-100% חיים ·
            <span className="nums inline-flex items-center gap-1" dir="ltr">
              {HERO_REVIVE_COST}
              <Icon name="diamond" size={14} className="text-cyan-300" />
            </span>
          </span>
        </SubmitButton>
      </form>
      {diamonds < HERO_REVIVE_COST && (
        <p className="mt-1.5 text-[11px] text-zinc-500">
          יש לך {diamonds} יהלומים — חסרים {HERO_REVIVE_COST - diamonds}.
        </p>
      )}
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
