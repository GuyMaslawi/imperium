"use client";

import { ItemTile, formatBonus } from "@/components/game/ItemTile";
import { catalogKey, itemDetails, uiRarityForLevel } from "@/components/game/heroItemView";
import {
  HERO_STAT_META,
  ITEM_DROP_CHANCE,
  ITEM_LEVELS,
  RARITY_META,
  RARITY_ORDER,
  SLOT_META,
  SLOT_ORDER,
  itemBonusValue,
} from "@/lib/game/hero";

/**
 * The complete item catalog: every slot at every tier level (1,3,8,10,…,100).
 * An item's tier (its colour and name) is derived from its level — the named
 * series פשוט → מתקדם → אליט → אגדי repeats every 10 levels — so each slot
 * simply renders its full level progression, showing what exists, what the
 * player owns, and what their hero can already wear.
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
  const owned = new Set(ownedKeys);
  const equipped = new Set(equippedKeys);

  return (
    <div className="space-y-5">
      {/* how the tier series works */}
      <div className="panel-inset rounded-lg p-3 text-xs leading-relaxed text-zinc-400">
        <p>
          🎯 חפצים נלכדים בניצחון בתקיפה (סיכוי{" "}
          <span className="nums text-gold" dir="ltr">
            {Math.round(ITEM_DROP_CHANCE * 100)}%
          </span>{" "}
          ללכידה). דרגת החפץ נקבעת לפי הרמה, וחוזרת בכל עשור:{" "}
          {RARITY_ORDER.map((r, i) => (
            <span key={r}>
              {i > 0 && " · "}
              <span className={RARITY_META[r].tone}>{RARITY_META[r].label}</span>
            </span>
          ))}
        </p>
        <p className="mt-1">
          ⬆ שדרוג מעלה את רמת החפץ לדרגה הבאה (וגם את הסטטים) · 🔒 = הגיבור שלך
          (רמה{" "}
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
        const maxBonus = itemBonusValue(slot, 100);
        return (
          <section key={slot} className="panel rounded-xl p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-gold-bright">
                {slotMeta.icon} {slotMeta.label}
              </h2>
              <span className="text-[11px] text-zinc-500">
                {statMeta.icon} {statMeta.label} — עד{" "}
                <span className="nums text-emerald-400" dir="ltr">
                  +{formatBonus(maxBonus.value)}
                  {maxBonus.flat ? "" : "%"}
                </span>{" "}
                ברמה 100
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7 lg:grid-cols-11">
              {ITEM_LEVELS.map((level) => {
                const key = catalogKey(slot, level);
                const isOwned = owned.has(key);
                const isEquipped = equipped.has(key);
                return (
                  <div key={level} tabIndex={0} className="outline-none">
                    <ItemTile
                      slug={slotMeta.slug}
                      icon={slotMeta.icon}
                      level={level}
                      rarity={uiRarityForLevel(level)}
                      details={itemDetails({ slot, level }, heroLevel, {
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
