"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import {
  HERO_BAG_CAPACITY,
  HERO_MAX_LEVEL,
  HERO_RESET_CITIZENS,
  HERO_RESET_POINTS,
  HERO_STAT_META,
  RARITY_META,
  canEquipItem,
  canUpgradeItem,
  itemDisplayName,
  itemUpgradeCost,
  nextTierLevel,
  rollDiscardWheelSpin,
  tierForLevel,
} from "@/lib/game/hero";
import type { ActionState } from "./game";

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

function revalidateGame() {
  revalidatePath("/game", "layout");
}

/* ------------------------------ allocate points ------------------------------ */

const allocateSchema = z.object({
  stat: z.enum(["attack", "defense", "resources"]),
  amount: z.coerce.number().int().min(1).max(1_000_000),
});

/**
 * Spend unspent hero points on a stat. Each point is a permanent +1% to
 * attack, defense or resource production (points return on a hero reset).
 */
export async function allocateHeroPoints(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = allocateSchema.safeParse({
    stat: formData.get("stat"),
    amount: formData.get("amount") ?? 1,
  });
  if (!parsed.success) return { error: "בחירה לא תקינה" };
  const { stat, amount } = parsed.data;
  const meta = HERO_STAT_META[stat];
  const pointsField = meta.pointsField;
  if (!pointsField) return { error: "בחירה לא תקינה" }; // item-only stat

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const hero = empire.hero;
      if (!hero) return { error: "הגיבור לא נמצא" };

      // Guarded decrement — a concurrent allocation can never overspend.
      const spent = await tx.hero.updateMany({
        where: { id: hero.id, unspentPoints: { gte: amount } },
        data: {
          unspentPoints: { decrement: amount },
          [pointsField]: { increment: amount },
        },
      });
      if (spent.count === 0) return { error: "אין מספיק נקודות גיבור פנויות" };

      return { success: `+${amount}% ${meta.label} — הנקודות הוקצו!` };
    });

    revalidateGame();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ reset (prestige) ------------------------------ */

/**
 * Level-100 hero reset: the hero returns to level 1, all allocated points
 * are wiped, and the empire receives 2,500 citizens plus 25 fresh hero
 * points. The reset counter marks the hero as prestiged.
 */
export async function resetHero(): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const hero = empire.hero;
      if (!hero) return { error: "הגיבור לא נמצא" };

      // Guarded on level — a double-submit can never reset twice.
      const reset = await tx.hero.updateMany({
        where: { id: hero.id, level: { gte: HERO_MAX_LEVEL } },
        data: {
          level: 1,
          xp: 0,
          unspentPoints: HERO_RESET_POINTS,
          attackPoints: 0,
          defensePoints: 0,
          resourcePoints: 0,
          resets: { increment: 1 },
        },
      });
      if (reset.count === 0) {
        return { error: `איפוס גיבור זמין רק ברמה ${HERO_MAX_LEVEL}` };
      }

      // A level-1 hero can no longer carry high-level gear — back to the bag.
      await tx.heroItem.updateMany({
        where: { heroId: hero.id, equipped: true, level: { gt: 1 } },
        data: { equipped: false },
      });

      await tx.empire.update({
        where: { id: empireId },
        data: { citizens: { increment: HERO_RESET_CITIZENS } },
      });

      return {
        success: `הגיבור אופס! קיבלת ${HERO_RESET_CITIZENS.toLocaleString("he-IL")} אזרחים ו-${HERO_RESET_POINTS} נקודות גיבור`,
      };
    });

    revalidateGame();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ equip / unequip ------------------------------ */

const itemSchema = z.object({ itemId: z.string().min(1) });

export async function equipHeroItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = itemSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return { error: "פריט לא תקין" };
  const { itemId } = parsed.data;

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const hero = empire.hero;
      if (!hero) return { error: "הגיבור לא נמצא" };

      const item = hero.items.find((i) => i.id === itemId);
      if (!item) return { error: "הפריט לא נמצא בתיק שלך" };
      if (item.equipped) return { error: "הפריט כבר לבוש" };
      if (!canEquipItem(hero.level, item.level)) {
        return {
          error: `דרוש גיבור רמה ${item.level} כדי ללבוש את הפריט (אתה ברמה ${hero.level})`,
        };
      }

      // Swap: the currently equipped item in that slot returns to the bag.
      await tx.heroItem.updateMany({
        where: { heroId: hero.id, slot: item.slot, equipped: true },
        data: { equipped: false },
      });
      await tx.heroItem.update({
        where: { id: item.id },
        data: { equipped: true },
      });

      return { success: `${itemDisplayName(item.slot, item.level)} נלבש!` };
    });

    revalidateGame();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

