"use server";

import { revalidatePath } from "next/cache";
import type { MiniGameEvent, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { grantCitizens } from "@/lib/game/grants";
import { awardSeasonPassXp } from "../seasonPassXp";
import {
  prizeText,
  publicConfig,
  parseHistory,
  scoreCode,
  HISTORY_LIMIT,
  PRIZE_FIELDS,
  type MiniGameState,
  type MiniGameBoardRow,
  type MiniGameGuessResult,
  type MiniGameHistoryRow,
} from "@/lib/game/minigame";

/** How many rival rows the live board carries (the viewer is always included). */
const BOARD_LIMIT = 50;

type Board = { rows: MiniGameBoardRow[]; players: number };

const EMPTY_BOARD: Board = { rows: [], players: 0 };

async function ownEmpireId(): Promise<string | null> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  return getActiveEmpireId();
}

function toState(
  event: MiniGameEvent,
  entry: { attempts: number; solved: boolean; won: boolean; guesses?: unknown } | null,
  board: Board = EMPTY_BOARD
): MiniGameState {
  const attempts = entry?.attempts ?? 0;
  const solved = entry?.solved ?? false;
  const pub = publicConfig(event);
  return {
    id: event.id,
    type: event.type,
    title: event.title,
    prizeText: prizeText(event),
    cups: pub.cups,
    digits: pub.digits,
    history: parseHistory(entry?.guesses),
    attempts,
    maxAttempts: event.maxAttempts,
    solved,
    won: entry?.won ?? false,
    finished: solved || attempts >= event.maxAttempts,
    prizesLeft: event.maxWinners === 0 || event.winnersCount < event.maxWinners,
    winnersCount: event.winnersCount,
    maxWinners: event.maxWinners,
    endsAt: event.endsAt?.getTime() ?? null,
    serverNow: Date.now(),
    board: board.rows,
    players: board.players,
  };
}

/** A timed release is over once its deadline passes, flag or no flag. */
function isExpired(event: { endsAt: Date | null }, now = Date.now()): boolean {
  return event.endsAt != null && event.endsAt.getTime() <= now;
}

/**
 * The event a player may currently interact with, or null. `isActive` alone is
 * not the gate: a timed release expires on the wall clock, and nothing runs on
 * a schedule here — so the first read after the deadline is what flips the
 * flag (guarded, so concurrent readers don't double-write).
 */
