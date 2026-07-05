import type { Prisma } from "@prisma/client";
import {
  BUILDING_TYPES,
  EMPIRE_UPGRADE_TYPES,
  STORAGE_TYPES,
  isProductionBuilding,
} from "./constants";
import { INITIAL_WEAPON_UNLOCKED_TIER, WEAPON_CATEGORIES } from "./weapons";

/**
 * New-player starting balance: enough resources for the first upgrades and
 * a few tier-1 weapons, citizens to train units, turns for several spy (5)
 * and attack (10) actions, and a small working army — spies so spying works
 * immediately, mine slaves (pre-assigned 5 per mine) so production works
 * immediately.
 */
const STARTING = {
  gold: 3000,
  wood: 2000,
  iron: 1500,
  stone: 1500,
  diamonds: 10,
  citizens: 60,
  turns: 50,
  soldiers: 10,
  spies: 2,
  mineSlaves: 20,
  slavesPerMine: 5,
} as const;

/**
 * Data for creating a fresh empire: starter buildings, an army with a few
 * soldiers, one level-1 warehouse per resource, all empire upgrades at
 * level 1, an empty bank account, and the first two weapon tiers unlocked
 * in every category.
 * Used by registration and by the seed script.
 */
export function newEmpireData(
  userId: string,
  name: string,
  seasonId?: string
): Prisma.EmpireCreateInput {
  return {
    user: { connect: { id: userId } },
    ...(seasonId ? { season: { connect: { id: seasonId } } } : {}),
    name,
    gold: STARTING.gold,
    wood: STARTING.wood,
    iron: STARTING.iron,
    stone: STARTING.stone,
    diamonds: STARTING.diamonds,
    citizens: STARTING.citizens,
    turns: STARTING.turns,
    buildings: {
      create: BUILDING_TYPES.map((type) => ({
        type,
        level: 1,
        slavesAssigned: isProductionBuilding(type) ? STARTING.slavesPerMine : 0,
      })),
    },
    army: {
      create: {
        soldiers: STARTING.soldiers,
        spies: STARTING.spies,
        mineSlaves: STARTING.mineSlaves,
      },
    },
    storages: {
      create: STORAGE_TYPES.map((resourceType) => ({ resourceType, level: 1 })),
    },
    upgrades: {
      create: EMPIRE_UPGRADE_TYPES.map((type) => ({ type, level: 1 })),
    },
    bankAccount: { create: { goldBalance: 0 } },
    weaponUnlocks: {
      create: WEAPON_CATEGORIES.map((category) => ({
        category,
        unlockedTier: INITIAL_WEAPON_UNLOCKED_TIER,
      })),
    },
  };
}
