import type { HeroItemSlot, HeroRarity } from "@prisma/client";
import type { ItemTileDetails, Rarity } from "@/components/game/ItemTile";
import {
  RARITY_META,
  SLOT_META,
  HERO_STAT_META,
  canEquipItem,
  itemBonusPct,
  itemDisplayName,
} from "@/lib/game/hero";

/** Serializable item row passed from server pages to the client components. */
export interface HeroItemView {
  id: string;
  slot: HeroItemSlot;
  level: number;
  rarity: HeroRarity;
}

export function uiRarity(rarity: HeroRarity): Rarity {
  return RARITY_META[rarity].ui;
}

/** Identity of a catalog entry (slot × level × rarity). */
export function catalogKey(slot: string, level: number, rarity: string): string {
  return `${slot}:${level}:${rarity}`;
}

/** Build the tooltip payload for an item at the given hero level. */
export function itemDetails(
  item: Pick<HeroItemView, "slot" | "level" | "rarity">,
  heroLevel: number,
  extras: Partial<ItemTileDetails> = {}
): ItemTileDetails {
  const slotMeta = SLOT_META[item.slot];
  const statMeta = HERO_STAT_META[slotMeta.stat];
  return {
    name: itemDisplayName(item.slot, item.rarity),
    rarityLabel: RARITY_META[item.rarity].label,
    statIcon: statMeta.icon,
    statLabel: statMeta.label,
    bonusPct: itemBonusPct(item.slot, item.level, item.rarity),
    requiredLevel: item.level,
    meetsRequirement: canEquipItem(heroLevel, item.level),
    ...extras,
  };
}
