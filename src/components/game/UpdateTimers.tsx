"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Tip } from "@/components/ui/Tip";

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Inline countdown chips shown in the frame header: the daily update wall time
 * ("עדכון יומי") and a live countdown to the next ranking/production tick
 * ("עדכון דירוג"). When the tick passes, the page refreshes so the server
 * applies it.
 */
export function UpdateTimers({
  serverNow,
  nextRegularAt,
  nextDailyLabel,
}: {
  serverNow: number;
  nextRegularAt: number;
  nextDailyAt: number;
  nextDailyLabel: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);
  // Count down in SERVER time: client clocks can be skewed, so measure the
  // offset against the freshest server timestamp and tick with it.
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

  const regularRemaining = nextRegularAt - now;
  const expired = regularRemaining <= 0;

  // The countdown hit 00:00 — refresh so the server applies the tick, and
  // keep retrying until a fresh nextRegularAt arrives (network hiccups,
  // slight clock drift).
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
    <div className="flex items-center gap-3 text-xs">
      <Tip
        side="bottom"
        tip="פעמיים ביום (07:30 / 19:30) מגיעים אזרחים חדשים, יהלומים וריבית בבנק, ונפתחות הפקדות חדשות."
      >
        <span className="flex cursor-help items-center gap-1.5 text-zinc-400">
          עדכון יומי:
          <span className="font-bold tabular-nums text-gold-bright" dir="ltr">
            {nextDailyLabel}
          </span>
        </span>
      </Tip>
      <span aria-hidden className="h-4 w-px bg-border-subtle" />
      <Tip
        side="bottom"
        tip="כל 5 דקות: המכרות מייצרים משאבים (לפי עבדי המכרות המוצבים) ומתקבלות תורות."
      >
        <span className="flex cursor-help items-center gap-1.5 text-zinc-400">
          עדכון דירוג:
          <span className="font-bold tabular-nums text-gold-bright" dir="ltr">
            {expired ? "מתעדכן…" : formatCountdown(regularRemaining)}
          </span>
        </span>
      </Tip>
    </div>
  );
}
