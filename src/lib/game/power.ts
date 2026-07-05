import type { Army } from "@prisma/client";
import { SOLDIER_POWER } from "./constants";

/**
 * Military power: soldiers only. Spies and mine slaves do not fight.
 */
export function armyPower(army: Pick<Army, "soldiers"> | null): number {
  if (!army) return 0;
  return army.soldiers * SOLDIER_POWER;
}