export async function unequipHeroItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = itemSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return { error: "פריט לא תקין" };
  const { itemId } = parsed.data;

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const hero = empire.hero;
      if (!hero) return { error: "הגיבור לא נמצא" };

      const item = hero.items.find((i) => i.id === itemId);
      if (!item || !item.equipped) return { error: "הפריט אינו לבוש" };

      const bagCount = hero.items.filter((i) => !i.equipped).length;
      if (bagCount >= HERO_BAG_CAPACITY) {
        return { error: "התיק מלא — לא ניתן להסיר את הפריט" };
      }

      await tx.heroItem.update({
        where: { id: item.id },
        data: { equipped: false },
      });

      return { success: `${itemDisplayName(item.slot, item.level)} הוסר לתיק` };
    });

    revalidateGame();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ discard ------------------------------ */

/** Permanently throw away a single owned item (bag or equipped). */
export async function discardHeroItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = itemSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return { error: "פריט לא תקין" };
  const { itemId } = parsed.data;

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const hero = empire.hero;
      if (!hero) return { error: "הגיבור לא נמצא" };

      const item = hero.items.find((i) => i.id === itemId);
      if (!item) return { error: "הפריט לא נמצא בתיק שלך" };

      // Scope the delete to this hero so a stale id can't touch another's gear.
      await tx.heroItem.deleteMany({ where: { id: item.id, heroId: hero.id } });

      // The fates may reward parting with gear — rarer items pay far more often
      // (אגדי pays 1-in-10). The server owns the roll.
      const wonSpin = rollDiscardWheelSpin(item.level);
      if (wonSpin) {
        await tx.empire.update({
          where: { id: empireId },
          data: { wheelSpins: { increment: 1 } },
        });
      }

      const name = itemDisplayName(item.slot, item.level);
      return {
        success: wonSpin
          ? `${name} נזרק — ומזל טוב! 🎡 זכית בסיבוב גלגל מזל!`
          : `${name} נזרק`,
      };
    });

    revalidateGame();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

const itemIdsSchema = z.object({
  itemIds: z
    .string()
    .min(1)
    .transform((s) => s.split(",").map((id) => id.trim()).filter(Boolean)),
});

/** Permanently throw away many owned items at once (bulk from the bag). */
export async function discardHeroItems(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = itemIdsSchema.safeParse({ itemIds: formData.get("itemIds") });
  if (!parsed.success || parsed.data.itemIds.length === 0) {
    return { error: "לא נבחרו פריטים" };
  }
  const ids = new Set(parsed.data.itemIds);

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const hero = empire.hero;
      if (!hero) return { error: "הגיבור לא נמצא" };

      const owned = hero.items.filter((i) => ids.has(i.id));
      if (owned.length === 0) return { error: "הפריטים לא נמצאו בתיק שלך" };

      const { count } = await tx.heroItem.deleteMany({
        where: { id: { in: owned.map((i) => i.id) }, heroId: hero.id },
      });

      // Roll each thrown item independently — rarer gear pays a wheel spin far
      // more often (אגדי pays 1-in-10). The server owns every roll.
      let spinsWon = 0;
      for (const item of owned) if (rollDiscardWheelSpin(item.level)) spinsWon += 1;
      if (spinsWon > 0) {
        await tx.empire.update({
          where: { id: empireId },
          data: { wheelSpins: { increment: spinsWon } },
        });
      }

      return {
        success:
          spinsWon > 0
            ? `${count} חפצים נזרקו — ומזל טוב! 🎡 זכית ב-${spinsWon} סיבובי גלגל מזל!`
            : `${count} חפצים נזרקו`,
      };
    });

    revalidateGame();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ upgrade ------------------------------ */

