"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates, type FullEmpire } from "@/lib/game/updates";
import {
  RESOURCE_META,
  STORAGE_META,
  STORAGE_TYPES,
  UNIT_META,
  storageCapacityForLevel,
  storageUpgradeCost,
  type StorableResource,
  type UnitKey,
} from "@/lib/game/constants";
import { applyShopDiscount } from "@/lib/game/diamondShop";
import { getShopDiscountPct } from "@/lib/game/diamondEffects";
import { seasonPassSpendUnits } from "@/lib/game/seasonPass";
import { awardSeasonPassXp } from "@/server/seasonPassXp";
import { syncEmpirePower } from "@/server/empirePower";
import { VIP_COST, VIP_LABEL, isVip } from "@/lib/game/vip";
import type { ActionState } from "./game";
import { logError } from "@/server/errorLog";

/**
 * The VIP pass and the bulk actions it unlocks.
 *
 * Every action here is a *loop over an existing one*, and each iteration keeps
 * that action's own guards: the same guarded `updateMany` debits, the same
 * capacity ceilings, the same season-pass XP. Nothing is cheaper, faster or
 * larger because it was bought — see src/lib/game/vip.ts for why that line
 * matters.
 *
 * Every one of them re-checks the pass server-side. The buttons are only
 * rendered for VIP, but a rendered button is not an authorisation: a
 * hand-rolled POST is exactly as easy against a bulk action as against any
 * other, and `requireVip` is the thing that actually stops it.
 */

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

function revalidateGame() {
  revalidatePath("/game", "layout");
}

/** The refusal every bulk action returns to a player without the pass. */
const NOT_VIP = `הפעולה הזו נפתחת עם ${VIP_LABEL} — ניתן לרכוש בעמוד היהלומים`;

/**
 * Shell for every bulk action: applies pending updates, re-checks the pass and
 * hands the settled empire to the body — all inside one transaction, so the
 * numbers the body plans against are the numbers it debits.
 */
