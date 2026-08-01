"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { notBannedWhere } from "@/lib/ban";
import { rateLimit } from "@/lib/rateLimit";
import {
  MESSAGE_BODY_MAX,
  MESSAGE_MAX_RECIPIENTS,
  MESSAGE_PAIR_LIMIT,
  MESSAGE_PAIR_WINDOW_MS,
  MESSAGE_RECIPIENT_LIMIT,
  MESSAGE_RECIPIENT_WINDOW_MS,
  MESSAGE_SEARCH_MAX_RESULTS,
  MESSAGE_SEARCH_MIN,
  MESSAGE_SEND_LIMIT,
  MESSAGE_SEND_WINDOW_MS,
  MESSAGE_TITLE_MAX,
} from "@/lib/game/messages";
import type { ActionState } from "./game";
import { settleDueAssault } from "@/server/bossSiege";
import { logError } from "@/server/errorLog";

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

/** One addressee in the composer's picker. Nothing but what draws a row. */
export type MessageRecipient = { id: string; name: string };

/**
 * Look up addressees by empire name for the compose box.
 *
 * This is what replaced shipping the whole player directory to the browser: the
 * picker holds an alphabetical seed (MESSAGE_ROSTER_SEED) and asks here for
 * anything past it, so the payload is bounded by what is on screen rather than
 * by how many people play the game.
 *
 * Deliberately as thin as `searchChatPlayers`, and for the same reason — id and
 * name only. A directory lookup must not become a free scouting report, so no
 * presence, no city, no power: this answers "does an empire by this name exist
 * and may I write to it", and nothing else.
 */
export async function searchMessageRecipients(
  query: string
): Promise<MessageRecipient[]> {
  let empireId: string;
  try {
    empireId = await requireOwnEmpireId();
  } catch {
    return [];
  }

  const q = String(query ?? "").trim();
  if (q.length < MESSAGE_SEARCH_MIN) return [];

  // `contains` is a scan no index serves, and this fires from a keystroke
  // handler. Generous enough that ordinary typing never trips it.
  if (!(await rateLimit(`msg-search:${empireId}`, 40, 60 * 1000))) return [];

  try {
    return await prisma.empire.findMany({
      where: {
        id: { not: empireId },
        name: { contains: q, mode: "insensitive" },
        user: notBannedWhere(),
      },
      orderBy: { name: "asc" },
      take: MESSAGE_SEARCH_MAX_RESULTS,
      select: { id: true, name: true },
    });
  } catch {
    return [];
  }
}

export type LiveAlert = {
  id: string;
  kind: "SYSTEM" | "BATTLE" | "SPY" | "PLAYER";
  title: string;
  body: string;
  href: string | null;
  createdAt: number;
};

export type InboxPulse = {
  /** Unread inbox messages — the green badge on the messages pill. */
  unreadMessages: number;
  /**
   * Reports filed *against* me since my last visit to the history page — the
   * red badge. Same rule as the layout's server-rendered count: attacks I
   * defended and enemy spies my defenses caught. My own raids and missions are
   * things I ordered on purpose, so they never light the badge.
   */
  newReports: number;
  /** Newest unread messages, oldest first, for the live toasts. */
  alerts: LiveAlert[];
};

const EMPTY_PULSE: InboxPulse = {
  unreadMessages: 0,
  newReports: 0,
  alerts: [],
};

