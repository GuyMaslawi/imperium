"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reviveHeroWithDiamonds } from "@/server/actions/diamondShop";
import type { ActionState } from "@/server/actions/game";
import { HERO_REVIVE_COST } from "@/lib/game/diamondShop";
import { HERO_REVIVE_HOURS } from "@/lib/game/hero";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { useT } from "@/i18n/client";

/** "12:34" — minutes:seconds, the only shape an under-an-hour wait needs. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * The fallen-hero panel: what death costs, how long it lasts, and the one way
 * to cut it short. Shown at the very top of the hero page while health is zero,
 * and deliberately loud — this is the *only* place revival is sold. It used to
 * sit as one card among a dozen in the diamond shop, where a player looking at
 * a dead hero had no reason to go; the purchase belongs next to the thing it
 * fixes.
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

  const short = diamonds < HERO_REVIVE_COST;

  const t = useT();
  return (
    <div className="hero-revive overflow-hidden rounded-2xl border-2 border-red-500/70">
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center md:gap-6 md:p-5">
        {/* what happened, and what it is costing right now */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span aria-hidden className="hero-revive-skull text-3xl leading-none">
              💀
            </span>
            <h2 className="text-lg font-black tracking-wide text-red-300 sm:text-xl">
              {t("הגיבור שלך נפל בקרב")}
            </h2>
            <span className="rounded-full border border-red-500/50 bg-red-950/70 px-2.5 py-0.5 text-[11px] font-black text-red-200">
              {t("כל הבונוסים שלו מושבתים")}
            </span>
          </div>
          <p className="mt-2.5 max-w-2xl text-xs leading-relaxed text-zinc-300 sm:text-[13px]">
            {t("כל עוד הוא מת,")}{" "}
            <b className="text-red-300">{t("אף אחד מהבונוסים שלו אינו פועל")}</b>{" "}
            {t("— הנקודות שהקצית, החפצים שהוא לובש ובונוס המחלקה מושבתים לחלוטין: הצבא שלך נלחם בלעדיו, והמכרות מייצרים בלעדיו. הוא יקום מעצמו כעבור")}{" "}
            {HERO_REVIVE_HOURS === 1
              ? t("שעה")
              : t("{hours} שעות", { hours: HERO_REVIVE_HOURS })}{" "}
            {t("— או מיד, תמורת יהלומים.")}
          </p>
        </div>

        {/* the two ways out, side by side: wait, or pay */}
        <div className="flex shrink-0 flex-col gap-3 md:w-72">
          <div className="rounded-xl border border-red-500/40 bg-black/50 px-3 py-2 text-center">
            <p className="text-[11px] font-bold text-red-200/80">
              {t("קם לתחייה מעצמו בעוד")}
            </p>
            <p
              className="nums text-3xl font-black leading-tight text-red-100"
              dir="ltr"
            >
              {expired ? "…" : formatCountdown(remaining)}
            </p>
          </div>

          <form>
            <SubmitButton
              className="btn btn-gold w-full px-4 py-3 text-sm"
              formAction={formAction}
              disabled={short}
              pendingText={t("מחייה...")}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="heart" size={16} />
                {t("החייאה מיידית ל-100% חיים ·")}
                <span className="nums inline-flex items-center gap-1" dir="ltr">
                  {HERO_REVIVE_COST}
                  <Icon name="diamond" size={14} className="text-cyan-300" />
                </span>
              </span>
            </SubmitButton>
          </form>

          {short && (
            <p className="text-center text-[11px] text-zinc-400">
              {t("יש לך")} <span className="nums">{diamonds}</span>{" "}
              {t("יהלומים — חסרים")}{" "}
              <span className="nums">{HERO_REVIVE_COST - diamonds}</span>.{" "}
              <Link
                href="/game/diamonds/buy"
                className="font-bold text-cyan-300 underline decoration-dotted underline-offset-2"
              >
                {t("לרכישת יהלומים")}
              </Link>
            </p>
          )}
          <FormMessage error={state.error} success={state.success} />
        </div>
      </div>
    </div>
  );
}
