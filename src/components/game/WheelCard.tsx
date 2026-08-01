"use client";

import { useState } from "react";
import { WheelOfFortune } from "./WheelOfFortune";
import { Icon } from "@/components/ui/Icon";

/** The base-screen "גלגל המזל" card that opens the wheel modal. */
export function WheelCard({
  spinsAvailable = 3,
  seasonCycle = 1,
}: {
  spinsAvailable?: number;
  /** Daily-update cycle of the season — wheel prize amounts grow with it. */
  seasonCycle?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Laid out as a band, not a tower: it shares a row with the season
          announcement, and a 200px-tall column beside a two-line banner left a
          dead strip across the width of the screen. */}
      <div className="panel-gold flex h-full items-center justify-between gap-4 rounded-xl px-4 py-3">
        <span className="relative shrink-0">
          <span className="wheel-medallion">
            <Icon name="wheel" size={22} className="text-gold-bright" />
          </span>
          {spinsAvailable > 0 && (
            <span className="absolute -right-1.5 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-red-300/40 bg-red-600 text-[10px] font-black text-white shadow-[0_0_8px_rgba(239,68,68,0.6)]">
              {spinsAvailable}
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black leading-tight text-gold-bright">גלגל המזל</p>
          <p className="text-[11px] leading-tight text-zinc-400">נסה את מזלך!</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-dark flex shrink-0 items-center gap-1 px-4 py-1.5 text-xs">
          <Icon name="wheel" size={14} /> סובב
        </button>
      </div>
      {open && (
        <WheelOfFortune
          spinsAvailable={spinsAvailable}
          seasonCycle={seasonCycle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
