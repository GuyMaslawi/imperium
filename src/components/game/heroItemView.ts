import type { HeroItemSlot, HeroRarity } from "@prisma/client";
import type { ItemTileDetails, Rarity } from "@/components/game/ItemTile";
import {
  RARITY_META,
  SLOT_META,
  HERO_STAT_META,
  canEquipItem,
  itemBonusValue,
  itemDisplayName,
  itemResourceBreakdown,
  tierForLevel,
} from "@/lib/game/hero";

/**
 * Serializable item row passed from server pages to the client components.
 * `rarity` is the tier derived from `level` (always kept in sync) — kept here
 * so client components can colour/label without re-deriving.
 */
export interface HeroItemView {
  id: string;
  slot: HeroItemSlot;
  level: number;
  rarity: HeroRarity;
}

export function uiRarity(rarity: HeroRarity): Rarity {
  return RARITY_META[rarity].ui;
}

/** UI rarity key straight from a level (tier is derived from level). */
export function uiRarityForLevel(level: number): Rarity {
  return RARITY_META[tierForLevel(level)].ui;
}

/** Identity of a catalog entry (slot × level). */
export function catalogKey(slot: string, level: number): string {
  return `${slot}:${level}`;
}

/** Build the tooltip payload for an item at the given hero level. */
export function itemDetails(
  item: Pick<HeroItemView, "slot" | "level">,
  heroLevel: number,
  extras: Partial<ItemTileDetails> = {}
): ItemTileDetails {
  const statMeta = HERO_STAT_META[SLOT_META[item.slot].stat];
  const bonus = itemBonusValue(item.slot, item.level);
  return {
    name: itemDisplayName(item.slot, item.level),
    rarityLabel: RARITY_META[tierForLevel(item.level)].label,
    statIcon: statMeta.icon,
    statLabel: statMeta.label,
    bonusValue: bonus.value,
    bonusIsFlat: bonus.flat,
    resourceLines: itemResourceBreakdown(item.slot, item.level),
    requiredLevel: item.level,
    meetsRequirement: canEquipItem(heroLevel, item.level),
    ...extras,
  };
}
