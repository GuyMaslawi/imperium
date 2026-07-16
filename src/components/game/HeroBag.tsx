"use client";

import { useActionState, useState } from "react";
import type { HeroRarity } from "@prisma/client";
import Link from "next/link";
import { equipHeroItem } from "@/server/actions/hero";
import type { ActionState } from "@/server/actions/game";
import { ItemTile } from "@/components/game/ItemTile";
import { Tip } from "@/components/ui/Tip";
import { HERO_BAG_CAPACITY, RARITY_META, RARITY_ORDER, SLOT_META, canEquipItem } from "@/lib/game/hero";
import { itemDetails, uiRarity, type HeroItemView } from "@/components/game/heroItemView";

/**
 * The hero's bag: unequipped items in a 24-slot grid with rarity filters.
 * Clicking an equippable item wears it (swapping the current slot item back
 * into the bag); locked items show why in the hover tooltip.
 */
export function HeroBag({
  items,
  heroLevel,
}: {
  items: HeroItemView[];
  heroLevel: number;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    equipHeroItem,
    {}
  );
  const [filter, setFilter] = useState<HeroRarity | null>(null);

  const rarityRank = (r: HeroRarity) => RARITY_ORDER.indexOf(r);
  const sorted = [...items].sort(
    (a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.level - a.level
  );
  const visible = filter ? sorted.filter((i) => i.rarity === filter) : sorted;
  const emptySlots = Math.max(0, HERO_BAG_CAPACITY - visible.length);

  return (
    <div className="panel-gold rounded-xl p-4">
      <div className="flex items-center justify-between">
        <Tip tip="חפצים שנלכדו בקרבות וממתינים בתיק. לחיצה על חפץ פנוי לובשת אותו.">
          <h2 className="cursor-help text-base font-bold tracking-wide text-gold-bright">
            התיק
          </h2>
        </Tip>
        <Tip tip="הקטלוג המלא: כל החפצים הקיימים במשחק, מרמה 1 עד 100 בכל הדרגות" side="bottom">
          <Link href="/game/hero/items" className="btn btn-ghost px-3 py-1.5 text-xs">
            לכל הפריטים
          </Link>
        </Tip>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
        <Tip tip={`מקום בתיק: עד ${HERO_BAG_CAPACITY} חפצים. כשהתיק מלא — לא נלכדים חפצים חדשים בקרב!`}>
          <span className="cursor-help">סלוטים</span>
        </Tip>
        <span className="nums" dir="ltr">
          {items.length}/{HERO_BAG_CAPACITY}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-3 sm:grid-cols-6">
        {visible.map((item) => {
          const equippable = canEquipItem(heroLevel, item.level);
          return (
            <form key={item.id} action={formAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <button
                type="submit"
                disabled={!equippable}
                className="block w-full disabled:cursor-not-allowed"
                aria-label={`${SLOT_META[item.slot].label} רמה ${item.level}`}
              >
                <ItemTile
                  slug={SLOT_META[item.slot].slug}
                  icon={SLOT_META[item.slot].icon}
                  level={item.level}
                  rarity={uiRarity(item.rarity)}
                  details={itemDetails(item, heroLevel, {
                    hint: equippable
                      ? "לחץ כדי ללבוש"
                      : `עלה לרמה ${item.level} כדי ללבוש`,
                  })}
                />
              </button>
            </form>
          );
        })}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="panel-inset flex aspect-square items-center justify-center rounded-xl text-zinc-700"
          >
            <span aria-hidden className="text-xl">
              ◇
            </span>
          </div>
        ))}
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

      <div className="rule-gold my-4" />

      {/* rarity filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`btn px-3 py-1.5 text-xs ${
            filter === null ? "btn-gold" : "btn-ghost text-zinc-300"
          }`}
        >
          הכל ({items.length})
        </button>
        {RARITY_ORDER.map((r) => {
          const count = items.filter((i) => i.rarity === r).length;
          return (
            <button
              key={r}
              onClick={() => setFilter(filter === r ? null : r)}
              className={`btn px-3 py-1.5 text-xs ${
                filter === r ? "btn-gold" : `btn-ghost ${RARITY_META[r].tone}`
              }`}
            >
              {RARITY_META[r].label} ({count})
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        חפצים נלכדים בניצחון בתקיפה על שחקנים אחרים — ככל שהחפץ נדיר יותר, כך
        קשה יותר ללכוד אותו.
      </p>
    </div>
  );
}
