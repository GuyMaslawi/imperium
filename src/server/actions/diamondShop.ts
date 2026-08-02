"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import { bankInterestRate } from "@/lib/game/constants";
import { cityName } from "@/lib/game/cities";
import { HERO_MAX_HEALTH, isHeroDead } from "@/lib/game/hero";
import {
  BANK_INTEREST_COOLDOWN_MS,
  BANK_INTEREST_SPELL_COST,
  CITY_DOWNGRADE_COOLDOWN_HOURS,
  CITY_DOWNGRADE_COOLDOWN_MS,
  CITY_DOWNGRADE_COST,
  CITY_DOWNGRADE_MIN_CITIES,
  BOOST_DURATION_MS,
  BOOST_MAX_PCT,
  BOOST_STEP_COST,
  BOOST_STEP_PCT,
  HERO_POINTS_RESET_COST,
  HERO_REVIVE_COST,
  RESOURCE_BOOST_KIND,
  SHIELD_RENEW_COOLDOWN_MINUTES,
  SHIELD_RENEW_COOLDOWN_MS,
  SHOP_DISCOUNT_COST,
  SHOP_DISCOUNT_DURATION_MS,
  SHOP_DISCOUNT_PCT,
  TURN_PACKAGES,
  shieldMeta,
} from "@/lib/game/diamondShop";
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
 * Lock the caller's empire row for the rest of the transaction.
 *
 * The cooldown / once-per-season guards below are check-then-act: they read
 * `readyAt` / `pointsResetSeasonId`, then upsert the new value at the end. Under
 * READ COMMITTED two concurrent casts by the same player could both pass the
 * check before either persists, letting a player collect bank interest N times
 * per window, buy a cooldown turn-pack repeatedly, or double-refund hero points.
 * Taking this row lock first serializes a player's own concurrent casts, so the
 * second one blocks until the first commits and then sees the fresh cooldown.
 */
