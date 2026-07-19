"use client";

import { useActionState } from "react";
import { trainUnits, type ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";

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
    <div className="panel-inset rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-bold text-gold-bright">{label}</h3>
            <p className="text-xs text-gold-dim">
              ברשותך:{" "}
              <span className="nums font-bold text-gold-bright" dir="ltr">
                {owned.toLocaleString("he-IL")}
              </span>
            </p>
          </div>
        </div>
        {power > 0 && (
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold-bright">
            <Icon name="spark" size={14} className="inline align-[-2px]" />{" "}
            <span className="nums" dir="ltr">
              {power}
            </span>{" "}
            עוצמה
          </span>
        )}
      </div>

      <p className="text-sm text-zinc-400">{description}</p>

      <p className="text-xs text-zinc-400">
        <span className="font-semibold text-gold-dim">עלות:</span> אזרח אחד
      </p>

      <form action={action} className="mt-auto space-y-2">
        <input type="hidden" name="unit" value={unit} />
        <label className="block space-y-1">
          <span className="text-xs text-gold-dim">
            כמות לאימון (אזרחים פנויים:{" "}
            <span className="nums" dir="ltr">
              {availableCitizens.toLocaleString("he-IL")}
            </span>
            )
          </span>
          <input
            type="number"
            name="quantity"
            min={1}
            max={availableCitizens}
            defaultValue={1}
            required
            className="nums w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-gold"
          />
        </label>
        <SubmitButton className="btn btn-dark w-full" pendingText="מאמן...">
          ביצוע אימון
        </SubmitButton>
      </form>

      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
