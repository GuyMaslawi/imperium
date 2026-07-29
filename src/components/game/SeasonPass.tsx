"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon, RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import {
  SEASON_PASS_PREMIUM_MULTIPLIER,
  SEASON_PASS_REWARD_LABEL,
} from "@/lib/game/seasonPass";
import {
  buySeasonPassPremium,
  claimSeasonPassRewards,
  type SeasonPassHaulEntry,
  type SeasonPassState,
  type SeasonPassTierView,
} from "@/server/actions/seasonPass";

const heNum = (n: number) => Math.round(n).toLocaleString("he-IL");

/**
 * The premium-unlock cascade pops rows one after another. At 50 tiers a
 * per-row delay would run for the better part of a minute, so only the first
 * few rows — the ones actually on screen when the modal is at the top — are
 * staggered; everything below opens together, off-screen.
 */
const UNLOCK_CASCADE_ROWS = 12;
const UNLOCK_CASCADE_STEP = 55;
const UNLOCK_CASCADE_MS = UNLOCK_CASCADE_ROWS * UNLOCK_CASCADE_STEP + 700;

/**
 * Remember that this cycle's clear has already been celebrated, and report
 * whether this is the first time. Keyed by the cycle's end timestamp, so the
 * next ladder celebrates again; the key changes twice a day, which also keeps
 * the entry from accumulating meaningfully.
 *
 * Storage can throw (Safari private mode, blocked cookies) — a celebration is
 * not worth breaking a claim over, so a failure just means it may show twice.
 */
function markCleared(cycleEndsAt: number): boolean {
  const key = `sp-cleared:${cycleEndsAt}`;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
  } catch {
    // ignore — fall through and celebrate
  }
  return true;
}

/**
 * The spoils of a claim, one tile per resource kind.
 *
 * The server totals the haul per kind before it gets here, so this never shows
 * the same resource twice — the old summary was a per-tier string join and read
 * as "4,000 זהב · 12,000 זהב · … · 5,000 זהב", which looked like a bug.
 */
