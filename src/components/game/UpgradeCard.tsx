"use client";

import { useActionState } from "react";
import { upgradeEmpireUpgrade, type ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";

export interface UpgradeCardProps {
  upgradeType:
    | "CITIZEN_GROWTH"
    | "INTELLIGENCE"
    | "BANK_DEPOSIT_COUNT"
    | "BANK_DAILY_INTEREST"
    | "TURNS_PER_REGULAR_UPDATE";
  label: string;
  icon: string;
  description: string;
  level: number;
  currentEffect: string;
  nextEffect: string;
  upgradeCost: { gold: number; wood: number; iron: number; stone: number };
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
  isMaxLevel = false,
}: UpgradeCardProps) {
  const [state, action] = useActionState<ActionState, FormData>(
    upgradeEmpireUpgrade,
    {}
  );

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="text-3xl">{icon}</span>
        <div>
          <h3 className="font-bold text-zinc-100">{label}</h3>
          <p className="text-xs font-semibold text-gold">רמה {level}</p>
        </div>
      </div>

      <p className="text-sm text-zinc-400">{description}</p>

      <div className="space-y-1 rounded-lg bg-surface-raised/60 p-3 text-xs">
        <p className="text-zinc-300">
          <span className="font-semibold">כעת:</span> {currentEffect}
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
            <span className="font-semibold text-zinc-300">עלות שדרוג:</span>
            <span>🪙 {upgradeCost.gold.toLocaleString("he-IL")}</span>
            <span>🪵 {upgradeCost.wood.toLocaleString("he-IL")}</span>
            <span>⚙️ {upgradeCost.iron.toLocaleString("he-IL")}</span>
            <span>🪨 {upgradeCost.stone.toLocaleString("he-IL")}</span>
          </div>
        )}
        <SubmitButton className="w-full" pendingText="משדרג..." disabled={isMaxLevel}>
          {isMaxLevel ? "רמה מקסימלית" : `שדרג לרמה ${level + 1}`}
        </SubmitButton>
      </form>

      <FormMessage error={state.error} success={state.success} />
    </Card>
  );
}
