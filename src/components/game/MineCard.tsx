"use client";

import { useActionState } from "react";
import {
  upgradeMine,
  assignMineSlavesToResource,
  type ActionState,
} from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";

export interface MineCardProps {
  resource: "gold" | "wood" | "iron" | "stone";
  label: string;
  icon: string;
  description: string;
  level: number;
  maxLevel: number;
  assignedSlaves: number;
  freeSlaves: number;
  resourceLabel: string;
  /** Production per assigned mine slave per regular update. */
  productionPerSlave: number;
  /** Total production per regular update. */
  productionPerTick: number;
  upgradeCost: { gold: number; wood: number; iron: number; stone: number };
}

export function MineCard({
  resource,
  label,
  icon,
  description,
  level,
  maxLevel,
  assignedSlaves,
  freeSlaves,
  resourceLabel,
  productionPerSlave,
  productionPerTick,
  upgradeCost,
}: MineCardProps) {
  const [upgradeState, upgradeAction] = useActionState<ActionState, FormData>(
    upgradeMine,
    {}
  );
  const [assignState, assignAction] = useActionState<ActionState, FormData>(
    assignMineSlavesToResource,
    {}
  );

  const isMaxLevel = level >= maxLevel;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-bold text-zinc-100">{label}</h3>
            <p className="text-xs font-semibold text-gold">
              רמה {level} / {maxLevel}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-emerald-400">
          +{productionPerTick.toLocaleString("he-IL")} {resourceLabel} לעדכון רגיל
        </span>
      </div>

      <p className="text-sm text-zinc-400">{description}</p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg bg-surface-raised/60 p-3 text-xs">
        <dt className="text-zinc-400">עבדי מכרות מוצבים</dt>
        <dd className="text-left font-bold tabular-nums text-zinc-100">
          {assignedSlaves.toLocaleString("he-IL")}
        </dd>
        <dt className="text-zinc-400">תפוקה לעבד מכרות</dt>
        <dd className="text-left font-bold tabular-nums text-zinc-100">
          {productionPerSlave.toLocaleString("he-IL")} {resourceLabel}
        </dd>
        <dt className="text-zinc-400">ייצור לעדכון רגיל</dt>
        <dd className="text-left font-bold tabular-nums text-emerald-400">
          +{productionPerTick.toLocaleString("he-IL")} {resourceLabel}
        </dd>
      </dl>

      <form action={assignAction} className="flex items-end gap-2">
        <input type="hidden" name="resource" value={resource} />
        <label className="flex-1 space-y-1">
          <span className="text-xs text-zinc-400">
            עבדי מכרות מוצבים (פנויים: {freeSlaves.toLocaleString("he-IL")})
          </span>
          <input
            type="number"
            name="amount"
            min={0}
            max={assignedSlaves + freeSlaves}
            defaultValue={assignedSlaves}
            className="w-full rounded-lg border border-border-subtle bg-surface-raised px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-gold"
          />
        </label>
        <SubmitButton variant="secondary" pendingText="מעדכן...">
          עדכן חלוקה
        </SubmitButton>
      </form>

      <form action={upgradeAction} className="mt-auto space-y-2">
        <input type="hidden" name="resource" value={resource} />
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
          {isMaxLevel ? "רמה מקסימלית" : "שדרג מכרה"}
        </SubmitButton>
      </form>

      <FormMessage
        error={upgradeState.error ?? assignState.error}
        success={upgradeState.success ?? assignState.success}
      />
    </Card>
  );
}
