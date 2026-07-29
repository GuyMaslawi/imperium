"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import {
  MESSAGE_BODY_MAX,
  MESSAGE_MAX_RECIPIENTS,
  MESSAGE_PAIR_LIMIT,
  MESSAGE_PAIR_WINDOW_MS,
  MESSAGE_RECIPIENT_LIMIT,
  MESSAGE_RECIPIENT_WINDOW_MS,
  MESSAGE_SEND_LIMIT,
  MESSAGE_SEND_WINDOW_MS,
  MESSAGE_TITLE_MAX,
} from "@/lib/game/messages";
import type { ActionState } from "./game";
import { logError } from "@/server/errorLog";

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

export type LiveAlert = {
  id: string;
  kind: "SYSTEM" | "BATTLE" | "SPY" | "PLAYER";
  title: string;
  body: string;
  href: string | null;
  createdAt: number;
};

/**
 * Latest unread inbox messages, polled by the WarAlerts client component to
 * pop live toasts when the player is attacked / spied on / messaged.
 */
export async function getUnreadAlerts(): Promise<LiveAlert[]> {
  try {
    const empireId = await requireOwnEmpireId();
    const messages = await prisma.message.findMany({
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
    });
    // Oldest first so toasts stack in chronological order.
    return messages.reverse().map((m) => ({
      ...m,
      createdAt: m.createdAt.getTime(),
    }));
  } catch {
    // Polling is best-effort — a missed round just retries in a few seconds.
    return [];
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
        user: { bannedAt: null },
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
