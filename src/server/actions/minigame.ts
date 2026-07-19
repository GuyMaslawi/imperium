"use server";

import { revalidatePath } from "next/cache";
import type { MiniGameEvent, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import {
  prizeText,
  publicConfig,
  PRIZE_FIELDS,
  type MiniGameState,
  type MiniGameGuessResult,
} from "@/lib/game/minigame";

async function ownEmpireId(): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const empire = await prisma.empire.findUnique({
    where: { userId },
    select: { id: true },
  });
  return empire?.id ?? null;
}

function toState(
  event: MiniGameEvent,
  entry: { attempts: number; solved: boolean; won: boolean } | null
): MiniGameState {
  const attempts = entry?.attempts ?? 0;
  const solved = entry?.solved ?? false;
  const pub = publicConfig(event);
  return {
    id: event.id,
    type: event.type,
    title: event.title,
    prizeText: prizeText(event),
    min: pub.min,
    max: pub.max,
    cups: pub.cups,
    attempts,
    maxAttempts: event.maxAttempts,
    solved,
    won: entry?.won ?? false,
    finished: solved || attempts >= event.maxAttempts,
    prizesLeft: event.maxWinners === 0 || event.winnersCount < event.maxWinners,
    winnersCount: event.winnersCount,
    maxWinners: event.maxWinners,
  };
}

/**
 * Live state of the active mini-game for the current player. Best-effort —
 * polled by the banner and also read once server-side by the game layout.
 */
export async function getMiniGameState(): Promise<MiniGameState | null> {
  try {
    const empireId = await ownEmpireId();
    if (!empireId) return null;
    const event = await prisma.miniGameEvent.findFirst({
      where: { isActive: true },
      orderBy: { activatedAt: "desc" },
    });
    if (!event) return null;
    const entry = await prisma.miniGameEntry.findUnique({
      where: { eventId_empireId: { eventId: event.id, empireId } },
      select: { attempts: true, solved: true, won: true },
    });
    return toState(event, entry);
  } catch {
    return null;
  }
}

/** Build the {field: {increment}} prize map for a winning empire update. */
function prizeIncrements(event: MiniGameEvent): Prisma.EmpireUpdateInput {
  const inc: Prisma.EmpireUpdateInput = {};
  const map: Record<string, keyof Prisma.EmpireUpdateInput> = {
    prizeGold: "gold",
    prizeWood: "wood",
    prizeIron: "iron",
    prizeStone: "stone",
    prizeDiamonds: "diamonds",
    prizeCitizens: "citizens",
    prizeTurns: "turns",
    prizeWheelSpins: "wheelSpins",
  };
  for (const f of PRIZE_FIELDS) {
    const amount = Number(event[f.key] ?? 0);
    if (amount > 0) {
      const value = f.int ? Math.round(amount) : amount;
      (inc as Record<string, unknown>)[map[f.key]] = { increment: value };
    }
  }
  return inc;
}

const HINT_TOO_LOW = "📉 נמוך מדי — נסה גבוה יותר";
const HINT_TOO_HIGH = "📈 גבוה מדי — נסה נמוך יותר";

/**
 * Submit one guess to the active mini-game. Records the attempt, checks the
 * secret answer, and — on a correct first solve — atomically claims a prize
 * slot (respecting maxWinners) and grants the bundle.
 */
export async function submitMiniGameGuess(
  _prev: MiniGameGuessResult,
  formData: FormData
): Promise<MiniGameGuessResult> {
  try {
    const empireId = await ownEmpireId();
    if (!empireId) return { state: null, feedback: "לא מחובר", tone: "error" };

    const guess = Number(formData.get("guess"));
    if (!Number.isFinite(guess)) {
      return { state: null, feedback: "בחר ניחוש תקין", tone: "error" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.miniGameEvent.findFirst({ where: { isActive: true } });
      if (!event) {
        return { state: null, feedback: "המשחק הסתיים", tone: "info" as const };
      }
      const cfg = (event.config ?? {}) as Record<string, unknown>;
      const answer = Number(cfg.answer);

      const entry = await tx.miniGameEntry.upsert({
        where: { eventId_empireId: { eventId: event.id, empireId } },
        create: { eventId: event.id, empireId },
        update: {},
      });

      if (entry.solved) {
        return {
          state: toState(event, entry),
          feedback: "כבר פתרת את המשחק 🎉",
          tone: "info" as const,
        };
      }
      if (entry.attempts >= event.maxAttempts) {
        return {
          state: toState(event, entry),
          feedback: "נגמרו הניסיונות",
          tone: "lose" as const,
        };
      }

      const correct = guess === answer;

      if (!correct) {
        const updated = await tx.miniGameEntry.update({
          where: { id: entry.id },
          data: { attempts: { increment: 1 } },
        });
        let feedback = "❌ לא נכון";
        if (event.type === "GUESS_NUMBER") {
          feedback = guess < answer ? HINT_TOO_LOW : HINT_TOO_HIGH;
        }
        const finished = updated.attempts >= event.maxAttempts;
        return {
          state: toState(event, updated),
          feedback: finished ? "😔 נגמרו הניסיונות — נסה בפעם הבאה" : feedback,
          tone: finished ? ("lose" as const) : ("hint" as const),
        };
      }

      // Correct! Claim a prize slot atomically (respecting maxWinners).
      let won: boolean;
      if (event.maxWinners === 0) {
        await tx.miniGameEvent.update({
          where: { id: event.id },
          data: { winnersCount: { increment: 1 } },
        });
        won = true;
      } else {
        const claim = await tx.miniGameEvent.updateMany({
          where: { id: event.id, winnersCount: { lt: event.maxWinners } },
          data: { winnersCount: { increment: 1 } },
        });
        won = claim.count > 0;
      }

      const updatedEntry = await tx.miniGameEntry.update({
        where: { id: entry.id },
        data: {
          attempts: { increment: 1 },
          solved: true,
          won,
          wonAt: won ? new Date() : null,
        },
      });

      if (won) {
        const inc = prizeIncrements(event);
        if (Object.keys(inc).length > 0) {
          await tx.empire.update({ where: { id: empireId }, data: inc });
        }
        await tx.message.create({
          data: {
            empireId,
            kind: "SYSTEM",
            title: `🎉 ניצחת ב"${event.title}"!`,
            body: `כל הכבוד! זכית בפרס: ${prizeText(event)}`,
          },
        });
      }

      // Re-read the event so winnersCount/prizesLeft are fresh in the response.
      const freshEvent = (await tx.miniGameEvent.findUnique({ where: { id: event.id } }))!;
      return {
        state: toState(freshEvent, updatedEntry),
        feedback: won
          ? `🎉 ניצחת! הפרס בדרך: ${prizeText(event)}`
          : "✅ ניחשת נכון! אך כל הפרסים כבר חולקו",
        tone: won ? ("win" as const) : ("info" as const),
      };
    });

    if (result.tone === "win") revalidatePath("/game", "layout");
    return result;
  } catch {
    return { state: null, feedback: "אירעה שגיאה, נסה שוב", tone: "error" };
  }
}
