"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import { grantCitizens } from "@/lib/game/grants";
import {
  WHEEL_PRIZES,
  pickWheelPrizeIndex,
  seasonCycle,
  wheelPrizeAmount,
  type WheelGrant,
  type WheelPrizeDef,
} from "@/lib/game/wheel";
import { HERO_BAG_CAPACITY, itemDisplayName, rollGuaranteedItem } from "@/lib/game/hero";
import { awardSeasonPassXp } from "../seasonPassXp";
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
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

const heNum = (n: number) => Math.round(n).toLocaleString("he-IL");

/**
 * Grant a won prize to the empire and return the reveal message. Every branch
 * writes to the DB — the wheel actually pays out. Amount prizes grow with the
 * daily-update cycle; the one unit prize (a hero item) is a concrete grant.
 */
async function grantPrize(
  tx: Prisma.TransactionClient,
  empire: FullEmpire,
  prize: WheelPrizeDef,
  cycle: number
): Promise<{ message: string; grants: WheelGrant[] }> {
  const empireId = empire.id;
  const amount = wheelPrizeAmount(prize, cycle);

  switch (prize.key) {
    case "diamonds":
      await tx.empire.update({ where: { id: empireId }, data: { diamonds: { increment: amount } } });
      return { message: `זכית ב־${heNum(amount)} יהלומים!`, grants: [{ key: "diamonds", amount }] };
    case "gold":
      await tx.empire.update({ where: { id: empireId }, data: { gold: { increment: amount } } });
      return { message: `זכית ב־${heNum(amount)} זהב!`, grants: [{ key: "gold", amount }] };
    case "iron":
      await tx.empire.update({ where: { id: empireId }, data: { iron: { increment: amount } } });
      return { message: `זכית ב־${heNum(amount)} ברזל!`, grants: [{ key: "iron", amount }] };
    case "stone":
      await tx.empire.update({ where: { id: empireId }, data: { stone: { increment: amount } } });
      return { message: `זכית ב־${heNum(amount)} אבן!`, grants: [{ key: "stone", amount }] };
    case "wood":
      await tx.empire.update({ where: { id: empireId }, data: { wood: { increment: amount } } });
      return { message: `זכית ב־${heNum(amount)} עץ!`, grants: [{ key: "wood", amount }] };
    case "citizens":
      // Capped by city count — see grantCitizens.
      await grantCitizens(tx, empireId, amount);
      return { message: `זכית ב־${heNum(amount)} אזרחים!`, grants: [{ key: "citizens", amount }] };
    case "item": {
      const hero = empire.hero;
      // Take the hero row lock and re-count the bag *under* it. `empire.hero.items`
      // is the snapshot from applyPendingUpdates, taken before the spin was even
      // consumed: two concurrent spins that both rolled this wedge each read the
      // same pre-spin count, both passed the capacity check, and both created an
      // item — overflowing HERO_BAG_CAPACITY. Mirrors lockHero in hero.ts, which
      // exists for exactly this on equip/unequip.
      let bagCount = 0;
      if (hero) {
        await tx.$queryRaw`SELECT id FROM "Hero" WHERE id = ${hero.id} FOR UPDATE`;
        bagCount = await tx.heroItem.count({
          where: { heroId: hero.id, equipped: false },
        });
      }
      if (hero && bagCount < HERO_BAG_CAPACITY) {
        // The wedge already decided an item is won, so roll one that always
        // drops but keeps the relative rarity odds — forcing the drop gate to
        // zero would have handed out the commonest tier every single time.
        const drop = rollGuaranteedItem(hero.level);
        await tx.heroItem.create({ data: { heroId: hero.id, ...drop } });
        return {
          message: `זכית ב־${itemDisplayName(drop.slot, drop.level)} לתיק הגיבור!`,
          grants: [{ key: "item", amount: 1 }],
        };
      }
      // No room / no hero — pay a gold consolation so the spin isn't wasted.
      const consolation = wheelPrizeAmount(
        WHEEL_PRIZES.find((p) => p.key === "gold")!,
        cycle
      );
      await tx.empire.update({
        where: { id: empireId },
        data: { gold: { increment: consolation } },
      });
      // Grant reflects what actually landed (gold), not the item wedge.
      return {
        message: `התיק מלא — קיבלת ${heNum(consolation)} זהב במקום החפץ.`,
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
      const cycle = seasonCycle(season, Date.now());

      const prizeIndex = pickWheelPrizeIndex();
      const { message, grants } = await grantPrize(tx, empire, WHEEL_PRIZES[prizeIndex], cycle);
      await awardSeasonPassXp(tx, empireId, "wheelSpin");

      return { ok: true, prizeIndex, message, grants, spinsLeft: empire.wheelSpins - 1 };
    });

    revalidatePath("/game", "layout");
    return result;
  } catch {
    return { ok: false, error: "אירעה שגיאה, נסה שוב" };
  }
}
