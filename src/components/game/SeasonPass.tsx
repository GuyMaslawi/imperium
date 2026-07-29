"use client";

import { useEffect, useState, useTransition } from "react";
import { Icon, RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import {
  buySeasonPassPremium,
  claimSeasonPassRewards,
  type SeasonPassState,
  type SeasonPassTierView,
} from "@/server/actions/seasonPass";

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

export function SeasonPassButton({ initial }: { initial: SeasonPassState }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(initial);
  const [unlocking, setUnlocking] = useState(false);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function reject(message?: string) {
    setShake(true);
    setTimeout(() => setShake(false), 450);
    if (message) setNotice(message);
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
      setNotice(res.message ?? null);
      // Celebrate only now: playing the cascade while the request was still in
      // flight made a *refused* sale look like a successful one, and the gold
      // track then snapped shut a second later with no obvious reason.
      setUnlocking(true);
      setFlash(true);
      setTimeout(() => setFlash(false), 700);
      setTimeout(() => setUnlocking(false), (tiers.length - 1) * 90 + 700);
    });
  }

  function handleClaim() {
    if (pending || collectable === 0) return;
    startTransition(async () => {
      const res = await claimSeasonPassRewards();
      if (res.ok && res.state) {
        setState(res.state);
        setNotice(res.message ?? null);
      } else {
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
        מסלול העונה
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
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="ornate-shell relative my-8 w-full max-w-lg rounded-xl p-6"
          >
            {/* celebratory flash overlay */}
            {flash && (
              <span
                aria-hidden
                className="sp-flash pointer-events-none absolute left-1/2 top-1/2 z-10 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--gold-bright),transparent_70%)]"
              />
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle text-zinc-400 hover:text-white"
              >
                ✕
              </button>
              <h2 className="flex items-center gap-2 text-2xl font-black text-zinc-100">
                מסלול העונה
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

            {notice && (
              <p className="mt-3 rounded-lg border border-gold/40 bg-amber-950/40 p-2 text-center text-xs font-bold text-amber-100">
                {notice}
              </p>
            )}

            {/* Premium status / sales CTA */}
            {owned ? (
              <div className="mt-5 rounded-lg border border-emerald-500/50 bg-emerald-950/40 p-4 text-center">
                <p className="font-black text-emerald-400">✅ מסלול הפרימיום פעיל לכל העונה — הצד הזהוב נפתח!</p>
                <button
                  onClick={handleClaim}
                  disabled={collectable === 0 || pending}
                  className="btn btn-gold mt-3 px-6 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? (
                    "אוסף..."
                  ) : collectable > 0 ? (
                    <span className="inline-flex items-center gap-1"><Icon name="gift" size={14} /> אסוף {collectable} תגמולים שהגעת אליהם</span>
                  ) : (
                    <span className="inline-flex items-center gap-1"><Icon name="gift" size={14} /> אין תגמולים לאיסוף</span>
                  )}
                </button>
                <p className="mt-1.5 text-[10px] text-zinc-500">אפשר לאסוף רק תגמולים מדרגות שכבר עברת</p>
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
                    פתח את <span className="font-black text-gold-bright">כל {tiers.length} התגמולים</span> — פי 3 שלל
                    ופריט גיבור אגדי, <span className="font-black text-gold-bright">תשלום אחד לכל העונה</span> 🔥
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
                <button
                  onClick={handleClaim}
                  disabled={collectable === 0 || pending}
                  className="btn btn-dark mt-3 w-full py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? (
                    "אוסף..."
                  ) : collectable > 0 ? (
                    <span className="inline-flex items-center gap-1"><Icon name="gift" size={14} /> אסוף {collectable} תגמולים חינמיים</span>
                  ) : (
                    <span className="inline-flex items-center gap-1"><Icon name="gift" size={14} /> אין תגמולים לאיסוף</span>
                  )}
                </button>
              </>
            )}

            {/* Column headers: right = free, left = premium (RTL) */}
            <div className="mt-6 grid grid-cols-[1fr_2.5rem_1fr] items-center gap-2">
              <div className="flex items-center justify-center gap-1 rounded-lg border border-gold/50 bg-amber-950/50 py-1.5 text-center text-xs font-black text-gold-bright">
                <Icon name="crown" size={13} className="inline-block align-text-bottom" /> פרימיום {!owned && <span aria-hidden>🔒</span>}
              </div>
              <div />
              <div className="rounded-lg border border-sky-500/40 bg-sky-950/40 py-1.5 text-center text-xs font-black text-sky-200">
                חינמי
              </div>
            </div>

            {/* Vertical track: each row is a tier — premium (left) + free (right) */}
            <div className="mt-3 space-y-2">
              {tiers.map((t, i) => (
                <div key={t.tier} className="grid grid-cols-[1fr_2.5rem_1fr] items-stretch gap-2">
                  <PremiumTile tier={t} owned={owned} unlocking={unlocking} delay={i * 90} />
                  <div className="flex items-center justify-center">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black shadow ${
                        t.reached ? "bg-gold text-black" : "bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      {t.tier}
                    </span>
                  </div>
                  <FreeTile tier={t} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
