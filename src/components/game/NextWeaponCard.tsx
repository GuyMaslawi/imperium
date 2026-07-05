"use client";

import { useActionState } from "react";
import { unlockNextWeaponTier, type ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import type { WeaponCost, WeaponDefinition } from "@/lib/game/weapons";

/**
 * The next locked weapon in a category's progression path, with the tier
 * unlock action merged into it — unlocking always targets this weapon.
 */
export function NextWeaponCard({
  weapon,
  category,
  unlockCost,
}: {
  weapon: WeaponDefinition;
  category: "ATTACK" | "DEFENSE" | "SPY";
  unlockCost: WeaponCost;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    unlockNextWeaponTier,
    {}
  );

  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-gold/50 bg-black/50 p-5 shadow-lg shadow-gold/15 ring-1 ring-inset ring-gold/10 backdrop-blur-sm">
      {/* soft gold glow behind the content */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-4 left-2 select-none text-7xl opacity-10"
      >
        🔒
      </span>

      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="mb-1 text-[11px] font-bold tracking-wide text-gold-bright">
            ← הנשק הבא
          </p>
          <h3 className="font-bold text-zinc-100">{weapon.name}</h3>
          <p className="text-xs font-semibold text-gold">רמה {weapon.tier}</p>
        </div>
        <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold">
          🔒 נעול
        </span>
      </div>

      <p className="relative text-sm text-zinc-400/90">{weapon.description}</p>

      <div className="relative grid grid-cols-2 gap-2 rounded-lg bg-surface-raised/40 p-3 text-xs opacity-90">
        <span className="text-zinc-400">
          עוצמה ליחידה:{" "}
          <span className="font-bold text-gold">⚡ {weapon.power}</span>
        </span>
        <span className="col-span-2 flex flex-wrap gap-x-3 gap-y-1 text-zinc-400">
          <span className="font-semibold text-zinc-300">עלות ליחידה:</span>
          {weapon.cost.gold > 0 && <span>🪙 {weapon.cost.gold.toLocaleString("he-IL")}</span>}
          {weapon.cost.wood > 0 && <span>🪵 {weapon.cost.wood.toLocaleString("he-IL")}</span>}
          {weapon.cost.iron > 0 && <span>⚙️ {weapon.cost.iron.toLocaleString("he-IL")}</span>}
          {weapon.cost.stone > 0 && <span>🪨 {weapon.cost.stone.toLocaleString("he-IL")}</span>}
        </span>
      </div>

      <p className="relative text-xs text-zinc-500">
        שדרג כדי לפתוח את הנשק הבא בקטגוריה.
      </p>

      <form action={action} className="relative mt-auto space-y-2">
        <input type="hidden" name="category" value={category} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">עלות פתיחה:</span>
          <span>🪙 {unlockCost.gold.toLocaleString("he-IL")}</span>
          <span>🪵 {unlockCost.wood.toLocaleString("he-IL")}</span>
          <span>⚙️ {unlockCost.iron.toLocaleString("he-IL")}</span>
          <span>🪨 {unlockCost.stone.toLocaleString("he-IL")}</span>
        </div>
        <SubmitButton className="w-full" pendingText="פותח...">
          🔓 פתח נשק הבא
        </SubmitButton>
      </form>

      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
