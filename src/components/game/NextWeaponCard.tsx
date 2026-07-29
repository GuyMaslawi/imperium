"use client";

import { useActionState } from "react";
import { unlockNextWeaponTier, type ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import { WeaponArt } from "@/components/game/WeaponArt";
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
 *
 * Laid out as a full-width banner above the owned-weapon grid rather than as a
 * grid cell: it carries far more content than a purchase card (requirements,
 * unlock cost, explanation), and as a cell it stretched every card in its row
 * to its own height, leaving a dead gap over their buy buttons.
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
    <div className="panel-gold relative overflow-hidden rounded-xl p-4">
      {/* soft gold glow behind the content */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 right-24 h-44 w-44 rounded-full bg-gold/10 blur-3xl"
      />
      {/* the lock motif rides the middle of the banner — over the action
          column it read as a smudge behind the unlock button */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-8 left-1/3 select-none text-8xl opacity-[0.06]"
      >
        🔒
      </span>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* identity */}
        <div className="flex min-w-0 items-center gap-3 lg:w-60 lg:shrink-0">
          <WeaponArt weapon={weapon} locked />
          <div className="min-w-0">
            <p className="mb-0.5 text-[11px] font-bold tracking-wide text-gold-bright">
              ← הנשק הבא
            </p>
            <h3 className="truncate font-bold text-gold-bright">
              {weapon.name}
            </h3>
            <p className="flex items-center gap-2 text-xs font-semibold text-gold-dim">
              <span>
                רמה{" "}
                <span className="nums" dir="ltr">
                  {weapon.tier}
                </span>
              </span>
              <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-px text-[11px] text-gold-bright">
                🔒 נעול
              </span>
            </p>
          </div>
        </div>

        {/* details */}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-zinc-400/90">{weapon.description}</p>

          {/* chips hug their content — a full-width panel here left a wide
              empty strip beside the numbers */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="panel-inset rounded-lg px-3 py-1.5 text-zinc-400">
              עוצמה ליחידה:{" "}
              <span className="nums font-bold text-gold-bright" dir="ltr">
                <Icon name="spark" size={14} className="inline align-[-2px]" />{" "}
                {weapon.power}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 panel-inset rounded-lg px-3 py-1.5 text-zinc-400">
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

          {(hasCityGate || hasHeroGate) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-gold-dim">
                דרישות לרמה הבאה:
              </span>
              {hasCityGate && (
                <span
                  className={`rounded-full border px-2.5 py-1 ${
                    gate.citiesMet
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-400"
                      : "border-red-400/40 bg-red-500/10 font-semibold text-red-400"
                  }`}
                >
                  {gate.citiesMet ? "✓" : "🔒"} 🏰 עיר{" "}
                  <span className="nums" dir="ltr">
                    {gate.cities}
                  </span>{" "}
                  <span className="text-zinc-500">
                    (אתה בעיר{" "}
                    <span className="nums" dir="ltr">
                      {cities}
                    </span>
                    )
                  </span>
                </span>
              )}
              {hasHeroGate && (
                <span
                  className={`rounded-full border px-2.5 py-1 ${
                    gate.heroLevelMet
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-400"
                      : "border-red-400/40 bg-red-500/10 font-semibold text-red-400"
                  }`}
                >
                  {gate.heroLevelMet ? "✓" : "🔒"} ⚔️ גיבור רמה{" "}
                  <span className="nums" dir="ltr">
                    {gate.heroLevel}
                  </span>{" "}
                  <span className="text-zinc-500">
                    (רמה{" "}
                    <span className="nums" dir="ltr">
                      {heroLevel}
                    </span>
                    )
                  </span>
                </span>
              )}
            </div>
          )}

          <p className="text-xs text-zinc-500">
            פתיחה מקדמת את הנשק הבא בכל הקטגוריות — התקפה, הגנה וריגול.
          </p>
        </div>

        {/* action */}
        <div className="lg:w-72 lg:shrink-0">
          <form action={action} className="space-y-2">
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
      </div>
    </div>
  );
}
