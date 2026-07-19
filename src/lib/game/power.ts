import type { Army } from "@prisma/client";
import { DEFENSE_BONUS, SOLDIER_POWER, SPY_POWER } from "./constants";
import { bonusMultiplier } from "./hero";
import { weaponsPower, type WeaponQuantityRow } from "./weapons";

/**
 * Military power: soldiers only. Spies and mine slaves do not fight.
 */
export function armyPower(army: Pick<Army, "soldiers"> | null): number {
  if (!army) return 0;
  return army.soldiers * SOLDIER_POWER;
}

/**
 * Intelligence rating from spies alone. Mine slaves and citizens do not
 * contribute to any power value.
 */
export function spiesPower(army: Pick<Army, "spies"> | null): number {
  if (!army) return 0;
  return army.spies * SPY_POWER;
}

/** Attack power: soldiers + attack weapons. */
export function getEmpireAttackPower(
  army: Pick<Army, "soldiers"> | null,
  weapons: readonly WeaponQuantityRow[]
): number {
  return armyPower(army) + weaponsPower(weapons, "ATTACK");
}

/**
 * Base defense power: soldiers + defense weapons.
 * The 20% defender bonus (DEFENSE_BONUS) is applied only during battle
 * resolution and is intentionally NOT included here.
 */
export function getEmpireDefensePower(
  army: Pick<Army, "soldiers"> | null,
  weapons: readonly WeaponQuantityRow[]
): number {
  return armyPower(army) + weaponsPower(weapons, "DEFENSE");
}

/** Intelligence power: spies + spy weapons. */
export function getEmpireSpyPower(
  army: Pick<Army, "spies"> | null,
  weapons: readonly WeaponQuantityRow[]
): number {
  return spiesPower(army) + weaponsPower(weapons, "SPY");
}

/**
 * Military power, as shown in the rankings and the public empire profile:
 * soldiers plus attack and defense weapons (spy weapons excluded, soldiers
 * counted once).
 */
export function getEmpireMilitaryPower(
  army: Pick<Army, "soldiers"> | null,
  weapons: readonly WeaponQuantityRow[]
): number {
  return (
    armyPower(army) +
    weaponsPower(weapons, "ATTACK") +
    weaponsPower(weapons, "DEFENSE")
  );
}

/** One active bonus contributing to a side's real battle power. */
export interface CombatPowerLine {
  key: "defense-bonus" | "hero" | "guild-spell";
  label: string;
  pct: number;
  /** Extra power this bonus adds (incremental, in the same order battle uses). */
  amount: number;
}

export interface CombatPowerBreakdown {
  /** Base power: soldiers + relevant weapons, before any multiplier. */
  base: number;
  /** Only the bonuses currently in effect. */
  lines: CombatPowerLine[];
  /** Real battle power — base plus every multiplier that applies in a fight. */
  total: number;
}

/**
 * The attacker's real attack power, decomposed. Mirrors the battle math in
 * `attackEmpire` exactly: (soldiers + attack weapons) × hero attack % × guild
 * ATTACK spell %. The multipliers compound, so each line is its incremental
 * contribution in battle order.
 */
export function attackPowerBreakdown(params: {
  army: Pick<Army, "soldiers"> | null;
  weapons: readonly WeaponQuantityRow[];
  /** Hero combined attack % (points + items). */
  heroAttackPct: number;
  /** Active guild ATTACK spell %. */
  guildAttackPct: number;
}): CombatPowerBreakdown {
  const base = getEmpireAttackPower(params.army, params.weapons);
  const lines: CombatPowerLine[] = [];

  const afterHero = base * bonusMultiplier(params.heroAttackPct);
  if (params.heroAttackPct > 0 && afterHero - base > 0) {
    lines.push({ key: "hero", label: "בונוס גיבור", pct: params.heroAttackPct, amount: afterHero - base });
  }

  const afterGuild = afterHero * bonusMultiplier(params.guildAttackPct);
  if (params.guildAttackPct > 0 && afterGuild - afterHero > 0) {
    lines.push({ key: "guild-spell", label: "קסם ברית", pct: params.guildAttackPct, amount: afterGuild - afterHero });
  }

  return { base, lines, total: afterGuild };
}

/**
 * The defender's real defense power, decomposed. Mirrors the battle math:
 * (soldiers + defense weapons) × 20% defender bonus × hero defense % × guild
 * DEFENSE spell %. The always-on +20% is shown as its own line so the total
 * reflects what an attacker actually faces.
 */
export function defensePowerBreakdown(params: {
  army: Pick<Army, "soldiers"> | null;
  weapons: readonly WeaponQuantityRow[];
  /** Hero combined defense % (points + items). */
  heroDefensePct: number;
  /** Active guild DEFENSE spell %. */
  guildDefensePct: number;
}): CombatPowerBreakdown {
  const base = getEmpireDefensePower(params.army, params.weapons);
  const lines: CombatPowerLine[] = [];

  const afterDefBonus = base * DEFENSE_BONUS;
  lines.push({
    key: "defense-bonus",
    label: "בונוס מגן",
    pct: Math.round((DEFENSE_BONUS - 1) * 100),
    amount: afterDefBonus - base,
  });

  const afterHero = afterDefBonus * bonusMultiplier(params.heroDefensePct);
  if (params.heroDefensePct > 0 && afterHero - afterDefBonus > 0) {
    lines.push({ key: "hero", label: "בונוס גיבור", pct: params.heroDefensePct, amount: afterHero - afterDefBonus });
  }

  const afterGuild = afterHero * bonusMultiplier(params.guildDefensePct);
  if (params.guildDefensePct > 0 && afterGuild - afterHero > 0) {
    lines.push({ key: "guild-spell", label: "קסם ברית", pct: params.guildDefensePct, amount: afterGuild - afterHero });
  }

  return { base, lines, total: afterGuild };
}

/** General power: attack + defense + intelligence. */
export function getEmpireGeneralPower(
  army: Pick<Army, "soldiers" | "spies"> | null,
  weapons: readonly WeaponQuantityRow[]
): number {
  return (
    getEmpireAttackPower(army, weapons) +
    getEmpireDefensePower(army, weapons) +
    getEmpireSpyPower(army, weapons)
  );
}
