"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Live countdown to the next regular tick + the next daily update time.
 * When a deadline passes, refresh the page once so the server applies the tick.
 */
export function UpdateTimers({
  serverNow,
  nextRegularAt,
  nextDailyAt,
  nextDailyLabel,
}: {
  /** Epoch ms of the server render time — keeps the first client render identical to the SSR HTML. */
  serverNow: number;
  /** Epoch ms of the next regular (5-minute) update. */
  nextRegularAt: number;
  /** Epoch ms of the next daily update. */
  nextDailyAt: number;
  /** Pre-formatted Jerusalem wall time of the next daily update (HH:MM). */
  nextDailyLabel: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    // Snap from the SSR timestamp to the client clock on the next macrotask
    // (a synchronous setState here would force a cascading render).
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  const regularRemaining = nextRegularAt - now;
  const dailyRemaining = nextDailyAt - now;
  const expired = regularRemaining <= 0;

  useEffect(() => {
    if (!expired) return;
    const timeout = setTimeout(() => router.refresh(), 2000);
    return () => clearTimeout(timeout);
  }, [expired, router]);

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border-subtle bg-surface/60 px-4 py-1.5 text-xs">
      <span className="flex shrink-0 items-center gap-1.5 text-zinc-400">
        <span aria-hidden>⏱️</span>
        עדכון רגיל הבא:
        <span className="font-bold tabular-nums text-gold" dir="ltr">
          {regularRemaining <= 0 ? "מתעדכן..." : formatCountdown(regularRemaining)}
        </span>
      </span>
      <span aria-hidden className="text-zinc-700">|</span>
      <span className="flex shrink-0 items-center gap-1.5 text-zinc-400">
        <span aria-hidden>🌅</span>
        עדכון יומי הבא:
        <span className="font-bold tabular-nums text-gold" dir="ltr">
          {nextDailyLabel}
        </span>
        {dailyRemaining > 0 && (
          <span className="hidden text-zinc-500 sm:inline">
            (בעוד {formatCountdown(dailyRemaining)})
          </span>
        )}
      </span>
    </div>
  );
}
