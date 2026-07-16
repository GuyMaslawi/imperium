"use client";

import { useActionState } from "react";
import { unequipHeroItem } from "@/server/actions/hero";
import type { ActionState } from "@/server/actions/game";
import { ItemTile } from "@/components/game/ItemTile";
import { Tip } from "@/components/ui/Tip";
import { HERO_STAT_META, SLOT_META, SLOT_ORDER } from "@/lib/game/hero";
import { itemDetails, uiRarity, type HeroItemView } from "@/components/game/heroItemView";

/**
 * The hero's 9 active equipment slots (3×3). Clicking an equipped item
 * returns it to the bag; empty slots show which piece belongs there.
 */
export function HeroEquipment({
  equipped,
  heroLevel,
}: {
  equipped: HeroItemView[];
  heroLevel: number;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    unequipHeroItem,
    {}
  );

  const bySlot = new Map(equipped.map((item) => [item.slot, item]));

  return (
    <div>
      <Tip tip="9 חלקי הציוד שהגיבור לובש כרגע — הבונוסים שלהם מתווספים לנקודות שהוקצו. לחיצה על חפץ מסירה אותו לתיק.">
        <h3 className="mb-3 cursor-help text-sm font-bold tracking-wide text-gold">
          ציוד פעיל
        </h3>
      </Tip>
      <div className="grid grid-cols-3 gap-3.5">
        {SLOT_ORDER.map((slot) => {
          const meta = SLOT_META[slot];
          const item = bySlot.get(slot);
          if (!item) {
            const statMeta = HERO_STAT_META[meta.stat];
            return (
              <Tip
                key={slot}
                tip={`סלוט ${meta.label} ריק — חפץ ${meta.label} מוסיף ${statMeta.label} (${statMeta.icon}). לכוד אחד בתקיפה ולבש אותו מהתיק.`}
              >
                <div className="flex w-full flex-col items-center gap-1.5">
                  <div className="panel-inset flex aspect-square w-full items-center justify-center rounded-xl">
                    <span aria-hidden className="text-4xl opacity-25 grayscale">
                      {meta.icon}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-600">{meta.label}</span>
                </div>
              </Tip>
            );
          }
          return (
            <form key={slot} action={formAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <button
                type="submit"
                className="block w-full"
                aria-label={`הסר ${meta.label}`}
              >
                <ItemTile
                  slug={meta.slug}
                  icon={meta.icon}
                  level={item.level}
                  name={meta.label}
                  rarity={uiRarity(item.rarity)}
                  size="lg"
                  details={itemDetails(item, heroLevel, {
                    equipped: true,
                    hint: "לחץ כדי להסיר לתיק",
                  })}
                />
              </button>
            </form>
          );
        })}
      </div>
      {(state.error || state.success) && (
        <p
          className={`mt-3 text-xs font-semibold ${
            state.error ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {state.error ?? state.success}
        </p>
      )}
    </div>
  );
}
