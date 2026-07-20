"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { BuildingType, Prisma, ResourceStorageType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import {
  BUILDING_META,
  cityHeroLevelRequired,
  EMPIRE_UPGRADE_META,
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
  spySuccessChance,
  storageCapacityForLevel,
  storageUpgradeCost,
  type StorableResource,
  type UnitKey,
} from "@/lib/game/constants";
import { getTunables } from "@/lib/game/config";
import { applyPendingUpdates, type FullEmpire } from "@/lib/game/updates";
import { getActiveGuildBuffPct } from "@/lib/game/guildBuffs";
import { getGuildAidBonus } from "@/lib/game/guildAid";
import { getShopDiscountPct } from "@/lib/game/diamondEffects";
import { applyShopDiscount } from "@/lib/game/diamondShop";
import { armyPower } from "@/lib/game/power";
import {
  CITIZENS_PER_LEVEL,
  HERO_BAG_CAPACITY,
  applyHeroXp,
  attackWinXp,
  bonusMultiplier,
  defenseLossXp,
  defenseWinXp,
  heroBonuses,
  rollItemDrop,
} from "@/lib/game/hero";
import {
  INITIAL_WEAPON_UNLOCKED_TIER,
  MAX_WEAPON_TIER,
  WEAPON_CATEGORIES,
  finalSpyChance,
  spyWeaponsBonusPercent,
  weaponByKey,
  weaponGateStatus,
  weaponTierUnlockCost,
  weaponsPower,
} from "@/lib/game/weapons";

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
  const userId = await getSessionUserId();
  if (!userId) throw new Error("לא מחובר");
  const empire = await prisma.empire.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!empire) throw new Error("לא נמצאה אימפריה");
  return empire.id;
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
      await tx.building.update({
        where: { id: building.id },
        data: { level: { increment: 1 } },
      });

      return {
        success: `${BUILDING_META[type].label} שודרג לרמה ${building.level + 1}!`,
      };
    });

    revalidateGame();
    return result;
  } catch {
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
      await tx.building.update({
        where: { id: building.id },
        data: { level: { increment: levels } },
      });

      return {
        success: `${BUILDING_META[type].label} שודרג לרמה ${building.level + levels}!`,
      };
    });

    revalidateGame();
    return result;
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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

      return { success: `אומנו ${quantity} ${meta.labelPlural} בהצלחה!` };
    });

    revalidateGame();
    return result;
  } catch {
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

    outcome = await prisma.$transaction(async (tx) => {
      const { spyTurnCost: SPY_TURN_COST } = (await getTunables()).battle;
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

      // All validations passed — the mission launches, so it costs turns
      // whether the spy succeeds or fails.
      if (!(await spendTurns(tx, empireId, SPY_TURN_COST))) {
        return { error: "אין לך מספיק תורות לביצוע ריגול." };
      }

      const intelligenceLevel =
        attacker.upgrades.find((u) => u.type === "INTELLIGENCE")?.level ?? 1;
      // Spy weapons add up to +15 percentage points on top of intelligence,
      // capped at a 95% final chance. An active guild spy spell and the hero's
      // spy % (from equipped spy items) each add percentage points on top,
      // under the same cap.
      const spyPower = weaponsPower(attacker.weapons, "SPY");
      const guildSpyBonusPct = await getActiveGuildBuffPct(empireId, "SPY", tx);
      const heroSpyBonusPct = heroBonuses(attacker.hero).totalPct.spy;
      const chance = Math.min(
        0.95,
        finalSpyChance(spySuccessChance(intelligenceLevel), spyPower) +
          guildSpyBonusPct / 100 +
          heroSpyBonusPct / 100
      );
      const success = Math.random() < chance;

      const report = await tx.spyReport.create({
        data: {
          attackerEmpireId: empireId,
          defenderEmpireId: targetEmpireId,
          success,
          finalChance: chance,
          weaponsBonus: spyWeaponsBonusPercent(spyPower),
          guildBonus: guildSpyBonusPct,
          turnsSpent: SPY_TURN_COST,
          ...(success
            ? {
                revealedGold: Math.floor(defender.gold),
                revealedWood: Math.floor(defender.wood),
                revealedIron: Math.floor(defender.iron),
                revealedStone: Math.floor(defender.stone),
                revealedSoldiers: defender.army?.soldiers ?? 0,
                revealedSpies: defender.army?.spies ?? 0,
                revealedMineSlaves: defender.army?.mineSlaves ?? 0,
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
      // or the spy was caught.
      return { reportId: report.id };
    });

    revalidateGame();
  } catch {
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

    outcome = await prisma.$transaction(async (tx) => {
      const {
        attackTurnCost: ATTACK_TURN_COST,
        defenseBonus: DEFENSE_BONUS,
        plunderRate: PLUNDER_RATE,
        enslaveRate: ENSLAVE_RATE,
        enslaveMinSoldiers: ENSLAVE_MIN_SOLDIERS,
      } = (await getTunables()).battle;
      const attacker = await applyPendingUpdates(empireId, tx);
      if (attacker.turns < ATTACK_TURN_COST) {
        return { error: "אין לך מספיק תורות לביצוע תקיפה." };
      }

      const defender = await applyPendingUpdates(targetEmpireId, tx).catch(
        () => null
      );
      if (!defender) return { error: "האימפריה המבוקשת לא נמצאה" };

      // Combat is confined to your own city — an empire is "in your city" when
      // it holds the same number of cities as you.
      if (defender.cities !== attacker.cities) {
        return { error: "לא ניתן לתקוף אימפריה שאינה בעיר שלך." };
      }

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

      // Proportional losses: a winning attacker loses a share scaled by how
      // close the fight was; a losing attacker loses a larger fixed share.
      // A defender who repels the attack loses nothing — soldiers and
      // resources stay untouched.
      const total = attackerPower + defenderPower;
      const closeness = total > 0 ? Math.min(attackerPower, defenderPower) / total : 0;
      const winnerLossRate = 0.1 * closeness * 2; // 0..0.1
      const loserLossRate = 0.3;

      const attackerLossRate = attackerWins ? winnerLossRate : loserLossRate;
      const defenderLossRate = attackerWins ? loserLossRate : 0;

      const attackerSoldiersLost = Math.min(
        attackerArmy.soldiers,
        Math.round(attackerArmy.soldiers * attackerLossRate)
      );
      const defenderSoldiersLost = defenderArmy
        ? Math.min(
            defenderArmy.soldiers,
            Math.round(defenderArmy.soldiers * defenderLossRate)
          )
        : 0;

      // Enslavement: a winning attack against a defender fielding 20+
      // soldiers captures a share of them. The haul scales with the
      // defender's army size and joins the attacker's free mine-slave pool
      // (not citizens).
      const defenderSoldiersRemaining = defenderArmy
        ? defenderArmy.soldiers - defenderSoldiersLost
        : 0;
      const enslavedSoldiers =
        attackerWins &&
        defenderArmy &&
        defenderArmy.soldiers >= ENSLAVE_MIN_SOLDIERS
          ? Math.min(
              defenderSoldiersRemaining,
              Math.max(1, Math.floor(defenderArmy.soldiers * ENSLAVE_RATE))
            )
          : 0;

      // Plunder touches only the defender's available balances — resources
      // deposited in warehouses (storedAmount) are protected from attacks.
      const stolen = attackerWins
        ? {
            gold: Math.floor(defender.gold * PLUNDER_RATE),
            wood: Math.floor(defender.wood * PLUNDER_RATE),
            iron: Math.floor(defender.iron * PLUNDER_RATE),
            stone: Math.floor(defender.stone * PLUNDER_RATE),
          }
        : { gold: 0, wood: 0, iron: 0, stone: 0 };

      await tx.army.update({
        where: { empireId },
        data: {
          soldiers: { decrement: attackerSoldiersLost },
          // Captured defenders arrive as unassigned mine slaves.
          ...(enslavedSoldiers > 0
            ? { mineSlaves: { increment: enslavedSoldiers } }
            : {}),
        },
      });
      if (defenderArmy) {
        await tx.army.update({
          where: { empireId: targetEmpireId },
          data: {
            soldiers: { decrement: defenderSoldiersLost + enslavedSoldiers },
          },
        });
      }

      if (attackerWins) {
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

      /* ---- heroes: battle XP + level-ups (1 stat point per level) ---- */
      // A failed attack earns the attacker nothing.
      const attackerHeroXp = attackerWins
        ? attackWinXp(
            defenderHero?.level ?? 1,
            defenderHero?.resets ?? 0,
            attackerPower,
            defenderPower
          )
        : 0;
      const defenderHeroXp = attackerWins
        ? defenseLossXp()
        : defenseWinXp(
            attackerHero?.level ?? 1,
            attackerHero?.resets ?? 0,
            defenderPower,
            attackerPower
          );

      if (attackerHero && attackerHeroXp > 0) {
        const next = applyHeroXp(attackerHero, attackerHeroXp);
        await tx.hero.update({
          where: { id: attackerHero.id },
          data: {
            level: next.level,
            xp: next.xp,
            unspentPoints: { increment: next.pointsGained },
          },
        });
        // Each hero level gained hands the empire fresh citizens.
        const levelsGained = next.level - attackerHero.level;
        if (levelsGained > 0) {
          await tx.empire.update({
            where: { id: empireId },
            data: { citizens: { increment: levelsGained * CITIZENS_PER_LEVEL } },
          });
        }
      }
      if (defenderHero) {
        const next = applyHeroXp(defenderHero, defenderHeroXp);
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
          await tx.empire.update({
            where: { id: targetEmpireId },
            data: { citizens: { increment: levelsGained * CITIZENS_PER_LEVEL } },
          });
        }
      }

      /* ---- item capture: winning attacks can loot a hero item ---- */
      let droppedItem: ReturnType<typeof rollItemDrop> = null;
      if (attackerWins && attackerHero) {
        const bagCount = attackerHero.items.filter((i) => !i.equipped).length;
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
          attackerHeroXp,
          defenderHeroXp,
          ...(droppedItem
            ? {
                droppedItemSlot: droppedItem.slot,
                droppedItemLevel: droppedItem.level,
                droppedItemRarity: droppedItem.rarity,
              }
            : {}),
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
            ? `איבדת ${defenderSoldiersLost} חיילים${
                enslavedSoldiers > 0
                  ? `, ${enslavedSoldiers} חיילים נלקחו לעבדות`
                  : ""
              } ונבזזו ממך ${stolen.gold} זהב, ${stolen.wood} עץ, ${stolen.iron} ברזל ו־${stolen.stone} אבן.`
            : `צבאך עמד איתן מול ההתקפה — לא איבדת חיילים או משאבים.`,
          href: `/game/battle/${report.id}`,
        },
      });

      // The battle resolved — go to the full WIN/LOSE result page either way.
      return { reportId: report.id };
    });

    revalidateGame();
  } catch {
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
      await tx.resourceStorage.update({
        where: { id: storage.id },
        data: { level: { increment: 1 } },
      });

      const newCapacity = storageCapacityForLevel(storage.level + 1);
      return {
        success: `${STORAGE_META[resourceType].label} שודרג לרמה ${
          storage.level + 1
        } (קיבולת: ${newCapacity.toLocaleString("he-IL")})`,
      };
    });

    revalidateGame();
    return result;
  } catch {
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
  } catch {
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

const empireUpgradeTypeSchema = z.enum([
  "CITIZEN_GROWTH",
  "DIAMOND_YIELD",
  "INTELLIGENCE",
  "BANK_DEPOSIT_COUNT",
  "BANK_DAILY_INTEREST",
  "TURNS_PER_REGULAR_UPDATE",
]);

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

      const maxLevel = EMPIRE_UPGRADE_META[upgradeType].maxLevel;
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
      await tx.empireUpgrade.update({
        where: { id: upgrade.id },
        data: { level: { increment: 1 } },
      });

      return {
        success: `${EMPIRE_UPGRADE_META[upgradeType].label} שודרג לרמה ${
          upgrade.level + 1
        }!`,
      };
    });

    revalidateGame();
    return result;
  } catch {
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
      const paid = await tx.empire.updateMany({
        where: {
          id: empireId,
          cities: { lt: MAX_CITIES },
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

      return {
        success: `עלית לעיר ${empire.cities + 1}! התפוקה שלך גדלה בהתאם.`,
      };
    });

    revalidateGame();
    return result;
  } catch {
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

      return {
        success: `נקנו ${quantity.toLocaleString("he-IL")} ${weapon.name} בהצלחה!`,
      };
    });

    revalidateGame();
    return result;
  } catch {
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
      for (const cat of WEAPON_CATEGORIES) {
        await tx.empireWeaponUnlock.upsert({
          where: { empireId_category: { empireId, category: cat } },
          create: { empireId, category: cat, unlockedTier: targetTier },
          update: { unlockedTier: targetTier },
        });
      }

      return {
        success: `נפתחה רמה ${targetTier} לכל הנשקים — התקפה, הגנה וריגול!`,
      };
    });

    revalidateGame();
    return result;
  } catch {
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
