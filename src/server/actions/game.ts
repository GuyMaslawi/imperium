"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type {
  BuildingType,
  PotionKind,
  Prisma,
  ResourceStorageType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { isBanned } from "@/lib/ban";
import { awardSeasonPassXp } from "@/server/seasonPassXp";
import { captureSpyIntel } from "@/server/spyIntelCapture";
import { seasonPassSpendUnits } from "@/lib/game/seasonPass";
import { secureRandom } from "@/lib/game/random";
import {
  BUILDING_META,
  cityHeroLevelRequired,
  EMPIRE_UPGRADE_META,
  EMPIRE_UPGRADE_TYPES,
  empireUpgradeMaxLevel,
  MAX_CITIES,
  MINE_MAX_LEVEL,
  PRODUCTION_BUILDING_TYPES,
  RESOURCE_META,
  RESOURCE_TO_MINE,
  STORAGE_META,
  UNIT_META,
  cityCost,
  empireUpgradeCostFor,
  mineUpgradeCost,
  storageCapacityForLevel,
  storageUpgradeCost,
  wheelLuckBonus,
  type StorableResource,
  type UnitKey,
} from "@/lib/game/constants";
import { getTunables } from "@/lib/game/config";
import { applyPendingUpdates, type FullEmpire } from "@/lib/game/updates";
import { grantCitizens } from "@/lib/game/grants";
import { getActiveGuildBuffPct } from "@/lib/game/guildBuffs";
import { getGuildAidBonus } from "@/lib/game/guildAid";
import { sharedGuild } from "@/lib/game/guildAllies";
import { getActiveShields, getShopDiscountPct } from "@/lib/game/diamondEffects";
import { applyShopDiscount } from "@/lib/game/diamondShop";
import { getActivePotionKinds, grantPotion } from "@/lib/game/potionEffects";
import { POTION_DOUBLE, rollPotionDrop } from "@/lib/game/potions";
import { getLiveHappyHour, happyHourFactor } from "@/server/happyHour";
import { armyPower, getEmpireIntelPower } from "@/lib/game/power";
import {
  CITIZENS_PER_LEVEL,
  HERO_BAG_CAPACITY,
  HERO_DAMAGE_PER_LOST_DEFENSE,
  applyHeroXp,
  classXpMultiplier,
  attackWinXp,
  bonusMultiplier,
  damagedHealth,
  defenseWinXp,
  heroBonuses,
  rollItemDrop,
} from "@/lib/game/hero";
import {
  INITIAL_WEAPON_UNLOCKED_TIER,
  MAX_WEAPON_TIER,
  WEAPON_CATEGORIES,
  weaponByKey,
  weaponGateStatus,
  weaponTierUnlockCost,
  weaponsPower,
} from "@/lib/game/weapons";
import type { ActiveEmpireUpgradeType } from "@/lib/game/constants";
import { logError } from "@/server/errorLog";
import { syncEmpirePower } from "@/server/empirePower";

export interface ActionState {
  error?: string;
  success?: string;
}

/**
 * Error for a failed cost check: if any lacking resource has protected
 * stock in its warehouse, point the player at withdrawing it.
 */
function insufficientResourcesError(
  empire: FullEmpire,
  cost: Record<StorableResource, number>,
  fallback: string
): string {
  const canWithdrawToCover = empire.storages.some((storage) => {
    const key = STORAGE_META[storage.resourceType].resourceKey;
    return empire[key] < cost[key] && storage.storedAmount > 0;
  });
  return canWithdrawToCover
    ? "אין מספיק משאבים זמינים. ניתן למשוך משאבים מהמחסן."
    : fallback;
}

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

function revalidateGame() {
  revalidatePath("/game", "layout");
}

/* ------------------------------ upgrade mine ------------------------------ */

const resourceSchema = z.enum(["gold", "wood", "iron", "stone"]);

