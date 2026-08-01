"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { getMiniGameState, submitMiniGameGuess } from "@/server/actions/minigame";
import {
  MINIGAME_TYPE_META,
  type MiniGameBoardRow,
  type MiniGameHistoryRow,
  type MiniGameState,
  type SafeMark,
} from "@/lib/game/minigame";
import { Icon } from "@/components/ui/Icon";

/**
 * Two rates, because this panel lives in the game's layout — it is mounted on
 * every single `/game/*` screen, for every player, for as long as the tab is
 * open.
 *
 * At one flat 10s beat that cost six round trips a minute per open tab forever,
 * and the overwhelming majority of them asked a question with no answer: most of
 * the time no event is running, so each poll was a session verification and a
 * `loadLiveEvent()` that returned null. A hundred players idling on a page was
 * ~36k empty queries an hour.
 *
 * LIVE is the old beat and applies only while an event is actually on screen,
 * where the countdown and the rival board genuinely move. IDLE is the rest of
 * the time, when the only thing being waited for is an event to be announced —
 * and even that is belt-and-braces, since the layout renders the panel
 * server-side, so any navigation picks up a new event at once.
 */
const POLL_LIVE_MS = 10_000;
const POLL_IDLE_MS = 30_000;

type Feedback = { text: string; tone: string; eventId: string };

/** Time left on a timed release; fires `onExpire` once it runs out. */
function Countdown({
  endsAt,
  serverNow,
  onExpire,
}: {
  endsAt: number;
  serverNow: number;
  onExpire: () => void;
}) {
  // Counts down in SERVER time: the deadline is enforced server-side, so a
  // skewed client clock would otherwise show a number the server disagrees
  // with. Seeding from serverNow also makes the first client render identical
  // to the server's.
  const [now, setNow] = useState(serverNow);
  const skewRef = useRef(0);
  const fired = useRef(false);

  useEffect(() => {
    skewRef.current = serverNow - Date.now();
  }, [serverNow]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + skewRef.current), 1000);
    return () => clearInterval(id);
  }, []);

  const left = endsAt - now;

  // The panel clears itself the second the clock runs out — by asking the
  // server, which is what actually decides. Fired once: `left` keeps ticking
  // past zero and a plain effect would re-ask every second.
  useEffect(() => {
    if (left > 0 || fired.current) return;
    fired.current = true;
    onExpire();
  }, [left, onExpire]);

  if (left <= 0) return <span className="nums text-lg font-black leading-none">00:00</span>;
  const total = Math.floor(left / 1000);
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return (
    <span className="nums text-lg font-black leading-none tabular-nums" dir="ltr">
      {h > 0 ? `${String(h).padStart(2, "0")}:` : ""}
      {m}:{s}
    </span>
  );
}

