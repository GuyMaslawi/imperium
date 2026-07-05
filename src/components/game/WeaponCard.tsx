"use client";

import { useActionState, useState } from "react";
import { buyWeapon, type ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";
import type { WeaponCost, WeaponDefinition } from "@/lib/game/weapons";

export interface AvailableResources {
  gold: number;
  wood: number;
  iron: number;
  stone: number;
}

const COST_RESOURCES = [
  { key: "gold", icon: "🪙" },
  { key: "wood", icon: "🪵" },
  { key: "iron", icon: "⚙️" },
  { key: "stone", icon: "🪨" },
] as const;

/**
 * Largest affordable quantity from available balances only — the minimum
 * of floor(available / cost) across every non-zero cost.
 */
export function maxAffordableQuantity(
  cost: WeaponCost,
  available: AvailableResources
): number {
  let max = Infinity;
  for (const key of ["gold", "wood", "iron", "stone"] as const) {
    if (cost[key] > 0) max = Math.min(max, Math.floor(available[key] / cost[key]));
  }
  return max === Infinity ? 0 : Math.max(0, max);
}

export function WeaponCard({
  weapon,
  owned,
  available,
}: {
  weapon: WeaponDefinition;
  owned: number;
  available: AvailableResources;
}) {
  const [state, action] = useActionState<ActionState, FormData>(buyWeapon, {});
  const [quantity, setQuantity] = useState("1");
  const [showMaxError, setShowMaxError] = useState(false);

  const maxQuantity = maxAffordableQuantity(weapon.cost, available);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-zinc-100">{weapon.name}</h3>
          <p className="text-xs font-semibold text-gold">רמה {weapon.tier}</p>
        </div>
        <span className="shrink-0 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold">
          ⚡ {weapon.power} עוצמה
        </span>
      </div>

      <p className="text-sm text-zinc-400">{weapon.description}</p>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-raised/60 p-3 text-xs">
        <span className="text-zinc-400">
          ברשותך:{" "}
          <span className="font-bold text-zinc-100">{owned.toLocaleString("he-IL")}</span>
        </span>
        <span className="text-zinc-400">
          עוצמה ליחידה: <span className="font-bold text-zinc-100">{weapon.power}</span>
        </span>
        <span className="col-span-2 text-zinc-400">
          עוצמה כוללת מנשק זה:{" "}
          <span className="font-bold text-gold">
            {(owned * weapon.power).toLocaleString("he-IL")}
          </span>
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
        <span className="font-semibold text-zinc-300">עלות ליחידה:</span>
        {COST_RESOURCES.map(({ key, icon }) => {
          if (weapon.cost[key] <= 0) return null;
          const missing = available[key] < weapon.cost[key];
          return (
            <span
              key={key}
              className={missing ? "font-semibold text-red-400" : undefined}
              title={missing ? "אין מספיק מהמשאב הזה ליחידה אחת" : undefined}
            >
              {icon} {weapon.cost[key].toLocaleString("he-IL")}
            </span>
          );
        })}
      </div>

      <form action={action} className="mt-auto space-y-2">
        <input type="hidden" name="weaponKey" value={weapon.key} />
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="quantity"
            min={1}
            required
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setShowMaxError(false);
            }}
            className="w-full min-w-0 flex-1 rounded-lg border border-border-subtle bg-surface-raised px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-gold"
          />
          <button
            type="button"
            onClick={() => {
              if (maxQuantity > 0) {
                setQuantity(String(maxQuantity));
                setShowMaxError(false);
              } else {
                setShowMaxError(true);
              }
            }}
            className="shrink-0 cursor-pointer rounded-lg border border-gold-dim px-3 py-1.5 text-sm text-gold transition-colors hover:bg-gold/10"
          >
            מקסימום
          </button>
          <SubmitButton pendingText="קונה..." className="shrink-0">
            קנה
          </SubmitButton>
        </div>
        {showMaxError && (
          <p className="text-xs text-red-400">אין מספיק משאבים זמינים לקנייה.</p>
        )}
      </form>

      <FormMessage error={state.error} success={state.success} />
    </Card>
  );
}
