import type { MiniGameEvent, MiniGameType } from "@prisma/client";

/** Prize bundle fields on a MiniGameEvent, in display order. */
export const PRIZE_FIELDS = [
  { key: "prizeGold", label: "זהב", int: false },
  { key: "prizeWood", label: "עץ", int: false },
  { key: "prizeIron", label: "ברזל", int: false },
  { key: "prizeStone", label: "אבן", int: false },
  { key: "prizeDiamonds", label: "יהלומים", int: false },
  { key: "prizeCitizens", label: "אזרחים", int: true },
  { key: "prizeTurns", label: "תורות", int: true },
  { key: "prizeWheelSpins", label: "סיבובים", int: true },
] as const satisfies ReadonlyArray<{
  key: keyof MiniGameEvent;
  label: string;
  int: boolean;
}>;

/**
 * Compact one-line prize summary, e.g. "1,000 זהב · 5 יהלומים".
 *
 * Named in words rather than icons on purpose: this string lands in inbox
 * bodies and toasts, where an emoji would be a second, off-set drawing of a
 * resource the rest of the UI renders from the shared icon set.
 */
export function prizeText(event: MiniGameEvent): string {
  const parts: string[] = [];
  for (const f of PRIZE_FIELDS) {
    const amount = Number(event[f.key] ?? 0);
    if (amount > 0) parts.push(`${Math.round(amount).toLocaleString("he-IL")} ${f.label}`);
  }
  return parts.length ? parts.join(" · ") : "כבוד בלבד";
}

export const MINIGAME_TYPE_META: Record<MiniGameType, { label: string; icon: string }> = {
  FIND_BALL: { label: "מצא את הכדור", icon: "🥤" },
  CRACK_SAFE: { label: "פריצת הכספת", icon: "🔐" },
};

/** Bounds on the two games' shapes, shared by the admin form and the server. */
export const CUPS_MIN = 2;
export const CUPS_MAX = 6;
export const SAFE_DIGITS_MIN = 3;
export const SAFE_DIGITS_MAX = 5;

/** Public (answer-free) parameters a player is allowed to see. */
export interface MiniGamePublicConfig {
  cups: number | null;
  digits: number | null;
}

export function publicConfig(event: MiniGameEvent): MiniGamePublicConfig {
  const cfg = (event.config ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return { cups: n(cfg.cups), digits: n(cfg.digits) };
}

/* ---------------------------- attempt history ---------------------------- */

/** How one digit of a submitted code scored against the secret one. */
export type SafeMark = "hit" | "near" | "miss";

/**
 * One past attempt by the viewing player. Answer-free by construction: a cup row
 * says which cup *this player* lifted, a code row says what they typed and how
 * it scored — neither is enough to name the answer without playing for it.
 */
export type MiniGameHistoryRow =
  | { kind: "cup"; pick: number; hit: boolean }
  | { kind: "code"; code: string; marks: SafeMark[] };

/** Most recent attempts kept per player — the safe's board never needs more. */
export const HISTORY_LIMIT = 12;

/** Read a stored `guesses` column back, dropping anything malformed. */
export function parseHistory(value: unknown): MiniGameHistoryRow[] {
  if (!Array.isArray(value)) return [];
  const rows: MiniGameHistoryRow[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (r.kind === "cup" && typeof r.pick === "number" && Number.isInteger(r.pick)) {
      rows.push({ kind: "cup", pick: r.pick, hit: r.hit === true });
    } else if (r.kind === "code" && typeof r.code === "string" && Array.isArray(r.marks)) {
      const marks = r.marks.filter(
        (m): m is SafeMark => m === "hit" || m === "near" || m === "miss"
      );
      if (marks.length === r.marks.length) rows.push({ kind: "code", code: r.code, marks });
    }
  }
  return rows.slice(-HISTORY_LIMIT);
}

/**
 * Score a submitted code against the secret one, Mastermind-style:
 * `hit` = right digit in the right slot, `near` = a digit that is in the code
 * but not here, `miss` = not in the code at all.
 *
 * Two passes, with consumption, because duplicates otherwise lie: against the
 * code `1 1 5`, the attempt `1 7 1` must score hit/miss/near — one of the two
 * typed `1`s is already spoken for by the exact match, so the other may only
 * claim the *second* `1`. A single pass that just asked `code.includes(digit)`
 * would call both of them near and tell the player there are more `1`s than
 * there are.
 */
export function scoreCode(guess: string, code: string): SafeMark[] {
  const marks: SafeMark[] = new Array(guess.length).fill("miss");
  // Digits of the code not already claimed by an exact match.
  const spare = new Map<string, number>();

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === code[i]) marks[i] = "hit";
    else spare.set(code[i], (spare.get(code[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === "hit") continue;
    const left = spare.get(guess[i]) ?? 0;
    if (left > 0) {
      marks[i] = "near";
      spare.set(guess[i], left - 1);
    }
  }
  return marks;
}

/**
 * One rival's public progress in the running event. A player who is out of
 * attempts keeps watching this board until the event itself ends, so it
 * carries no secrets — only how far everyone else got.
 */
export interface MiniGameBoardRow {
  empireId: string;
  name: string;
  attempts: number;
  solved: boolean;
  won: boolean;
  /** True for the viewer's own row, so it can be highlighted. */
  isSelf: boolean;
}

/** Live per-player state of the active mini-game (null = none active). */
export interface MiniGameState {
  id: string;
  type: MiniGameType;
  title: string;
  prizeText: string;
  cups: number | null;
  digits: number | null;
  /** The viewer's own attempt log, oldest first. Never another player's. */
  history: MiniGameHistoryRow[];
  attempts: number;
  maxAttempts: number;
  solved: boolean;
  won: boolean;
  /** No more moves for this player (solved or out of attempts). */
  finished: boolean;
  /** Whether prize slots remain (maxWinners not yet reached). */
  prizesLeft: boolean;
  winnersCount: number;
  maxWinners: number;
  /** Epoch ms this timed release expires at (null = until the admin stops it). */
  endsAt: number | null;
  /** Server clock when this snapshot was built — the countdown ticks from it,
   *  so a skewed client clock can't disagree with the server-side deadline. */
  serverNow: number;
  /** Everyone who has played this event, best progress first. */
  board: MiniGameBoardRow[];
  /** Total participants (the board itself is capped for size). */
  players: number;
}

/** Result of a single guess submission. */
export interface MiniGameGuessResult {
  state: MiniGameState | null;
  feedback: string;
  tone: "win" | "lose" | "hint" | "error" | "info";
}
