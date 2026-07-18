"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import { bankInterestRate } from "@/lib/game/constants";
import {
  BANK_INTEREST_COOLDOWN_MS,
  BANK_INTEREST_SPELL_COST,
  BOOST_DURATION_MS,
  BOOST_MAX_PCT,
  BOOST_STEP_COST,
  BOOST_STEP_PCT,
  HERO_POINTS_RESET_COST,
  RESOURCE_BOOST_KIND,
  SHOP_DISCOUNT_COST,
  SHOP_DISCOUNT_DURATION_MS,
  SHOP_DISCOUNT_PCT,
  TURN_PACKAGES,
} from "@/lib/game/diamondShop";
import type { ActionState } from "./game";

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

/* ------------------------------ resource boost ------------------------------ */

const resourceSchema = z.enum(["gold", "wood", "iron", "stone"]);

/** Buy one +25% production boost step for a resource (24h, stacks to +200%). */
export async function buyResourceBoost(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resourceSchema.safeParse(formData.get("resource"));
  if (!parsed.success) return { error: "משאב לא תקין" };
  const resource = parsed.data;
  const kind = RESOURCE_BOOST_KIND[resource];

  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      await applyPendingUpdates(empireId, tx);
      const now = new Date();

      const existing = await tx.diamondEffect.findUnique({
        where: { empireId_kind: { empireId, kind } },
      });
      const activePct =
        existing?.activeUntil && existing.activeUntil > now ? existing.magnitude : 0;
      if (activePct >= BOOST_MAX_PCT) {
        return { error: `הבונוס כבר בתקרה (+${BOOST_MAX_PCT}%)` };
      }

      if (!(await spendDiamonds(tx, empireId, BOOST_STEP_COST))) {
        return { error: "אין מספיק יהלומים" };
      }

      const magnitude = Math.min(BOOST_MAX_PCT, activePct + BOOST_STEP_PCT);
      const activeUntil = new Date(now.getTime() + BOOST_DURATION_MS);
      await tx.diamondEffect.upsert({
        where: { empireId_kind: { empireId, kind } },
        create: { empireId, kind, magnitude, activeUntil },
        update: { magnitude, activeUntil, readyAt: null },
      });

      return { success: `בונוס תפוקה עלה ל־+${magnitude}% ל־24 שעות!` };
    });

    revalidateGame();
    return result;
  } catch {
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
      await applyPendingUpdates(empireId, tx);
      const now = new Date();

      const existing = await tx.diamondEffect.findUnique({
        where: { empireId_kind: { empireId, kind: "SHOP_DISCOUNT" } },
      });
      if (existing?.activeUntil && existing.activeUntil > now) {
        return { error: "ההנחה כבר פעילה" };
      }

      if (!(await spendDiamonds(tx, empireId, SHOP_DISCOUNT_COST))) {
        return { error: "אין מספיק יהלומים" };
      }

      const activeUntil = new Date(now.getTime() + SHOP_DISCOUNT_DURATION_MS);
      await tx.diamondEffect.upsert({
        where: { empireId_kind: { empireId, kind: "SHOP_DISCOUNT" } },
        create: { empireId, kind: "SHOP_DISCOUNT", magnitude: SHOP_DISCOUNT_PCT, activeUntil },
        update: { magnitude: SHOP_DISCOUNT_PCT, activeUntil, readyAt: null },
      });

      return { success: `הנחת ${SHOP_DISCOUNT_PCT}% על נשק ושדרוגים פעילה ל־24 שעות!` };
    });

    revalidateGame();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ turn packages ------------------------------ */

const packageSchema = z.object({
  packageIndex: z.coerce.number().int().min(0).max(TURN_PACKAGES.length - 1),
});

/** Buy a package of turns for diamonds. */
export async function buyTurns(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = packageSchema.safeParse({ packageIndex: formData.get("packageIndex") });
  if (!parsed.success) return { error: "חבילה לא תקינה" };
  const pkg = TURN_PACKAGES[parsed.data.packageIndex];

  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      await applyPendingUpdates(empireId, tx);

      if (!(await spendDiamonds(tx, empireId, pkg.cost))) {
        return { error: "אין מספיק יהלומים" };
      }
      await tx.empire.update({
        where: { id: empireId },
        data: { turns: { increment: pkg.turns } },
      });

      return { success: `נוספו ${pkg.turns.toLocaleString("he-IL")} תורות!` };
    });

    revalidateGame();
    return result;
  } catch {
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
  } catch {
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
      const empire = await applyPendingUpdates(empireId, tx);
      const now = new Date();

      const cd = await tx.diamondEffect.findUnique({
        where: { empireId_kind: { empireId, kind: "BANK_INTEREST" } },
      });
      if (cd?.readyAt && cd.readyAt > now) {
        const mins = Math.ceil((cd.readyAt.getTime() - now.getTime()) / 60_000);
        return { error: `הקסם בקירור — זמין בעוד כ־${mins} דקות` };
      }

      const bank = empire.bankAccount;
      if (!bank || bank.goldBalance <= 0) {
        return { error: "אין יתרה בבנק לצבירת ריבית" };
      }

      const interestLevel =
        empire.upgrades.find((u) => u.type === "BANK_DAILY_INTEREST")?.level ?? 1;
      const interest = Math.floor(bank.goldBalance * bankInterestRate(interestLevel));
      if (interest <= 0) return { error: "הריבית הנוכחית אפסית" };

      if (!(await spendDiamonds(tx, empireId, BANK_INTEREST_SPELL_COST))) {
        return { error: "אין מספיק יהלומים" };
      }

      const balanceAfter = bank.goldBalance + interest;
      await tx.bankAccount.update({
        where: { id: bank.id },
        data: { goldBalance: balanceAfter },
      });
      await tx.bankTransaction.create({
        data: {
          bankAccountId: bank.id,
          empireId,
          type: "INTEREST",
          amount: interest,
          balanceAfter,
          createdAt: now,
        },
      });

      const readyAt = new Date(now.getTime() + BANK_INTEREST_COOLDOWN_MS);
      await tx.diamondEffect.upsert({
        where: { empireId_kind: { empireId, kind: "BANK_INTEREST" } },
        create: { empireId, kind: "BANK_INTEREST", readyAt },
        update: { readyAt, activeUntil: null },
      });

      return {
        success: `נצברה ריבית של ${interest.toLocaleString("he-IL")} זהב לבנק!`,
      };
    });

    revalidateGame();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}