/**
 * The live heartbeat of the top command bar: both badge counts plus the newest
 * unread messages, in one round trip.
 *
 * Everything the player is meant to learn *without touching the keyboard* —
 * that they were raided, that a spy was caught, that mail arrived — is answered
 * here, because this is the one call that runs on every screen in the game.
 * Badges and toasts deliberately share it: two pollers over the same data would
 * double the load and still disagree with each other for seconds at a time,
 * which is exactly the flicker the live badges exist to remove.
 *
 * It also settles a finished city-boss assault first, and that is deliberate
 * rather than convenient. A boss assault runs for a minute of real time while the
 * player is free to go anywhere in the game, so *something* has to notice it
 * finished no matter which screen they are on — and this poll is the only thing
 * that runs on all of them. The settle writes the very message this call is about
 * to read, so the toast announcing the haul arrives in the same round trip. It is
 * a cheap indexed lookup that finds nothing in the overwhelmingly common case, and
 * it is idempotent under the empire row lock (see `settleDueAssault`).
 *
 * Held to a handful of indexed lookups on purpose: every logged-in player runs
 * this every few seconds, so nothing that scans (the achievements snapshot, the
 * guild-war fixtures, the rankings) may migrate in here. Those ride the far
 * rarer `router.refresh()` that a genuinely new alert triggers.
 */
export async function getInboxPulse(): Promise<InboxPulse> {
  try {
    const empireId = await requireOwnEmpireId();
    if (await settleDueAssault(empireId)) {
      // The haul moved resources, the army and the hero — the resource bar and
      // the boss banner are both stale now.
      revalidatePath("/game", "layout");
    }

    const empire = await prisma.empire.findUnique({
      where: { id: empireId },
      select: { reportsSeenAt: true },
    });
    if (!empire) return EMPTY_PULSE;
    const seenAt = empire.reportsSeenAt;

    const [messages, unreadMessages, battleReports, spyReports] =
      await Promise.all([
        prisma.message.findMany({
          where: { empireId, readAt: null },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            kind: true,
            title: true,
            body: true,
            href: true,
            createdAt: true,
          },
        }),
        prisma.message.count({ where: { empireId, readAt: null } }),
        prisma.battleReport.count({
          where: { defenderEmpireId: empireId, createdAt: { gt: seenAt } },
        }),
        // A successful enemy spy stays invisible to its target; only the ones
        // my defenses caught are news. Mirrors the layout and ReportsTabs.
        prisma.spyReport.count({
          where: {
            defenderEmpireId: empireId,
            success: false,
            createdAt: { gt: seenAt },
          },
        }),
      ]);

    return {
      unreadMessages,
      newReports: battleReports + spyReports,
      // Oldest first so toasts stack in chronological order.
      alerts: messages.reverse().map((m) => ({
        ...m,
        createdAt: m.createdAt.getTime(),
      })),
    };
  } catch {
    // Polling is best-effort — a missed round just retries in a few seconds.
    return EMPTY_PULSE;
  }
}

/**
 * Mark every unread inbox message as read. Called when the player opens the
 * messages page, so the sidebar badge clears while they're reading.
 */
export async function markMessagesRead(): Promise<void> {
  try {
    const empireId = await requireOwnEmpireId();
    const updated = await prisma.message.updateMany({
      where: { empireId, readAt: null },
      data: { readAt: new Date() },
    });
    if (updated.count > 0) revalidatePath("/game", "layout");
  } catch {
    // Losing a mark-read is harmless — the badge clears on the next visit.
  }
}

const sendSchema = z.object({
  title: z.string().trim().min(1).max(MESSAGE_TITLE_MAX),
  body: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
  recipients: z
    .array(z.string().min(1).max(64))
    .min(1)
    .max(MESSAGE_MAX_RECIPIENTS),
});

/**
 * Player-to-player mail. Recipients arrive as empire ids picked from the closed
 * roster the compose form renders, but the ids are still re-checked here — a
 * Server Action is reachable by direct POST, so the list in the UI is a
 * convenience, never the authorization.
 */
