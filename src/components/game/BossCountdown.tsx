"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * A live countdown to a boss deadline — the revive clock, or the assault's own.
 *
 * Counts in **server** time: both deadlines are enforced server-side, so a skewed
 * device clock would otherwise show a number the server disagrees with. Seeding
 * from `serverNow` also makes the first client render identical to the server's,
 * which is what keeps hydration quiet.
 *
 * When it reaches zero it refreshes the route once. That is the whole reason it is
 * a client component: the moment a boss revives (or an assault ends) the banner
 * above it is stale, and the player should see the attack button light up without
 * reaching for reload.
 */
export function BossCountdown({
  endsAt,
  serverNow,
  totalMs,
  compact = false,
}: {
  endsAt: number;
  serverNow: number;
  /** Full span of the countdown; draws a thin progress track when given. */
  totalMs?: number;
  /** Just the digits, for sitting inside a button. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);
  const skew = useRef(0);
  const fired = useRef(false);

  useEffect(() => {
    skew.current = serverNow - Date.now();
  }, [serverNow]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + skew.current), 1000);
    return () => clearInterval(id);
  }, []);

  const left = endsAt - now;

  // Fired once: `left` keeps going negative and a plain effect would refresh
  // every second forever.
  useEffect(() => {
    if (left > 0 || fired.current) return;
    fired.current = true;
    router.refresh();
  }, [left, router]);

  const total = Math.max(0, Math.ceil(left / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  const digits = (
    <span className="nums font-black" dir="ltr">
      {mm}:{ss}
    </span>
  );

  if (compact) return digits;

  return (
    <span className="inline-flex min-w-0 flex-1 items-center gap-2">
      <span className="text-gold-bright">{digits}</span>
      {totalMs != null && totalMs > 0 && (
        <span
          aria-hidden
          className="h-1 min-w-8 flex-1 overflow-hidden rounded-full bg-white/10"
        >
          <span
            className="block h-full rounded-full bg-gradient-to-l from-gold-bright to-gold-deep transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.max(0, Math.min(100, (1 - left / totalMs) * 100))}%` }}
          />
        </span>
      )}
    </span>
  );
}
