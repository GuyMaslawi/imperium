"use client";

import { useActionState, useEffect } from "react";
import { trainUnits, type ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon, type IconName } from "@/components/ui/Icon";
import { usePulse } from "@/components/ui/motion";
import { MusterYard } from "./MusterYard";
import { formatNumber } from "@/lib/game/format";
import { COLUMN_INT_MAX } from "@/lib/game/constants";
import { useT } from "@/i18n/client";

export interface TrainCardProps {
  unit: "soldiers" | "spies" | "mineSlaves";
  label: string;
  icon: IconName;
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
  const t = useT();
  const [state, action] = useActionState<ActionState, FormData>(trainUnits, {});

  // Every settled training order marches the recruits into the yard. The
  // action state is a fresh object per submit, so an identical repeat still
  // fires; `fire` is stable, so it never re-triggers on its own.
  const [pulse, fire] = usePulse<"train">();
  useEffect(() => {
    if (state.success) fire("train");
  }, [state, fire]);

  return (
    <div className="panel-inset rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Icon name={icon} size={30} className="text-gold-bright" />
          <div>
            <h3 className="font-bold text-gold-bright">{t(label)}</h3>
            <p className="text-xs text-gold-dim">
              {t("ברשותך:")}{" "}
              <span className="nums font-bold text-gold-bright" dir="ltr">
                {formatNumber(owned)}
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
            {t("עוצמה")}
          </span>
        )}
      </div>

      {/* the parade ground: one silhouette rank standing for what you hold */}
      <MusterYard unit={unit} label={label} owned={owned} power={power} pulse={pulse} />

      <p className="text-sm text-zinc-400">{t(description)}</p>

      <p className="text-xs text-zinc-400">
        <span className="font-semibold text-gold-dim">{t("עלות:")}</span>{" "}
        {t("אזרח אחד")}
      </p>

      <form action={action} className="mt-auto space-y-2">
        <input type="hidden" name="unit" value={unit} />
        <label className="block space-y-1">
          <span className="text-xs text-gold-dim">
            {t("כמות לאימון (אזרחים פנויים: {available})", {
              available: formatNumber(availableCitizens),
            })}
          </span>
          <input
            type="number"
            name="quantity"
            min={1}
            // Free citizens, held to what the army column can store — see
            // COLUMN_INT_MAX. Nothing else caps an order.
            max={Math.min(availableCitizens, Math.max(0, COLUMN_INT_MAX - owned))}
            defaultValue={1}
            required
            className="nums w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-gold"
          />
        </label>
        <SubmitButton className="btn btn-dark w-full" pendingText={t("מאמן...")}>
          {t("ביצוע אימון")}
        </SubmitButton>
      </form>

      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
