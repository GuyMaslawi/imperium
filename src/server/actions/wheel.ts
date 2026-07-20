"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import {
  WHEEL_PRIZES,
  pickWheelPrizeIndex,
  seasonDay,
  wheelPrizeAmount,
  type WheelGrant,
  type WheelPrizeDef,
} from "@/lib/game/wheel";
import {
  INITIAL_WEAPON_UNLOCKED_TIER,
  WEAPON_CATEGORIES,
  weaponsOfCategory,
} from "@/lib/game/weapons";
import { HERO_BAG_CAPACITY, itemDisplayName, rollItemDrop } from "@/lib/game/hero";
import type { FullEmpire } from "@/lib/game/updates";

/** What a spin returns to the client so it can animate to the right wedge. */
export type SpinResult =
  | {
      ok: true;
      prizeIndex: number;
      message: string;
      /** Exactly what was granted, so a batch can total each prize precisely. */
      grants: WheelGrant[];
      spinsLeft: number;
    }
  | { ok: false; error: string };

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

const heNum = (n: number) => Math.round(n).toLocaleString("he-IL");

/**
 * Grant a won prize to the empire and return the reveal message. Every branch
 * writes to the DB — the wheel actually pays out. Amount prizes grow with the
 * season day; unit prizes (all weapons, hero item) are concrete grants.
 */
async function grantPrize(
  tx: Prisma.TransactionClient,
  empire: FullEmpire,
  prize: WheelPrizeDef,
  day: number
): Promise<{ message: string; grants: WheelGrant[] }> {
  const empireId = empire.id;
  const amount = wheelPrizeAmount(prize, day);

  switch (prize.key) {
    case "diamonds":
      await tx.empire.update({ where: { id: empireId }, data: { diamonds: { increment: amount } } });
      return { message: `זכית ב־💎 ${heNum(amount)} יהלומים!`, grants: [{ key: "diamonds", amount }] };
    case "turns":
      await tx.empire.update({ where: { id: empireId }, data: { turns: { increment: amount } } });
      return { message: `זכית ב־🔄 ${heNum(amount)} תורות!`, grants: [{ key: "turns", amount }] };
    case "gold":
      await tx.empire.update({ where: { id: empireId }, data: { gold: { increment: amount } } });
      return { message: `זכית ב־🪙 ${heNum(amount)} זהב!`, grants: [{ key: "gold", amount }] };
    case "iron":
      await tx.empire.update({ where: { id: empireId }, data: { iron: { increment: amount } } });
      return { message: `זכית ב־⚙️ ${heNum(amount)} ברזל!`, grants: [{ key: "iron", amount }] };
    case "stone":
      await tx.empire.update({ where: { id: empireId }, data: { stone: { increment: amount } } });
      return { message: `זכית ב־🪨 ${heNum(amount)} אבן!`, grants: [{ key: "stone", amount }] };
    case "wood":
      await tx.empire.update({ where: { id: empireId }, data: { wood: { increment: amount } } });
      return { message: `זכית ב־🪵 ${heNum(amount)} עץ!`, grants: [{ key: "wood", amount }] };
    case "citizens":
      await tx.empire.update({ where: { id: empireId }, data: { citizens: { increment: amount } } });
      return { message: `זכית ב־👥 ${heNum(amount)} אזרחים!`, grants: [{ key: "citizens", amount }] };
    case "loot": {
      // Mixed resource pack: split the gold-value evenly across all four.
      const each = Math.round(amount / 4);
      await tx.empire.update({
        where: { id: empireId },
        data: {
          gold: { increment: each },
          wood: { increment: each },
          iron: { increment: each },
          stone: { increment: each },
        },
      });
      return {
        message: `זכית ב־🎁 חבילת שלל: ${heNum(each)} מכל משאב!`,
        // Report the split so a batch totals each resource exactly.
        grants: [
          { key: "gold", amount: each },
          { key: "wood", amount: each },
          { key: "iron", amount: each },
          { key: "stone", amount: each },
        ],
      };
    }
    case "allWeapons": {
      // One of every weapon the empire has already unlocked, per category.
      let granted = 0;
      for (const category of WEAPON_CATEGORIES) {
        const unlockedTier =
          empire.weaponUnlocks.find((u) => u.category === category)?.unlockedTier ??
          INITIAL_WEAPON_UNLOCKED_TIER;
        for (const weapon of weaponsOfCategory(category)) {
          if (weapon.tier > unlockedTier) continue;
          await tx.empireWeapon.upsert({
            where: { empireId_weaponKey: { empireId, weaponKey: weapon.key } },
            create: { empireId, weaponKey: weapon.key, quantity: 1 },
            update: { quantity: { increment: 1 } },
          });
          granted += 1;
        }
      }
      return {
        message: `זכית ב־🗡️ אחד מכל ${heNum(granted)} סוגי הנשק שפתחת!`,
        grants: [{ key: "allWeapons", amount: granted }],
      };
    }
    case "item": {
      const hero = empire.hero;
      const bagCount = hero ? hero.items.filter((i) => !i.equipped).length : 0;
      if (hero && bagCount < HERO_BAG_CAPACITY) {
        // Force a guaranteed drop (bypass the item-drop chance gate).
        let first = true;
        const drop = rollItemDrop(hero.level, () => {
          if (first) {
            first = false;
            return 0;
          }
          return Math.random();
        });
        if (drop) {
          await tx.heroItem.create({ data: { heroId: hero.id, ...drop } });
          return {
            message: `זכית ב־✨ ${itemDisplayName(drop.slot, drop.level)} לתיק הגיבור!`,
            grants: [{ key: "item", amount: 1 }],
          };
        }
      }
      // No room / no hero — pay a gold consolation so the spin isn't wasted.
      const consolation = wheelPrizeAmount(
        WHEEL_PRIZES.find((p) => p.key === "gold")!,
        day
      );
      await tx.empire.update({
        where: { id: empireId },
        data: { gold: { increment: consolation } },
      });
      // Grant reflects what actually landed (gold), not the item wedge.
      return {
        message: `התיק מלא — קיבלת 🪙 ${heNum(consolation)} זהב במקום החפץ.`,
        grants: [{ key: "gold", amount: consolation }],
      };
    }
    default:
      return { message: "זכית בפרס!", grants: [] };
  }
}

/** Spin the wheel: consume one spin, roll a prize server-side, and pay it out. */
export async function spinWheel(): Promise<SpinResult> {
  try {
    const empireId = await requireOwnEmpireId();
    const result = await prisma.$transaction(async (tx): Promise<SpinResult> => {
      const empire = await applyPendingUpdates(empireId, tx);

      // Guarded consume — can never drive spins negative under concurrency.
      const consumed = await tx.empire.updateMany({
        where: { id: empireId, wheelSpins: { gte: 1 } },
        data: { wheelSpins: { decrement: 1 } },
      });
      if (consumed.count === 0) {
        return { ok: false, error: "אין סיבובים זמינים" };
      }

      const season = empire.seasonId
        ? await tx.gameSeason.findUnique({ where: { id: empire.seasonId } })
        : null;
      const day = seasonDay(season, Date.now());

      const prizeIndex = pickWheelPrizeIndex();
      const { message, grants } = await grantPrize(tx, empire, WHEEL_PRIZES[prizeIndex], day);

      return { ok: true, prizeIndex, message, grants, spinsLeft: empire.wheelSpins - 1 };
    });

    revalidatePath("/game", "layout");
    return result;
  } catch {
    return { ok: false, error: "אירעה שגיאה, נסה שוב" };
  }
}
