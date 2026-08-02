import "server-only";
import type { HeroClass, Prisma } from "@prisma/client";
import {
  BUILDING_TYPES,
  EMPIRE_UPGRADE_TYPES,
  MINE_START_LEVEL,
  NEWBIE_PROTECTION_MS,
  STORAGE_TYPES,
  isProductionBuilding,
} from "./constants";
import { DEFAULT_TUNABLES, type GameTunables } from "./config";
import { INITIAL_WEAPON_UNLOCKED_TIER, WEAPON_CATEGORIES } from "./weapons";

/**
 * New-player starting balance: enough resources for the first upgrades and
 * a few tier-1 weapons, citizens to train units, turns for several spy (5)
 * and attack (10) actions, and a small working army — spies so spying works
 * immediately, mine slaves (pre-assigned 5 per mine) so production works
 * immediately.
 */
/**
 * Data for creating a fresh empire: starter buildings, an army with a few
 * soldiers, one level-1 warehouse per resource, all empire upgrades at
 * level 1, an empty bank account, and the first two weapon tiers unlocked
 * in every category.
 * Used by registration and by the seed script. The starting bundle is
 * admin-tunable — pass the live tunables (defaults mirror the original
 * hard-coded values).
 */
export function newEmpireData(
  userId: string,
  name: string,
  seasonId?: string,
  starting: GameTunables["starting"] = DEFAULT_TUNABLES.starting,
  heroClass: HeroClass = "WARLORD"
): Prisma.EmpireCreateInput {
  return {
    user: { connect: { id: userId } },
    ...(seasonId ? { season: { connect: { id: seasonId } } } : {}),
    name,
    gold: starting.gold,
    wood: starting.wood,
    iron: starting.iron,
    stone: starting.stone,
    diamonds: starting.diamonds,
    citizens: starting.citizens,
    turns: starting.turns,
    wheelSpins: starting.wheelSpins,
    // Written explicitly (client-side UTC) rather than relying on the DB's
    // CURRENT_TIMESTAMP default, which follows the server timezone and can
    // land "in the future" relative to Prisma-written UTC timestamps.
    reportsSeenAt: new Date(),
    // New-player shield — see NEWBIE_PROTECTION_MS. Cleared early on first attack/spy.
    protectedUntil: new Date(Date.now() + NEWBIE_PROTECTION_MS),
    buildings: {
      create: BUILDING_TYPES.map((type) => ({
        // Every building — mines included — starts built at level 1. Mines used
        // to start at level 0, which yields nothing: a new player assigned
        // slaves, watched the rig animation stay dead and had no way to tell
        // that the mine simply wasn't built yet. Level 1 produces from the
        // first tick, so training and assigning slaves visibly does something.
        type,
        level: isProductionBuilding(type) ? MINE_START_LEVEL : 1,
        slavesAssigned: isProductionBuilding(type) ? starting.slavesPerMine : 0,
      })),
    },
    army: {
      create: {
        soldiers: starting.soldiers,
        spies: starting.spies,
        mineSlaves: starting.mineSlaves,
      },
    },
    storages: {
      create: STORAGE_TYPES.map((resourceType) => ({ resourceType, level: 1 })),
    },
    upgrades: {
      create: EMPIRE_UPGRADE_TYPES.map((type) => ({ type, level: 1 })),
    },
    bankAccount: { create: { goldBalance: 0 } },
    hero: { create: { heroClass } },
    weaponUnlocks: {
      create: WEAPON_CATEGORIES.map((category) => ({
        category,
        unlockedTier: INITIAL_WEAPON_UNLOCKED_TIER,
      })),
    },
    messages: {
      create: [
        {
          kind: "SYSTEM",
          title: "📣 ברוך הבא לקראלדור!",
          body: "האימפריה שלך נוסדה. אמן חיילים, שדרג מכרות ופתח במלחמה — הכל מתחיל בבסיס.",
          href: "/game/base",
        },
      ],
    },
  };
}