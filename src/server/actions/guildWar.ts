"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import {
  GUILD_WAR_END_LABEL,
  GUILD_WAR_START_LABEL,
  registrationWarStart,
  type GuildWarLiveState,
} from "@/lib/game/guildWar";
import {
  advanceLiveWars,
  buildLiveState,
  ensureWarForStart,
  getFocusWar,
  guildMilitaryPower,
  settleDueWars,
} from "@/server/guildWarState";
import type { ActionState } from "./game";
import { logError } from "@/server/errorLog";

/**
 * The whole player-facing surface of the guild war: enrol, withdraw, watch.
 *
 * There is deliberately no "attack" action. The campaign is fought by the
 * system — see advanceWar in src/server/guildWarState.ts — so the only decision
 * a player makes is whether their guild turns up.
 */

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

function revalidateWar() {
  revalidatePath("/game", "layout");
}

/* ------------------------------ registration ------------------------------ */

/**
 * Enrol the guild in the next war. Registration never closes — it simply
 * always books the *next* bell, so signing up mid-battle books tomorrow rather
 * than walking into a campaign that started without you.
 *
 * Leadership only: enrolment commits the whole roster to being fought over for
 * half an hour, which is not a call any single member gets to make for the rest.
 */
export async function registerGuildForWar(): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();

    const membership = await prisma.guildMember.findUnique({
      where: { empireId },
      include: { guild: { select: { id: true, name: true } } },
    });
    if (!membership) return { error: "אינך חבר בברית." };
    if (membership.role === "MEMBER") {
      return { error: "רק מנהיג או סגן יכולים לרשום את הברית למלחמה." };
    }

    const startsAt = registrationWarStart(new Date());
    // Deliberately outside any transaction: ensureWarForStart resolves the
    // create race through the unique index, and a P2002 raised inside an
    // interactive transaction would poison it instead of being catchable.
    const warId = await ensureWarForStart(startsAt);

    try {
      await prisma.guildWarEntry.create({
        data: {
          warId,
          guildId: membership.guild.id,
          // Snapshotted so the war keeps its history through a rename.
          guildName: membership.guild.name,
          // Seeded so the field is comparable before a shot is fired; refreshed
          // every round once the bell rings.
          power: await guildMilitaryPower(membership.guild.id),
        },
      });
    } catch {
      // The [warId, guildId] unique index is the double-click guard.
      return { error: "הברית שלך כבר רשומה למלחמה הקרובה." };
    }

    revalidateWar();
    return {
      success: `${membership.guild.name} נרשמה למלחמת הבריתות! הקרב מתנהל אוטומטית בין ${GUILD_WAR_START_LABEL} ל־${GUILD_WAR_END_LABEL} — אין מה לעשות חוץ מלצפות.`,
    };
  } catch (err) {
    await logError("guildWar.registerGuildForWar", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/** Pull out of the upcoming war. Only ever touches a bell that has not rung. */
export async function withdrawGuildFromWar(): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();

    const membership = await prisma.guildMember.findUnique({
      where: { empireId },
      select: { role: true, guildId: true },
    });
    if (!membership) return { error: "אינך חבר בברית." };
    if (membership.role === "MEMBER") {
      return { error: "רק מנהיג או סגן יכולים לבטל את ההרשמה." };
    }

    const startsAt = registrationWarStart(new Date());
    const war = await prisma.guildWar.findUnique({
      where: { startsAt },
      select: { id: true },
    });
    if (!war) return { error: "הברית שלך לא רשומה למלחמה הקרובה." };

    // registrationWarStart is always in the future, so this can never cancel a
    // guild out of a war it is already fighting.
    const removed = await prisma.guildWarEntry.deleteMany({
      where: { warId: war.id, guildId: membership.guildId },
    });
    if (removed.count === 0) {
      return { error: "הברית שלך לא רשומה למלחמה הקרובה." };
    }

    revalidateWar();
    return { success: "ההרשמה למלחמה בוטלה." };
  } catch (err) {
    await logError("guildWar.withdrawGuildFromWar", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ the live board ------------------------------ */

/**
 * One snapshot of the running war, polled by the board — and the place the war
 * is actually fought from. With no cron in the game, the rounds that have come
 * due are materialised by whichever request arrives next, and during the window
 * that is this poll, a few seconds later. The same call settles the war once
 * the window closes.
 *
 * Returns null for a player without a guild, who has no business reading the
 * board at all.
 */
export async function getGuildWarLive(): Promise<GuildWarLiveState | null> {
  const empireId = await getActiveEmpireId();
  if (empireId === null) return null;

  const membership = await prisma.guildMember.findUnique({
    where: { empireId },
    select: { guildId: true },
  });
  if (!membership) return null;

  const now = new Date();
  await advanceLiveWars(now);
  await settleDueWars(now);

  const war = await getFocusWar(now);

  return buildLiveState({
    empireId,
    myGuildId: membership.guildId,
    war,
    now,
  });
}
