"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";
import { useBankPulse } from "./BankFx";

export interface BankVaultProps {
  /** Whole gold currently in the bank. */
  bankGold: number;
  /** Whole gold available outside the warehouse. */
  availableGold: number;
  /** Whole gold protected in the gold warehouse. */
  storedGold: number;
  /** Gold the bank will pay at the next daily update. */
  nextInterest: number;
  /** Already-formatted interest rate, e.g. "3.00%". */
  ratePercent: string;
  interestLevel: number;
}

/** Bolt angles around the door face. */
const BOLTS = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Four full wave periods across a 120-unit box, solid below the crest line.
 * The period (30 units) is exactly a quarter of the box, which is what lets
 * the sliding animation in globals.css loop without a seam.
 */
const WAVE_PATH =
  "M0 7 Q 7.5 1 15 7 T 30 7 T 45 7 T 60 7 T 75 7 T 90 7 T 105 7 T 120 7 V14 H0 Z";

/** Bubbles rising through the gold — fixed table, so SSR and client agree. */
const BUBBLES = [
  { x: "22%", delay: "0s", dur: "3.4s" },
  { x: "41%", delay: "1.1s", dur: "4.2s" },
  { x: "58%", delay: "2.3s", dur: "3.8s" },
  { x: "74%", delay: "0.6s", dur: "4.6s" },
  { x: "33%", delay: "3.1s", dur: "3.2s" },
];

/**
 * The coin burst. Hand-picked rather than random so the fall reads as a
 * scatter instead of a grid, and so nothing depends on Math.random (which
 * would differ between the server render and hydration).
 */
const COINS = [
  { x: "12%", delay: 0, rot: 420, dx: "0.4rem" },
  { x: "26%", delay: 170, rot: -380, dx: "-0.5rem" },
  { x: "39%", delay: 60, rot: 500, dx: "0.2rem" },
  { x: "52%", delay: 240, rot: -440, dx: "0.6rem" },
  { x: "64%", delay: 110, rot: 360, dx: "-0.3rem" },
  { x: "77%", delay: 300, rot: -520, dx: "0.5rem" },
  { x: "88%", delay: 40, rot: 400, dx: "-0.6rem" },
  { x: "19%", delay: 380, rot: -340, dx: "0.3rem" },
  { x: "45%", delay: 460, rot: 460, dx: "-0.4rem" },
  { x: "70%", delay: 520, rot: -400, dx: "0.2rem" },
  { x: "33%", delay: 610, rot: 380, dx: "0.5rem" },
  { x: "58%", delay: 680, rot: -480, dx: "-0.5rem" },
  { x: "82%", delay: 740, rot: 340, dx: "0.3rem" },
  { x: "6%", delay: 820, rot: -420, dx: "-0.2rem" },
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Counts from the previously shown value up to `value`. Starts at 0 so the
 * balance rolls in when the page first paints, then animates the delta after
 * every deposit / withdrawal.
 */
function useCountUp(value: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    // A zero-length roll lands on the final value in the very first frame,
    // which is how the reduced-motion case skips the count.
    const span = prefersReducedMotion() ? 0 : duration;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = span === 0 ? 1 : Math.min(1, (now - t0) / span);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(start + (value - start) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration]);

  return display;
}

/**
 * False for the first painted frame, true afterwards — the hook that lets the
 * gold *rise* into the vault instead of appearing already at its level. The
 * flag is flipped from a frame callback so the browser has committed the empty
 * state before the height transition starts.
 */
function useAfterFirstPaint(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return ready;
}