function HaulPanel({
  haul,
  tiers,
  onDismiss,
}: {
  haul: SeasonPassHaulEntry[];
  tiers: number;
  onDismiss: () => void;
}) {
  return (
    <div className="haul-panel mt-4 overflow-hidden rounded-xl border border-emerald-500/50 bg-gradient-to-b from-emerald-950/70 via-black/60 to-black/70 p-3 shadow-[0_0_28px_-10px_rgba(16,185,129,0.8)]">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onDismiss}
          aria-label="סגור סיכום"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 text-[11px] text-emerald-300/70 transition hover:bg-emerald-500/10 hover:text-emerald-200"
        >
          ✕
        </button>
        <p className="flex items-center gap-1.5 text-sm font-black text-emerald-300">
          <Icon name="gift" size={15} />
          השלל נאסף
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-200 nums">
            {tiers} דרגות
          </span>
        </p>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {haul.map((entry, i) => (
          <div
            key={entry.kind}
            style={{ animationDelay: `${i * 70}ms` }}
            className="haul-tile flex flex-col items-center justify-center gap-1 rounded-lg border border-emerald-500/25 bg-black/50 p-2 text-center"
          >
            <Icon
              name={RESOURCE_ICON[entry.kind]}
              size={24}
              className={RESOURCE_ICON_COLOR[entry.kind]}
            />
            <span className="text-sm font-black text-emerald-200 nums">
              +{heNum(entry.amount)}
            </span>
            <span className="text-[10px] font-bold leading-none text-zinc-400">
              {SEASON_PASS_REWARD_LABEL[entry.kind]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FreeTile({ tier }: { tier: SeasonPassTierView }) {
  const { reached } = tier;
  const { kind, label, claimed } = tier.free;
  return (
    <div
      className={`flex h-full flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center ${
        reached ? "border-sky-500/40 bg-gradient-to-b from-sky-900/30 to-sky-950/50" : "border-white/10 bg-black/30"
      }`}
    >
      <Icon
        name={RESOURCE_ICON[kind]}
        size={26}
        className={`${RESOURCE_ICON_COLOR[kind]} ${reached ? "" : "opacity-40"}`}
      />
      <span className={`px-1 text-[10px] font-bold leading-tight ${reached ? "text-sky-200" : "text-zinc-600"}`}>
        {label}
      </span>
      {claimed ? (
        <span className="text-[9px] font-bold text-emerald-400">נאסף ✅</span>
      ) : reached ? (
        <span className="text-[9px] font-bold text-zinc-400">זמין</span>
      ) : (
        <span className="text-[9px] font-bold text-zinc-600">🔒 טרם הושג</span>
      )}
    </div>
  );
}

function PremiumTile({
  tier,
  owned,
  unlocking,
  delay,
}: {
  tier: SeasonPassTierView;
  owned: boolean;
  unlocking: boolean;
  delay: number;
}) {
  const { reached } = tier;
  const { kind, label, claimed } = tier.premium;
  const showContentUnlocked = owned || unlocking; // reveal artwork as it pops open
  return (
    <div
      style={unlocking ? { animationDelay: `${delay}ms` } : undefined}
      className={`relative flex h-full flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border p-2 text-center transition ${
        owned
          ? "border-gold/60 bg-gradient-to-b from-amber-800/40 to-amber-950/60 shadow-[0_0_18px_-6px_var(--gold)]"
          : "border-gold/30 bg-gradient-to-b from-amber-900/20 to-amber-950/40"
      } ${unlocking ? "sp-unlocking" : ""}`}
    >
      <Icon
        name={RESOURCE_ICON[kind]}
        size={26}
        className={`${RESOURCE_ICON_COLOR[kind]} ${showContentUnlocked ? "" : "opacity-40 grayscale"}`}
      />
      <span
        className={`px-1 text-[10px] font-bold leading-tight ${
          showContentUnlocked ? "text-gold-bright" : "text-gold-dim/60"
        }`}
      >
        {label}
      </span>

      {/* status line */}
      {!owned ? (
        <span className="text-[9px] font-bold text-gold-dim">🔒 פרימיום</span>
      ) : claimed ? (
        <span className="text-[9px] font-bold text-emerald-400">נאסף ✅</span>
      ) : reached ? (
        <span className="flex items-center justify-center gap-0.5 text-[9px] font-bold text-gold-bright"><Icon name="spark" size={11} /> מוכן לאיסוף</span>
      ) : (
        <span className="text-[9px] font-bold text-zinc-500">🔒 טרם הושג</span>
      )}

      {/* lock overlay — breaks away during unlock, gone once owned */}
      {(!owned || unlocking) && (
        <span
          aria-hidden
          style={unlocking ? { animationDelay: `${delay}ms` } : undefined}
          className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-lg ${
            unlocking ? "sp-lockbreak" : ""
          }`}
        >
          🔒
        </span>
      )}
    </div>
  );
}

/** Countdown to the daily update that refills the ladder with bigger rewards. */
function CycleCountdown({ endsAt }: { endsAt: number }) {
  // Seeded from a lazy initializer and re-seeded by the `key` at the call site,
  // so a new cycle boundary remounts this with a fresh reading. The old code
  // re-synced with a `setLeft` at the top of the effect, which fired on every
  // mount and forced a second render pass before the first had painted.
  const [left, setLeft] = useState(() => endsAt - Date.now());

  useEffect(() => {
    const id = setInterval(() => setLeft(endsAt - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (left <= 0) return <span className="nums">מתחדש עכשיו…</span>;
  const total = Math.floor(left / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return <span className="nums">{h}:{m}:{s}</span>;
}

/**
 * Confetti positions. Hard-coded rather than randomised: this renders inside a
 * client component that can be server-rendered on a later navigation, and a
 * Math.random() here would produce a hydration mismatch.
 */
const CONFETTI = [
  { left: 6, delay: 0, dur: 2.6, tone: "var(--gold-bright)" },
  { left: 14, delay: 0.5, dur: 3.2, tone: "#34d399" },
  { left: 23, delay: 0.15, dur: 2.9, tone: "var(--gold)" },
  { left: 31, delay: 0.9, dur: 3.4, tone: "#f87171" },
  { left: 39, delay: 0.3, dur: 2.7, tone: "var(--gold-bright)" },
  { left: 47, delay: 1.1, dur: 3.1, tone: "#38bdf8" },
  { left: 55, delay: 0.2, dur: 3.5, tone: "var(--gold)" },
  { left: 63, delay: 0.75, dur: 2.8, tone: "#34d399" },
  { left: 71, delay: 0.45, dur: 3.3, tone: "var(--gold-bright)" },
  { left: 79, delay: 1.3, dur: 2.6, tone: "#f87171" },
  { left: 87, delay: 0.6, dur: 3.0, tone: "var(--gold)" },
  { left: 94, delay: 0.05, dur: 3.4, tone: "#38bdf8" },
];

/**
 * The "you cleared the whole ladder" moment.
 *
 * Deliberately a sibling of the pass modal rather than a child: the per-claim
 * haul panel dies with the modal, which meant finishing the ladder — the one
 * thing worth celebrating — flashed past and vanished on the next ✕. This
 * survives closing the pass and has to be dismissed on its own.
 */
function CycleClearedOverlay({
  haul,
  tierCount,
  day,
  cycleEndsAt,
  owned,
  multiplier,
  onClose,
}: {
  haul: SeasonPassHaulEntry[];
  tierCount: number;
  day: number;
  cycleEndsAt: number;
  owned: boolean;
  multiplier: number;
  onClose: () => void;
}) {
  return (
    <div
      dir="rtl"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/85 p-4 backdrop-blur-sm"
    >
      {/* confetti rains over the whole screen, behind the card */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className="sp-confetti absolute top-[-8%] h-3 w-1.5 rounded-sm"
            style={{
              left: `${c.left}%`,
              background: c.tone,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.dur}s`,
            }}
          />
        ))}
      </span>

      <div
        onClick={(e) => e.stopPropagation()}
        className="sp-cheer ornate-shell relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl"
      >
        <div className="min-h-0 overflow-y-auto p-6 text-center">
          <p className="sp-trophy text-5xl leading-none">🏆</p>
          <h2 className="mt-3 text-2xl font-black text-gold-bright">
            וואו! ניקית הכול 🔥
          </h2>
          <p className="mt-1.5 text-sm font-bold text-zinc-300">
            סיימת את כל <span className="nums text-gold-bright">{tierCount}</span> הדרגות של
            דרך התהילה — ביום <span className="nums">{day}</span> של העונה. משוגע.
          </p>

          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3">
            <p className="text-xs font-black text-emerald-300">כל השלל של הסבב הזה</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {haul.map((entry, i) => (
                <div
                  key={entry.kind}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className="haul-tile flex flex-col items-center justify-center gap-1 rounded-lg border border-emerald-500/25 bg-black/50 p-2"
                >
                  <Icon
                    name={RESOURCE_ICON[entry.kind]}
                    size={24}
                    className={RESOURCE_ICON_COLOR[entry.kind]}
                  />
                  <span className="text-sm font-black text-emerald-200 nums">
                    +{heNum(entry.amount)}
                  </span>
                  <span className="text-[10px] font-bold leading-none text-zinc-400">
                    {SEASON_PASS_REWARD_LABEL[entry.kind]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-gold/40 bg-amber-950/30 p-3">
            <p className="text-xs font-bold text-amber-100/90">
              סבב חדש נפתח בעדכון היומי הבא, בעוד{" "}
              <b className="text-gold-bright">
                <CycleCountdown key={cycleEndsAt} endsAt={cycleEndsAt} />
              </b>
            </p>
            {/* Payouts are priced per season *day*, not per cycle — the ladder
                refills twice a day but both refills are worth the same. Saying
                "next cycle pays more" would be a promise the math doesn't keep. */}
            <p className="mt-1 text-[11px] text-zinc-400">
              הסולם יתמלא מחדש — וכל יום שעובר בעונה מגדיל את התגמולים בכל דרגה
            </p>
          </div>

          {!owned && (
            <p className="mt-3 text-[11px] font-bold text-gold-dim">
              👑 עם פרימיום היית לוקח פי {multiplier} מזה — הצד הזהוב נשאר נעול
            </p>
          )}

          <button onClick={onClose} className="btn btn-gold mt-4 w-full py-2.5 font-black">
            יאללה, בחזרה לקרב
          </button>
        </div>
      </div>
    </div>
  );
}

export function SeasonPassButton({ initial }: { initial: SeasonPassState }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(initial);
  const [unlocking, setUnlocking] = useState(false);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [haul, setHaul] = useState<{ entries: SeasonPassHaulEntry[]; tiers: number } | null>(null);
  const [cleared, setCleared] = useState<SeasonPassHaulEntry[] | null>(null);
  const [pending, startTransition] = useTransition();
  const ladderRef = useRef<HTMLDivElement | null>(null);
  const currentRowRef = useRef<HTMLDivElement | null>(null);

  // Open the ladder at the tier the player is actually on. Fifty rows means the
  // part that matters — what just unlocked and what is next — is otherwise
  // buried, and the top of the list is all long-since-collected tiers.
  useEffect(() => {
    if (!open) return;
    const box = ladderRef.current;
    const row = currentRowRef.current;
    if (!box || !row) return;
    box.scrollTop = row.offsetTop - box.clientHeight / 2 + row.clientHeight / 2;
  }, [open]);

  // The layout re-renders with fresh server state after every claim/purchase
  // (revalidatePath), so adopt it rather than drifting on stale local state.
  // Adopted during render, not from an effect: an effect would paint the stale
  // ladder first and only then correct it, so a just-claimed tier flashed back
  // to "collectable" for a frame.
  const [syncedTo, setSyncedTo] = useState(initial);
  if (syncedTo !== initial) {
    setSyncedTo(initial);
    setState(initial);
  }

  const { premium: owned, tiers, collectable, seasonActive } = state;
  const pct = state.xpMax > 0 ? Math.min(100, Math.round((state.xp / state.xpMax) * 100)) : 0;
  const canAfford = state.diamonds >= state.price;
  const canBuy = seasonActive && canAfford;

  /**
   * Closing the pass throws away the post-claim panels with it. They report
   * what *just* happened, so leaving them in state meant reopening the ladder
   * an hour later still greeted you with "השלל נאסף" from the last claim — a
   * message that looked stuck, because only its own ✕ ever cleared it.
   */
  function closePass() {
    setOpen(false);
    setHaul(null);
    setNotice(null);
  }

  function reject(message?: string) {
    setShake(true);
    setTimeout(() => setShake(false), 450);
    if (message) {
      setHaul(null);
      setNotice(message);
    }
  }

  function handleUpgrade() {
    if (owned || unlocking || pending) return;
    // The pass is sold per season, so the server refuses the sale outright when
    // none is active. Say so here rather than firing a request that can only
    // come back as an error.
    if (!seasonActive) return reject("אין עונה פעילה כרגע — הרכישה תיפתח כשתתחיל עונה חדשה");
    if (!canAfford) return reject();

    startTransition(async () => {
      const res = await buySeasonPassPremium();
      if (!res.ok || !res.state) {
        reject(res.error ?? "הרכישה נכשלה");
        return;
      }
      setState(res.state);
      setHaul(null);
      setNotice(res.message ?? null);
      // Celebrate only now: playing the cascade while the request was still in
      // flight made a *refused* sale look like a successful one, and the gold
      // track then snapped shut a second later with no obvious reason.
      setUnlocking(true);
      setFlash(true);
      setTimeout(() => setFlash(false), 700);
      setTimeout(() => setUnlocking(false), UNLOCK_CASCADE_MS);
    });
  }

  function handleClaim() {
    if (pending || collectable === 0) return;
    startTransition(async () => {
      const res = await claimSeasonPassRewards();
      if (res.ok && res.state) {
        setState(res.state);
        // The haul panel *is* the confirmation, so don't also print the
        // plain-text fallback underneath it.
        setHaul(res.haul?.length ? { entries: res.haul, tiers: res.haulTiers ?? res.haul.length } : null);
        setNotice(res.haul?.length ? null : res.message ?? null);
        setFlash(true);
        setTimeout(() => setFlash(false), 700);

        // Clearing the ladder gets its own takeover — but only once per cycle,
        // remembered across reloads. Without the guard, every later render that
        // still reads `cleared` would re-fire it, and the reward for finishing
        // would be a popup that will not stay shut.
        if (res.state.cleared && res.cycleHaul?.length && markCleared(res.state.cycleEndsAt)) {
          setCleared(res.cycleHaul);
        }
      } else {
        setHaul(null);
        setNotice(res.error ?? "האיסוף נכשל");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`btn gap-2 px-4 py-1.5 text-sm ${owned ? "btn-gold" : "btn-dark"}`}
      >
        דרך התהילה
        {collectable > 0 && (
          <span aria-hidden className="rounded-full bg-emerald-500 px-1.5 text-[9px] font-black text-white">
            {collectable}
          </span>
        )}
        {owned ? (
          <span aria-hidden className="rounded bg-emerald-500 px-1 text-[9px] font-black text-white">
            פרימיום
          </span>
        ) : (
          // No upsell badge while the pass is unsellable — see seasonActive.
          seasonActive && (
            <span aria-hidden className="inline-flex items-center gap-0.5 animate-pulse rounded bg-red-500 px-1 text-[9px] font-black text-white">
              שדרג <Icon name="spark" size={11} />
            </span>
          )
        )}
      </button>

      {open && (
        <div
          // The overlay itself must NOT scroll. With one scroller here and
          // another around a 50-row ladder, a wheel gesture moved whichever the
          // browser felt like — the dialog drifting under the pointer while the
          // ladder crawled. The shell is height-capped instead, and the ladder
          // below is the single scroll region.
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          onClick={closePass}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="ornate-shell flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-xl"
          >
            {/* celebratory flash overlay */}
            {flash && (
              <span
                aria-hidden
                className="sp-flash pointer-events-none absolute left-1/2 top-1/2 z-10 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--gold-bright),transparent_70%)]"
              />
            )}

            {/* Pinned head: identity, progress, claim CTA. Stays put while the
                ladder scrolls, so the collect button is reachable from row 50.
                `shrink-0` is required, not cosmetic: the ladder is `flex-1`
                (basis 0%), and a percentage basis against the shell's indefinite
                height resolves to *content* — all 50 rows. That makes the flex
                pass see huge negative free space and, if the head were
                shrinkable, crush it to ~100px with its own scrollbar. Which is
                precisely the two-scrollbars-at-once problem.
                Below ~560px tall the head alone no longer fits, so there it does
                shrink and scroll internally — better than clipping the collect
                button out of reach. Normal viewports never hit that branch. */}
            <div className="shrink-0 overflow-y-auto p-5 pb-4 [@media(max-height:560px)]:min-h-0 [@media(max-height:560px)]:shrink">
            <div className="flex items-center justify-between">
              <button
                onClick={closePass}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle text-zinc-400 hover:text-white"
              >
                ✕
              </button>
              <h2 className="flex items-center gap-2 text-2xl font-black text-zinc-100">
                <Icon name="crown" size={20} className="text-gold" />
                דרך התהילה
                <span aria-hidden className="rounded bg-red-500 px-1.5 text-[10px] font-black text-white">
                  יום {state.day}
                </span>
              </h2>
              <span className="w-8" />
            </div>

            {/* Level + experience progress */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm font-bold text-zinc-200">
                <span>דרגה נוכחית: {state.level}/{tiers.length}</span>
                <span className="inline-flex items-center gap-1 text-zinc-400">כל פעולה במשחק מזכה בניסיון <Icon name="spark" size={12} /></span>
              </div>
              <div className="relative mt-2 h-5 overflow-hidden rounded-full border border-gold/40 bg-black/50">
                <span
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-gold to-gold-bright"
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center gap-1 text-[11px] font-black text-black/80 nums">
                  {state.xp}/{state.xpMax} ניסיון <Icon name="spark" size={12} />
                </span>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-zinc-500">
                מתאפס בעדכון היומי הבא בעוד <CycleCountdown key={state.cycleEndsAt} endsAt={state.cycleEndsAt} /> — והתגמולים יגדלו
              </p>
            </div>

            {haul && (
              <HaulPanel
                key={haul.entries.map((e) => `${e.kind}:${e.amount}`).join()}
                haul={haul.entries}
                tiers={haul.tiers}
                onDismiss={() => setHaul(null)}
              />
            )}

            {notice && (
              <p className="mt-3 rounded-lg border border-gold/40 bg-amber-950/40 p-2 text-center text-xs font-bold text-amber-100">
                {notice}
              </p>
            )}

            {/* Premium status / sales CTA */}
            {owned ? (
              <div className="mt-5 rounded-lg border border-emerald-500/50 bg-emerald-950/40 p-4 text-center">
                <p className="font-black text-emerald-400">✅ מסלול הפרימיום פעיל לכל העונה — הצד הזהוב נפתח!</p>
                {/* A dead, greyed-out button reads as broken; when there is
                    nothing to take, say so as a status line instead. */}
                {collectable > 0 || pending ? (
                  <>
                    <button
                      onClick={handleClaim}
                      disabled={pending}
                      className="btn btn-gold mt-3 px-6 py-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pending ? (
                        "אוסף..."
                      ) : (
                        <span className="inline-flex items-center gap-1"><Icon name="gift" size={14} /> אסוף שלל מ־{collectable} דרגות</span>
                      )}
                    </button>
                    <p className="mt-1.5 text-[10px] text-zinc-500">אפשר לאסוף רק תגמולים מדרגות שכבר עברת</p>
                  </>
                ) : (
                  <p className="mt-2 text-xs font-bold text-zinc-400">
                    ✓ אספת כל מה שנפתח — עלה דרגה כדי לפתוח עוד
                  </p>
                )}
              </div>
            ) : (
              <>
                <div
                  className={`mt-5 overflow-hidden rounded-xl border-2 border-gold/60 bg-gradient-to-br from-amber-900/40 via-amber-950/50 to-black p-4 text-center shadow-[0_0_30px_-8px_var(--gold)] ${
                    shake ? "sp-shake" : ""
                  }`}
                >
                  <p className="flex items-center justify-center gap-1.5 text-lg font-black text-gold-bright"><Icon name="crown" size={18} /> שדרג לפרימיום</p>
                  <p className="mt-1 text-sm text-amber-100/90">
                    פתח את <span className="font-black text-gold-bright">כל {tiers.length} המתנות</span> בצד הזהוב —
                    פי {SEASON_PASS_PREMIUM_MULTIPLIER} שלל בכל דרגה,{" "}
                    <span className="font-black text-gold-bright">תשלום אחד לכל העונה</span> 🔥
                  </p>
                  <button
                    onClick={handleUpgrade}
                    disabled={unlocking || pending || !seasonActive}
                    className={`btn btn-gold mt-3 w-full py-2.5 text-base font-black disabled:cursor-not-allowed disabled:opacity-60 ${
                      unlocking || !canBuy ? "" : "animate-pulse"
                    }`}
                  >
                    {!seasonActive ? (
                      "⏳ אין עונה פעילה"
                    ) : unlocking || pending ? (
                      "🔓 פותח..."
                    ) : (
                      <span className="inline-flex items-center gap-1">🔓 שדרג עכשיו · {state.price} <Icon name="diamond" size={14} className="text-cyan-300" /></span>
                    )}
                  </button>
                  <p className={`mt-1.5 text-[10px] ${canBuy ? "text-amber-200/60" : "text-red-400 font-bold"}`}>
                    {!seasonActive ? (
                      <span>מסלול הפרימיום נמכר לעונה שלמה — הוא ייפתח לרכישה כשתתחיל העונה הבאה</span>
                    ) : canAfford ? (
                      <span className="inline-flex items-center gap-1">יש לך {state.diamonds} <Icon name="diamond" size={12} className="text-cyan-300" /> · נשאר פתוח עד סוף העונה</span>
                    ) : (
                      <span className="inline-flex items-center gap-1">אין מספיק יהלומים ({state.diamonds}/{state.price} <Icon name="diamond" size={12} className="text-cyan-300" />)</span>
                    )}
                  </p>
                </div>

                {/* The free track pays out without buying anything. */}
                {collectable > 0 || pending ? (
                  <button
                    onClick={handleClaim}
                    disabled={pending}
                    className="btn btn-dark mt-3 w-full py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? (
                      "אוסף..."
                    ) : (
                      <span className="inline-flex items-center gap-1"><Icon name="gift" size={14} /> אסוף שלל חינמי מ־{collectable} דרגות</span>
                    )}
                  </button>
                ) : (
                  <p className="mt-3 text-center text-xs font-bold text-zinc-500">
                    ✓ אספת כל מה שנפתח במסלול החינמי — עלה דרגה כדי לפתוח עוד
                  </p>
                )}
              </>
            )}

            {/* Column headers: right = free, left = premium (RTL). They live in
                the pinned head rather than inside the scroller, so you can still
                tell the two tracks apart forty rows down. The gutter below is
                reserved on both so the columns stay aligned with these. */}
            <div className="mt-5 grid grid-cols-[1fr_2.5rem_1fr] items-center gap-2 [scrollbar-gutter:stable]">
              <div className="flex items-center justify-center gap-1 rounded-lg border border-gold/50 bg-amber-950/50 py-1.5 text-center text-xs font-black text-gold-bright">
                <Icon name="crown" size={13} className="inline-block align-text-bottom" /> פרימיום {!owned && <span aria-hidden>🔒</span>}
              </div>
              <div />
              <div className="rounded-lg border border-sky-500/40 bg-sky-950/40 py-1.5 text-center text-xs font-black text-sky-200">
                חינמי
              </div>
            </div>
            </div>

            {/* The one and only scroll region — the shell itself is height-capped
                and `overflow-hidden`, so nothing else on the page can scroll while
                this is open. `min-h-0` is what actually lets a flex child shrink
                below its content height; without it fifty rows push the shell past
                max-h and the overlay starts scrolling too.
                `relative` is load-bearing as well: the auto-scroll measures
                row.offsetTop, which is relative to the nearest positioned
                ancestor — without it that would be .ornate-shell and every row
                would measure the pinned head's height too low. */}
            <div
              ref={ladderRef}
              className="relative min-h-36 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-3 [scrollbar-gutter:stable] [@media(max-height:560px)]:h-36 [@media(max-height:560px)]:flex-none"
            >
            {/* Vertical track: each row is a tier — premium (left) + free (right) */}
            <div className="space-y-2">
              {tiers.map((t, i) => {
                // Every tenth rung is a landmark, so 50 rows still read as a
                // journey with waypoints instead of an undifferentiated list.
                const milestone = t.tier % 10 === 0;
                const current = t.tier === Math.max(1, state.level);
                return (
                  <div
                    key={t.tier}
                    ref={current ? currentRowRef : undefined}
                    className="grid grid-cols-[1fr_2.5rem_1fr] items-stretch gap-2"
                  >
                    <PremiumTile
                      tier={t}
                      owned={owned}
                      unlocking={unlocking}
                      delay={Math.min(i, UNLOCK_CASCADE_ROWS) * UNLOCK_CASCADE_STEP}
                    />
                    <div className="flex items-center justify-center">
                      <span
                        className={`flex items-center justify-center rounded-full font-black shadow ${
                          milestone ? "h-9 w-9 text-sm ring-2 ring-gold/40" : "h-7 w-7 text-[11px]"
                        } ${t.reached ? "bg-gold text-black" : "bg-zinc-800 text-zinc-500"} ${
                          current ? "ring-2 ring-emerald-400/70" : ""
                        }`}
                      >
                        {t.tier}
                      </span>
                    </div>
                    <FreeTile tier={t} />
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Sibling of the pass modal, not a child — closing the pass must not take
          the celebration with it. */}
      {cleared && (
        <CycleClearedOverlay
          haul={cleared}
          tierCount={tiers.length}
          day={state.day}
          cycleEndsAt={state.cycleEndsAt}
          owned={owned}
          multiplier={SEASON_PASS_PREMIUM_MULTIPLIER}
          onClose={() => setCleared(null)}
        />
      )}
    </>
  );
}
