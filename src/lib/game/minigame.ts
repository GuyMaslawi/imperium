import type { MiniGameEvent, MiniGameType } from "@prisma/client";

/** Prize bundle fields on a MiniGameEvent, in display order. */
export const PRIZE_FIELDS = [
  { key: "prizeGold", icon: "🪙", label: "זהב", int: false },
  { key: "prizeWood", icon: "🪵", label: "עץ", int: false },
  { key: "prizeIron", icon: "⚙️", label: "ברזל", int: false },
  { key: "prizeStone", icon: "🪨", label: "אבן", int: false },
  { key: "prizeDiamonds", icon: "💎", label: "יהלומים", int: false },
  { key: "prizeCitizens", icon: "👥", label: "אזרחים", int: true },
  { key: "prizeTurns", icon: "⏳", label: "תורות", int: true },
  { key: "prizeWheelSpins", icon: "🎡", label: "סיבובים", int: true },
] as const satisfies ReadonlyArray<{
  key: keyof MiniGameEvent;
  icon: string;
  label: string;
  int: boolean;
}>;

/** Compact one-line prize summary, e.g. "🪙 1,000 · 💎 5". */
export function prizeText(event: MiniGameEvent): string {
  const parts: string[] = [];
  for (const f of PRIZE_FIELDS) {
    const amount = Number(event[f.key] ?? 0);
    if (amount > 0) parts.push(`${f.icon} ${Math.round(amount).toLocaleString("he-IL")}`);
  }
  return parts.length ? parts.join(" · ") : "כבוד בלבד 🏅";
}

export const MINIGAME_TYPE_META: Record<MiniGameType, { label: string; icon: string }> = {
  GUESS_NUMBER: { label: "נחש את המספר", icon: "🔢" },
  FIND_BALL: { label: "מצא את הכדור", icon: "🔮" },
};

/** Public (answer-free) parameters a player is allowed to see. */
export interface MiniGamePublicConfig {
  min: number | null;
  max: number | null;
  cups: number | null;
}

export function publicConfig(event: MiniGameEvent): MiniGamePublicConfig {
  const cfg = (event.config ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return { min: n(cfg.min), max: n(cfg.max), cups: n(cfg.cups) };
}

/** Live per-player state of the active mini-game (null = none active). */
export interface MiniGameState {
  id: string;
  type: MiniGameType;
  title: string;
  prizeText: string;
  min: number | null;
  max: number | null;
  cups: number | null;
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
}

/** Result of a single guess submission. */
export interface MiniGameGuessResult {
  state: MiniGameState | null;
  feedback: string;
  tone: "win" | "lose" | "hint" | "error" | "info";
}
