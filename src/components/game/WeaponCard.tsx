"use client";

import { useActionState, useState } from "react";
import { buyWeapon, type ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";
import { discountedAmount } from "@/lib/game/diamondShop";
import type { WeaponCost, WeaponDefinition } from "@/lib/game/weapons";

export interface AvailableResources {
  gold: number;
  wood: number;
  iron: number;
  stone: number;
}

const COST_RESOURCES = [
  { key: "gold", icon: "gold" },
  { key: "wood", icon: "wood" },
  { key: "iron", icon: "iron" },
  { key: "stone", icon: "stone" },
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
  discountPct,
}: {
  weapon: WeaponDefinition;
  owned: number;
  available: AvailableResources;
  /** Active shop-discount percent (0 when none). */
  discountPct: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(buyWeapon, {});
  const [quantity, setQuantity] = useState("1");
  const [showMaxError, setShowMaxError] = useState(false);

  const hasDiscount = discountPct > 0;
  // Affordability & MAX use the discounted per-unit cost, matching the server.
  const netCost: WeaponCost = {
    gold: discountedAmount(weapon.cost.gold, discountPct),
    wood: discountedAmount(weapon.cost.wood, discountPct),
    iron: discountedAmount(weapon.cost.iron, discountPct),
    stone: discountedAmount(weapon.cost.stone, discountPct),
  };
  const maxQuantity = maxAffordableQuantity(netCost, available);

  return (
    <div className="panel rounded-xl p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-gold-bright">{weapon.name}</h3>
          <p className="text-xs font-semibold text-gold-dim">
            רמה{" "}
            <span className="nums" dir="ltr">
              {weapon.tier}
            </span>
          </p>
        </div>
        {hasDiscount && (
          <span
            className="nums shrink-0 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-300"
            dir="ltr"
            title="קסם הנחה פעיל"
          >
            ✨ −{discountPct}%
          </span>
        )}
      </div>

      <p className="text-sm text-zinc-400">{weapon.description}</p>

      <div className="grid grid-cols-2 gap-2 panel-inset rounded-lg p-3 text-xs">
        <span className="text-zinc-400">
          ברשותך:{" "}
          <span className="nums font-bold text-zinc-100" dir="ltr">
            {formatNumber(owned)}
          </span>
        </span>
        <span className="text-zinc-400">
          עוצמה ליחידה:{" "}
          <span className="nums font-bold text-zinc-100" dir="ltr">
            {formatNumber(weapon.power)}
          </span>
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
        {COST_RESOURCES.map(({ key, icon }) => {
          if (weapon.cost[key] <= 0) return null;
          const missing = available[key] < netCost[key];
          return (
            <span
              key={key}
              title={missing ? "אין מספיק מהמשאב הזה ליחידה אחת" : undefined}
            >
              <Icon
                name={icon}
                size={14}
                className={`inline align-[-2px] ${RESOURCE_ICON_COLOR[key]}`}
              />{" "}
              {hasDiscount && (
                <span className="nums text-zinc-600 line-through" dir="ltr">
                  {formatNumber(weapon.cost[key])}
                </span>
              )}{" "}
              <span
                className={`nums font-semibold ${
                  missing
                    ? "text-red-400"
                    : hasDiscount
                      ? "text-emerald-300"
                      : "font-normal"
                }`}
                dir="ltr"
              >
                {formatNumber(netCost[key])}
              </span>
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
            className="nums w-full min-w-0 flex-1 rounded-lg border border-border-subtle bg-panel-inset px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-gold"
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
            className="btn btn-ghost shrink-0 px-3 py-1.5 text-sm"
          >
            MAX
          </button>
          <SubmitButton pendingText="קונה..." className="btn btn-gold shrink-0">
            קנה
          </SubmitButton>
        </div>
        {showMaxError && (
          <p className="text-xs text-red-400">אין מספיק משאבים זמינים לקנייה.</p>
        )}
      </form>

      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
