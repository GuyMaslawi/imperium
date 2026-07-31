"use client";

import { useId, useState } from "react";

/**
 * The chained padlock that seals a hero-quest rung the empire has not earned yet.
 *
 * A greyed-out row with a 🔒 emoji says "this is off"; it does not say *why*, and
 * — worse — it says nothing back when the player pokes it. A locked rung is the
 * board's main advertisement for founding the next city, so it is worth a real
 * object: two chains drawn across the row and a lock hanging where they cross.
 *
 * Clicking it **answers**. The chains snap taut and rattle, the lock jolts on its
 * hanger, the shackle lifts a hair and clanks straight back down, and the keyhole
 * flares red — the whole vocabulary of "you pulled, it held". That last beat is
 * the point: the lock has to move, or the click feels ignored, and it has to
 * refuse, or the player thinks something broke. The plate under it names the
 * price of opening it in the same breath.
 *
 * Everything here is presentational. The rung is gated on the server (a quest
 * tier needs that many cities — see lib/game/heroQuests.ts) and by the row's own
 * disabled button; this overlay only makes the refusal legible. It sits on top of
 * the whole row as a `<button>` so the tug is reachable by keyboard and by a
 * thumb anywhere on the card, not just on a 44px padlock.
 *
 * The animation lives in globals.css under `qlock-*`; it restarts on every click
 * because the rig is keyed on the tug count, which is the cheapest way to replay
 * a CSS animation without touching the DOM by hand.
 */
export function QuestLock({
  /** What is sealed, for screen readers — "מסע נעול". */
  label,
  /** The price of opening it, e.g. "נפתח עם העיר ה-4". Shown on the plate. */
  hint,
}: {
  label: string;
  hint: string;
}) {
  // Ten locked rows render ten of these, and SVG gradient ids are
  // document-global — without a unique prefix they would all paint from the
  // first lock's defs.
  const uid = useId().replace(/:/g, "");
  const [tugs, setTugs] = useState(0);

  return (
    <button
      type="button"
      onClick={() => setTugs((n) => n + 1)}
      aria-label={`${label} — ${hint}`}
      className="quest-lock"
    >
      {/* Keyed on the tug count: a fresh node replays the animation from 0%,
          so an impatient player gets a rattle per click rather than one. */}
      <span key={tugs} className={`quest-lock-rig${tugs > 0 ? " is-tugged" : ""}`}>
        <i className="quest-chain quest-chain-a" aria-hidden />
        <i className="quest-chain quest-chain-b" aria-hidden />

        <span className="quest-lock-hub">
          <span className="quest-lock-hang" aria-hidden>
            <span className="quest-lock-spark" />
            <svg
              className="quest-lock-svg"
              viewBox="0 0 44 54"
              width="52"
              height="64"
              role="presentation"
            >
              <defs>
                <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0.35" y2="1">
                  <stop offset="0%" stopColor="#e8c96e" />
                  <stop offset="42%" stopColor="#b8912f" />
                  <stop offset="100%" stopColor="#6a4f17" />
                </linearGradient>
                <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="0.6" y2="1">
                  <stop offset="0%" stopColor="#d7dde8" />
                  <stop offset="55%" stopColor="#8b93a3" />
                  <stop offset="100%" stopColor="#4a5060" />
                </linearGradient>
              </defs>

              {/* The shackle — drawn first so the body overlaps its feet. */}
              <path
                className="quest-lock-shackle"
                d="M13 26 V17 a9 9 0 0 1 18 0 V26"
                fill="none"
                stroke={`url(#${uid}-steel)`}
                strokeWidth="5.5"
                strokeLinecap="round"
              />

              <rect
                x="5.5"
                y="24"
                width="33"
                height="26"
                rx="6"
                fill={`url(#${uid}-body)`}
                stroke="rgba(28,20,4,0.85)"
                strokeWidth="1.5"
              />
              {/* A lit top edge and a shadowed belly: two strokes are the whole
                  difference between a gold rectangle and a cast object. */}
              <path
                d="M9 27.5 h25"
                stroke="rgba(255,244,208,0.55)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M10 46.5 h23"
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="2"
                strokeLinecap="round"
              />

              <g className="quest-lock-key">
                <circle cx="22" cy="34.5" r="3.6" />
                <path d="M22 36.5 l-2.9 8.5 h5.8 z" />
              </g>
            </svg>
          </span>

          <span className="quest-lock-plate">{hint}</span>
        </span>
      </span>
    </button>
  );
}
