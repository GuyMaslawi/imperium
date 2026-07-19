import type { Building } from "@prisma/client";
import { BUILDING_META, mineProductionPerTick } from "./constants";
import { bonusMultiplier } from "./hero";

/** Resources produced by a mine per regular (5-minute) update. */
export function productionPerTick(building: Building): number {
  const meta = BUILDING_META[building.type];
  if (!meta.producedResource) return 0;
  return mineProductionPerTick(building.level, building.slavesAssigned);
}

/** One active bonus contributing to a mine's real production. */
export interface ProductionBonusLine {
  key: "hero-points" | "guild-spell" | "diamond-boost" | "hero-item";
  label: string;
  /** Percent, for the multiplicative bonuses (absent for flat item bonuses). */
  pct?: number;
  /** Extra resources this bonus adds per regular update (incremental). */
  amount: number;
}

export interface MineProductionBreakdown {
  /** Base production per regular update (slaves × per-slave yield). */
  base: number;
  /** Only the bonuses that are currently active (empty when none). */
  lines: ProductionBonusLine[];
  /** Real production per regular update — base plus every active bonus. */
  total: number;
}

/**
 * The real per-update production of one mine, decomposed into the base and each
 * active bonus. Mirrors the settlement math in `applyPendingUpdates` exactly
 * (hero resource points × guild resources spell × diamond boost, then the flat
 * relic amount on top), so the number shown here equals what the game clock
 * actually credits. The percentage bonuses compound, so each line reports its
 * *incremental* contribution (applied in the same order the clock uses).
 */
export function mineProductionBreakdown(params: {
  level: number;
  assignedSlaves: number;
  /** Hero "resources" allocated points, as a percent. */
  heroResourcesPct: number;
  /** Active guild RESOURCES spell, as a percent. */
  guildResourcesPct: number;
  /** Active diamond resource boost for this resource, as a percent. */
  diamondBoostPct: number;
  /** Flat resources per update from an equipped relic covering this resource. */
  heroItemFlat: number;
}): MineProductionBreakdown {
  const base = mineProductionPerTick(params.level, params.assignedSlaves);
  const lines: ProductionBonusLine[] = [];

  const afterHero = base * bonusMultiplier(params.heroResourcesPct);
  if (params.heroResourcesPct > 0 && afterHero - base > 0) {
    lines.push({
      key: "hero-points",
      label: "בונוס גיבור — נקודות משאבים",
      pct: params.heroResourcesPct,
      amount: afterHero - base,
    });
  }

  const afterGuild = afterHero * bonusMultiplier(params.guildResourcesPct);
  if (params.guildResourcesPct > 0 && afterGuild - afterHero > 0) {
    lines.push({
      key: "guild-spell",
      label: "קסם גילדה — משאבים",
      pct: params.guildResourcesPct,
      amount: afterGuild - afterHero,
    });
  }

  const afterDiamond = afterGuild * bonusMultiplier(params.diamondBoostPct);
  if (params.diamondBoostPct > 0 && afterDiamond - afterGuild > 0) {
    lines.push({
      key: "diamond-boost",
      label: "בוסט יהלומים",
      pct: params.diamondBoostPct,
      amount: afterDiamond - afterGuild,
    });
  }

  if (params.heroItemFlat > 0) {
    lines.push({
      key: "hero-item",
      label: "פריט גיבור — פרי שטן",
      amount: params.heroItemFlat,
    });
  }

  return { base, lines, total: afterDiamond + params.heroItemFlat };
}
