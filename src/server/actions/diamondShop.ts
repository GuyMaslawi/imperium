"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import { HERO_MAX_HEALTH, isHeroDead } from "@/lib/game/hero";
import {
  HERO_POINTS_RESET_COST,
  HERO_REVIVE_COST,
  TURN_PACKAGES,
} from "@/lib/game/diamondShop";
import {
  castBankInterest,
  castCityDowngrade,
  castRaidShield,
  castResourceBoost,
  castShopDiscount,
  castTurnPackage,
  lockEmpire,
  type CastContext,
} from "@/server/diamondEffects";
import type { ActionState } from "./game";
import { logError } from "@/server/errorLog";

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

function revalidateGame() {
  revalidatePath("/game", "layout");
}

/**
 * Guarded diamond spend — concurrent purchases can never drive the balance
 * negative; returns false when the empire lacks enough diamonds.
 */
async function spendDiamonds(
  tx: Prisma.TransactionClient,
  empireId: string,
  cost: number
): Promise<boolean> {
  const updated = await tx.empire.updateMany({
    where: { id: empireId, diamonds: { gte: cost } },
    data: { diamonds: { decrement: cost } },
  });
  return updated.count > 0;
}

/**
 * The cast context for a *paying* caster: real diamonds, real cooldowns.
 *
 * The effects themselves live in `@/server/diamondEffects`, shared with the
 * admin player editor, which casts the same spells for free — see that module
 * for what the two callers do and don't have in common.
 */
function playerCast(tx: Prisma.TransactionClient, empireId: string): CastContext {
  return {
    tx,
    empireId,
    now: new Date(),
    charge: (cost) => spendDiamonds(tx, empireId, cost),
  };
}

/* ------------------------------ resource boost ------------------------------ */

const resourceSchema = z.enum(["gold", "wood", "iron", "stone"]);