export async function sendPlayerMessage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let empireId: string;
  try {
    empireId = await requireOwnEmpireId();
  } catch {
    return { error: "לא מחובר" };
  }

  // How often the composer may fire. The budget that bounds actual delivery
  // volume is charged per addressee further down, once the recipients are
  // known — see MESSAGE_RECIPIENT_LIMIT.
  if (!(await rateLimit(`msg-send:${empireId}`, MESSAGE_SEND_LIMIT, MESSAGE_SEND_WINDOW_MS))) {
    return { error: "שלחת יותר מדי הודעות — נסה שוב בעוד כמה דקות" };
  }

  const parsed = sendSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    // Dedup: the same id twice must not deliver (or bill against the cap) twice.
    recipients: [...new Set(formData.getAll("recipients").map(String))],
  });
  if (!parsed.success) {
    return {
      error: `בחר עד ${MESSAGE_MAX_RECIPIENTS} נמענים ומלא נושא (עד ${MESSAGE_TITLE_MAX} תווים) ותוכן (עד ${MESSAGE_BODY_MAX} תווים)`,
    };
  }

  try {
    const me = await prisma.empire.findUnique({
      where: { id: empireId },
      select: { name: true },
    });
    if (!me) return { error: "לא מחובר" };

    // Only real, unbanned empires — and never yourself.
    const targets = await prisma.empire.findMany({
      where: {
        id: { in: parsed.data.recipients.filter((id) => id !== empireId) },
        user: notBannedWhere(),
      },
      select: { id: true, name: true },
    });
    if (targets.length === 0) {
      return { error: "לא נבחרו נמענים תקינים" };
    }

    // Volume budget, charged per addressee — one send to ten players costs ten.
    // Checked against the resolved targets rather than the submitted ids, so a
    // list padded with dead ones does not bill for deliveries never made.
    if (
      !(await rateLimit(
        `msg-recipients:${empireId}`,
        MESSAGE_RECIPIENT_LIMIT,
        MESSAGE_RECIPIENT_WINDOW_MS,
        targets.length
      ))
    ) {
      return {
        error: "שלחת הודעות ליותר מדי שחקנים בזמן קצר — נסה שוב בעוד כמה דקות",
      };
    }

    // Per sender→recipient budget: the volume cap above still allows a whole
    // window to be aimed at one player, which is the harassment case. Throttled
    // addressees are dropped from this send rather than failing it, so one
    // over-mailed target does not block the rest of the list.
    const verdicts = await Promise.all(
      targets.map((t) =>
        rateLimit(
          `msg-pair:${empireId}:${t.id}`,
          MESSAGE_PAIR_LIMIT,
          MESSAGE_PAIR_WINDOW_MS
        )
      )
    );
    const allowed = targets.filter((_, i) => verdicts[i]);
    const throttled = targets.filter((_, i) => !verdicts[i]);
    if (allowed.length === 0) {
      return {
        error:
          targets.length === 1
            ? `שלחת לאחרונה כמה הודעות אל ${targets[0]!.name} — המתן לפני שתשלח שוב`
            : "שלחת לאחרונה כמה הודעות אל השחקנים האלה — המתן לפני שתשלח שוב",
      };
    }

    await prisma.message.createMany({
      data: allowed.map((t) => ({
        empireId: t.id,
        senderEmpireId: empireId,
        kind: "PLAYER" as const,
        title: parsed.data.title,
        body: parsed.data.body,
      })),
    });

    revalidatePath("/game", "layout");
    // A silent partial send would read as a full one, so the skipped names are
    // named.
    const skipped =
      throttled.length > 0
        ? ` (לא נשלחה אל ${throttled.map((t) => t.name).join(", ")} — יותר מדי הודעות אליהם לאחרונה)`
        : "";
    return {
      success:
        (allowed.length === 1
          ? `ההודעה נשלחה אל ${allowed[0]!.name}`
          : `ההודעה נשלחה אל ${allowed.length} שחקנים`) + skipped,
    };
  } catch (err) {
    await logError("messages.sendPlayerMessage", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/**
 * Stamp the reports page as seen. Called when the player opens the reports
 * page, so the sidebar "new reports" badge clears.
 */
export async function markReportsSeen(): Promise<void> {
  try {
    const empireId = await requireOwnEmpireId();
    await prisma.empire.update({
      where: { id: empireId },
      data: { reportsSeenAt: new Date() },
    });
    revalidatePath("/game", "layout");
  } catch {
    // Losing a mark-seen is harmless — the badge clears on the next visit.
  }
}
