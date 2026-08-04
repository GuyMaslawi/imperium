"use client";

import { useId, useState } from "react";
import { useT } from "@/i18n/client";

/**
 * The chains and the padlock that seal the diamond store while real-money
 * purchases are still closed.
 *
 * Until now the store looked open: six live cards with prices and buttons, and
 * the player only learned it was shut *after* paying attention, clicking, and
 * reading a modal. That is the wrong order — a store that cannot sell should
 * say so from across the room. So the whole grid gets bound: three chains drawn
 * across it and a lock hanging on the middle one, with the plate under it
 * naming what is missing.
 *
 * It is the same object as the hero-quest lock (QuestLock — chains, gold body,
 * steel shackle) at the scale of a whole screen, and it answers the same
 * way: tug on it and the chains snap taut, the lock jolts on its hanger and the
 * keyhole flares red. A dead overlay reads as a broken page; a refusal reads as
 * a door that is simply not open yet.
 *
 * Purely presentational. The real gate is on the server — `getCheckoutConfig()`
 * decides who may pay, the buy page passes the verdict down, and the package
 * buttons under this overlay are `disabled` so nothing here is load-bearing.
 * Motion lives in globals.css under `seal-*`, replayed by keying the rig on the
 * tug count.
 */
export function StoreSeal({
  /** The line on the plate — why the store is shut, in the game's voice. */
  note,
}: {
  note: string;
}) {
  // SVG gradient ids are document-global; the quest board proves how fast that
  // bites when two locks share a page.
  const uid = useId().replace(/:/g, "");
  const [tugs, setTugs] = useState(0);

  const t = useT();
  return (
    <button
      type="button"
      onClick={() => setTugs((n) => n + 1)}
      aria-label={t("חנות היהלומים נעולה — {note}", { note })}
      className="seal"
    >
      {/* Keyed on the tug count so an impatient player gets a rattle per
          click rather than one. */}
      <span key={tugs} className={`seal-rig${tugs > 0 ? " is-tugged" : ""}`}>
        <i className="seal-chain seal-chain-top" aria-hidden />
        <i className="seal-chain seal-chain-a" aria-hidden />
        <i className="seal-chain seal-chain-b" aria-hidden />

        <span className="seal-hub">
          <span className="seal-hang" aria-hidden>
            <span className="seal-spark" />
            <svg
              className="seal-svg"
              viewBox="0 0 44 54"
              width="82"
              height="100"
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
                className="seal-shackle"
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
              {/* A lit top edge and a shadowed belly — the two strokes that turn
                  a gold rectangle into a cast object. */}
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

              <g className="seal-key">
                <circle cx="22" cy="34.5" r="3.6" />
                <path d="M22 36.5 l-2.9 8.5 h5.8 z" />
              </g>
            </svg>
          </span>

          <span className="seal-plate">{note}</span>
        </span>
      </span>
    </button>
  );
}