/** One rival's row on the live standings. */
function BoardRow({ row, maxAttempts }: { row: MiniGameBoardRow; maxAttempts: number }) {
  const out = !row.solved && row.attempts >= maxAttempts;
  return (
    <li
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
        row.isSelf ? "bg-gold/10 ring-1 ring-gold/40" : "odd:bg-white/[0.03]"
      }`}
    >
      <span
        className={`min-w-0 flex-1 truncate font-bold ${
          row.isSelf ? "text-gold-bright" : "text-zinc-300"
        }`}
      >
        {row.name}
        {row.isSelf && <span className="mr-1 text-[10px] font-normal text-gold-dim">(אתה)</span>}
      </span>
      <span className="nums shrink-0 text-[11px] text-zinc-500" dir="ltr">
        {row.attempts}/{maxAttempts}
      </span>
      <span className="shrink-0 text-[10px] font-bold">
        {row.won ? (
          <span className="text-emerald-300">🏆 זכה</span>
        ) : row.solved ? (
          <span className="text-sky-300">✅ פתר</span>
        ) : out ? (
          <span className="text-red-300">💀 נגמרו</span>
        ) : (
          <span className="text-amber-300">⏳ משחק</span>
        )}
      </span>
    </li>
  );
}

/* ========================================================================== */
/*                          מצא את הכדור — the cups                           */
/* ========================================================================== */

/**
 * A row of upturned cups on a table, drawn in CSS (see `.cup*` in globals.css).
 * They are drawn rather than stood in for by an icon because the old panel
 * offered a line of potion bottles and asked "which cup?" — the one thing the
 * game is about was the one thing not on screen.
 *
 * A cup the player already lifted stays lifted, and cannot be picked again. The
 * attempt log is server-side, so that survives a reload — which is the point:
 * without it, the easiest way to lose is to spend a second attempt emptying a
 * cup you already emptied.
 */
function CupsGame({
  count,
  history,
  interactive,
  pending,
  onPick,
}: {
  count: number;
  history: MiniGameHistoryRow[];
  interactive: boolean;
  pending: boolean;
  onPick: (index: number) => void;
}) {
  const picks = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const row of history) if (row.kind === "cup") map.set(row.pick, row.hit);
    return map;
  }, [history]);

  // The shuffle is a mount-time flourish, gated on "has this player touched the
  // game yet" rather than re-run per render — a poll tick hands down a new state
  // object every 10s, and re-shuffling under a player mid-decision would read as
  // the game cheating.
  const shuffling = picks.size === 0;

  return (
    <div className="cups-stage" role="group" aria-label="כוסות">
      <div className={`cups-row ${shuffling ? "is-shuffling" : ""}`}>
        {Array.from({ length: count }).map((_, i) => {
          const tried = picks.has(i);
          const hit = picks.get(i) === true;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              disabled={!interactive || tried || pending}
              className="cup"
              data-state={hit ? "hit" : tried ? "tried" : "idle"}
              style={{ "--i": i, "--dir": i % 2 === 0 ? 1 : -1 } as CSSProperties}
              aria-label={
                hit ? `כוס ${i + 1} — הכדור כאן!` : tried ? `כוס ${i + 1} — ריקה` : `כוס ${i + 1}`
              }
            >
              {hit && <span className="cup-ball" aria-hidden />}
              {/* Only the art lifts. The ball and the shadow are siblings of it,
                  so the ball stays put on the table instead of being carried
                  away by the tilt of the cup that was covering it. */}
              <span className="cup-art" aria-hidden>
                <span className="cup-body">
                  <span className="cup-shine" />
                </span>
                <span className="cup-base" />
                <span className="cup-mouth" />
              </span>
              <span className="cup-shadow" aria-hidden />
              <span className="cup-empty" aria-hidden>
                ✕
              </span>
            </button>
          );
        })}
      </div>
      <div className="cups-table" aria-hidden />
    </div>
  );
}

/* ========================================================================== */
/*                        פריצת הכספת — the code lock                         */
/* ========================================================================== */

const MARK_CLASS: Record<SafeMark, string> = {
  hit: "mark-hit",
  near: "mark-near",
  miss: "mark-miss",
};

/** The three marks, spelled out once above the log so the game is learnable. */
function SafeLegend() {
  return (
    <ul className="safe-legend">
      <li>
        <span className="safe-pip mark-hit" aria-hidden />
        ספרה נכונה במקום הנכון
      </li>
      <li>
        <span className="safe-pip mark-near" aria-hidden />
        ספרה נכונה במקום אחר
      </li>
      <li>
        <span className="safe-pip mark-miss" aria-hidden />
        לא בקוד
      </li>
    </ul>
  );
}

/**
 * The vault. Type a code and every digit comes back marked — right digit in the
 * right slot, right digit in the wrong slot, or not in the code at all — so the
 * attempt log below is a set of constraints to reason from rather than a list of
 * failures. The marks are computed server-side (see scoreCode); the client only
 * ever paints what it was handed.
 */
function SafeGame({
  digits,
  history,
  interactive,
  solved,
  pending,
  attempts,
  onSubmit,
}: {
  digits: number;
  history: MiniGameHistoryRow[];
  interactive: boolean;
  solved: boolean;
  pending: boolean;
  attempts: number;
  onSubmit: (code: string) => void;
}) {
  const [code, setCode] = useState<string[]>(() => Array(digits).fill(""));
  const slots = useRef<(HTMLInputElement | null)[]>([]);

  // Clear the dial once an attempt lands, keyed on the attempt count — that is
  // the *server's* record that the submission was accepted, so a rejected one
  // leaves the player's digits where they typed them.
  //
  // Adjusted during render rather than in an effect: an effect would paint the
  // spent code for a frame before wiping it, and re-keying the component would
  // remount the inputs and drop focus mid-game.
  const [lastReset, setLastReset] = useState(`${digits}:${attempts}`);
  if (lastReset !== `${digits}:${attempts}`) {
    setLastReset(`${digits}:${attempts}`);
    setCode(Array(digits).fill(""));
  }

  const rows = history.filter(
    (r): r is Extract<MiniGameHistoryRow, { kind: "code" }> => r.kind === "code"
  );
  const ready = code.length === digits && code.every((d) => d !== "");
  // A cracked safe keeps the winning code in the wheels. Three blank boxes under
  // "הכספת פתוחה" read as a form waiting for input, which is the opposite of
  // what just happened.
  const shown = solved ? (rows[rows.length - 1]?.code.split("") ?? code) : code;

  function put(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < digits - 1) slots.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      e.preventDefault();
      slots.current[index - 1]?.focus();
      setCode((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
    }
    if (e.key === "ArrowLeft" && index > 0) slots.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < digits - 1) slots.current[index + 1]?.focus();
  }

  // A player who wants to re-try an earlier code with one digit changed should be
  // able to paste it back in rather than retype it slot by slot.
  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, digits);
    if (!pasted) return;
    e.preventDefault();
    setCode(Array.from({ length: digits }, (_, i) => pasted[i] ?? ""));
    slots.current[Math.min(pasted.length, digits - 1)]?.focus();
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || !interactive || pending) return;
    onSubmit(code.join(""));
  }

  return (
    <div className="safe-stage">
      {/* --- the vault door --- */}
      <div className={`safe-door ${solved ? "is-open" : ""}`} aria-hidden>
        <span className="safe-vault">
          <span className="safe-loot">💰</span>
        </span>
        <span className="safe-plate">
          {/* One notch per attempt, so the dial visibly winds as the player works. */}
          <span className="safe-dial" style={{ "--turn": attempts } as CSSProperties}>
            <span className="safe-dial-face" />
            <span className="safe-dial-mark" />
          </span>
          <span className="safe-rivets" />
          <span className="safe-handle" />
        </span>
      </div>

      {/* --- the keypad + the attempt log --- */}
      <div className="safe-controls">
        <form onSubmit={submit} className="space-y-2.5">
          <p className="text-center text-sm text-zinc-300">
            {solved ? (
              <span className="font-bold text-emerald-300">הכספת פתוחה 🎉</span>
            ) : (
              <>
                הזן קוד בן{" "}
                <span className="nums font-bold text-gold-bright" dir="ltr">
                  {digits}
                </span>{" "}
                ספרות
              </>
            )}
          </p>
          <div className="safe-slots" dir="ltr">
            {Array.from({ length: digits }).map((_, i) => (
              <input
                key={i}
                ref={(el) => {
                  slots.current[i] = el;
                }}
                value={shown[i] ?? ""}
                onChange={(e) => put(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                onFocus={(e) => e.target.select()}
                disabled={!interactive || pending}
                inputMode="numeric"
                autoComplete="off"
                maxLength={1}
                className={`safe-slot nums ${solved ? "is-cracked" : ""}`}
                aria-label={`ספרה ${i + 1}`}
              />
            ))}
          </div>
          {interactive && (
            <div className="flex justify-center">
              <button type="submit" disabled={!ready || pending} className="btn btn-gold px-6">
                🔓 נסה לפרוץ
              </button>
            </div>
          )}
        </form>

        {rows.length > 0 && (
          <div className="safe-log">
            <SafeLegend />
            <ul dir="ltr">
              {rows.map((row, i) => (
                <li key={i} className="safe-log-row">
                  <span className="safe-log-n nums">{i + 1}</span>
                  {row.code.split("").map((digit, d) => (
                    <span key={d} className={`safe-log-digit nums ${MARK_CLASS[row.marks[d]]}`}>
                      {digit}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */

/**
 * The live mini-game, rendered big at the top of every game screen (under the
 * season pass) rather than tucked into the command bar.
 *
 * It deliberately has no dismiss: once a player solves it or burns their last
 * attempt they stay on the panel and watch the rival board until the event
 * itself ends — that tail is the point of the event, not leftovers.
 */
export function MiniGamePanel({ initial }: { initial: MiniGameState | null }) {
  const router = useRouter();
  const [state, setState] = useState<MiniGameState | null>(initial);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const next = await getMiniGameState();
    setState(next);
    // The layout renders the first copy server-side; keep it from resurrecting
    // a game that has since ended.
    if (!next) router.refresh();
  }, [router]);

  // Derived rather than read off `state` inside the effect: the poll result is a
  // new object every tick, so depending on `state` itself would tear down and
  // rebuild the interval on every beat. This flips only when an event starts or
  // ends, which is exactly when the rate should change.
  const live = state !== null;

  // Poll for activation / end / rival progress.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      // Nobody is watching a hidden tab, and the wake-up listeners below poll
      // the moment it comes back — so skipping here is not falling behind, it is
      // the difference between a backgrounded tab costing six requests a minute
      // for hours and costing nothing. Same rule the chat dock already follows.
      if (document.visibilityState === "hidden") return;
      const next = await getMiniGameState();
      if (alive) setState(next);
    };
    const id = setInterval(tick, live ? POLL_LIVE_MS : POLL_IDLE_MS);
    const onWake = () => {
      if (document.visibilityState === "visible") void tick();
    };
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [live]);

  function play(eventId: string, value: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("guess", value);
      const res = await submitMiniGameGuess({ state: null, feedback: "", tone: "info" }, fd);
      if (res.state) setState(res.state);
      setFeedback({ text: res.feedback, tone: res.tone, eventId });
      if (res.tone === "win") router.refresh();
    });
  }

  if (!state) return null;

  const meta = MINIGAME_TYPE_META[state.type];
  const attemptsLeft = Math.max(0, state.maxAttempts - state.attempts);
  const outOfAttempts = !state.solved && attemptsLeft === 0;
  // A finished player keeps the board on screen in a read-only state rather than
  // having it swapped out for a text box: the cracked safe and the cup with the
  // ball under it ARE the payoff.
  const interactive = !state.solved && !outOfAttempts;
  const fb = feedback && feedback.eventId === state.id ? feedback : null;
  const toneClass =
    fb?.tone === "win"
      ? "text-emerald-300"
      : fb?.tone === "lose" || fb?.tone === "error"
        ? "text-red-300"
        : fb?.tone === "hint"
          ? "text-amber-300"
          : "text-zinc-300";

  return (
    <section
      dir="rtl"
      className="panel-gold mb-5 rounded-xl p-4 shadow-[0_0_30px_-14px_var(--gold)]"
      aria-label="מיני-משחק פעיל"
    >
      {/* ── Banner: what it is, what it pays, how long it lives ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gold/25 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gold/50 bg-black/40 ${
              interactive ? "animate-bounce" : ""
            }`}
            aria-hidden
          >
            <Icon
              name={state.type === "CRACK_SAFE" ? (state.solved ? "unlocked" : "lock") : "dice"}
              size={24}
              className="text-gold-bright"
            />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-lg font-black leading-tight text-gold-bright">
              <span aria-hidden>{meta.icon}</span>
              <span className="truncate">{state.title}</span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                משחק פעיל
              </span>
            </p>
            <p className="text-xs text-gold-dim">
              {meta.label} · פרס:{" "}
              <span className="font-bold text-amber-200" dir="ltr">
                {state.prizeText}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {state.maxWinners > 0 && (
            <span className="rounded-md border border-border-subtle px-2 py-1 text-zinc-400">
              זוכים{" "}
              <span className="nums font-bold text-zinc-200" dir="ltr">
                {state.winnersCount}/{state.maxWinners}
              </span>
            </span>
          )}
          <span className="rounded-md border border-border-subtle px-2 py-1 text-zinc-400">
            משתתפים{" "}
            <span className="nums font-bold text-zinc-200" dir="ltr">
              {state.players}
            </span>
          </span>
          {state.endsAt != null && (
            // The clock is the one number on this banner that is actually
            // urgent, so it is sized past the badges around it rather than
            // sharing their 11px — at that size it read as another chip.
            <span className="flex items-center gap-1.5 rounded-lg border border-gold/50 bg-black/45 px-2.5 py-1 text-[13px] font-bold text-gold-bright shadow-[0_0_16px_-6px_var(--gold)]">
              <span aria-hidden className="text-base leading-none">
                ⏳
              </span>
              נותר{" "}
              <Countdown
                key={state.endsAt}
                endsAt={state.endsAt}
                serverNow={state.serverNow}
                onExpire={refresh}
              />
            </span>
          )}
        </div>
      </div>

      {/* ── Play area + live standings ── */}
      <div className="grid gap-4 pt-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-3">
          {state.solved && (
            <div className="panel-inset space-y-1 rounded-lg p-3 text-center">
              <p className="text-xl font-black text-emerald-300">
                {state.won ? "🎉 ניצחת!" : "✅ פתרת נכון"}
              </p>
              <p className="text-sm text-zinc-300">
                {state.won
                  ? `הפרס נוסף לאימפריה שלך: ${state.prizeText}`
                  : "כל הפרסים כבר חולקו — אבל כל הכבוד!"}
              </p>
            </div>
          )}
          {outOfAttempts && (
            <div className="panel-inset space-y-1 rounded-lg p-3 text-center">
              <p className="text-xl font-black text-red-300">😔 נגמרו הניסיונות</p>
              <p className="text-sm text-zinc-400">
                יצאת מהמשחק, אבל הוא עדיין רץ — עקוב אחרי המתחרים עד שיסתיים.
              </p>
            </div>
          )}

          {state.type === "CRACK_SAFE" ? (
            <SafeGame
              digits={state.digits ?? 3}
              history={state.history}
              interactive={interactive}
              solved={state.solved}
              pending={pending}
              attempts={state.attempts}
              onSubmit={(value) => play(state.id, value)}
            />
          ) : (
            <CupsGame
              count={state.cups ?? 3}
              history={state.history}
              interactive={interactive}
              pending={pending}
              onPick={(i) => play(state.id, String(i))}
            />
          )}

          <p className="text-center text-xs text-zinc-500">
            {interactive ? (
              <>
                נותרו{" "}
                <span className="nums font-bold text-zinc-300" dir="ltr">
                  {attemptsLeft}
                </span>{" "}
                ניסיונות
              </>
            ) : (
              "עקוב אחרי שאר השחקנים עד שהמשחק ייסגר ←"
            )}
          </p>

          {fb && <p className={`text-center text-sm font-bold ${toneClass}`}>{fb.text}</p>}
        </div>

        {/* Live standings — the reason a knocked-out player stays on the panel. */}
        <div className="panel-inset rounded-lg p-2">
          <p className="px-1 pb-1.5 text-[11px] font-bold text-gold-dim">🏁 מי משחק עכשיו</p>
          {state.board.length === 0 ? (
            <p className="px-1 py-3 text-center text-[11px] text-zinc-500">
              עדיין אף אחד לא ניסה — היה הראשון!
            </p>
          ) : (
            <ul className="max-h-56 space-y-0.5 overflow-y-auto">
              {state.board.map((row) => (
                <BoardRow key={row.empireId} row={row} maxAttempts={state.maxAttempts} />
              ))}
            </ul>
          )}
          {state.players > state.board.length && (
            <p className="px-1 pt-1.5 text-center text-[10px] text-zinc-600">
              ועוד{" "}
              <span className="nums" dir="ltr">
                {state.players - state.board.length}
              </span>{" "}
              משתתפים
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
