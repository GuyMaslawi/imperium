"use client";

import { useActionState } from "react";
import { trainUnits, type ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";

export interface TrainCardProps {
  unit: "soldiers" | "spies" | "mineSlaves";
  label: string;
  icon: string;
  description: string;
  owned: number;
  power: number;
  availableCitizens: number;
}

export function TrainCard({
  unit,
  label,
  icon,
  description,
  owned,
  power,
  availableCitizens,
}: TrainCardProps) {
  const [state, action] = useActionState<ActionState, FormData>(trainUnits, {});

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-bold text-zinc-100">{label}</h3>
            <p className="text-xs text-zinc-400">
              ברשותך: <span className="font-bold text-gold">{owned.toLocaleString("he-IL")}</span>
            </p>
          </div>
        </div>
        {power > 0 && (
          <span className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold">
            ⚡ {power} עוצמה
          </span>
        )}
      </div>

      <p className="text-sm text-zinc-400">{description}</p>

      <p className="text-xs text-zinc-400">
        <span className="font-semibold text-zinc-300">עלות:</span> אזרח אחד
      </p>

      <form action={action} className="mt-auto flex items-end gap-2">
        <input type="hidden" name="unit" value={unit} />
        <label className="flex-1 space-y-1">
          <span className="text-xs text-zinc-400">
            כמות לאימון (אזרחים פנויים: {availableCitizens.toLocaleString("he-IL")})
          </span>
          <input
            type="number"
            name="quantity"
            min={1}
            max={availableCitizens}
            defaultValue={1}
            required
            className="w-full rounded-lg border border-border-subtle bg-surface-raised px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-gold"
          />
        </label>
        <SubmitButton pendingText="מאמן...">אמן</SubmitButton>
      </form>

      <FormMessage error={state.error} success={state.success} />
    </Card>
  );
}
