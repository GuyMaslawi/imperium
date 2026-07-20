"use client";

import { useActionState } from "react";
import { unlockNextWeaponTier, type ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";
import { discountedAmount } from "@/lib/game/diamondShop";
import type {
  WeaponCost,
  WeaponDefinition,
  WeaponGateStatus,
} from "@/lib/game/weapons";
import type { AvailableResources } from "@/components/game/WeaponCard";

const COST_RESOURCES = [
  { key: "gold", icon: "gold" },
  { key: "wood", icon: "wood" },
  { key: "iron", icon: "iron" },
  { key: "stone", icon: "stone" },
] as const;

/**
 * The next locked weapon in a category's progression path, with the tier
 * unlock action merged into it — unlocking always targets this weapon.
 */
export function NextWeaponCard({
  weapon,
  category,
  unlockCost,
  available,
  gate,
  cities,
  heroLevel,
  discountPct,
}: {
  weapon: WeaponDefinition;
  category: "ATTACK" | "DEFENSE" | "SPY";
  unlockCost: WeaponCost;
  available: AvailableResources;
  /** Shared next-tier requirements. */
  gate: WeaponGateStatus;
  /** Current city count. */
  cities: number;
  /** Current hero level. */
  heroLevel: number;
  /** Active shop-discount percent (0 when none). */
  discountPct: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    unlockNextWeaponTier,
    {}
  );

  const hasDiscount = discountPct > 0;

  // The gate only bites when it actually requires more than the empire has.
  const hasCityGate = gate.cities > 1;
  const hasHeroGate = gate.heroLevel > 0;

  return (
    <div className="panel-gold relative flex flex-col gap-3 overflow-hidden rounded-xl p-4">
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
          <h3 className="font-bold text-gold-bright">{weapon.name}</h3>
          <p className="text-xs font-semibold text-gold-dim">
            רמה{" "}
            <span className="nums" dir="ltr">
              {weapon.tier}
            </span>
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold-bright">
          🔒 נעול
        </span>
      </div>

      <p className="relative text-sm text-zinc-400/90">{weapon.description}</p>

      <div className="relative grid grid-cols-2 gap-2 panel-inset rounded-lg p-3 text-xs">
        <span className="text-zinc-400">
          עוצמה ליחידה:{" "}
          <span className="nums font-bold text-gold-bright" dir="ltr">
            <Icon name="spark" size={14} className="inline align-[-2px]" /> {weapon.power}
          </span>
        </span>
        <span className="col-span-2 flex flex-wrap gap-x-3 gap-y-1 text-zinc-400">
          <span className="font-semibold text-gold-dim">עלות ליחידה:</span>
          {COST_RESOURCES.map(({ key, icon }) => {
            if (weapon.cost[key] <= 0) return null;
            const net = discountedAmount(weapon.cost[key], discountPct);
            const missing = available[key] < net;
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
                  {formatNumber(net)}
                </span>
              </span>
            );
          })}
        </span>
      </div>

      <p className="relative text-xs text-zinc-500">
        פתיחה מקדמת את הנשק הבא בכל הקטגוריות — התקפה, הגנה וריגול.
      </p>

      {(hasCityGate || hasHeroGate) && (
        <div className="relative space-y-1.5 panel-inset rounded-lg p-3 text-xs">
          <p className="font-semibold text-gold-dim">דרישות לרמה הבאה:</p>
          {hasCityGate && (
            <p
              className={
                gate.citiesMet ? "text-emerald-400" : "font-semibold text-red-400"
              }
            >
              {gate.citiesMet ? "✓" : "🔒"} 🏰 {gate.cities} ערים{" "}
              <span className="text-zinc-500">
                (יש לך <span className="nums" dir="ltr">{cities}</span>)
              </span>
            </p>
          )}
          {hasHeroGate && (
            <p
              className={
                gate.heroLevelMet
                  ? "text-emerald-400"
                  : "font-semibold text-red-400"
              }
            >
              {gate.heroLevelMet ? "✓" : "🔒"} ⚔️ גיבור רמה{" "}
              <span className="nums" dir="ltr">{gate.heroLevel}</span>{" "}
              <span className="text-zinc-500">
                (רמה <span className="nums" dir="ltr">{heroLevel}</span>)
              </span>
            </p>
          )}
        </div>
      )}

      <form action={action} className="relative mt-auto space-y-2">
        <input type="hidden" name="category" value={category} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
          <span className="font-semibold text-gold-dim">עלות פתיחה:</span>
          {COST_RESOURCES.map(({ key, icon }) => {
            const net = discountedAmount(unlockCost[key], discountPct);
            const missing = available[key] < net;
            return (
              <span
                key={key}
                title={missing ? "אין מספיק מהמשאב הזה לפתיחה" : undefined}
              >
                <Icon
                  name={icon}
                  size={14}
                  className={`inline align-[-2px] ${RESOURCE_ICON_COLOR[key]}`}
                />{" "}
                {hasDiscount && (
                  <span className="nums text-zinc-600 line-through" dir="ltr">
                    {formatNumber(unlockCost[key])}
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
                  {formatNumber(net)}
                </span>
              </span>
            );
          })}
        </div>
        <SubmitButton
          className="btn btn-gold w-full"
          pendingText="פותח..."
          disabled={!gate.met}
        >
          {gate.met ? "🔓 פתח נשק הבא" : "🔒 דרישות לא הושלמו"}
        </SubmitButton>
      </form>

      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
