"use client";

import { useState } from "react";
import type { HeroRarity } from "@prisma/client";
import { ItemTile, formatBonus } from "@/components/game/ItemTile";
import { catalogKey, itemDetails } from "@/components/game/heroItemView";
import {
  HERO_STAT_META,
  ITEM_DROP_CHANCE,
  ITEM_LEVELS,
  RARITY_META,
  RARITY_ORDER,
  SLOT_META,
  SLOT_ORDER,
  itemBonusPct,
} from "@/lib/game/hero";

/**
 * The complete item catalog: every slot at every level tier (1–100) in every
 * rarity. Tabs pick the rarity; each slot renders its full level progression
 * so the player sees exactly what exists, what they own, and what their hero
 * can already wear.
 */
export function ItemCatalog({
  heroLevel,
  ownedKeys,
  equippedKeys,
}: {
  heroLevel: number;
  /** catalogKey() of every item in the player's possession. */
  ownedKeys: string[];
  equippedKeys: string[];
}) {
  const [rarity, setRarity] = useState<HeroRarity>("COMMON");
  const owned = new Set(ownedKeys);
  const equipped = new Set(equippedKeys);
  const meta = RARITY_META[rarity];

  const totalWeight = RARITY_ORDER.reduce(
    (sum, r) => sum + RARITY_META[r].dropWeight,
    0
  );

  return (
    <div className="space-y-5">
      {/* rarity tabs */}
      <div className="flex flex-wrap gap-2">
        {RARITY_ORDER.map((r) => (
          <button
            key={r}
            onClick={() => setRarity(r)}
            className={`btn px-4 py-2 text-sm ${
              rarity === r ? "btn-gold" : `btn-ghost ${RARITY_META[r].tone}`
            }`}
          >
            {RARITY_META[r].label}
          </button>
        ))}
      </div>

      {/* capture odds — rarer items are harder to loot */}
      <div className="panel-inset rounded-lg p-3 text-xs leading-relaxed text-zinc-400">
        <p>
          🎯 חפצים נלכדים בניצחון בתקיפה (סיכוי{" "}
          <span className="nums text-gold" dir="ltr">
            {Math.round(ITEM_DROP_CHANCE * 100)}%
          </span>
          ללכידה). סיכוי לפי דרגה:{" "}
          {RARITY_ORDER.map((r, i) => (
            <span key={r}>
              {i > 0 && " · "}
              <span className={RARITY_META[r].tone}>
                {RARITY_META[r].label}{" "}
                <span className="nums" dir="ltr">
                  {Math.round((RARITY_META[r].dropWeight / totalWeight) * 100)}%
                </span>
              </span>
            </span>
          ))}
        </p>
        <p className="mt-1">
          🔒 = הגיבור שלך (רמה{" "}
          <span className="nums text-gold-bright" dir="ltr">
            {heroLevel}
          </span>
          ) עדיין לא יכול ללבוש · ✓ = נמצא ברשותך
        </p>
      </div>

      {/* one section per slot, full level progression */}
      {SLOT_ORDER.map((slot) => {
        const slotMeta = SLOT_META[slot];
        const statMeta = HERO_STAT_META[slotMeta.stat];
        const maxBonus = itemBonusPct(slot, 100, rarity);
        return (
          <section key={slot} className="panel rounded-xl p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-gold-bright">
                {slotMeta.icon} {slotMeta.label}{" "}
                <span className={`text-xs font-semibold ${meta.tone}`}>
                  ({meta.label})
                </span>
              </h2>
              <span className="text-[11px] text-zinc-500">
                {statMeta.icon} {statMeta.label} — עד{" "}
                <span className="nums text-emerald-400" dir="ltr">
                  +{formatBonus(maxBonus)}%
                </span>{" "}
                ברמה 100
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7 lg:grid-cols-11">
              {ITEM_LEVELS.map((level) => {
                const key = catalogKey(slot, level, rarity);
                const isOwned = owned.has(key);
                const isEquipped = equipped.has(key);
                return (
                  <div key={level} tabIndex={0} className="outline-none">
                    <ItemTile
                      slug={slotMeta.slug}
                      icon={slotMeta.icon}
                      level={level}
                      rarity={meta.ui}
                      details={itemDetails({ slot, level, rarity }, heroLevel, {
                        owned: isOwned,
                        equipped: isEquipped,
                        hint: isOwned
                          ? undefined
                          : "נלכד בניצחון בתקיפה על שחקן אחר",
                      })}
                      tooltipBelow={level <= ITEM_LEVELS[3]}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