export function BankVault({
  bankGold,
  availableGold,
  storedGold,
  nextInterest,
  ratePercent,
  interestLevel,
}: BankVaultProps) {
  const pulse = useBankPulse();

  // The vault has no capacity cap in the rules, so the fill level shows how
  // much of the empire's gold is *protected* — the number the player actually
  // acts on when deciding whether to bank another pile.
  const looseGold = availableGold + storedGold;
  const totalGold = bankGold + looseGold;
  const share = totalGold > 0 ? bankGold / totalGold : 0;
  const pct = Math.round(share * 100);

  // Fill from empty on first paint rather than snapping to the final level.
  // A non-zero balance always shows a sliver, so "there is gold in there" is
  // never rounded away to an empty vault.
  const filled = useAfterFirstPaint();
  const fillPct = filled ? Math.min(100, Math.max(bankGold > 0 ? 4 : 0, pct)) : 0;

  const shownBalance = useCountUp(bankGold);

  return (
    <div className="panel-gold rounded-xl p-5">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch sm:gap-7">
        {/* -------- the vault itself -------- */}
        <div
          className={`vault ${pulse ? "vault-active" : ""}`}
          role="img"
          aria-label={`כספת הבנק — ${formatNumber(bankGold)} זהב, ${pct}% מהזהב שלך`}
        >
          <div className="vault-frame">
            <div className="vault-door">
              {BOLTS.map((angle) => (
                <span
                  key={angle}
                  className="vault-bolt"
                  style={{ "--a": `${angle}deg` } as CSSProperties}
                />
              ))}

              <div className="vault-glass">
                <div className="vault-fill" style={{ height: `${fillPct}%` }}>
                  <svg className="vault-wave" viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden>
                    <path d={WAVE_PATH} />
                  </svg>
                  <svg
                    className="vault-wave vault-wave-2"
                    viewBox="0 0 120 14"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path d={WAVE_PATH} />
                  </svg>
                  <span className="vault-shimmer" />
                  {/* Clipped to the gold itself, so a bubble never floats in
                      the empty air above the surface. */}
                  <span className="vault-bubbles">
                    {BUBBLES.map((bubble) => (
                      <span
                        key={bubble.x}
                        className="vault-bubble"
                        style={
                          {
                            "--x": bubble.x,
                            "--d": bubble.delay,
                            "--dur": bubble.dur,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </span>
                </div>

                {bankGold === 0 && (
                  <span className="vault-empty">הכספת ריקה</span>
                )}
                <span className="vault-glare" />
              </div>

              <div className="vault-dial">
                <span className="vault-spoke" style={{ "--a": "0deg" } as CSSProperties} />
                <span className="vault-spoke" style={{ "--a": "60deg" } as CSSProperties} />
                <span className="vault-spoke" style={{ "--a": "120deg" } as CSSProperties} />
                <span className="vault-hub" />
              </div>
            </div>
          </div>

          {/* coin burst — remounted per pulse so a repeat transfer replays it */}
          {pulse && (
            <div className="vault-coins" key={pulse.id} aria-hidden>
              {COINS.map((coin) => (
                <span
                  key={coin.x + coin.delay}
                  className={
                    pulse.kind === "deposit" ? "vault-coin vault-coin-in" : "vault-coin vault-coin-out"
                  }
                  style={
                    {
                      "--x": coin.x,
                      "--d": `${coin.delay}ms`,
                      "--rot": `${coin.rot}deg`,
                      "--dx": coin.dx,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* -------- the numbers beside it -------- */}
        <div className="flex flex-1 flex-col justify-center gap-3 text-center sm:text-right">
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <Icon name="bank" size={30} className="text-crimson-bright" />
            <div>
              <h2 className="text-xl font-black text-gold-bright">הבנק המרכזי</h2>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 sm:justify-start">
                <span className="vault-live-dot" aria-hidden />
                פעיל · דרגה{" "}
                <span className="nums" dir="ltr">
                  {interestLevel}
                </span>
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-gold-dim">
              יתרה בבנק
            </p>
            <p
              className="nums text-4xl font-black leading-tight text-gold-bright"
              dir="ltr"
            >
              {formatNumber(shownBalance)}
            </p>
          </div>

          {/* protected-share meter — the same number the fill level draws */}
          <div>
            <div className="vault-meter">
              <span
                className="vault-meter-fill"
                style={{ width: `${filled ? pct : 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-gold-dim">
              <span className="nums font-bold text-gold" dir="ltr">
                {pct}%
              </span>{" "}
              מהזהב שלך מוגן בכספת · חשוף:{" "}
              <span className="nums font-bold text-zinc-300" dir="ltr">
                {formatNumber(looseGold)}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-400 sm:justify-start">
            <span>
              ריבית:{" "}
              <span className="nums font-bold text-gold-bright" dir="ltr">
                {ratePercent}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="vault-rise" aria-hidden>
                ▲
              </span>
              בעדכון הבא:{" "}
              <span className="nums font-bold text-emerald-400" dir="ltr">
                +{formatNumber(nextInterest)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
