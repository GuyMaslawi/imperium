"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveEmpireId } from "@/lib/auth";
import { runBossFight, type BossFightOutcome } from "@/server/bossFight";
import { logError } from "@/server/errorLog";

export interface BossActionState {
  error?: string;
}

/**
 * Server action behind the boss banner's CTA. It owns exactly one thing the
 * resolver does not: proving the caller owns the empire being marched.
 * `getActiveEmpireId` also enforces the ban and email-verification gates, so
 * the mutation surface is closed to accounts that cannot load the page.
 */
export async function attackCityBoss(): Promise<BossActionState> {
  let outcome: BossFightOutcome;

  try {
    const empireId = await getActiveEmpireId();
    if (empireId === null) return { error: "לא מחובר" };
    outcome = await runBossFight(empireId);
    revalidatePath("/game", "layout");
  } catch (err) {
    await logError("boss.attackCityBoss", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }

  if ("error" in outcome) return outcome;
  // redirect() throws NEXT_REDIRECT — must run outside the try/catch above.
  redirect(`/game/boss/${outcome.fightId}`);
}
