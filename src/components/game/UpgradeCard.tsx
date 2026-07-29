"use client";

import { useActionState, useEffect, type CSSProperties } from "react";
import { upgradeEmpireUpgrade, type ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { usePulse } from "@/components/ui/motion";
import { formatNumber } from "@/lib/game/format";
import type { ActiveEmpireUpgradeType } from "@/lib/game/constants";
import type { AvailableResources } from "@/components/game/WeaponCard";

/** Shards thrown off the crest when an upgrade settles. */
const BURST = [0, 45, 90, 135, 180, 225, 270, 315];

const COST_RESOURCES = [
  { key: "gold", icon: "gold" },
  { key: "wood", icon: "wood" },
  { key: "iron", icon: "iron" },
  { key: "stone", icon: "stone" },
] as const;

export interface UpgradeCardProps {
  upgradeType: ActiveEmpireUpgradeType;
  label: string;
  icon: IconName;
  description: string;
  level: number;
  currentEffect: string;
  nextEffect: string;
  upgradeCost: { gold: number; wood: number; iron: number; stone: number };
  available: AvailableResources;
  isMaxLevel?: boolean;
}

export function UpgradeCard({
  upgradeType,
  label,
  icon,
  description,
  level,
  currentEffect,
  nextEffect,
  upgradeCost,
  available,
  isMaxLevel = false,
}: UpgradeCardProps) {
  const [state, action] = useActionState<ActionState, FormData>(
    upgradeEmpireUpgrade,
    {}
  );

  // A settled upgrade flares the crest. The action state is a fresh object per
  // submit, so an identical repeat still fires; `fire` is stable.
  const [pulse, fire] = usePulse<"upgrade">();
  useEffect(() => {
    if (state.success) fire("upgrade");
  }, [state, fire]);

  return (
    <Card className={`flex flex-col gap-4${pulse ? " forged" : ""}`}>
      <div className="flex items-center gap-3">
        {/* the emblem doubles as the level dial: it glows brighter the further
            the upgrade has been pushed, and flares when one settles */}
        <span
          className="crest"
          style={{ "--lit": `${Math.min(1, level / 25)}` } as CSSProperties}
        >
          <span className="crest-ring" />
          <Icon name={icon} size={26} className="crest-mark text-gold-bright" />
          {pulse && (
            <span className="crest-burst" key={pulse.id} aria-hidden>
              {BURST.map((angle) => (
                <span
                  key={angle}
                  className="crest-shard"
                  style={{ "--a": `${angle}deg` } as CSSProperties}
                />
              ))}
            </span>
          )}
        </span>
        <div>
          <h3 className="font-bold text-gold-bright">{label}</h3>
          <p className="text-xs font-semibold text-gold">
            רמה{" "}
            <span className="nums crest-level" key={level} dir="ltr">
              {level}
            </span>
          </p>
        </div>
      </div>

      <p className="text-sm text-zinc-400">{description}</p>

      <div className="panel-inset space-y-1 rounded-lg p-3 text-xs">
        <p className="text-zinc-300">
          <span className="font-semibold text-gold-dim">כעת:</span> {currentEffect}
        </p>
        {!isMaxLevel && (
          <p className="text-emerald-400">
            <span className="font-semibold">אחרי שדרוג:</span> {nextEffect}
          </p>
        )}
      </div>

      <form action={action} className="mt-auto space-y-2">
        <input type="hidden" name="upgradeType" value={upgradeType} />
        {!isMaxLevel && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
            <span className="font-semibold text-gold-dim">עלות שדרוג:</span>
            {COST_RESOURCES.map(({ key, icon }) => {
              if (upgradeCost[key] <= 0) return null;
              const missing = available[key] < upgradeCost[key];
              return (
                <span
                  key={key}
                  className={missing ? "font-semibold text-red-400" : undefined}
                  title={missing ? "אין מספיק מהמשאב הזה לשדרוג" : undefined}
                >
                  <Icon name={icon} size={14} className="inline align-[-2px]" />{" "}
                  <span className="nums" dir="ltr">
                    {formatNumber(upgradeCost[key])}
                  </span>
                </span>
              );
            })}
          </div>
        )}
        <SubmitButton
          className={`w-full ${isMaxLevel ? "" : "btn btn-gold"}`}
          pendingText="משדרג..."
          disabled={isMaxLevel}
        >
          {isMaxLevel ? "רמה מקסימלית" : `שדרג לרמה ${level + 1}`}
        </SubmitButton>
      </form>

      <FormMessage error={state.error} success={state.success} />
    </Card>
  );
}
