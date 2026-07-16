"use client";

import { useState } from "react";
import { WheelOfFortune } from "./WheelOfFortune";

/** The base-screen "גלגל המזל" card that opens the wheel modal. */
export function WheelCard({
  spinsAvailable = 4,
  seasonDay = 1,
}: {
  spinsAvailable?: number;
  /** Current day of the season — wheel prize amounts grow with it. */
  seasonDay?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="panel-gold flex flex-col items-center justify-center gap-3 rounded-xl p-5 text-center">
        <span className="relative text-4xl">
          🎰
          {spinsAvailable > 0 && (
            <span className="absolute -right-2 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
              {spinsAvailable}
            </span>
          )}
        </span>
        <div>
          <p className="font-black text-gold-bright">גלגל המזל</p>
          <p className="text-xs text-zinc-400">נסה את מזלך!</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-dark px-5 py-1.5 text-xs">
          🎰 סובב
        </button>
      </div>
      {open && (
        <WheelOfFortune
          spinsAvailable={spinsAvailable}
          seasonDay={seasonDay}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
