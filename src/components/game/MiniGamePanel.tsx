"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { getMiniGameState, submitMiniGameGuess } from "@/server/actions/minigame";
import {
  MINIGAME_TYPE_META,
  type MiniGameBoardRow,
  type MiniGameState,
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

  if (left <= 0) return <span className="nums">00:00</span>;
  const total = Math.floor(left / 1000);
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return (
    <span className="nums" dir="ltr">
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

  function play(eventId: string, value: number) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("guess", String(value));
      const res = await submitMiniGameGuess({ state: null, feedback: "", tone: "info" }, fd);
      if (res.state) setState(res.state);
      setFeedback({ text: res.feedback, tone: res.tone, eventId });
      if (res.tone === "win") router.refresh();
    });
  }

  function onNumberSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!state) return;
    const form = e.currentTarget;
    const value = Number(new FormData(form).get("guess"));
    if (Number.isFinite(value)) {
      play(state.id, value);
      form.reset();
    }
  }

  if (!state) return null;

  const meta = MINIGAME_TYPE_META[state.type];
  const attemptsLeft = Math.max(0, state.maxAttempts - state.attempts);
  const outOfAttempts = !state.solved && attemptsLeft === 0;
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
              outOfAttempts || state.solved ? "" : "animate-bounce"
            }`}
            aria-hidden
          >
            <Icon name="dice" size={24} className="text-gold-bright" />
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
            <span className="flex items-center gap-1.5 rounded-md border border-gold/40 bg-black/30 px-2 py-1 font-bold text-gold-bright">
              ⏳ נותר{" "}
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
        <div className="min-w-0">
          {state.solved ? (
            <div className="panel-inset space-y-1 rounded-lg p-4 text-center">
              <p className="text-2xl font-black text-emerald-300">
                {state.won ? "🎉 ניצחת!" : "✅ פתרת נכון"}
              </p>
              <p className="text-sm text-zinc-300">
                {state.won
                  ? `הפרס נוסף לאימפריה שלך: ${state.prizeText}`
                  : "כל הפרסים כבר חולקו — אבל כל הכבוד!"}
              </p>
              <p className="text-xs text-zinc-500">עקוב אחרי שאר השחקנים עד שהמשחק ייסגר ←</p>
            </div>
          ) : outOfAttempts ? (
            <div className="panel-inset space-y-1 rounded-lg p-4 text-center">
              <p className="text-2xl font-black text-red-300">😔 נגמרו הניסיונות</p>
              <p className="text-sm text-zinc-400">
                יצאת מהמשחק, אבל הוא עדיין רץ — עקוב אחרי המתחרים עד שיסתיים.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.type === "GUESS_NUMBER" ? (
                <form onSubmit={onNumberSubmit} className="space-y-3">
                  <p className="text-center text-sm text-zinc-300">
                    נחש מספר בין{" "}
                    <span className="nums font-bold text-gold-bright" dir="ltr">
                      {state.min}
                    </span>{" "}
                    ל-
                    <span className="nums font-bold text-gold-bright" dir="ltr">
                      {state.max}
                    </span>
                  </p>
                  <div className="mx-auto flex max-w-sm gap-2">
                    <input
                      name="guess"
                      type="number"
                      min={state.min ?? undefined}
                      max={state.max ?? undefined}
                      required
                      dir="ltr"
                      className="flex-1 rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-center text-lg font-bold text-zinc-100 outline-none focus:border-gold/60"
                      placeholder="?"
                    />
                    <button type="submit" disabled={pending} className="btn btn-gold px-6">
                      נחש
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <p className="text-center text-sm text-zinc-300">באיזו כוס מסתתר הכדור? 🔮</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {Array.from({ length: state.cups ?? 3 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => play(state.id, i)}
                        disabled={pending}
                        className="btn btn-dark flex h-16 w-16 items-center justify-center transition-transform hover:-translate-y-1"
                        title={`כוס ${i + 1}`}
                      >
                        <Icon name="potion" size={30} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-center text-xs text-zinc-500">
                נותרו{" "}
                <span className="nums font-bold text-zinc-300" dir="ltr">
                  {attemptsLeft}
                </span>{" "}
                ניסיונות
              </p>
            </div>
          )}

          {fb && <p className={`pt-2 text-center text-sm font-bold ${toneClass}`}>{fb.text}</p>}
        </div>

        {/* Live standings — the reason a knocked-out player stays on the panel. */}
        <div className="panel-inset rounded-lg p-2">
          <p className="px-1 pb-1.5 text-[11px] font-bold text-gold-dim">
            🏁 מי משחק עכשיו
          </p>
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