/** Upgrade a single item to the next tier level, paying the gold cost. */
export async function upgradeHeroItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = itemSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return { error: "פריט לא תקין" };
  const { itemId } = parsed.data;

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const hero = empire.hero;
      if (!hero) return { error: "הגיבור לא נמצא" };

      const item = hero.items.find((i) => i.id === itemId);
      if (!item) return { error: "הפריט לא נמצא בתיק שלך" };

      const targetLevel = nextTierLevel(item.level);
      if (targetLevel === null) return { error: "הפריט כבר ברמה הגבוהה ביותר" };

      // Can't push an item above the hero's own level.
      if (hero.level < targetLevel) {
        return {
          error: `דרוש גיבור רמה ${targetLevel} כדי לשדרג (אתה ברמה ${hero.level})`,
        };
      }

      const cost = itemUpgradeCost(item.level) ?? 0;
      if (empire.gold < cost) {
        return {
          error: `דרוש ${cost.toLocaleString("he-IL")} זהב לשדרוג (יש לך ${Math.floor(
            empire.gold
          ).toLocaleString("he-IL")})`,
        };
      }

      // Guarded decrement — a concurrent spend can never take gold below zero.
      const paid = await tx.empire.updateMany({
        where: { id: empireId, gold: { gte: cost } },
        data: { gold: { decrement: cost } },
      });
      if (paid.count === 0) return { error: "אין מספיק זהב לשדרוג" };

      // Level drives the item's stats and tier; keep the stored tier in sync.
      // Guard on the level we read and paid for: if a concurrent upgrade already
      // advanced this item, throw to roll back the gold debit above rather than
      // charging twice for a single tier gain.
      const upgraded = await tx.heroItem.updateMany({
        where: { id: item.id, level: item.level },
        data: { level: targetLevel, rarity: tierForLevel(targetLevel) },
      });
      if (upgraded.count === 0) throw new Error("item upgrade conflict");

      return {
        success: `${itemDisplayName(item.slot, item.level)} שודרג לרמה ${targetLevel} (${RARITY_META[tierForLevel(targetLevel)].label})!`,
      };
    });

    revalidateGame();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/**
 * Upgrade many items at once, cheapest first, until the gold runs out. Items
 * already at the max level are skipped. Reports how many actually upgraded.
 */
export async function upgradeHeroItems(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = itemIdsSchema.safeParse({ itemIds: formData.get("itemIds") });
  if (!parsed.success || parsed.data.itemIds.length === 0) {
    return { error: "לא נבחרו פריטים" };
  }
  const ids = new Set(parsed.data.itemIds);

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      const hero = empire.hero;
      if (!hero) return { error: "הגיבור לא נמצא" };

      // Only upgradeable items (not at max level, and whose next level the hero
      // is high enough to reach), cheapest first so a limited gold budget buys
      // as many upgrades as possible.
      const upgradeable = hero.items
        .filter((i) => ids.has(i.id) && canUpgradeItem(hero.level, i.level))
        .map((i) => ({
          item: i,
          targetLevel: nextTierLevel(i.level)!,
          cost: itemUpgradeCost(i.level) ?? 0,
        }))
        .sort((a, b) => a.cost - b.cost);

      if (upgradeable.length === 0) {
        return { error: "אין פריטים לשדרוג מבין הנבחרים" };
      }

      // First build the upgrade plan WITHOUT mutating anything, so payment can
      // be taken (and verified) before any item level is written. Applying the
      // item updates first and only then paying would commit the upgrades even
      // when the guarded payment fails under a concurrent gold spend.
      let budget = empire.gold;
      let spent = 0;
      const plan: { itemId: string; targetLevel: number }[] = [];
      for (const { item, targetLevel, cost } of upgradeable) {
        if (cost > budget) break;
        plan.push({ itemId: item.id, targetLevel });
        budget -= cost;
        spent += cost;
      }

      if (plan.length === 0) {
        const cheapest = upgradeable[0].cost;
        return {
          error: `אין מספיק זהב — השדרוג הזול ביותר עולה ${cheapest.toLocaleString(
            "he-IL"
          )} זהב`,
        };
      }

      // Guarded decrement of the exact total spent — pay before applying.
      const paid = await tx.empire.updateMany({
        where: { id: empireId, gold: { gte: spent } },
        data: { gold: { decrement: spent } },
      });
      if (paid.count === 0) return { error: "אין מספיק זהב לשדרוג" };

      for (const { itemId, targetLevel } of plan) {
        await tx.heroItem.update({
          where: { id: itemId },
          data: { level: targetLevel, rarity: tierForLevel(targetLevel) },
        });
      }

      const upgraded = plan.length;
      const skipped = upgradeable.length - upgraded;
      const suffix = skipped > 0 ? ` (${skipped} לא שודרגו — חסר זהב)` : "";
      return {
        success: `${upgraded} חפצים שודרגו תמורת ${spent.toLocaleString("he-IL")} זהב${suffix}`,
      };
    });

    revalidateGame();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}
