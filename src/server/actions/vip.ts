"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import { VIP_COST, VIP_LABEL, isVip } from "@/lib/game/vip";
import type { ActionState } from "./game";
import { logError } from "@/server/errorLog";

/**
 * Buying the VIP pass.
 *
 * The pass has no actions of its own: what it unlocks are the game's existing
 * one-click bulk buttons, and each of those is gated where it already lives
 * (bank.ts, game.ts) by re-reading `vipSince` inside its own transaction. A
 * rendered button is not an authorisation — a hand-rolled POST is exactly as
 * easy against "הפקד הכל" as against any other action, and that server-side
 * re-check is the thing that actually stops it.
 */

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
    // Enforces the ban on the purchase too (not just page loads); see
    // getActiveEmpireId.
    const empireId = await getActiveEmpireId();
    if (empireId === null) throw new Error("לא מחובר");

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

    revalidatePath("/game", "layout");
    return result;
  } catch (err) {
    await logError("vip.buyVip", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}