/** Buy one +25% production boost step for a resource (24h, stacks to +200%). */
export async function buyResourceBoost(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resourceSchema.safeParse(formData.get("resource"));
  if (!parsed.success) return { error: "משאב לא תקין" };

  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      await lockEmpire(tx, empireId);
      await applyPendingUpdates(empireId, tx);
      return castResourceBoost(playerCast(tx, empireId), parsed.data);
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("diamondShop.buyResourceBoost", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ shop discount ------------------------------ */

/** Buy a 20% discount on weapons + upgrades for 24 hours. */
export async function buyShopDiscount(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      await lockEmpire(tx, empireId);
      await applyPendingUpdates(empireId, tx);
      return castShopDiscount(playerCast(tx, empireId));
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("diamondShop.buyShopDiscount", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ raid shields ------------------------------ */

const shieldSchema = z.object({
  shield: z.enum(["resources", "soldiers"]),
  hours: z
    .string()
    .min(1)
    .transform((s) => Number(s))
    .pipe(z.number().int().positive()),
});

/** Buy (or extend) a raid shield for a fixed number of hours. */
export async function buyRaidShield(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = shieldSchema.safeParse({
    shield: formData.get("shield"),
    hours: formData.get("hours"),
  });
  if (!parsed.success) return { error: "מגן לא תקין" };

  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      await lockEmpire(tx, empireId);
      await applyPendingUpdates(empireId, tx);
      return castRaidShield(
        playerCast(tx, empireId),
        parsed.data.shield,
        parsed.data.hours
      );
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("diamondShop.buyRaidShield", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ turn packages ------------------------------ */

// `z.coerce.number()` alone treated a *missing* field as valid: FormData.get
// returns null for an absent key, Number(null) is 0, and 0 is a legal index —
// so a POST with no `packageIndex` at all silently bought package 0. Requiring
// a non-empty string first makes an omitted field a parse failure.
const packageSchema = z.object({
  packageIndex: z
    .string()
    .min(1)
    .transform((s) => Number(s))
    .pipe(z.number().int().min(0).max(TURN_PACKAGES.length - 1)),
});

/** Buy a package of turns for diamonds. */
export async function buyTurns(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = packageSchema.safeParse({ packageIndex: formData.get("packageIndex") });
  if (!parsed.success) return { error: "חבילה לא תקינה" };

  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      await lockEmpire(tx, empireId);
      await applyPendingUpdates(empireId, tx);
      return castTurnPackage(playerCast(tx, empireId), parsed.data.packageIndex);
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("diamondShop.buyTurns", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ hero points reset ------------------------------ */

/** Refund all allocated hero points back to "unspent" — once per season. */
export async function resetHeroPointsWithDiamonds(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      await lockEmpire(tx, empireId);
      const empire = await applyPendingUpdates(empireId, tx);
      const hero = empire.hero;
      if (!hero) return { error: "הגיבור לא נמצא" };

      const activeSeason = await tx.gameSeason.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      const seasonId = activeSeason?.id ?? "none";
      if (hero.pointsResetSeasonId === seasonId) {
        return { error: "כבר אפסת נקודות גיבור העונה" };
      }

      const allocated = hero.attackPoints + hero.defensePoints + hero.resourcePoints;
      if (allocated === 0) return { error: "אין נקודות מוקצות לאיפוס" };

      if (!(await spendDiamonds(tx, empireId, HERO_POINTS_RESET_COST))) {
        return { error: "אין מספיק יהלומים" };
      }

      await tx.hero.update({
        where: { id: hero.id },
        data: {
          unspentPoints: { increment: allocated },
          attackPoints: 0,
          defensePoints: 0,
          resourcePoints: 0,
          pointsResetSeasonId: seasonId,
        },
      });

      return { success: `${allocated} נקודות גיבור שוחררו מחדש להקצאה!` };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("diamondShop.resetHeroPointsWithDiamonds", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ hero revival ------------------------------ */

/**
 * Raise a fallen hero to full health immediately, for diamonds. The free path
 * is simply waiting: applyPendingUpdates revives him an hour after he fell, so
 * this only buys back the hour — and with it every bonus he carries.
 */
export async function reviveHeroWithDiamonds(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      // The empire lock also serializes against an incoming attack (which locks
      // both empire rows before wounding the hero), so a raid can never land on
      // top of the revival and knock the freshly-raised hero straight back down.
      await lockEmpire(tx, empireId);
      // Applies the free hourly revival first, if it is already due — the
      // player is never charged for an hour that has quietly passed.
      const empire = await applyPendingUpdates(empireId, tx);
      const hero = empire.hero;
      if (!hero) return { error: "הגיבור לא נמצא" };
      if (!isHeroDead(hero)) return { error: "הגיבור בחיים — אין צורך בהחייאה" };

      if (!(await spendDiamonds(tx, empireId, HERO_REVIVE_COST))) {
        return { error: `דרושים ${HERO_REVIVE_COST} יהלומים להחייאת הגיבור` };
      }

      // Guarded on "still dead": if anything raised him between the check and
      // here, throw so the whole transaction — diamonds included — rolls back.
      const raised = await tx.hero.updateMany({
        where: { id: hero.id, health: { lte: 0 } },
        data: { health: HERO_MAX_HEALTH, diedAt: null },
      });
      if (raised.count === 0) throw new Error("hero revive conflict");

      return { success: "הגיבור קם לתחייה עם 100% חיים — כל הבונוסים שלו חזרו!" };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("diamondShop.reviveHeroWithDiamonds", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ bank interest spell ------------------------------ */

/** Instantly collect one interest payment into the bank — once per 24h. */
export async function castBankInterestSpell(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      await lockEmpire(tx, empireId);
      const empire = await applyPendingUpdates(empireId, tx);
      return castBankInterest(playerCast(tx, empireId), empire);
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("diamondShop.castBankInterestSpell", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ city downgrade spell ------------------------------ */

/**
 * Give up exactly one city tier for diamonds — the only purchase in the shop
 * that makes the empire smaller. The guards (the floor at
 * CITY_DOWNGRADE_MIN_CITIES, the pinned decrement) live with the effect in
 * `@/server/diamondEffects`.
 *
 * The hour-long cooldown is the human-scale half of that guarantee: even with
 * the row lock serialising a player's own casts, an unthrottled spell would let
 * ten clicks walk an empire from city 10 to city 1 in a second, which is exactly
 * the "I only meant to drop one" support ticket this prevents.
 */
export async function castCityDowngradeSpell(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      await lockEmpire(tx, empireId);
      const empire = await applyPendingUpdates(empireId, tx);
      return castCityDowngrade(playerCast(tx, empireId), empire);
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("diamondShop.castCityDowngradeSpell", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

