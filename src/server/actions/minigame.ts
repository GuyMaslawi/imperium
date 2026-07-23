"use server";

import { revalidatePath } from "next/cache";
import type { MiniGameEvent, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import {
  prizeText,
  publicConfig,
  PRIZE_FIELDS,
  type MiniGameState,
  type MiniGameGuessResult,
} from "@/lib/game/minigame";

async function ownEmpireId(): Promise<string | null> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  return getActiveEmpireId();
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

      // Atomically claim one attempt slot. The `entry.attempts` read above is
      // not a safe gate on its own: without a row lock, N parallel guesses all
      // read attempts=0, all pass a check-then-act limit, and the one holding
      // the answer reaches the solve branch — bypassing maxAttempts entirely
      // (solve any mini-game on demand and drain the prize). This guarded
      // updateMany serializes the spend on the entry row, so at most
      // maxAttempts submissions ever proceed past here.
      const attemptClaim = await tx.miniGameEntry.updateMany({
        where: { id: entry.id, solved: false, attempts: { lt: event.maxAttempts } },
        data: { attempts: { increment: 1 } },
      });
      if (attemptClaim.count === 0) {
        const current = await tx.miniGameEntry.findUniqueOrThrow({
          where: { id: entry.id },
        });
        return {
          state: toState(event, current),
          feedback: current.solved ? "כבר פתרת את המשחק 🎉" : "נגמרו הניסיונות",
          tone: current.solved ? ("info" as const) : ("lose" as const),
        };
      }

      // We hold an attempt slot (attempts already incremented by 1 above).
      const attempts = entry.attempts + 1;
      const correct = guess === answer;

      if (!correct) {
        let feedback = "❌ לא נכון";
        if (event.type === "GUESS_NUMBER") {
          feedback = guess < answer ? HINT_TOO_LOW : HINT_TOO_HIGH;
        }
        const finished = attempts >= event.maxAttempts;
        return {
          state: toState(event, { attempts, solved: false, won: false }),
          feedback: finished ? "😔 נגמרו הניסיונות — נסה בפעם הבאה" : feedback,
          tone: finished ? ("lose" as const) : ("hint" as const),
        };
      }

      // Correct! Claim *this player's* single solve atomically. Two concurrent
      // correct submissions both passed the attempt claim with solved=false;
      // this guarded updateMany takes the row lock and re-checks solved:false,
      // so only one flips the entry — the loser matches zero rows and skips the
      // prize. Without it the unlimited-winner (maxWinners===0) path, which has
      // no other atomic guard, would grant the prize twice.
      const solveClaim = await tx.miniGameEntry.updateMany({
        where: { id: entry.id, solved: false },
        data: { solved: true },
      });
      if (solveClaim.count === 0) {
        const current = await tx.miniGameEntry.findUniqueOrThrow({
          where: { id: entry.id },
        });
        return {
          state: toState(event, current),
          feedback: "כבר פתרת את המשחק 🎉",
          tone: "info" as const,
        };
      }

      // We own the solve — now claim a prize slot (respecting maxWinners).
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
