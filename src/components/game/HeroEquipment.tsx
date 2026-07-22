"use client";

import { useState } from "react";
import { ItemTile } from "@/components/game/ItemTile";
import { ItemDialog } from "@/components/game/ItemDialog";
import { Tip } from "@/components/ui/Tip";
import { HERO_STAT_META, SLOT_META, SLOT_ORDER } from "@/lib/game/hero";
import { itemDetails, uiRarity, type HeroItemView } from "@/components/game/heroItemView";

/**
 * The hero's 9 active equipment slots (3×3). Clicking an equipped item opens
 * its detail dialog (remove / upgrade / discard); empty slots show which piece
 * belongs there.
 */
export function HeroEquipment({
  equipped,
  heroLevel,
  gold,
}: {
  equipped: HeroItemView[];
  heroLevel: number;
  gold: number;
}) {
  const [openItem, setOpenItem] = useState<HeroItemView | null>(null);
  const bySlot = new Map(equipped.map((item) => [item.slot, item]));

  return (
    <div>
      <Tip tip="9 חלקי הציוד שהגיבור לובש כרגע — הבונוסים שלהם אינם משנים את כרטיסי הנקודות, אלא מצטברים ל'סך הכל מהגיבור' שלמטה. לחיצה על חפץ פותחת את פרטיו.">
        <h3 className="mb-3 cursor-help text-sm font-bold tracking-wide text-gold">
          ציוד פעיל
        </h3>
      </Tip>
      <div className="mx-auto grid max-w-[15rem] grid-cols-3 gap-3 sm:mx-0 sm:max-w-none">
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
            <button
              key={slot}
              type="button"
              onClick={() => setOpenItem(item)}
              className="block w-full"
              aria-label={`פרטי ${meta.label}`}
            >
              <ItemTile
                slug={meta.slug}
                icon={meta.icon}
                level={item.level}
                name={meta.label}
                rarity={uiRarity(item.rarity)}
                details={itemDetails(item, heroLevel, {
                  equipped: true,
                  hint: "לחץ לפרטים",
                })}
              />
            </button>
          );
        })}
      </div>

      {openItem && (
        <ItemDialog
          item={openItem}
          heroLevel={heroLevel}
          gold={gold}
          equipped
          onClose={() => setOpenItem(null)}
        />
      )}
    </div>
  );
}
