"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import {
  HERO_BAG_CAPACITY,
  HERO_MAX_LEVEL,
  HERO_RESET_CITIZENS,
  HERO_RESET_POINTS,
  HERO_STAT_META,
  canEquipItem,
  itemDisplayName,
} from "@/lib/game/hero";
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

/* ------------------------------ allocate points ------------------------------ */

const allocateSchema = z.object({
  stat: z.enum(["attack", "defense", "resources"]),
  amount: z.coerce.number().int().min(1).max(1000),
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

      return { success: `${itemDisplayName(item.slot, item.rarity)} נלבש!` };
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

      return { success: `${itemDisplayName(item.slot, item.rarity)} הוסר לתיק` };
    });

    revalidateGame();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}