async function lockEmpire(
  tx: Prisma.TransactionClient,
  empireId: string
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Empire" WHERE id = ${empireId} FOR UPDATE`;
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
      await lockEmpire(tx, empireId);
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
  } catch (err) {
    await logError("diamondShop.buyShopDiscount", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ raid shields ------------------------------ */

// The duration is looked up in the shield's own table rather than trusted from
// the form, so a hand-rolled POST can't ask for 48 hours at the 24-hour price
// (or for a duration that was never on sale at all).
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
  const meta = shieldMeta(parsed.data.shield);
  const duration = meta.durations.find((d) => d.hours === parsed.data.hours);
  if (!duration) return { error: "משך מגן לא תקין" };

  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      await lockEmpire(tx, empireId);
      await applyPendingUpdates(empireId, tx);
      const now = new Date();

      // A shield has to run its course before it can be bought again: no
      // renewing and no extending while one is up, and then a further
      // SHIELD_RENEW_COOLDOWN_MINUTES in which the empire is exposed. Otherwise
      // a paying player could chain shields back to back and never be raidable.
      const existing = await tx.diamondEffect.findUnique({
        where: { empireId_kind: { empireId, kind: meta.kind } },
      });
      if (existing?.activeUntil && existing.activeUntil > now) {
        return {
          error: `${meta.label} עדיין פעיל — ניתן לרכוש מחדש רק ${SHIELD_RENEW_COOLDOWN_MINUTES} דקות אחרי שיסתיים`,
        };
      }
      if (existing?.readyAt && existing.readyAt > now) {
        const mins = Math.ceil((existing.readyAt.getTime() - now.getTime()) / 60_000);
        return { error: `${meta.label} בקירור — ניתן לחדש בעוד כ־${mins} דקות` };
      }

      if (!(await spendDiamonds(tx, empireId, duration.cost))) {
        return { error: "אין מספיק יהלומים" };
      }

      // Both stamps are written together: `activeUntil` is the protection,
      // `readyAt` is when the next purchase unlocks — the exposed window is the
      // gap between them.
      const activeUntil = new Date(now.getTime() + duration.hours * 3_600_000);
      const readyAt = new Date(activeUntil.getTime() + SHIELD_RENEW_COOLDOWN_MS);
      await tx.diamondEffect.upsert({
        where: { empireId_kind: { empireId, kind: meta.kind } },
        create: { empireId, kind: meta.kind, activeUntil, readyAt },
        update: { activeUntil, readyAt },
      });

      return {
        success: `${meta.label} פעיל ל־${duration.hours} השעות הבאות!`,
      };
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
  const pkg = TURN_PACKAGES[parsed.data.packageIndex];

  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx) => {
      await lockEmpire(tx, empireId);
      await applyPendingUpdates(empireId, tx);
      const now = new Date();

      // Each package has its own cooldown; the bigger the package the longer it
      // stays locked (largest → once per 12h).
      const cd = await tx.diamondEffect.findUnique({
        where: { empireId_kind: { empireId, kind: pkg.cooldownKind } },
      });
      if (cd?.readyAt && cd.readyAt > now) {
        const mins = Math.ceil((cd.readyAt.getTime() - now.getTime()) / 60_000);
        const label =
          mins >= 60 ? `כ־${Math.ceil(mins / 60)} שעות` : `כ־${mins} דקות`;
        return { error: `החבילה בקירור — זמינה בעוד ${label}` };
      }

      if (!(await spendDiamonds(tx, empireId, pkg.cost))) {
        return { error: "אין מספיק יהלומים" };
      }
      await tx.empire.update({
        where: { id: empireId },
        data: { turns: { increment: pkg.turns } },
      });

      const readyAt = new Date(now.getTime() + pkg.cooldownHours * 3_600_000);
      await tx.diamondEffect.upsert({
        where: { empireId_kind: { empireId, kind: pkg.cooldownKind } },
        create: { empireId, kind: pkg.cooldownKind, readyAt },
        update: { readyAt, activeUntil: null },
      });

      return { success: `נוספו ${pkg.turns.toLocaleString("he-IL")} תורות!` };
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
      // Increment (not absolute set) so a bank deposit/withdraw committing
      // between the read above and this write is not clobbered (lost update).
      await tx.bankAccount.update({
        where: { id: bank.id },
        data: { goldBalance: { increment: interest } },
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
  } catch (err) {
    await logError("diamondShop.castBankInterestSpell", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ city downgrade spell ------------------------------ */

/**
 * Give up exactly one city tier for diamonds — the only purchase in the shop
 * that makes the empire smaller.
 *
 * Two things make it safe to sell. It is refused below
 * CITY_DOWNGRADE_MIN_CITIES, so the last city can never be surrendered (an
 * empire with zero cities has no production multiplier, no population ceiling
 * and no boss tier — the value simply isn't legal). And the decrement is pinned
 * to the exact city count the check ran against, so a cast racing a `foundCity`
 * (which pins the same column) can only ever move the empire by one tier: the
 * loser of the race matches zero rows and the whole transaction — diamonds
 * included — rolls back rather than silently costing a second city.
 *
 * The hour-long cooldown is the other half of that guarantee at the human scale:
 * even with the row lock serialising a player's own casts, an unthrottled spell
 * would let ten clicks walk an empire from city 10 to city 1 in a second, which
 * is exactly the "I only meant to drop one" support ticket this prevents.
 *
 * Nothing is refunded; see CITY_DOWNGRADE_COST for why. Upgrades already bought
 * above the new tier's ceiling (CITIZEN_GROWTH is capped at 10 levels per city)
 * are deliberately left standing — they were paid for — they simply cannot be
 * raised again until the city is founded back.
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
      const now = new Date();

      if (empire.cities < CITY_DOWNGRADE_MIN_CITIES) {
        return {
          error: `הקסם זמין רק מעיר ${CITY_DOWNGRADE_MIN_CITIES} ומעלה — אין לך עיר לוותר עליה`,
        };
      }

      const cd = await tx.diamondEffect.findUnique({
        where: { empireId_kind: { empireId, kind: "CITY_DOWNGRADE" } },
      });
      if (cd?.readyAt && cd.readyAt > now) {
        const mins = Math.ceil((cd.readyAt.getTime() - now.getTime()) / 60_000);
        return { error: `הקסם בקירור — זמין בעוד כ־${mins} דקות` };
      }

      if (!(await spendDiamonds(tx, empireId, CITY_DOWNGRADE_COST))) {
        return { error: `דרושים ${CITY_DOWNGRADE_COST} יהלומים להטלת הקסם` };
      }

      // Pinned to the snapshot tier: exactly one city, and only from the tier the
      // guards above were checked against.
      const dropped = await tx.empire.updateMany({
        where: { id: empireId, cities: empire.cities },
        data: { cities: { decrement: 1 } },
      });
      if (dropped.count === 0) throw new Error("city downgrade conflict");

      const readyAt = new Date(now.getTime() + CITY_DOWNGRADE_COOLDOWN_MS);
      await tx.diamondEffect.upsert({
        where: { empireId_kind: { empireId, kind: "CITY_DOWNGRADE" } },
        create: { empireId, kind: "CITY_DOWNGRADE", readyAt },
        update: { readyAt, activeUntil: null },
      });

      const to = empire.cities - 1;
      return {
        success: `ירדת לעיר ${to} — ${cityName(to)}. הקסם יהיה זמין שוב בעוד ${CITY_DOWNGRADE_COOLDOWN_HOURS} שעה.`,
      };
    });

    revalidateGame();
    return result;
  } catch (err) {
    await logError("diamondShop.castCityDowngradeSpell", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