async function loadLiveEvent(): Promise<MiniGameEvent | null> {
  const event = await prisma.miniGameEvent.findFirst({
    where: { isActive: true },
    orderBy: { activatedAt: "desc" },
  });
  if (!event) return null;
  if (isExpired(event)) {
    await prisma.miniGameEvent.updateMany({
      where: { id: event.id, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });
    return null;
  }
  return event;
}

/**
 * Public progress of everyone playing the event. This is what a knocked-out
 * player keeps watching until the event ends, so it deliberately exposes only
 * attempt counts and win state — never a guess, never the answer.
 */
async function loadBoard(eventId: string, selfEmpireId: string): Promise<Board> {
  const [entries, players] = await Promise.all([
    prisma.miniGameEntry.findMany({
      where: { eventId },
      orderBy: [
        { won: "desc" },
        { wonAt: "asc" },
        { solved: "desc" },
        { attempts: "desc" },
        { updatedAt: "asc" },
      ],
      take: BOARD_LIMIT,
      select: { empireId: true, attempts: true, solved: true, won: true },
    }),
    prisma.miniGameEntry.count({ where: { eventId } }),
  ]);

  // The viewer's own row always rides along, even past the cap — the board is
  // there so a knocked-out player can follow the race they're still in.
  if (entries.length && !entries.some((e) => e.empireId === selfEmpireId)) {
    const own = await prisma.miniGameEntry.findUnique({
      where: { eventId_empireId: { eventId, empireId: selfEmpireId } },
      select: { empireId: true, attempts: true, solved: true, won: true },
    });
    if (own) entries.push(own);
  }

  const empires = await prisma.empire.findMany({
    where: { id: { in: entries.map((e) => e.empireId) } },
    select: { id: true, name: true },
  });
  const names = new Map(empires.map((e) => [e.id, e.name]));

  return {
    players,
    rows: entries.map((e) => ({
      empireId: e.empireId,
      name: names.get(e.empireId) ?? "אימפריה אלמונית",
      attempts: e.attempts,
      solved: e.solved,
      won: e.won,
      isSelf: e.empireId === selfEmpireId,
    })),
  };
}

/**
 * Live state of the active mini-game for the current player. Best-effort —
 * polled by the panel and also read once server-side by the game layout.
 */
export async function getMiniGameState(): Promise<MiniGameState | null> {
  try {
    const empireId = await ownEmpireId();
    if (!empireId) return null;
    const event = await loadLiveEvent();
    if (!event) return null;
    const [entry, board] = await Promise.all([
      prisma.miniGameEntry.findUnique({
        where: { eventId_empireId: { eventId: event.id, empireId } },
        select: { attempts: true, solved: true, won: true, guesses: true },
      }),
      loadBoard(event.id, empireId),
    ]);
    return toState(event, entry, board);
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

/** Hebrew names of the three code marks, for the one-line result summary. */
const MARK_WORD = { hit: "במקום", near: "בקוד", miss: "בחוץ" } as const;

/**
 * Submit one guess to the active mini-game — a cup index for FIND_BALL, a digit
 * string for CRACK_SAFE. Records the attempt, checks the secret answer, and —
 * on a correct first solve — atomically claims a prize slot (respecting
 * maxWinners) and grants the bundle.
 */
export async function submitMiniGameGuess(
  _prev: MiniGameGuessResult,
  formData: FormData
): Promise<MiniGameGuessResult> {
  try {
    const empireId = await ownEmpireId();
    if (!empireId) return { state: null, feedback: "לא מחובר", tone: "error" };

    const raw = formData.get("guess");
    if (typeof raw !== "string") {
      return { state: null, feedback: "בחר ניחוש תקין", tone: "error" };
    }
    const guess = raw.trim();

    const result = await prisma.$transaction(async (tx) => {
      // Ordered exactly as loadLiveEvent orders it. An unordered findFirst picks
      // an arbitrary row, so should two events ever be live at once the panel
      // and the guess it submits could resolve to different games — the player
      // would be scored against a board they were never shown.
      const event = await tx.miniGameEvent.findFirst({
        where: { isActive: true },
        orderBy: { activatedAt: "desc" },
      });
      // A timed release stops accepting guesses the moment its deadline passes,
      // even if no read has flipped `isActive` yet (see loadLiveEvent).
      if (!event || isExpired(event)) {
        return { state: null, feedback: "המשחק הסתיים", tone: "info" as const };
      }
      const cfg = (event.config ?? {}) as Record<string, unknown>;
      const pub = publicConfig(event);

      // Reject a guess outside the event's own shape *before* claiming an
      // attempt slot. A malformed submission can never match the answer, so
      // letting it through would only silently burn one of the player's
      // limited attempts.
      const code = typeof cfg.code === "string" ? cfg.code : "";
      const cups = pub.cups ?? 0;
      const valid =
        event.type === "CRACK_SAFE"
          ? code.length > 0 &&
            guess.length === code.length &&
            /^[0-9]+$/.test(guess)
          : /^[0-9]{1,2}$/.test(guess) && Number(guess) < cups;
      if (!valid) {
        return { state: null, feedback: "בחר ניחוש תקין", tone: "error" as const };
      }

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

      // We hold an attempt slot. Re-read the row rather than trusting the copy
      // from before the claim: the guarded updateMany above took the row lock,
      // so this reads *our* increment plus whatever history a guess that raced
      // us already committed. Appending to the pre-claim copy would drop it.
      const locked = await tx.miniGameEntry.findUniqueOrThrow({ where: { id: entry.id } });
      const attempts = locked.attempts;

      // Score the attempt and write the row the player will reason over. The
      // safe's marks ARE the game — a code attempt with no marks tells the
      // player nothing — so they are computed server-side, from the secret, and
      // the client only ever renders them.
      let correct: boolean;
      let row: MiniGameHistoryRow;
      let feedback: string;
      if (event.type === "CRACK_SAFE") {
        const marks = scoreCode(guess, code);
        correct = marks.every((m) => m === "hit");
        row = { kind: "code", code: guess, marks };
        const tally = { hit: 0, near: 0, miss: 0 };
        for (const m of marks) tally[m]++;
        feedback = correct
          ? ""
          : `🔐 ${(["hit", "near", "miss"] as const)
              .filter((m) => tally[m] > 0)
              .map((m) => `${tally[m]} ${MARK_WORD[m]}`)
              .join(" · ")}`;
      } else {
        correct = Number(guess) === Number(cfg.answer);
        row = { kind: "cup", pick: Number(guess), hit: correct };
        feedback = "🫙 הכוס ריקה…";
      }
      const history = [...parseHistory(locked.guesses), row].slice(-HISTORY_LIMIT);

      if (!correct) {
        const finished = attempts >= event.maxAttempts;
        const updated = await tx.miniGameEntry.update({
          where: { id: entry.id },
          data: { guesses: history },
        });
        return {
          state: toState(event, updated),
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
          guesses: history,
        },
      });

      if (won) {
        const inc = prizeIncrements(event);
        // Citizens are capped by city count, so they go through grantCitizens
        // instead of riding along in the bulk increment — a raw increment here
        // breached the ceiling the daily update enforces.
        const citizenPrize = Math.max(0, Math.round(Number(event.prizeCitizens ?? 0)));
        delete (inc as Record<string, unknown>).citizens;
        if (Object.keys(inc).length > 0) {
          await tx.empire.update({ where: { id: empireId }, data: inc });
        }
        await grantCitizens(tx, empireId, citizenPrize);
        await tx.message.create({
          data: {
            empireId,
            kind: "SYSTEM",
            title: `🎉 ניצחת ב"${event.title}"!`,
            body: `כל הכבוד! זכית בפרס: ${prizeText(event)}`,
          },
        });
      }

      // Solving is once-per-event (guarded by the solve claim above), so this
      // pays pass XP exactly once whether or not a prize slot was left.
      await awardSeasonPassXp(tx, empireId, "miniGame");

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
    // Refresh the rival board on the way out so a player who just spent their
    // last attempt lands straight on the live standings instead of a stale copy.
    if (result.state) {
      const board = await loadBoard(result.state.id, empireId);
      return { ...result, state: { ...result.state, board: board.rows, players: board.players } };
    }
    return result;
  } catch {
    return { state: null, feedback: "אירעה שגיאה, נסה שוב", tone: "error" };
  }
}
