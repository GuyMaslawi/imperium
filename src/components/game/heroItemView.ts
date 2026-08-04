import type { HeroItemSlot, HeroRarity } from "@prisma/client";
import { RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import type { ItemTileBonus, ItemTileDetails, Rarity } from "@/components/game/ItemTile";
import {
  RARITY_META,
  HERO_STAT_META,
  canEquipItem,
  itemBonusLines,
  itemDisplayName,
  tierForLevel,
} from "@/lib/game/hero";
import type { T } from "@/i18n/translate";

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

/**
 * Everything an item grants, in the shape the tile renders.
 *
 * Resource lines wear their own resource glyph and tint rather than the generic
 * mine icon, so a relic reads as "gold / wood / iron / stone" the way the rest
 * of the UI spells resources out.
 */
export function itemBonuses(
  t: T,
  slot: HeroItemSlot,
  level: number
): ItemTileBonus[] {
  return itemBonusLines(slot, level).map((line) => ({
    icon: line.resource ? RESOURCE_ICON[line.resource] : HERO_STAT_META[line.stat].icon,
    iconClass: line.resource ? RESOURCE_ICON_COLOR[line.resource] : undefined,
    label: t(line.label, line.labelParams),
    value: line.value,
    flat: line.flat,
    primary: line.primary,
  }));
}

/** Build the tooltip payload for an item at the given hero level. */
export function itemDetails(
  t: T,
  item: Pick<HeroItemView, "slot" | "level">,
  heroLevel: number,
  extras: Partial<ItemTileDetails> = {}
): ItemTileDetails {
  return {
    name: itemDisplayName(t, item.slot, item.level),
    rarityLabel: t(RARITY_META[tierForLevel(item.level)].label),
    bonuses: itemBonuses(t, item.slot, item.level),
    requiredLevel: item.level,
    meetsRequirement: canEquipItem(heroLevel, item.level),
    ...extras,
  };
}
