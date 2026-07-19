"use client";

import { useActionState } from "react";
import {
  upgradeMine,
  assignMineSlavesToResource,
  type ActionState,
} from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import type { MineProductionBreakdown } from "@/lib/game/resources";

const nis = (n: number) => Math.round(n).toLocaleString("he-IL");

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
  /** Real production per regular update, broken down by active bonus. */
  breakdown: MineProductionBreakdown;
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
  breakdown,
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
    <div className="panel rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-bold text-gold-bright">{label}</h3>
            <p className="text-xs font-semibold text-gold-dim">
              רמה{" "}
              <span className="nums" dir="ltr">
                {level} / {maxLevel}
              </span>
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            isMaxLevel
              ? "border border-gold/40 bg-gold/10 text-gold-bright"
              : "border border-border-subtle bg-panel-inset text-gold-dim"
          }`}
        >
          {isMaxLevel ? "MAX " : ""}
          רמה{" "}
          <span className="nums" dir="ltr">
            {maxLevel}
          </span>
        </span>
      </div>

      <div className="panel-inset rounded-lg p-3 text-center">
        <p className="nums text-2xl font-black text-emerald-400" dir="ltr">
          +{nis(breakdown.total)}
        </p>
        <p className="text-xs text-gold-dim">
          {resourceLabel} לעדכון רגיל
          {breakdown.lines.length > 0 ? " (כולל בונוסים)" : ""}
        </p>
      </div>

      {/* min-height keeps the stat boxes and forms aligned across the four
          cards even when descriptions wrap to a different number of lines */}
      <p className="min-h-[3.75rem] text-sm text-zinc-400">{description}</p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 panel-inset rounded-lg p-3 text-xs">
        <dt className="text-zinc-400">עבדי מכרות מוצבים</dt>
        <dd className="nums text-left font-bold text-zinc-100" dir="ltr">
          {assignedSlaves.toLocaleString("he-IL")}
        </dd>
        <dt className="text-zinc-400">תפוקה לעבד מכרות</dt>
        <dd className="nums text-left font-bold text-zinc-100" dir="ltr">
          {productionPerSlave.toLocaleString("he-IL")} {resourceLabel}
        </dd>
        <dt className="text-zinc-400">תפוקת בסיס לעדכון</dt>
        <dd className="nums text-left font-bold text-zinc-100" dir="ltr">
          +{nis(breakdown.base)} {resourceLabel}
        </dd>
      </dl>

      {breakdown.lines.length > 0 && (
        <div className="panel-inset rounded-lg p-3 text-xs space-y-1.5">
          <p className="flex items-center gap-1.5 font-semibold text-gold-dim">
            <span aria-hidden>✨</span>
            בונוסים פעילים
          </p>
          {breakdown.lines.map((line) => (
            <div key={line.key} className="flex items-center justify-between gap-2">
              <span className="text-zinc-400">
                {line.label}
                {line.pct !== undefined ? (
                  <span className="nums" dir="ltr">
                    {" "}
                    (+{line.pct}%)
                  </span>
                ) : null}
              </span>
              <span className="nums font-bold text-emerald-300" dir="ltr">
                +{nis(line.amount)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-1.5">
            <span className="font-semibold text-gold-dim">סה״כ בפועל</span>
            <span className="nums font-black text-emerald-400" dir="ltr">
              +{nis(breakdown.total)} {resourceLabel}
            </span>
          </div>
        </div>
      )}

      <form action={assignAction} className="flex items-end gap-2">
        <input type="hidden" name="resource" value={resource} />
        <label className="flex-1 space-y-1">
          <span className="text-xs text-gold-dim">
            ניהול עובדים (פנויים:{" "}
            <span className="nums" dir="ltr">
              {freeSlaves.toLocaleString("he-IL")}
            </span>
            )
          </span>
          <input
            type="number"
            name="amount"
            min={0}
            max={assignedSlaves + freeSlaves}
            defaultValue={assignedSlaves}
            className="nums w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-gold"
          />
        </label>
        <SubmitButton variant="secondary" className="btn btn-ghost" pendingText="מעדכן...">
          עדכן חלוקה
        </SubmitButton>
      </form>

      <form action={upgradeAction} className="mt-auto space-y-2">
        <input type="hidden" name="resource" value={resource} />
        {!isMaxLevel && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
            <span className="font-semibold text-gold-dim">עלות שדרוג:</span>
            <span className="nums" dir="ltr">🪙 {upgradeCost.gold.toLocaleString("he-IL")}</span>
            <span className="nums" dir="ltr">🪵 {upgradeCost.wood.toLocaleString("he-IL")}</span>
            <span className="nums" dir="ltr">⚙️ {upgradeCost.iron.toLocaleString("he-IL")}</span>
            <span className="nums" dir="ltr">🪨 {upgradeCost.stone.toLocaleString("he-IL")}</span>
          </div>
        )}
        <SubmitButton className="btn btn-dark w-full" pendingText="משדרג..." disabled={isMaxLevel}>
          {isMaxLevel ? "רמה מקסימלית" : "שדרג רמה"}
        </SubmitButton>
      </form>

      <FormMessage
        error={upgradeState.error ?? assignState.error}
        success={upgradeState.success ?? assignState.success}
      />
    </div>
  );
}
