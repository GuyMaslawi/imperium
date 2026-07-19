"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getMiniGameState, submitMiniGameGuess } from "@/server/actions/minigame";
import { MINIGAME_TYPE_META, type MiniGameState } from "@/lib/game/minigame";
import { Icon } from "@/components/ui/Icon";

const POLL_MS = 12_000;
const DISMISS_KEY = "warzone-minigame-dismissed";

function isDismissed(id: string): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === id;
  } catch {
    return false;
  }
}
function markDismissed(id: string) {
  try {
    localStorage.setItem(DISMISS_KEY, id);
  } catch {
    /* ignore */
  }
}

type Feedback = { text: string; tone: string; eventId: string };

export function MiniGameLauncher({ initial }: { initial: MiniGameState | null }) {
  const router = useRouter();
  const [state, setState] = useState<MiniGameState | null>(initial);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [closedId, setClosedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Poll for activation / end / winners progress (inside the interval callback,
  // not synchronously in the effect body).
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const next = await getMiniGameState();
      if (alive) setState(next);
    };
    const id = setInterval(tick, POLL_MS);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

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
    const value = Number(new FormData(e.currentTarget).get("guess"));
    if (Number.isFinite(value)) play(state.id, value);
  }

  if (!state) return null;
  if (closedId === state.id || isDismissed(state.id)) return null;

  const meta = MINIGAME_TYPE_META[state.type];
  const attemptsLeft = Math.max(0, state.maxAttempts - state.attempts);
  const done = state.solved || state.finished;
  const fb = feedback && feedback.eventId === state.id ? feedback : null;
  const toneClass =
    fb?.tone === "win"
      ? "text-emerald-300"
      : fb?.tone === "lose" || fb?.tone === "error"
        ? "text-red-300"
        : fb?.tone === "hint"
          ? "text-amber-300"
          : "text-zinc-300";

  function dismiss() {
    if (!state) return;
    markDismissed(state.id);
    setClosedId(state.id);
    setOpen(false);
  }

  return (
    <>
      {/* ── The die on the right of the command bar ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="יש משחק פעיל! לחץ לשחק"
        className="relative flex shrink-0 items-center gap-2 rounded-lg border border-gold/60 bg-gradient-to-b from-[#3a2a12] to-[#1a130a] px-2.5 py-1.5 shadow-[0_0_14px_rgba(212,168,67,0.35)] transition-transform hover:-translate-y-0.5"
      >
        {!done && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-3 w-3"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
        )}
        <span className={`text-xl leading-none ${done ? "" : "animate-bounce"}`} aria-hidden>
          <Icon name="dice" size={20} className="text-crimson-bright" />
        </span>
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="text-[10px] font-bold text-gold-dim">משחק</span>
          <span className="text-[11px] font-black text-gold-bright">
            {done ? (state.won ? "ניצחת!" : "הסתיים") : "שחק וזכה!"}
          </span>
        </span>
      </button>

      {/* ── The game window (modal) ── */}
      {open && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="ornate-shell relative z-10 w-full max-w-md rounded-xl p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-lg font-black text-gold-bright">
                  <span aria-hidden>{meta.icon}</span>
                  {state.title}
                </p>
                <p className="text-xs text-gold-dim">{meta.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-subtle text-zinc-400 transition-colors hover:border-red-500/50 hover:text-red-300"
                aria-label="סגור"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 rounded-lg panel-inset p-3 text-center text-sm">
              <span className="text-zinc-400">פרס: </span>
              <span className="font-bold text-amber-200" dir="ltr">
                {state.prizeText}
              </span>
              {state.maxWinners > 0 && (
                <div className="mt-1 text-[11px] text-zinc-500">
                  זוכים {state.winnersCount}/{state.maxWinners}
                </div>
              )}
            </div>

            {state.solved ? (
              <div className="space-y-3 text-center">
                <p className="text-2xl font-black text-emerald-300">
                  {state.won ? "🎉 ניצחת!" : "✅ פתרת נכון"}
                </p>
                <p className="text-sm text-zinc-300">
                  {state.won
                    ? `הפרס נוסף לאימפריה שלך: ${state.prizeText}`
                    : "כל הפרסים כבר חולקו — אבל כל הכבוד!"}
                </p>
                <button onClick={dismiss} className="btn btn-gold w-full">
                  סגור
                </button>
              </div>
            ) : state.finished ? (
              <div className="space-y-3 text-center">
                <p className="text-2xl font-black text-red-300">😔 נגמרו הניסיונות</p>
                <p className="text-sm text-zinc-400">נסה שוב במשחק הבא!</p>
                <button onClick={dismiss} className="btn btn-ghost w-full">
                  סגור
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {state.type === "GUESS_NUMBER" ? (
                  <form onSubmit={onNumberSubmit} className="space-y-3">
                    <p className="text-center text-sm text-zinc-300">
                      נחש מספר בין{" "}
                      <span className="font-bold text-gold-bright nums" dir="ltr">
                        {state.min}
                      </span>{" "}
                      ל-
                      <span className="font-bold text-gold-bright nums" dir="ltr">
                        {state.max}
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <input
                        name="guess"
                        type="number"
                        min={state.min ?? undefined}
                        max={state.max ?? undefined}
                        required
                        autoFocus
                        dir="ltr"
                        className="flex-1 rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-center text-lg font-bold text-zinc-100 outline-none focus:border-gold/60"
                        placeholder="?"
                      />
                      <button type="submit" disabled={pending} className="btn btn-gold px-5">
                        נחש
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <p className="text-center text-sm text-zinc-300">
                      באיזו כוס מסתתר הכדור? 🔮
                    </p>
                    <div className="flex justify-center gap-3">
                      {Array.from({ length: state.cups ?? 3 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => play(state.id, i)}
                          disabled={pending}
                          className="btn btn-dark flex h-16 w-16 items-center justify-center text-3xl transition-transform hover:-translate-y-1"
                          title={`כוס ${i + 1}`}
                        >
                          <Icon name="potion" size={30} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {fb && (
                  <p className={`text-center text-sm font-bold ${toneClass}`}>{fb.text}</p>
                )}

                <p className="text-center text-xs text-zinc-500">
                  נותרו{" "}
                  <span className="font-bold text-zinc-300 nums" dir="ltr">
                    {attemptsLeft}
                  </span>{" "}
                  ניסיונות
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
