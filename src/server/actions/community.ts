"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { logError } from "@/server/errorLog";
import { discordInviteUrl } from "@/server/discord";
import { DISCORD_JOIN_DIAMONDS } from "@/lib/community";

export interface ClaimDiscordResult {
  ok: boolean;
  error?: string;
  /** Diamonds actually credited by *this* call. */
  diamonds?: number;
  /**
   * The purse was already taken — by an earlier click, another tab, or the
   * losing side of a double submit. Flagged rather than left for the caller to
   * recognise by its message: the UI answers it by showing the collected state,
   * which is not the same thing as showing an error.
   */
  alreadyClaimed?: boolean;
}

/**
 * Collect the one-time welcome purse for joining the community channel.
 *
 * Honour-based, and openly so: no bot reports back from Discord, so what this
 * really pays for is pressing the button after the invite opened. The design
 * follows from that rather than pretending otherwise — the purse is small
 * enough that farming it from alternate accounts is a waste of an afternoon
 * (see DISCORD_JOIN_DIAMONDS), and the copy on /game/community says plainly
 * that it is paid on trust.
 *
 * The whole payout is **one guarded statement**. `discordJoinedAt IS NULL` lives
 * in the WHERE, not in an `if` above it: a read-then-write check would let two
 * simultaneous clicks both see "not claimed yet" and both credit — the same
 * TOCTOU that every resource spend in this codebase avoids the same way. The
 * loser of the race matches zero rows and is told it was already collected.
 */
export async function claimDiscordReward(): Promise<ClaimDiscordResult> {
  try {
    // Also enforces the ban / email-verification gate on the action itself,
    // not merely on the page that renders the button.
    const empireId = await getActiveEmpireId();
    if (empireId === null) return { ok: false, error: "לא מחובר" };

    // No channel, no reward. Without this the purse would be collectable during
    // exactly the window this whole feature was built for — the days before the
    // invite exists — by anyone who found the action.
    if (discordInviteUrl() === null) {
      return { ok: false, error: "ערוץ הקהילה עדיין לא נפתח" };
    }

    const claimed = await prisma.empire.updateMany({
      where: { id: empireId, discordJoinedAt: null },
      data: {
        discordJoinedAt: new Date(),
        diamonds: { increment: DISCORD_JOIN_DIAMONDS },
      },
    });
    if (claimed.count === 0) {
      return { ok: false, alreadyClaimed: true, error: "כבר אספת את המתנה הזו" };
    }

    // The diamond counter lives in the command bar on every screen.
    revalidatePath("/game", "layout");
    return { ok: true, diamonds: DISCORD_JOIN_DIAMONDS };
  } catch (err) {
    // Never the raw message — it names models and sometimes the statement, and
    // this string is rendered straight into the browser.
    await logError("community.claimDiscordReward", err);
    return { ok: false, error: "אירעה שגיאה, נסה שוב" };
  }
}