async function runVipAction(
  scope: string,
  perform: (
    empire: FullEmpire,
    tx: Prisma.TransactionClient,
    empireId: string
  ) => Promise<ActionState>
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      if (!isVip(empire)) return { error: NOT_VIP };
      return perform(empire, tx, empireId);
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError(scope, err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ buying the pass ------------------------------ */

/**
 * Buy VIP. Once, forever.
 *
 * The `vipSince: null` in the WHERE is not decoration: without it two
 * simultaneous clicks each pass the "not VIP yet" read, each spend 1000
 * diamonds and the second one buys nothing at all. Matching zero rows there
 * throws, which rolls the charge back with it.
 */
export async function buyVip(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      if (isVip(empire)) return { error: `${VIP_LABEL} כבר ברשותך` };

      const paid = await tx.empire.updateMany({
        where: { id: empireId, diamonds: { gte: VIP_COST }, vipSince: null },
        data: { diamonds: { decrement: VIP_COST }, vipSince: new Date() },
      });
      if (paid.count === 0) {
        return { error: `דרושים ${VIP_COST} יהלומים לרכישת ${VIP_LABEL}` };
      }

      return {
        success: `${VIP_LABEL} שלך! הפעולות המהירות פתוחות מעכשיו מכל מסך במשחק.`,
      };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("vip.buyVip", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ warehouses, all four ------------------------------ */

interface StoragePlan {
  storageId: string;
  resourceKey: StorableResource;
  capacity: number;
  amount: number;
}

/**
 * Store every resource in its warehouse, up to whatever room each one has left.
 *
 * The debit is a single guarded update across all four columns — either the
 * whole move is affordable at commit time or none of it happens — and each
 * warehouse is then filled under its own `storedAmount <= capacity - amount`
 * guard, so a deposit racing this one cannot push a silo past its ceiling.
 */
export async function storeAllResources(): Promise<ActionState> {
  return runVipAction("vip.storeAllResources", async (empire, tx, empireId) => {
    const plans: StoragePlan[] = [];
    for (const type of STORAGE_TYPES) {
      const storage = empire.storages.find((s) => s.resourceType === type);
      if (!storage) continue;
      const resourceKey = STORAGE_META[type].resourceKey;
      const capacity = storageCapacityForLevel(storage.level);
      const freeSpace = Math.max(0, Math.floor(capacity - storage.storedAmount));
      const amount = Math.min(Math.floor(empire[resourceKey]), freeSpace);
      if (amount > 0) {
        plans.push({ storageId: storage.id, resourceKey, capacity, amount });
      }
    }
    if (plans.length === 0) {
      return { error: "אין מה לאחסן — אין משאבים זמינים, או שכל המחסנים מלאים" };
    }

    const amounts = byResource(plans);
    const debited = await tx.empire.updateMany({
      where: {
        id: empireId,
        gold: { gte: amounts.gold },
        wood: { gte: amounts.wood },
        iron: { gte: amounts.iron },
        stone: { gte: amounts.stone },
      },
      data: {
        gold: { decrement: amounts.gold },
        wood: { decrement: amounts.wood },
        iron: { decrement: amounts.iron },
        stone: { decrement: amounts.stone },
      },
    });
    if (debited.count === 0) return { error: "אין מספיק משאבים זמינים לאחסון" };

    for (const plan of plans) {
      const stored = await tx.resourceStorage.updateMany({
        where: {
          id: plan.storageId,
          storedAmount: { lte: plan.capacity - plan.amount },
        },
        data: { storedAmount: { increment: plan.amount } },
      });
      // Throw (instead of returning an error) so the debit above rolls back.
      if (stored.count === 0) throw new Error("storage capacity exceeded");
    }

    return { success: `אוחסנו ${summary(plans)} במחסנים` };
  });
}

/** Empty all four warehouses back into the empire's available balances. */
export async function releaseAllResources(): Promise<ActionState> {
  return runVipAction("vip.releaseAllResources", async (empire, tx, empireId) => {
    const plans: StoragePlan[] = [];
    for (const type of STORAGE_TYPES) {
      const storage = empire.storages.find((s) => s.resourceType === type);
      if (!storage) continue;
      const amount = Math.floor(storage.storedAmount);
      if (amount > 0) {
        plans.push({
          storageId: storage.id,
          resourceKey: STORAGE_META[type].resourceKey,
          capacity: storageCapacityForLevel(storage.level),
          amount,
        });
      }
    }
    if (plans.length === 0) return { error: "כל המחסנים ריקים" };

    for (const plan of plans) {
      const withdrawn = await tx.resourceStorage.updateMany({
        where: { id: plan.storageId, storedAmount: { gte: plan.amount } },
        data: { storedAmount: { decrement: plan.amount } },
      });
      // A withdrawal that raced this one already moved the stock; skipping the
      // matching credit is what keeps the two sides equal.
      if (withdrawn.count === 0) plan.amount = 0;
    }
    const moved = plans.filter((p) => p.amount > 0);
    if (moved.length === 0) return { error: "כל המחסנים ריקים" };

    const amounts = byResource(moved);
    await tx.empire.update({
      where: { id: empireId },
      data: {
        gold: { increment: amounts.gold },
        wood: { increment: amounts.wood },
        iron: { increment: amounts.iron },
        stone: { increment: amounts.stone },
      },
    });

    return { success: `נמשכו ${summary(moved)} מהמחסנים` };
  });
}

/**
 * A plan list as a full four-resource record — the untouched resources come
 * back as 0, which is what lets both transfers spell every column out instead
 * of assembling a dynamic Prisma payload.
 */
function byResource(plans: StoragePlan[]): Record<StorableResource, number> {
  const out: Record<StorableResource, number> = { gold: 0, wood: 0, iron: 0, stone: 0 };
  for (const plan of plans) out[plan.resourceKey] = plan.amount;
  return out;
}

/** "1,200,000 זהב · 400,000 עץ" — the itemised line every bulk transfer reports. */
function summary(plans: StoragePlan[]): string {
  return plans
    .map(
      (p) =>
        `${p.amount.toLocaleString("he-IL")} ${RESOURCE_META[p.resourceKey].label}`
    )
    .join(" · ");
}

/* ------------------------------ warehouses, one level each ------------------------------ */

/**
 * Raise every warehouse one level, skipping the ones the empire cannot afford.
 *
 * Deliberately **one** level per warehouse per press, not "as many as the
 * treasury can carry". A run-until-broke button empties an empire's entire
 * reserve on a single click, and a warehouse level is not refundable — the
 * conservative reading of "שדרג את כל המחסנים" is the only one that cannot
 * surprise the player who pressed it.
 */
export async function upgradeAllStorages(): Promise<ActionState> {
  return runVipAction("vip.upgradeAllStorages", async (empire, tx, empireId) => {
    const discountPct = await getShopDiscountPct(empireId, tx);
    const upgraded: string[] = [];
    let unaffordable = 0;

    for (const type of STORAGE_TYPES) {
      const storage = empire.storages.find((s) => s.resourceType === type);
      if (!storage) continue;
      const cost = applyShopDiscount(storageUpgradeCost(storage.level), discountPct);

      // Sequential guarded debits, so each warehouse is priced against what is
      // actually left after the ones before it were paid for.
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
        unaffordable += 1;
        continue;
      }

      // Guarded on the level the price came from — a warehouse level bought at
      // a stale price is plunder immunity bought at a discount (see
      // upgradeStorage, which this mirrors).
      const raised = await tx.resourceStorage.updateMany({
        where: { id: storage.id, level: storage.level },
        data: { level: { increment: 1 } },
      });
      if (raised.count === 0) throw new Error("storage upgrade conflict");

      await awardSeasonPassXp(tx, empireId, "storageUpgrade");
      upgraded.push(`${STORAGE_META[type].label} → ${storage.level + 1}`);
    }

    if (upgraded.length === 0) {
      return { error: "אין מספיק משאבים לשדרוג אף מחסן" };
    }
    return {
      success:
        `שודרגו ${upgraded.length} מחסנים: ${upgraded.join(" · ")}` +
        (unaffordable > 0 ? ` (${unaffordable} לא היו במסגרת התקציב)` : ""),
    };
  });
}

/* ------------------------------ training ------------------------------ */

const unitSchema = z.enum(["soldiers", "spies", "mineSlaves"]);

/**
 * Turn every free citizen into one unit type.
 *
 * The same conversion `trainUnits` does — one citizen per unit, the spy centre
 * still required for spies — with the quantity read off the empire instead of
 * typed into a box.
 */
export async function trainMaxUnits(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = unitSchema.safeParse(formData.get("unit"));
  if (!parsed.success) return { error: "יחידה לא תקינה" };
  const unit: UnitKey = parsed.data;

  return runVipAction("vip.trainMaxUnits", async (empire, tx, empireId) => {
    const meta = UNIT_META[unit];

    if (unit === "spies") {
      const spyCenter = empire.buildings.find((b) => b.type === "SPY_CENTER");
      if (!spyCenter || spyCenter.level < 1) {
        return { error: "נדרש מרכז מודיעין כדי להכשיר מרגלים" };
      }
    }

    const quantity = Math.floor(empire.citizens / meta.citizenCost);
    if (quantity < 1) return { error: "אין אזרחים פנויים לאימון" };
    const citizensNeeded = quantity * meta.citizenCost;

    const debited = await tx.empire.updateMany({
      where: { id: empireId, citizens: { gte: citizensNeeded } },
      data: { citizens: { decrement: citizensNeeded } },
    });
    if (debited.count === 0) return { error: "אין מספיק אזרחים פנויים לאימון" };

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

    return {
      success: `אומנו ${quantity.toLocaleString("he-IL")} ${meta.labelPlural}!`,
    };
  });
}