export async function upgradeMine(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resourceSchema.safeParse(formData.get("resource"));
  if (!parsed.success) return { error: "סוג משאב לא תקין" };
  const type: BuildingType = RESOURCE_TO_MINE[parsed.data];

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const building = empire.buildings.find((b) => b.type === type);
      if (!building) return { error: "המכרה לא נמצא" };
      if (building.level >= MINE_MAX_LEVEL) {
        return { error: "המכרה כבר ברמה המקסימלית" };
      }

      const discountPct = await getShopDiscountPct(empireId, tx);
      const cost = applyShopDiscount(
        mineUpgradeCost(building.level, parsed.data),
        discountPct
      );
      if (
        empire.gold < cost.gold ||
        empire.wood < cost.wood ||
        empire.iron < cost.iron ||
        empire.stone < cost.stone
      ) {
        return {
          error: insufficientResourcesError(empire, cost, "אין מספיק משאבים לשדרוג"),
        };
      }

      // Guarded debit: the `gte` conditions make the decrement atomic so two
      // concurrent upgrades can never drive resources negative or double-apply.
      const paid = await tx.empire.updateMany({
        where: {
          id: empireId,
          gold: { gte: cost.gold },
          wood: { gte: cost.wood },
          iron: { gte: cost.iron },
          stone: { gte: cost.stone },
        },
        data: {
          gold: { decrement: cost.gold },
          wood: { decrement: cost.wood },
          iron: { decrement: cost.iron },
          stone: { decrement: cost.stone },
        },
      });
      if (paid.count === 0) {
        return {
          error: insufficientResourcesError(empire, cost, "אין מספיק משאבים לשדרוג"),
        };
      }
      // Guarded on the exact level the price was quoted from, so two concurrent
      // upgrades cannot both buy the same level; throwing rolls the payment back.
      //
      // The resource debit above only serialises racers on the Empire row — it
      // does not stop each of them applying an unconditional `increment: 1`
      // here. Because mineUpgradeCost rises with the level, N concurrent calls
      // used to buy N levels at the snapshot price (50 racers took a mine from
      // level 0 to 50 for 37.5k gold instead of 956k), and the `MINE_MAX_LEVEL`
      // check above — read from the same snapshot — could be raced straight
      // past. Nothing downstream clamps `mineProductionValue`, so overshooting
      // the cap was a permanent uncapped resource faucet.
      const upgraded = await tx.building.updateMany({
        where: {
          id: building.id,
          level: building.level,
        },
        data: { level: { increment: 1 } },
      });
      if (upgraded.count === 0) throw new Error("mine upgrade conflict");
      await awardSeasonPassXp(tx, empireId, "mineUpgrade");

      return {
        success: `${BUILDING_META[type].label} שודרג לרמה ${building.level + 1}!`,
      };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("game.upgradeMine", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* --------------------------- upgrade mine to max --------------------------- */

export async function upgradeMineToMax(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resourceSchema.safeParse(formData.get("resource"));
  if (!parsed.success) return { error: "סוג משאב לא תקין" };
  const type: BuildingType = RESOURCE_TO_MINE[parsed.data];

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const building = empire.buildings.find((b) => b.type === type);
      if (!building) return { error: "המכרה לא נמצא" };
      if (building.level >= MINE_MAX_LEVEL) {
        return { error: "המכרה כבר ברמה המקסימלית" };
      }

      const discountPct = await getShopDiscountPct(empireId, tx);

      // Walk from the current level upward, accumulating the cost of each
      // affordable level until the empire runs out of any resource or hits the
      // cap. We debit the summed cost and bump the level in a single write so
      // the whole "upgrade to max" is one atomic, guarded transaction.
      let levels = 0;
      const total = { gold: 0, wood: 0, iron: 0, stone: 0 };
      let gold = empire.gold;
      let wood = empire.wood;
      let iron = empire.iron;
      let stone = empire.stone;
      for (let lvl = building.level; lvl < MINE_MAX_LEVEL; lvl++) {
        const cost = applyShopDiscount(
          mineUpgradeCost(lvl, parsed.data),
          discountPct
        );
        if (
          gold < cost.gold ||
          wood < cost.wood ||
          iron < cost.iron ||
          stone < cost.stone
        ) {
          break;
        }
        gold -= cost.gold;
        wood -= cost.wood;
        iron -= cost.iron;
        stone -= cost.stone;
        total.gold += cost.gold;
        total.wood += cost.wood;
        total.iron += cost.iron;
        total.stone += cost.stone;
        levels++;
      }

      if (levels === 0) {
        const cost = applyShopDiscount(
          mineUpgradeCost(building.level, parsed.data),
          discountPct
        );
        return {
          error: insufficientResourcesError(empire, cost, "אין מספיק משאבים לשדרוג"),
        };
      }

      // Guarded debit: the `gte` conditions keep the summed decrement atomic so
      // concurrent upgrades can never drive resources negative or double-apply.
      const paid = await tx.empire.updateMany({
        where: {
          id: empireId,
          gold: { gte: total.gold },
          wood: { gte: total.wood },
          iron: { gte: total.iron },
          stone: { gte: total.stone },
        },
        data: {
          gold: { decrement: total.gold },
          wood: { decrement: total.wood },
          iron: { decrement: total.iron },
          stone: { decrement: total.stone },
        },
      });
      if (paid.count === 0) {
        const cost = applyShopDiscount(
          mineUpgradeCost(building.level, parsed.data),
          discountPct
        );
        return {
          error: insufficientResourcesError(empire, cost, "אין מספיק משאבים לשדרוג"),
        };
      }
      // Guarded on the level the whole plan was costed from — see upgradeMine
      // for why the resource debit alone is not enough. Throwing rolls back the
      // payment so a losing racer is charged nothing.
      const upgraded = await tx.building.updateMany({
        where: {
          id: building.id,
          level: building.level,
        },
        data: { level: { increment: levels } },
      });
      if (upgraded.count === 0) throw new Error("mine upgrade conflict");
      // Pay per level so bulk-upgrading isn't worse than clicking one at a
      // time, but cap it — an unbounded run to MINE_MAX_LEVEL would clear the
      // whole season-pass ladder in a single click.
      await awardSeasonPassXp(tx, empireId, "mineUpgrade", Math.min(levels, 5));

      return {
        success: `${BUILDING_META[type].label} שודרג לרמה ${building.level + levels}!`,
      };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("game.upgradeMineToMax", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ assign mine slaves ------------------------------ */

/**
 * Write a full assignment map (mine type -> slaves) inside a transaction,
 * after validating it against the empire's total mine slaves.
 */
async function applyAssignments(
  empireId: string,
  compute: (
    totalSlaves: number,
    current: Map<BuildingType, number>
  ) => Map<BuildingType, number> | { error: string }
): Promise<ActionState & { assigned?: Map<BuildingType, number> }> {
  return prisma.$transaction(async (tx) => {
    // Serialize concurrent assignments for this empire. Each mine's slave count
    // is read here and written unguarded below; a single-mine assignment keeps
    // the *stale* read of the other three mines. Without this lock, two
    // overlapping assignments to different mines each validate sum≤total against
    // stale siblings and both commit — leaving sum(slavesAssigned) > mineSlaves,
    // i.e. permanent free production. The row lock forces the second to re-read
    // fresh values after the first commits (mirrors attackEmpire's lock).
    await tx.$queryRaw`SELECT id FROM "Empire" WHERE id = ${empireId} FOR UPDATE`;

    const empire = await applyPendingUpdates(empireId, tx);
    const totalSlaves = empire.army?.mineSlaves ?? 0;

    const mines = empire.buildings.filter((b) =>
      (PRODUCTION_BUILDING_TYPES as readonly BuildingType[]).includes(b.type)
    );
    const current = new Map<BuildingType, number>(
      mines.map((b) => [b.type, b.slavesAssigned])
    );

    const next = compute(totalSlaves, current);
    if (!(next instanceof Map)) return next;

    let sum = 0;
    for (const amount of next.values()) {
      if (amount < 0 || !Number.isInteger(amount)) {
        return { error: "כמות עבדי מכרות לא תקינה" };
      }
      sum += amount;
    }
    if (sum > totalSlaves) {
      return {
        error: `אין מספיק עבדי מכרות (סה"כ עבדי מכרות: ${totalSlaves})`,
      };
    }

    for (const mine of mines) {
      const amount = next.get(mine.type);
      if (amount === undefined || amount === mine.slavesAssigned) continue;
      await tx.building.update({
        where: { id: mine.id },
        data: { slavesAssigned: amount },
      });
    }

    return { assigned: next };
  });
}

export async function assignMineSlavesToResource(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = z
    .object({
      resource: resourceSchema,
      amount: z.coerce.number().int().min(0).max(1_000_000),
    })
    .safeParse({
      resource: formData.get("resource"),
      amount: formData.get("amount"),
    });
  if (!parsed.success) return { error: "כמות עבדי מכרות לא תקינה" };
  const { resource, amount } = parsed.data;
  const mineType = RESOURCE_TO_MINE[resource];

  try {
    const empireId = await requireOwnEmpireId();
    const result = await applyAssignments(empireId, (totalSlaves, current) => {
      const next = new Map(current);
      next.set(mineType, amount);
      let sum = 0;
      for (const value of next.values()) sum += value;
      if (sum > totalSlaves) {
        const available =
          totalSlaves - (sum - amount);
        return {
          error: `אין מספיק עבדי מכרות פנויים (ניתן להציב כאן עד ${Math.max(0, available)})`,
        };
      }
      return next;
    });
    if (result.error) return { error: result.error };

    revalidateGame();
    return {
      success: `הוצבו ${amount} עבדי מכרות ב${BUILDING_META[mineType].label}`,
    };
  } catch (err) {
    await logError("game.assignMineSlavesToResource", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

export async function assignAllMineSlavesToResource(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resourceSchema.safeParse(formData.get("resource"));
  if (!parsed.success) return { error: "סוג משאב לא תקין" };
  const resource: StorableResource = parsed.data;
  const mineType = RESOURCE_TO_MINE[resource];

  try {
    const empireId = await requireOwnEmpireId();
    let total = 0;
    const result = await applyAssignments(empireId, (totalSlaves) => {
      total = totalSlaves;
      const next = new Map<BuildingType, number>(
        PRODUCTION_BUILDING_TYPES.map((type) => [type, 0])
      );
      next.set(mineType, totalSlaves);
      return next;
    });
    if (result.error) return { error: result.error };

    revalidateGame();
    return {
      success: `כל ${total} עבדי המכרות הוצבו ב${RESOURCE_META[resource].label}`,
    };
  } catch (err) {
    await logError("game.assignAllMineSlavesToResource", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

export async function splitMineSlavesEqually(): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();
    const result = await applyAssignments(empireId, (totalSlaves) => {
      const base = Math.floor(totalSlaves / PRODUCTION_BUILDING_TYPES.length);
      let remainder = totalSlaves % PRODUCTION_BUILDING_TYPES.length;
      const next = new Map<BuildingType, number>();
      // Remainder goes to GOLD, WOOD, IRON, STONE — in that order.
      for (const type of PRODUCTION_BUILDING_TYPES) {
        next.set(type, base + (remainder > 0 ? 1 : 0));
        remainder--;
      }
      return next;
    });
    if (result.error) return { error: result.error };

    revalidateGame();
    return { success: "עבדי המכרות חולקו שווה בשווה בין ארבעת המשאבים" };
  } catch (err) {
    await logError("game.splitMineSlavesEqually", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

export async function clearMineSlaveAssignments(): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();
    const result = await applyAssignments(empireId, () => {
      return new Map<BuildingType, number>(
        PRODUCTION_BUILDING_TYPES.map((type) => [type, 0])
      );
    });
    if (result.error) return { error: result.error };

    revalidateGame();
    return { success: "החלוקה נוקתה — כל עבדי המכרות פנויים" };
  } catch (err) {
    await logError("game.clearMineSlaveAssignments", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ train units ------------------------------ */

const trainSchema = z.object({
  unit: z.enum(["soldiers", "spies", "mineSlaves"]),
  quantity: z.coerce.number().int().min(1).max(100_000),
});

export async function trainUnits(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = trainSchema.safeParse({
    unit: formData.get("unit"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { error: "כמות לא תקינה" };
  const unit: UnitKey = parsed.data.unit;
  const quantity = parsed.data.quantity;

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const meta = UNIT_META[unit];

      if (unit === "spies") {
        const spyCenter = empire.buildings.find((b) => b.type === "SPY_CENTER");
        if (!spyCenter || spyCenter.level < 1) {
          return { error: "נדרש מרכז מודיעין כדי להכשיר מרגלים" };
        }
      }

      // Training is free of resources — each unit converts one citizen.
      // The guarded update means a concurrent training action can never
      // drive the citizen count negative.
      const citizensNeeded = meta.citizenCost * quantity;
      const debited = await tx.empire.updateMany({
        where: { id: empireId, citizens: { gte: citizensNeeded } },
        data: { citizens: { decrement: citizensNeeded } },
      });
      if (debited.count === 0) {
        return { error: "אין מספיק אזרחים פנויים לאימון" };
      }
      await tx.army.upsert({
        where: { empireId },
        create: { empireId, [unit]: quantity },
        update: { [unit]: { increment: quantity } },
      });
      await syncEmpirePower(tx, empireId);
      await awardSeasonPassXp(
        tx,
        empireId,
        "trainUnits",
        seasonPassSpendUnits("trainUnits", citizensNeeded)
      );

      return { success: `אומנו ${quantity} ${meta.labelPlural} בהצלחה!` };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("game.trainUnits", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ spy ------------------------------ */

const targetSchema = z.object({ targetEmpireId: z.string().min(1) });

/**
 * Deduct the turn cost of an aggressive action inside its transaction.
 * The guarded update means a concurrent action can never drive turns
 * negative; returns false when the empire lacks enough turns.
 */
async function spendTurns(
  tx: Prisma.TransactionClient,
  empireId: string,
  cost: number
): Promise<boolean> {
  const updated = await tx.empire.updateMany({
    where: { id: empireId, turns: { gte: cost } },
    data: { turns: { decrement: cost } },
  });
  return updated.count > 0;
}

/**
 * Why a target may not be attacked or spied: it still holds a new-player shield,
 * or its owner is banned (a banned/dormant account must not be farmable). Returns
 * a user-facing reason, or null when the target is fair game.
 */
async function targetBlockedReason(
  tx: Prisma.TransactionClient,
  target: { id: string; protectedUntil: Date | null },
  now: Date
): Promise<string | null> {
  if (target.protectedUntil && target.protectedUntil > now) {
    return "האימפריה הזו מוגנת (שחקן חדש) — לא ניתן לתקוף או לרגל אותה עדיין.";
  }
  const owner = await tx.empire.findUnique({
    where: { id: target.id },
    select: { user: { select: { bannedAt: true, bannedUntil: true } } },
  });
  if (owner && isBanned(owner.user, now)) return "האימפריה הזו אינה זמינה.";
  return null;
}

/**
 * Launching an offensive action (attack or spy) ends the actor's own new-player
 * shield — you can't scout or raid from behind protection. No-op once expired.
 */
async function dropOwnShield(
  tx: Prisma.TransactionClient,
  empireId: string,
  attacker: { protectedUntil: Date | null },
  now: Date
): Promise<void> {
  if (attacker.protectedUntil && attacker.protectedUntil > now) {
    await tx.empire.update({
      where: { id: empireId },
      data: { protectedUntil: null },
    });
  }
}

export async function spyOnEmpire(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = targetSchema.safeParse({
    targetEmpireId: formData.get("targetEmpireId"),
  });
  if (!parsed.success) return { error: "יעד לא תקין" };
  const { targetEmpireId } = parsed.data;

  let outcome: { error: string } | { reportId: string };
  try {
    const empireId = await requireOwnEmpireId();
    if (empireId === targetEmpireId) {
      return { error: "לא ניתן לרגל אחרי האימפריה שלך" };
    }

    // Read before the transaction opens. `getTunables` goes to the database on a
    // connection of its own, so asking for it *inside* a transaction means one
    // caller holding a connection while waiting for a second — and on a serverless
    // fleet with a small pool, a burst can end up with every connection held by a
    // transaction waiting for one that will never be freed. It is React-cached per
    // request, so hoisting it costs nothing.
    const { spyTurnCost: SPY_TURN_COST } = (await getTunables()).battle;

    outcome = await prisma.$transaction(async (tx) => {
      const attacker = await applyPendingUpdates(empireId, tx);
      if (!attacker.army || attacker.army.spies < 1) {
        return { error: "נדרש לפחות מרגל אחד למשימת ריגול" };
      }
      if (attacker.turns < SPY_TURN_COST) {
        return { error: "אין לך מספיק תורות לביצוע ריגול." };
      }

      const defender = await applyPendingUpdates(targetEmpireId, tx).catch(
        () => null
      );
      if (!defender) return { error: "האימפריה המבוקשת לא נמצאה" };

      // You may only operate against empires in your own city — an empire is
      // "in your city" when it holds the same number of cities as you.
      if (defender.cities !== attacker.cities) {
        return { error: "לא ניתן לרגל אחר אימפריה שאינה בעיר שלך." };
      }

      // Shielded newcomers and banned accounts are off-limits.
      const now = new Date();
      const blocked = await targetBlockedReason(tx, defender, now);
      if (blocked) return { error: blocked };

      // All validations passed — the mission launches, so it costs turns
      // whether the spy succeeds or fails.
      if (!(await spendTurns(tx, empireId, SPY_TURN_COST))) {
        return { error: "אין לך מספיק תורות לביצוע ריגול." };
      }
      // Acting aggressively drops your own new-player shield.
      await dropOwnShield(tx, empireId, attacker, now);

      // Spy missions resolve deterministically: the attacker's intelligence
      // power against the defender's. Both sides scale their raw spy power
      // (spies + spy weapons) by their own intelligence upgrade (+10%/level).
      // The attacker additionally gets its hero spy % and active guild spy
      // spell as percentage-point bonuses. Strictly-greater wins — a tie fails.
      const attackerIntelLevel =
        attacker.upgrades.find((u) => u.type === "INTELLIGENCE")?.level ?? 1;
      const defenderIntelLevel =
        defender.upgrades.find((u) => u.type === "INTELLIGENCE")?.level ?? 1;
      const guildSpyBonusPct = await getActiveGuildBuffPct(empireId, "SPY", tx);
      const heroSpyBonusPct = heroBonuses(attacker.hero).totalPct.spy;
      const attackerIntel = getEmpireIntelPower(
        attacker.army,
        attacker.weapons,
        attackerIntelLevel,
        guildSpyBonusPct + heroSpyBonusPct
      );
      const defenderIntel = getEmpireIntelPower(
        defender.army,
        defender.weapons,
        defenderIntelLevel
      );
      const success = attackerIntel > defenderIntel;

      // A spy who gets out brings back the whole city, not a headline: coffers,
      // vaults, the bank ledger, the arsenal, the mines, the upgrades, the hero
      // and every timed spell with the hour it runs out. Captured as a frozen
      // snapshot on the report (see lib/game/spyIntel.ts) so re-opening the
      // report tomorrow shows what the spy saw, not today's live numbers.
      const revealed = success
        ? await captureSpyIntel(tx, defender, now, defenderIntel)
        : undefined;

      const report = await tx.spyReport.create({
        data: {
          attackerEmpireId: empireId,
          defenderEmpireId: targetEmpireId,
          success,
          attackerIntel,
          defenderIntel,
          guildBonus: guildSpyBonusPct,
          turnsSpent: SPY_TURN_COST,
          ...(success
            ? {
                // The flat columns stay the report's index: the reports table
                // and the profile card read them without parsing the dossier.
                revealedGold: Math.floor(defender.gold),
                revealedWood: Math.floor(defender.wood),
                revealedIron: Math.floor(defender.iron),
                revealedStone: Math.floor(defender.stone),
                revealedSoldiers: defender.army?.soldiers ?? 0,
                revealedSpies: defender.army?.spies ?? 0,
                revealedMineSlaves: defender.army?.mineSlaves ?? 0,
                revealed,
              }
            : {}),
        },
      });

      if (!success) {
        // A failed mission costs the captured spy. Guarded so a concurrent
        // failure can never drive the spy count negative.
        await tx.army.updateMany({
          where: { empireId, spies: { gte: 1 } },
          data: { spies: { decrement: 1 } },
        });
        await syncEmpirePower(tx, empireId);
        // A caught spy blows the operation — the defender gets an alert.
        await tx.message.create({
          data: {
            empireId: targetEmpireId,
            kind: "SPY",
            title: "🕵️ מרגל נתפס בשטחך!",
            body: `כוחות הביטחון שלך תפסו מרגל של ${attacker.name} לפני שהספיק לאסוף מידע.`,
          },
        });
      }

      // The mission ran — go to the full result page whether it succeeded
      // or the spy was caught. Either way it cost turns, so it earns pass XP.
      await awardSeasonPassXp(tx, empireId, "spy");
      return { reportId: report.id };
    });

    revalidateGame();
  } catch (err) {
    await logError("game.spyOnEmpire", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }

  if ("error" in outcome) return outcome;
  // redirect() throws NEXT_REDIRECT — must run outside the try/catch above.
  redirect(`/game/spy/${outcome.reportId}`);
}

/* ------------------------------ attack ------------------------------ */

export async function attackEmpire(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = targetSchema.safeParse({
    targetEmpireId: formData.get("targetEmpireId"),
  });
  if (!parsed.success) return { error: "יעד לא תקין" };
  const { targetEmpireId } = parsed.data;

  let outcome: { error: string } | { reportId: string };
  try {
    const empireId = await requireOwnEmpireId();
    if (empireId === targetEmpireId) {
      return { error: "לא ניתן לתקוף את האימפריה שלך" };
    }

    // Hoisted above the transaction for the reason spelled out in spyOnEmpire —
    // and it matters most here, because this transaction holds locks on *two*
    // empire rows. A caller blocked waiting for a second connection while sitting
    // on two row locks is the worst version of that stall: it takes other players'
    // battles down with it, not just its own.
    const {
      attackTurnCost: ATTACK_TURN_COST,
      defenseBonus: DEFENSE_BONUS,
      plunderRate: PLUNDER_RATE,
      enslaveRate: ENSLAVE_RATE,
      enslaveMinSoldiers: ENSLAVE_MIN_SOLDIERS,
    } = (await getTunables()).battle;

    outcome = await prisma.$transaction(async (tx) => {
      // Serialize concurrent battles that involve either empire. The army
      // decrements and hero level-up / citizen grants below read a snapshot and
      // then apply unguarded increments/decrements, so without this two
      // simultaneous attacks on the same defender could drive its soldiers
      // negative or double-credit level-up citizens/XP. Locking both empire rows
      // up front — ordered by id so A→B and B→A can't deadlock — forces the
      // second attack to re-read fresh values after the first commits.
      const [lockLo, lockHi] = [empireId, targetEmpireId].sort();
      await tx.$queryRaw`SELECT id FROM "Empire" WHERE id IN (${lockLo}, ${lockHi}) FOR UPDATE`;

      const attacker = await applyPendingUpdates(empireId, tx);
      if (attacker.turns < ATTACK_TURN_COST) {
        return { error: "אין לך מספיק תורות לביצוע תקיפה." };
      }

      const defender = await applyPendingUpdates(targetEmpireId, tx).catch(
        () => null
      );
      if (!defender) return { error: "האימפריה המבוקשת לא נמצאה" };

      // Allies don't raid each other. Checked before the city gate so a
      // guildmate hears the real reason, and inside the transaction so leaving
      // the guild and swinging can't both count.
      const allied = await sharedGuild(empireId, targetEmpireId, tx);
      if (allied) {
        return {
          error: `לא ניתן לתקוף חבר לברית — שניכם בברית ${allied.name}.`,
        };
      }

      // Combat is confined to your own city — an empire is "in your city" when
      // it holds the same number of cities as you.
      if (defender.cities !== attacker.cities) {
        return { error: "לא ניתן לתקוף אימפריה שאינה בעיר שלך." };
      }

      // Shielded newcomers and banned accounts can't be attacked.
      const now = new Date();
      const blocked = await targetBlockedReason(tx, defender, now);
      if (blocked) return { error: blocked };

      // Potions in force on either side. Each is an hour in which one rule of
      // the battle is bent: the attacker's XP or plunder doubled, or the
      // defender's hero walking away from a breach without a scratch. Read once
      // here, after both empire rows are locked, so the whole battle resolves
      // against one consistent view of who is buffed.
      const attackerPotions = await getActivePotionKinds(empireId, tx, now);
      const defenderPotions = await getActivePotionKinds(targetEmpireId, tx, now);

      // Happy Hour — the same window, for everyone on the map at once. Read here
      // alongside the potions and applied the same way: a multiplier on the XP
      // and on the plunder rate, stacking with whatever the two sides already
      // had running rather than replacing it.
      const happyHour = await getLiveHappyHour(tx, now);

      // Paid raid shields, read under the same locks for the same reason. They
      // don't stop the raid — the battle resolves, the hero takes his blow and
      // the attacker still earns XP and loot rolls — they only put the
      // defender's property out of reach: no plunder, no enslavement.
      const defenderShields = await getActiveShields(targetEmpireId, tx, now);
      const resourceShielded = defenderShields.resources !== null;
      const soldierShielded = defenderShields.soldiers !== null;

      const attackerArmy = attacker.army;
      const defenderArmy = defender.army;

      if (!attackerArmy || attackerArmy.soldiers === 0) {
        return { error: "אין לך צבא לתקיפה — אמן חיילים קודם" };
      }

      // All validations passed — the attack launches, so it costs turns
      // whether the attacker wins or loses.
      if (!(await spendTurns(tx, empireId, ATTACK_TURN_COST))) {
        return { error: "אין לך מספיק תורות לביצוע תקיפה." };
      }
      // Acting aggressively drops your own new-player shield.
      await dropOwnShield(tx, empireId, attacker, now);

      // Soldiers plus weapons fight: attack weapons boost the attacker,
      // defense weapons boost the defender, and the defender still gets
      // +20% on top of everything. Each hero then multiplies its side by
      // its attack/defense bonus (1 point / item % = +1%), and an active
      // guild spell (attack for the attacker, defense for the defender)
      // multiplies it once more.
      const attackerHero = attacker.hero;
      const defenderHero = defender.hero;
      const attackerHeroBonusPct = heroBonuses(attackerHero).totalPct.attack;
      const defenderHeroBonusPct = heroBonuses(defenderHero).totalPct.defense;
      const attackerGuildBonusPct = await getActiveGuildBuffPct(
        empireId,
        "ATTACK",
        tx
      );
      const defenderGuildBonusPct = await getActiveGuildBuffPct(
        targetEmpireId,
        "DEFENSE",
        tx
      );
      // Passive guild aid: each side's guild reinforces the fighter with a
      // flat power equal to a % of the guild's total power, added after every
      // own-troop multiplier.
      const attackerGuildAid = await getGuildAidBonus(empireId, tx);
      const defenderGuildAid = await getGuildAidBonus(targetEmpireId, tx);
      const attackerSoldiersPower = armyPower(attackerArmy);
      const attackerWeaponsPower = weaponsPower(attacker.weapons, "ATTACK");
      const defenderSoldiersPower = armyPower(defenderArmy);
      const defenderWeaponsPower = weaponsPower(defender.weapons, "DEFENSE");
      const attackerPower =
        (attackerSoldiersPower + attackerWeaponsPower) *
          bonusMultiplier(attackerHeroBonusPct) *
          bonusMultiplier(attackerGuildBonusPct) +
        attackerGuildAid.power;
      const defenderPower =
        (defenderSoldiersPower + defenderWeaponsPower) *
          DEFENSE_BONUS *
          bonusMultiplier(defenderHeroBonusPct) *
          bonusMultiplier(defenderGuildBonusPct) +
        defenderGuildAid.power;
      const attackerWins = attackerPower > defenderPower;
      const winnerEmpireId = attackerWins ? attacker.id : defender.id;

      // Player-vs-player battles cost no lives: neither side loses soldiers,
      // win or lose. Armies only die marching on a city boss (bossFight.ts),
      // so the whole risk of a raid is the turns — and, for the defender, the
      // plunder and the enslavement below.
      const attackerSoldiersLost = 0;
      const defenderSoldiersLost = 0;

      // Enslavement: a winning attack against a defender fielding 20+
      // soldiers captures a share of them. The haul scales with the
      // defender's army size and joins the attacker's free mine-slave pool
      // (not citizens).
      // …unless מגן חיילים is up, in which case not one of them changes hands.
      const enslavedSoldiers =
        attackerWins &&
        !soldierShielded &&
        defenderArmy &&
        defenderArmy.soldiers >= ENSLAVE_MIN_SOLDIERS
          ? Math.min(
              defenderArmy.soldiers,
              Math.max(1, Math.floor(defenderArmy.soldiers * ENSLAVE_RATE))
            )
          : 0;

      // Plunder touches only the defender's available balances — resources
      // deposited in warehouses (storedAmount) are protected from attacks.
      // שיקוי השפע doubles the attacker's share; the live clamp below still
      // caps the haul at what the defender actually holds.
      // Happy Hour multiplies it further, for everyone at once. Capped at 1: with
      // a ×10 window and a potion up the raw rate runs past 100%, and a haul
      // that claims to take more than the defender owns is a lie the clamp
      // below silently corrects — better to say "everything" and mean it.
      const plunderRate = Math.min(
        1,
        PLUNDER_RATE *
          (attackerPotions.has("DOUBLE_RESOURCES") ? POTION_DOUBLE : 1) *
          happyHourFactor(happyHour, "boostPlunder")
      );
      // מגן משאבים zeroes the haul outright — the raid is won, the vaults hold.
      const stolen =
        attackerWins && !resourceShielded
          ? {
              gold: Math.floor(defender.gold * plunderRate),
              wood: Math.floor(defender.wood * plunderRate),
              iron: Math.floor(defender.iron * plunderRate),
              stone: Math.floor(defender.stone * plunderRate),
            }
          : { gold: 0, wood: 0, iron: 0, stone: 0 };

      // Only the enslaved change hands — no casualties to write on either side.
      if (enslavedSoldiers > 0) {
        await tx.army.update({
          where: { empireId },
          // Captured defenders arrive as unassigned mine slaves.
          data: { mineSlaves: { increment: enslavedSoldiers } },
        });
        await tx.army.update({
          where: { empireId: targetEmpireId },
          data: { soldiers: { decrement: enslavedSoldiers } },
        });
        // Only the defender's fighting strength moved — the attacker gained
        // mine slaves, which no power figure counts — but both are synced so
        // the rule stays "any army write re-syncs", with no exceptions to
        // remember.
        await syncEmpirePower(tx, empireId);
        await syncEmpirePower(tx, targetEmpireId);
      }

      // A shielded defender skips the whole transfer — with every figure at
      // zero there is nothing to clamp, debit or credit.
      if (attackerWins && !resourceShielded) {
        // Re-read the defender's live balances inside the transaction and clamp
        // the plunder to what is actually available, so overlapping attacks on
        // the same defender can never drive it negative or mint resources for
        // the attacker that were not truly removed.
        const live = await tx.empire.findUnique({
          where: { id: targetEmpireId },
          select: { gold: true, wood: true, iron: true, stone: true },
        });
        stolen.gold = Math.min(stolen.gold, Math.max(0, Math.floor(live?.gold ?? 0)));
        stolen.wood = Math.min(stolen.wood, Math.max(0, Math.floor(live?.wood ?? 0)));
        stolen.iron = Math.min(stolen.iron, Math.max(0, Math.floor(live?.iron ?? 0)));
        stolen.stone = Math.min(stolen.stone, Math.max(0, Math.floor(live?.stone ?? 0)));

        // Guarded debit: only remove what is still present at write time; if a
        // concurrent attack already drained it, `count === 0` and we credit
        // nothing rather than duplicating resources.
        const looted = await tx.empire.updateMany({
          where: {
            id: targetEmpireId,
            gold: { gte: stolen.gold },
            wood: { gte: stolen.wood },
            iron: { gte: stolen.iron },
            stone: { gte: stolen.stone },
          },
          data: {
            gold: { decrement: stolen.gold },
            wood: { decrement: stolen.wood },
            iron: { decrement: stolen.iron },
            stone: { decrement: stolen.stone },
          },
        });
        if (looted.count === 0) {
          stolen.gold = 0;
          stolen.wood = 0;
          stolen.iron = 0;
          stolen.stone = 0;
        }
        await tx.empire.update({
          where: { id: empireId },
          data: {
            gold: { increment: stolen.gold },
            wood: { increment: stolen.wood },
            iron: { increment: stolen.iron },
            stone: { increment: stolen.stone },
          },
        });
      }

      /* ---- the defending hero takes the blow ---- */
      // Only a breach wounds him: repel the raid and your hero is untouched.
      // At zero health he falls, and a fallen hero stops granting *every*
      // bonus he carries — points, gear and class alike (see heroBonuses) —
      // until he rises an hour later or his owner pays to raise him at once.
      // …unless שיקוי החסינות is running, in which case the blow lands on the
      // empire but never on the hero: he keeps every point of health, and with
      // it every bonus he carries.
      let defenderHeroDamage = 0;
      let defenderHeroHealth = defenderHero?.health ?? 0;
      let defenderHeroFell = false;
      const defenderHeroShielded =
        attackerWins &&
        defenderHero != null &&
        defenderHero.health > 0 &&
        defenderPotions.has("HERO_INVULNERABLE");
      if (
        attackerWins &&
        defenderHero &&
        defenderHero.health > 0 &&
        !defenderHeroShielded
      ) {
        const nextHealth = damagedHealth(
          defenderHero.health,
          HERO_DAMAGE_PER_LOST_DEFENSE
        );
        // Guarded on the health we read. Both empire rows are locked above, so
        // no second battle can be in here — but a diamond revival that slipped
        // in must not be clobbered back down to a wounded (or dead) hero.
        const wounded = await tx.hero.updateMany({
          where: { id: defenderHero.id, health: defenderHero.health },
          data: {
            health: nextHealth,
            // The hour starts at the blow that felled him; a hero already down
            // keeps his original timer (he takes no further damage at 0).
            ...(nextHealth === 0 ? { diedAt: now } : {}),
          },
        });
        if (wounded.count > 0) {
          defenderHeroDamage = defenderHero.health - nextHealth;
          defenderHeroHealth = nextHealth;
          defenderHeroFell = nextHealth === 0;
        }
      }

      /* ---- heroes: battle XP + level-ups (1 stat point per level) ---- */
      // Only the winner learns anything: a repelled attacker and a breached
      // defender both earn zero XP.
      // שיקוי הניסיון doubles the winner's haul of XP. Folded in here rather
      // than at the hero write, so the battle report shows the XP that was
      // really earned instead of the un-doubled base.
      // Happy Hour multiplies on top, and does so for *both* sides: the window is
      // the server's, not one player's, so a defender who repels a raid during
      // the golden hour is paid it too.
      const happyXp = happyHourFactor(happyHour, "boostXp");
      const attackerXpMultiplier =
        (attackerPotions.has("DOUBLE_XP") ? POTION_DOUBLE : 1) * happyXp;
      const defenderXpMultiplier =
        (defenderPotions.has("DOUBLE_XP") ? POTION_DOUBLE : 1) * happyXp;
      const attackerHeroXp = attackerWins
        ? Math.round(
            attackWinXp(
              defenderHero?.level ?? 1,
              defenderHero?.resets ?? 0,
              attackerPower,
              defenderPower
            ) * attackerXpMultiplier
          )
        : 0;
      const defenderHeroXp = attackerWins
        ? 0
        : Math.round(
            defenseWinXp(
              attackerHero?.level ?? 1,
              attackerHero?.resets ?? 0,
              defenderPower,
              attackerPower
            ) * defenderXpMultiplier
          );

      if (attackerHero && attackerHeroXp > 0) {
        // The class XP bonus (הצל) scales every battle-XP gain.
        const next = applyHeroXp(
          attackerHero,
          Math.round(attackerHeroXp * classXpMultiplier(attackerHero))
        );
        await tx.hero.update({
          where: { id: attackerHero.id },
          data: {
            level: next.level,
            xp: next.xp,
            unspentPoints: { increment: next.pointsGained },
          },
        });
        // Each hero level gained hands the empire fresh citizens — through
        // grantCitizens so the city ceiling holds, since a raw increment here
        // minted citizens rather than moving them: farming a controlled alt was
        // a net population faucet.
        const levelsGained = next.level - attackerHero.level;
        if (levelsGained > 0) {
          await grantCitizens(tx, empireId, levelsGained * CITIZENS_PER_LEVEL);
        }
      }
      if (defenderHero && defenderHeroXp > 0) {
        const next = applyHeroXp(
          defenderHero,
          Math.round(defenderHeroXp * classXpMultiplier(defenderHero))
        );
        await tx.hero.update({
          where: { id: defenderHero.id },
          data: {
            level: next.level,
            xp: next.xp,
            unspentPoints: { increment: next.pointsGained },
          },
        });
        const levelsGained = next.level - defenderHero.level;
        if (levelsGained > 0) {
          await grantCitizens(tx, targetEmpireId, levelsGained * CITIZENS_PER_LEVEL);
        }
      }

      /* ---- item capture: winning attacks can loot a hero item ---- */
      let droppedItem: ReturnType<typeof rollItemDrop> = null;
      if (attackerWins && attackerHero) {
        // Count the bag live, not off `attackerHero.items`: that snapshot was
        // read before this tx took the empire locks, so a drop that landed in
        // between would be invisible and the bag could overflow its capacity.
        const bagCount = await tx.heroItem.count({
          where: { heroId: attackerHero.id, equipped: false },
        });
        if (bagCount < HERO_BAG_CAPACITY) {
          // Loot rolls near the attacker's hero level — usable soon, not
          // trivially high/low because of who the target happened to be.
          droppedItem = rollItemDrop(attackerHero.level);
          if (droppedItem) {
            await tx.heroItem.create({
              data: { heroId: attackerHero.id, ...droppedItem },
            });
          }
        }
      }

      /* ---- potion capture: winning attacks can also yield a brew ---- */
      // Potions stack by count rather than by slot, so there is no bag to check
      // — only the (very high) per-kind cap, which grantPotion reports on.
      let droppedPotion: PotionKind | null = null;
      if (attackerWins) {
        const rolled = rollPotionDrop();
        if (rolled && (await grantPotion(tx, empireId, rolled))) {
          droppedPotion = rolled;
        }
      }

      /* ---- wheel-of-fortune spin: a winning attack has a wheel-luck chance ---- */
      let wonWheelSpin = false;
      if (attackerWins) {
        const wheelLuckLevel =
          attacker.upgrades.find((u) => u.type === "WHEEL_LUCK")?.level ?? 1;
        wonWheelSpin = secureRandom() < wheelLuckBonus(wheelLuckLevel);
        if (wonWheelSpin) {
          await tx.empire.update({
            where: { id: empireId },
            data: { wheelSpins: { increment: 1 } },
          });
        }
      }

      const report = await tx.battleReport.create({
        data: {
          attackerEmpireId: empireId,
          defenderEmpireId: targetEmpireId,
          attackerPower,
          defenderPower,
          attackerSoldiersPower,
          attackerWeaponsPower,
          defenderSoldiersPower,
          defenderWeaponsPower,
          winnerEmpireId,
          attackerSoldiersLost,
          defenderSoldiersLost,
          enslavedSoldiers,
          stolenGold: stolen.gold,
          stolenWood: stolen.wood,
          stolenIron: stolen.iron,
          stolenStone: stolen.stone,
          turnsSpent: ATTACK_TURN_COST,
          attackerHeroBonusPct,
          defenderHeroBonusPct,
          attackerGuildBonusPct,
          defenderGuildBonusPct,
          // Every remaining term of the two power formulas above, so the battle
          // report can itemise a total instead of asserting one.
          attackerGuildAidPct: attackerGuildAid.pct,
          attackerGuildAidPower: attackerGuildAid.power,
          defenderGuildAidPct: defenderGuildAid.pct,
          defenderGuildAidPower: defenderGuildAid.power,
          // Unrounded, so the report's ledger reproduces the battle exactly
          // even on a fractional tunable; the display rounds it.
          defenseBonusPct: (DEFENSE_BONUS - 1) * 100,
          attackerHeroXp,
          defenderHeroXp,
          wonWheelSpin,
          // Recorded on a win only: on a repelled raid nothing was at stake, so
          // flagging the shields would credit them with a save they never made.
          defenderResourceShielded: attackerWins && resourceShielded,
          defenderSoldierShielded: attackerWins && soldierShielded,
          ...(droppedItem
            ? {
                droppedItemSlot: droppedItem.slot,
                droppedItemLevel: droppedItem.level,
                droppedItemRarity: droppedItem.rarity,
              }
            : {}),
          ...(droppedPotion ? { droppedPotionKind: droppedPotion } : {}),
        },
      });

      // The defender wasn't in the room — drop the battle alert in their inbox.
      await tx.message.create({
        data: {
          empireId: targetEmpireId,
          kind: "BATTLE",
          title: attackerWins
            ? `⚔️ הותקפת על ידי ${attacker.name} — ההגנה נפרצה`
            : `🛡️ הדפת התקפה של ${attacker.name}!`,
          body: attackerWins
            ? `${
                soldierShielded
                  ? "🛡️ מגן החיילים שלך מנע שעבוד — אף חייל לא נלקח. "
                  : enslavedSoldiers > 0
                    ? `${enslavedSoldiers} חיילים נלקחו לעבדות. `
                    : ""
              }${
                resourceShielded
                  ? "🛡️ מגן המשאבים שלך חסם את הביזה — לא נלקח ממך ולו משאב אחד."
                  : `נבזזו ממך ${stolen.gold} זהב, ${stolen.wood} עץ, ${stolen.iron} ברזל ו־${stolen.stone} אבן.`
              } צבאך לא ספג אבדות.${
                defenderHeroShielded
                  ? ` 🧪 שיקוי החסינות הגן על הגיבור שלך — הוא יצא מהקרב ללא פגע.`
                  : defenderHeroFell
                    ? ` 💀 הגיבור שלך נפל בקרב! כל הנקודות והבונוסים שלו מושבתים עד שיקום לתחייה.`
                    : defenderHeroDamage > 0
                      ? ` הגיבור שלך ספג ${defenderHeroDamage} נזק — נותרו לו ${defenderHeroHealth}% חיים.`
                      : ""
              }`
            : `צבאך עמד איתן מול ההתקפה — לא איבדת חיילים או משאבים.`,
          href: `/game/battle/${report.id}`,
        },
      });

      // The battle resolved — go to the full WIN/LOSE result page either way.
      // XP is paid for launching the attack, win or lose; the turns are spent
      // regardless and the pass should not punish a failed raid.
      await awardSeasonPassXp(tx, empireId, "attack");
      return { reportId: report.id };
    });

    revalidateGame();
  } catch (err) {
    await logError("game.attackEmpire", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }

  if ("error" in outcome) return outcome;
  // redirect() throws NEXT_REDIRECT — must run outside the try/catch above.
  redirect(`/game/battle/${outcome.reportId}`);
}

/* ------------------------------ upgrade storage ------------------------------ */

const storageTypeSchema = z.enum(["GOLD", "WOOD", "IRON", "STONE"]);

export async function upgradeStorage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = storageTypeSchema.safeParse(formData.get("resourceType"));
  if (!parsed.success) return { error: "סוג מחסן לא תקין" };
  const resourceType = parsed.data;

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const storage = empire.storages.find((s) => s.resourceType === resourceType);
      if (!storage) return { error: "המחסן לא נמצא" };

      const discountPct = await getShopDiscountPct(empireId, tx);
      const cost = applyShopDiscount(storageUpgradeCost(storage.level), discountPct);
      if (
        empire.gold < cost.gold ||
        empire.wood < cost.wood ||
        empire.iron < cost.iron ||
        empire.stone < cost.stone
      ) {
        return {
          error: insufficientResourcesError(
            empire,
            cost,
            "אין מספיק משאבים לשדרוג המחסן"
          ),
        };
      }

      // Guarded debit (atomic) — prevents concurrent upgrades from going negative.
      const paid = await tx.empire.updateMany({
        where: {
          id: empireId,
          gold: { gte: cost.gold },
          wood: { gte: cost.wood },
          iron: { gte: cost.iron },
          stone: { gte: cost.stone },
        },
        data: {
          gold: { decrement: cost.gold },
          wood: { decrement: cost.wood },
          iron: { decrement: cost.iron },
          stone: { decrement: cost.stone },
        },
      });
      if (paid.count === 0) {
        return {
          error: insufficientResourcesError(
            empire,
            cost,
            "אין מספיק משאבים לשדרוג המחסן"
          ),
        };
      }
      // Guarded on the level the price came from — see upgradeMine. Storage
      // capacity is the pool attackEmpire cannot plunder, so buying levels at a
      // stale price converted directly into plunder immunity.
      const upgraded = await tx.resourceStorage.updateMany({
        where: {
          id: storage.id,
          level: storage.level,
        },
        data: { level: { increment: 1 } },
      });
      if (upgraded.count === 0) throw new Error("storage upgrade conflict");

      await awardSeasonPassXp(tx, empireId, "storageUpgrade");

      const newCapacity = storageCapacityForLevel(storage.level + 1);
      return {
        success: `${STORAGE_META[resourceType].label} שודרג לרמה ${
          storage.level + 1
        } (קיבולת: ${newCapacity.toLocaleString("he-IL")})`,
      };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("game.upgradeStorage", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ deposit / withdraw ------------------------------ */

const storageTransferSchema = z.object({
  resourceType: storageTypeSchema,
  amount: z.coerce.number().int().min(1).max(1_000_000_000),
});

interface StorageTransferContext {
  storage: FullEmpire["storages"][number];
  resourceKey: StorableResource;
  resourceLabel: string;
  capacity: number;
  /** Whole units available outside the warehouse. */
  available: number;
  /** Whole units of free space left in the warehouse. */
  freeSpace: number;
  /** Whole units currently protected inside the warehouse. */
  storedAmount: number;
}

/**
 * Shared shell for the four deposit/withdraw actions: applies pending
 * updates, locates the warehouse and computes its balances — all inside
 * one transaction so validation and the transfer are atomic.
 */
async function runStorageTransfer(
  resourceType: ResourceStorageType,
  perform: (
    ctx: StorageTransferContext,
    tx: Prisma.TransactionClient,
    empireId: string
  ) => Promise<ActionState>
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const storage = empire.storages.find(
        (s) => s.resourceType === resourceType
      );
      if (!storage) return { error: "המחסן לא נמצא" };

      const resourceKey = STORAGE_META[resourceType].resourceKey;
      const capacity = storageCapacityForLevel(storage.level);
      const ctx: StorageTransferContext = {
        storage,
        resourceKey,
        resourceLabel: RESOURCE_META[resourceKey].label,
        capacity,
        available: Math.floor(empire[resourceKey]),
        freeSpace: Math.max(0, Math.floor(capacity - storage.storedAmount)),
        storedAmount: Math.floor(storage.storedAmount),
      };
      return perform(ctx, tx, empireId);
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("game.upgradeStorage", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

async function transferToStorage(
  ctx: StorageTransferContext,
  tx: Prisma.TransactionClient,
  empireId: string,
  amount: number
): Promise<ActionState> {
  // Conditional updates so a concurrent transfer can never drive the
  // available balance negative or push the warehouse past capacity.
  const debited = await tx.empire.updateMany({
    where: { id: empireId, [ctx.resourceKey]: { gte: amount } },
    data: { [ctx.resourceKey]: { decrement: amount } },
  });
  if (debited.count === 0) {
    return { error: "אין מספיק משאבים זמינים לאחסון" };
  }
  const stored = await tx.resourceStorage.updateMany({
    where: {
      id: ctx.storage.id,
      storedAmount: { lte: ctx.capacity - amount },
    },
    data: { storedAmount: { increment: amount } },
  });
  // Throw (instead of returning an error) so the debit above rolls back.
  if (stored.count === 0) throw new Error("storage capacity exceeded");
  return {
    success: `אוחסנו ${amount.toLocaleString("he-IL")} ${ctx.resourceLabel} במחסן`,
  };
}

async function transferFromStorage(
  ctx: StorageTransferContext,
  tx: Prisma.TransactionClient,
  empireId: string,
  amount: number
): Promise<ActionState> {
  const withdrawn = await tx.resourceStorage.updateMany({
    where: { id: ctx.storage.id, storedAmount: { gte: amount } },
    data: { storedAmount: { decrement: amount } },
  });
  if (withdrawn.count === 0) {
    return { error: "אין מספיק משאבים במחסן" };
  }
  await tx.empire.update({
    where: { id: empireId },
    data: { [ctx.resourceKey]: { increment: amount } },
  });
  return {
    success: `נמשכו ${amount.toLocaleString("he-IL")} ${ctx.resourceLabel} מהמחסן`,
  };
}

export async function depositToStorage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = storageTransferSchema.safeParse({
    resourceType: formData.get("resourceType"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { error: "כמות לא תקינה" };
  const { resourceType, amount } = parsed.data;

  return runStorageTransfer(resourceType, async (ctx, tx, empireId) => {
    if (amount > ctx.available) {
      return { error: "אין מספיק משאבים זמינים לאחסון" };
    }
    if (amount > ctx.freeSpace) {
      return {
        error: `אין מספיק מקום במחסן (מקום פנוי: ${ctx.freeSpace.toLocaleString("he-IL")})`,
      };
    }
    return transferToStorage(ctx, tx, empireId, amount);
  });
}

export async function withdrawFromStorage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = storageTransferSchema.safeParse({
    resourceType: formData.get("resourceType"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { error: "כמות לא תקינה" };
  const { resourceType, amount } = parsed.data;

  return runStorageTransfer(resourceType, async (ctx, tx, empireId) => {
    if (amount > ctx.storedAmount) {
      return {
        error: `אין מספיק משאבים במחסן (מאוחסן: ${ctx.storedAmount.toLocaleString("he-IL")})`,
      };
    }
    return transferFromStorage(ctx, tx, empireId, amount);
  });
}

export async function depositAllToStorage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = storageTypeSchema.safeParse(formData.get("resourceType"));
  if (!parsed.success) return { error: "סוג מחסן לא תקין" };

  return runStorageTransfer(parsed.data, async (ctx, tx, empireId) => {
    if (ctx.freeSpace < 1) return { error: "המחסן מלא — שדרג אותו כדי לאחסן עוד" };
    const amount = Math.min(ctx.available, ctx.freeSpace);
    if (amount < 1) return { error: "אין משאבים זמינים לאחסון" };
    return transferToStorage(ctx, tx, empireId, amount);
  });
}

export async function withdrawAllFromStorage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = storageTypeSchema.safeParse(formData.get("resourceType"));
  if (!parsed.success) return { error: "סוג מחסן לא תקין" };

  return runStorageTransfer(parsed.data, async (ctx, tx, empireId) => {
    if (ctx.storedAmount < 1) return { error: "המחסן ריק" };
    return transferFromStorage(ctx, tx, empireId, ctx.storedAmount);
  });
}

/* ------------------------------ empire upgrades ------------------------------ */

// Derived from EMPIRE_UPGRADE_TYPES rather than hand-listed.
//
// The hand-written list silently went stale when WHEEL_LUCK was added: the
// upgrades page renders one card per EMPIRE_UPGRADE_TYPES entry, so the card was
// there, priced and clickable — and every click died on "סוג שדרוג לא תקין"
// because the schema had never heard of the type. Deriving both from the same
// constant means a new upgrade is buyable the moment it is defined.
const empireUpgradeTypeSchema = z.enum(
  EMPIRE_UPGRADE_TYPES as [ActiveEmpireUpgradeType, ...ActiveEmpireUpgradeType[]]
);

export async function upgradeEmpireUpgrade(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = empireUpgradeTypeSchema.safeParse(formData.get("upgradeType"));
  if (!parsed.success) return { error: "סוג שדרוג לא תקין" };
  const upgradeType = parsed.data;

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      // A missing row (e.g. an empire predating this upgrade) starts at level 1.
      const upgrade =
        empire.upgrades.find((u) => u.type === upgradeType) ??
        (await tx.empireUpgrade.create({
          data: { empireId, type: upgradeType, level: 1 },
        }));

      const maxLevel = empireUpgradeMaxLevel(upgradeType, empire.cities);
      if (maxLevel !== undefined && upgrade.level >= maxLevel) {
        return { error: "רמה מקסימלית" };
      }

      const discountPct = await getShopDiscountPct(empireId, tx);
      const cost = applyShopDiscount(
        empireUpgradeCostFor(upgradeType, upgrade.level),
        discountPct
      );
      if (
        empire.gold < cost.gold ||
        empire.wood < cost.wood ||
        empire.iron < cost.iron ||
        empire.stone < cost.stone
      ) {
        return {
          error: insufficientResourcesError(empire, cost, "אין מספיק משאבים לשדרוג"),
        };
      }

      // Guarded debit (atomic) — prevents concurrent upgrades from going negative.
      const paid = await tx.empire.updateMany({
        where: {
          id: empireId,
          gold: { gte: cost.gold },
          wood: { gte: cost.wood },
          iron: { gte: cost.iron },
          stone: { gte: cost.stone },
        },
        data: {
          gold: { decrement: cost.gold },
          wood: { decrement: cost.wood },
          iron: { decrement: cost.iron },
          stone: { decrement: cost.stone },
        },
      });
      if (paid.count === 0) {
        return {
          error: insufficientResourcesError(empire, cost, "אין מספיק משאבים לשדרוג"),
        };
      }
      // Guarded on the level that was both max-checked and priced above.
      //
      // Without the pin the `maxLevel` check was a stale read and the increment
      // unconditional, so N concurrent calls pushed the level N past its cap at
      // the snapshot price. On TURNS_PER_REGULAR_UPDATE (cap 5) that was the
      // worst exploit in the game after foundCity: 20 parallel POSTs at level 1
      // cost ~54k gold and produced level 21, i.e. +21 turns every 5-minute tick
      // (6,048/day against a designed 1,440). Turns are the only rate limit on
      // attacking, and attacks are the source of plunder, hero XP, item drops
      // and wheel spins — so uncapping them uncapped the whole PvP economy.
      // INTELLIGENCE (cap 15) was equally raceable into guaranteed spy success.
      const upgraded = await tx.empireUpgrade.updateMany({
        where: {
          id: upgrade.id,
          level: upgrade.level,
        },
        data: { level: { increment: 1 } },
      });
      if (upgraded.count === 0) throw new Error("empire upgrade conflict");
      await awardSeasonPassXp(tx, empireId, "empireUpgrade");

      return {
        success: `${EMPIRE_UPGRADE_META[upgradeType].label} שודרג לרמה ${
          upgrade.level + 1
        }!`,
      };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("game.upgradeEmpireUpgrade", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ found city ------------------------------ */

/**
 * Upgrade to the next city. Requires the hero to have reached the level demanded
 * for this city tier (10 for the 2nd, 20 for the 3rd…) and a standing garrison of
 * soldiers — the soldiers are only a *gate*, never consumed. Resources are spent
 * and the debit is guarded (gte) so concurrent calls can never over-spend or
 * push the empire past MAX_CITIES. Each city also multiplies mine production, so
 * upgrading immediately raises resource output.
 */
export async function foundCity(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);

      if (empire.cities >= MAX_CITIES) {
        return { error: `הגעת לרמת העיר המרבית (${MAX_CITIES}).` };
      }
      const heroRequired = cityHeroLevelRequired(empire.cities);
      if ((empire.hero?.level ?? 1) < heroRequired) {
        return {
          error: `נדרש גיבור ברמה ${heroRequired} כדי לעלות עיר.`,
        };
      }

      const cost = cityCost(empire.cities);
      if (
        empire.gold < cost.gold ||
        empire.wood < cost.wood ||
        empire.iron < cost.iron ||
        empire.stone < cost.stone
      ) {
        return {
          error: insufficientResourcesError(empire, cost, "אין מספיק משאבים כדי לעלות עיר."),
        };
      }
      // Soldiers are only a requirement — the empire must field a garrison of
      // this size, but upgrading the city never consumes it.
      if ((empire.army?.soldiers ?? 0) < cost.soldiers) {
        return {
          error: `נדרשים ${cost.soldiers.toLocaleString("he-IL")} חיילים בצבא כדי לעלות עיר.`,
        };
      }

      // Guarded resource debit + city increment, atomic against concurrent calls.
      //
      // `cities: empire.cities` pins the tier the price was quoted from, and is
      // the load-bearing part of this guard. Guarding only the balances (plus a
      // loose `cities: { lt: MAX_CITIES }`) let N concurrent calls each pay the
      // price of the *snapshot* tier while each incrementing `cities`: since
      // cityCost is 1M × 2.5^(cities-1), racing 9 requests from one city bought
      // cities 2..10 at the city-2 price — ~9M gold instead of ~2.54B, a ~280×
      // discount — and every racer also cleared the hero-level gate at the
      // tier-1 requirement of 10 instead of 90. `cities` is the game's top-line
      // multiplier (mine output, population ceiling, PvP bracket), so this was
      // the single highest-value exploit in the economy. Pinning the exact value
      // means only one racer can win per tier; the losers match zero rows.
      const paid = await tx.empire.updateMany({
        where: {
          id: empireId,
          cities: empire.cities,
          gold: { gte: cost.gold },
          wood: { gte: cost.wood },
          iron: { gte: cost.iron },
          stone: { gte: cost.stone },
        },
        data: {
          gold: { decrement: cost.gold },
          wood: { decrement: cost.wood },
          iron: { decrement: cost.iron },
          stone: { decrement: cost.stone },
          cities: { increment: 1 },
        },
      });
      if (paid.count === 0) {
        return {
          error: insufficientResourcesError(empire, cost, "אין מספיק משאבים כדי לעלות עיר."),
        };
      }

      // Soldiers are a gate, not a currency — the garrison is left untouched.
      await awardSeasonPassXp(tx, empireId, "foundCity");

      return {
        success: `עלית לעיר ${empire.cities + 1}! התפוקה שלך גדלה בהתאם.`,
      };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("game.foundCity", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ weapons ------------------------------ */

/**
 * The highest weapon tier this empire may buy. Progression is **shared** across
 * all three categories — a tier unlocked anywhere counts everywhere — so this is
 * the maximum unlocked tier over the empire's unlock rows. Empires created
 * before the weapons system have no rows and default to the initial two tiers.
 */
function sharedUnlockedTier(empire: FullEmpire): number {
  return empire.weaponUnlocks.reduce(
    (max, u) => Math.max(max, u.unlockedTier),
    INITIAL_WEAPON_UNLOCKED_TIER
  );
}

const buyWeaponSchema = z.object({
  weaponKey: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
});

export async function buyWeapon(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = buyWeaponSchema.safeParse({
    weaponKey: formData.get("weaponKey"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { error: "כמות לא תקינה" };
  const { weaponKey, quantity } = parsed.data;

  const weapon = weaponByKey(weaponKey);
  if (!weapon) return { error: "נשק לא מוכר" };

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);

      if (weapon.tier > sharedUnlockedTier(empire)) {
        return { error: "הנשק נעול — פתח נשק מתקדם כדי לקנות אותו" };
      }

      // Buying uses only available balances — warehouse stock is protected.
      const discountPct = await getShopDiscountPct(empireId, tx);
      const cost = applyShopDiscount(
        {
          gold: weapon.cost.gold * quantity,
          wood: weapon.cost.wood * quantity,
          iron: weapon.cost.iron * quantity,
          stone: weapon.cost.stone * quantity,
        },
        discountPct
      );
      if (
        empire.gold < cost.gold ||
        empire.wood < cost.wood ||
        empire.iron < cost.iron ||
        empire.stone < cost.stone
      ) {
        return {
          error: insufficientResourcesError(
            empire,
            cost,
            "אין מספיק משאבים זמינים לקנייה."
          ),
        };
      }

      // Guarded debit (atomic) — prevents concurrent buys from going negative.
      const paid = await tx.empire.updateMany({
        where: {
          id: empireId,
          gold: { gte: cost.gold },
          wood: { gte: cost.wood },
          iron: { gte: cost.iron },
          stone: { gte: cost.stone },
        },
        data: {
          gold: { decrement: cost.gold },
          wood: { decrement: cost.wood },
          iron: { decrement: cost.iron },
          stone: { decrement: cost.stone },
        },
      });
      if (paid.count === 0) {
        return {
          error: insufficientResourcesError(
            empire,
            cost,
            "אין מספיק משאבים זמינים לקנייה."
          ),
        };
      }
      await tx.empireWeapon.upsert({
        where: { empireId_weaponKey: { empireId, weaponKey } },
        create: { empireId, weaponKey, quantity },
        update: { quantity: { increment: quantity } },
      });
      await syncEmpirePower(tx, empireId);
      await awardSeasonPassXp(
        tx,
        empireId,
        "buyWeapon",
        seasonPassSpendUnits(
          "buyWeapon",
          cost.gold + cost.wood + cost.iron + cost.stone
        )
      );

      return {
        success: `נקנו ${quantity.toLocaleString("he-IL")} ${weapon.name} בהצלחה!`,
      };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("game.buyWeapon", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

export async function unlockNextWeaponTier(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);

      // Unlocking is cross-cutting: the shared tier is the highest tier over
      // all categories, and advancing it opens the next weapon in all three.
      const currentTier = sharedUnlockedTier(empire);
      if (currentTier >= MAX_WEAPON_TIER) {
        return { error: "כל הנשקים פתוחים." };
      }
      const targetTier = currentTier + 1;

      // Every few tiers demands a founded city and a hero level — so weapons,
      // hero and cities advance together.
      const heroLevel = empire.hero?.level ?? 0;
      const gate = weaponGateStatus(targetTier, empire.cities, heroLevel);
      if (!gate.met) {
        const needs: string[] = [];
        if (!gate.citiesMet) {
          needs.push(`${gate.cities} ערים (יש לך ${empire.cities})`);
        }
        if (!gate.heroLevelMet) {
          needs.push(`גיבור ברמה ${gate.heroLevel} (הגיבור שלך ברמה ${heroLevel})`);
        }
        return {
          error: `כדי לפתוח רמה ${targetTier} צריך ${needs.join(" ו-")}.`,
        };
      }

      const discountPct = await getShopDiscountPct(empireId, tx);
      const cost = applyShopDiscount(weaponTierUnlockCost(currentTier), discountPct);
      if (
        empire.gold < cost.gold ||
        empire.wood < cost.wood ||
        empire.iron < cost.iron ||
        empire.stone < cost.stone
      ) {
        return {
          error: insufficientResourcesError(
            empire,
            cost,
            "אין מספיק משאבים לפתיחת הנשק הבא"
          ),
        };
      }

      // Guarded debit (atomic) — prevents concurrent unlocks from going negative.
      const paid = await tx.empire.updateMany({
        where: {
          id: empireId,
          gold: { gte: cost.gold },
          wood: { gte: cost.wood },
          iron: { gte: cost.iron },
          stone: { gte: cost.stone },
        },
        data: {
          gold: { decrement: cost.gold },
          wood: { decrement: cost.wood },
          iron: { decrement: cost.iron },
          stone: { decrement: cost.stone },
        },
      });
      if (paid.count === 0) {
        return {
          error: insufficientResourcesError(
            empire,
            cost,
            "אין מספיק משאבים לפתיחת הנשק הבא"
          ),
        };
      }
      // Advance every category together — the unlock is cross-cutting.
      //
      // Guarded and monotonic. The old unconditional `update: { unlockedTier:
      // targetTier }` was an absolute write off a snapshot, which broke two ways
      // at once: two concurrent unlocks both passed the (guarded) payment, both
      // wrote the same tier, and the player paid twice for one tier; and a slow
      // request that had read an older tier clobbered a newer one on commit,
      // *removing* a tier that had already been bought. `lt: targetTier` fixes
      // both — a racer that finds nothing below the target matches zero rows.
      let advanced = 0;
      for (const cat of WEAPON_CATEGORIES) {
        const bumped = await tx.empireWeaponUnlock.updateMany({
          where: { empireId, category: cat, unlockedTier: { lt: targetTier } },
          data: { unlockedTier: targetTier },
        });
        advanced += bumped.count;
      }
      // Empires predating the weapons system carry no unlock rows at all — seed
      // the missing ones. `skipDuplicates` (ON CONFLICT DO NOTHING) rather than
      // create: a failed INSERT aborts the whole transaction in Postgres, and
      // catching it in JS does not recover the connection.
      const seeded = await tx.empireWeaponUnlock.createMany({
        data: WEAPON_CATEGORIES.map((category) => ({
          empireId,
          category,
          unlockedTier: targetTier,
        })),
        skipDuplicates: true,
      });
      advanced += seeded.count;
      // Nothing moved: a concurrent unlock already bought this tier. Throw so
      // the payment above rolls back rather than charging twice for one tier.
      if (advanced === 0) throw new Error("weapon tier unlock conflict");

      return {
        success: `נפתחה רמה ${targetTier} לכל הנשקים — התקפה, הגנה וריגול!`,
      };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("game.unlockNextWeaponTier", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ settings ------------------------------ */

/**
 * Empire names are locked for the duration of the season.
 * The action is kept so any old client form gets a clear rejection.
 */
export async function renameEmpire(): Promise<ActionState> {
  return { error: "שם האימפריה נעול למשך העונה ולא ניתן לשינוי." };
}
