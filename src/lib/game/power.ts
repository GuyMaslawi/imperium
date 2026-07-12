import type { Army } from "@prisma/client";
import { SOLDIER_POWER, SPY_POWER } from "./constants";
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
