"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { LabeledInput } from "@/components/admin/fields";
import { cityAt } from "@/lib/game/cities";
import { formatCompact } from "@/lib/game/format";
import { BOT_BATCH_MAX, BOT_SPREAD_MAX_PCT } from "@/lib/game/bots";
import type { AdminActionState } from "@/server/actions/admin";

/** One city tier as the planter sees it: who lives there, and what a bot would cost to match. */
export interface BotCityStat {
  cities: number;
  /** Real residents — staff and bots excluded. */
  players: number;
  bots: number;
  /** The power a bot planted here would be built at, on "match the city". */
  baseline: number;
}

/**
 * The city picker.
 *
 * Which tiers to plant in is the only decision here that needs a screen rather
 * than a number box, because it is the one made by looking: the admin is hunting
 * for the tier where somebody is stranded alone, and the answer is "the row that
 * says 1 player, 0 bots". So each tier carries its own headcount and the power a
 * bot would be built at, and a tier with exactly one resident is called out —
 * that player currently has nobody to attack and nobody to spy.
 */
export function BotPlanter({
  action,
  stats,
}: {
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  stats: BotCityStat[];
}) {
  const [selected, setSelected] = useState<number[]>(
    // Pre-selected: exactly the stranded tiers. Nine times in ten that is the
    // whole reason the page was opened, so it opens with the answer already
    // filled in and the admin only has to press the button.
    stats.filter((s) => s.players === 1 && s.bots === 0).map((s) => s.cities)
  );
  const [perCity, setPerCity] = useState("2");

  const toggle = (cities: number) =>
    setSelected((prev) =>
      prev.includes(cities) ? prev.filter((c) => c !== cities) : [...prev, cities]
    );

  const total = selected.length * (Number(perCity) || 0);

  return (
    <ActionForm
      action={action}
      submitLabel={total > 0 ? `🤖 שתול ${total} בוטים` : "🤖 שתול בוטים"}
      confirm="לשתול את הבוטים בערים שנבחרו?"
    >
      {selected.map((cities) => (
        <input key={cities} type="hidden" name="cities" value={cities} />
      ))}

      <div className="grid gap-2 sm:grid-cols-2">
        {stats.map((stat) => {
          const city = cityAt(stat.cities);
          const active = selected.includes(stat.cities);
          const lonely = stat.players === 1 && stat.bots === 0;
          return (
            <button
              key={stat.cities}
              type="button"
              onClick={() => toggle(stat.cities)}
              aria-pressed={active}
              className={`rounded-lg border px-3 py-2 text-right transition-colors ${
                active
                  ? "border-gold/60 bg-gold/12"
                  : "border-border-subtle bg-panel-inset hover:border-gold/40"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold text-zinc-100">
                  {city.name}{" "}
                  <span className="nums text-[11px] text-zinc-500" dir="ltr">
                    ({stat.cities})
                  </span>
                </span>
                {lonely && (
                  <span className="rounded bg-crimson/25 px-1.5 py-0.5 text-[10px] font-bold text-red-200">
                    שחקן בודד
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-[11px] text-zinc-400">
                <span className="nums" dir="ltr">
                  {stat.players}
                </span>{" "}
                שחקנים ·{" "}
                <span className="nums" dir="ltr">
                  {stat.bots}
                </span>{" "}
                בוטים · כוח מותאם{" "}
                <span className="nums text-gold-dim" dir="ltr">
                  {formatCompact(stat.baseline)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <LabeledInput
          label="בוטים לכל עיר"
          name="perCity"
          type="number"
          min={1}
          max={BOT_BATCH_MAX}
          value={perCity}
          onValueChange={setPerCity}
        />
        <LabeledInput
          label="כוח צבאי"
          name="power"
          type="number"
          min={0}
          placeholder="ריק = מותאם לעיר"
          hint="השאר ריק כדי לבנות כל בוט לפי ממוצע הכוח של תושבי העיר שלו"
        />
        <LabeledInput
          label="פיזור ±%"
          name="spreadPct"
          type="number"
          min={0}
          max={BOT_SPREAD_MAX_PCT}
          defaultValue={25}
          hint="הגרלה סביב הכוח, כדי שכמה בוטים באותה עיר לא יֵצאו זהים"
        />
      </div>
    </ActionForm>
  );
}
