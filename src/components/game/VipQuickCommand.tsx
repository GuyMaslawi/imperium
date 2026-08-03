"use client";

import Link from "next/link";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { VIP_COST, VIP_LABEL, VIP_PERKS, VIP_SHORT } from "@/lib/game/vip";
import { VipQuickActions, type VipActionKey } from "./VipQuickActions";

/**
 * The VIP command post: a chip in the row the season pass and the timers ride
 * in, opening every bulk action from wherever the player happens to be.
 *
 * Reachability is the actual product here. "אחסן הכל" on the warehouse screen
 * saves seven clicks; the same button reachable from the battle report you are
 * reading saves the trip to the warehouse screen as well — which is the trip
 * players skip, and the reason their resources are sitting unprotected when the
 * raid lands.
 *
 * A player without the pass gets the same chip, opening the pitch instead of
 * the buttons. Hiding it entirely would make the pass invisible to exactly the
 * people it is sold to, and a locked control that names what it unlocks is the
 * honest version of an advertisement.
 */

/** Every bulk action, in the order they are used in a session. */
const DOCK_ACTIONS: VipActionKey[] = [
  "storeAll",
  "releaseAll",
  "bankDepositAll",
  "bankWithdrawAll",
  "upgradeStorages",
  "trainSoldiers",
  "trainSpies",
  "trainMineSlaves",
];

export function VipQuickCommand({ isVip }: { isVip: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`btn gap-1.5 px-3 py-1.5 text-sm ${isVip ? "btn-gold" : "btn-dark"}`}
      >
        <Icon name="crown" size={15} aria-hidden />
        מפקדה
        {!isVip && (
          <span className="rounded bg-red-500 px-1 text-[9px] font-black text-white">
            {VIP_SHORT}
          </span>
        )}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="vip-command-title"
        size="lg"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="vip-command-title"
            className="flex items-center gap-2 text-lg font-black text-gold-bright"
          >
            <Icon name="crown" size={20} className="text-crimson-bright" />
            {isVip ? "מפקדה מהירה" : VIP_LABEL}
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="סגור"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/30 text-sm text-gold-dim transition hover:bg-gold/10 hover:text-gold-bright"
          >
            ✕
          </button>
        </div>

        {isVip ? (
          <>
            <p className="mt-1 text-xs text-zinc-400">
              כל הפעולות הגורפות, מכל מסך במשחק. כל פעולה מדווחת בדיוק מה קרה.
            </p>
            <div className="mt-4">
              <VipQuickActions keys={DOCK_ACTIONS} columns={2} />
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-zinc-400">
              רכישה חד־פעמית שפותחת פעולות גורפות בלחיצה אחת. חיסכון בזמן בלבד —
              בלי משאבים, בלי עוצמה ובלי הגנה שאין לשחקן חינמי.
            </p>
            <ul className="mt-4 space-y-2">
              {VIP_PERKS.map((perk) => (
                <li key={perk.title} className="panel-inset flex gap-2.5 rounded-lg p-3">
                  <Icon
                    name={perk.icon}
                    size={18}
                    className="mt-0.5 shrink-0 text-crimson-bright"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-gold-bright">
                      {perk.title}
                    </span>
                    <span className="block text-[11px] leading-snug text-zinc-400">
                      {perk.desc}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/game/diamonds"
              onClick={() => setOpen(false)}
              className="btn btn-gold mt-4 flex w-full items-center justify-center gap-1.5 py-2.5 font-black"
            >
              <Icon name="crown" size={16} />
              לרכישה — {VIP_COST}
              <Icon name="diamond" size={15} className="text-cyan-100" />
            </Link>
          </>
        )}
      </Dialog>
    </>
  );
}
