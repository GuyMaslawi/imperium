"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Reward = { icon: string; label: string };
type Tier = { tier: number; free: Reward; premium: Reward };

const PREMIUM_PRICE = 10;

const TIERS: Tier[] = [
  { tier: 1, free: { icon: "🪙", label: "5,000,000 זהב" }, premium: { icon: "🪙", label: "15,000,000 זהב" } },
  { tier: 2, free: { icon: "🌲", label: "5,000,000 עץ" }, premium: { icon: "🌲", label: "15,000,000 עץ" } },
  { tier: 3, free: { icon: "⚙️", label: "5,000,000 ברזל" }, premium: { icon: "⚙️", label: "15,000,000 ברזל" } },
  { tier: 4, free: { icon: "🪨", label: "5,000,000 אבן" }, premium: { icon: "💎", label: "30 יהלומים" } },
  { tier: 5, free: { icon: "🎁", label: "10 יהלומים" }, premium: { icon: "🎁", label: "60 יהלומים" } },
  { tier: 6, free: { icon: "🌲", label: "5,000,000 עץ" }, premium: { icon: "⚔️", label: "חרב אגדית" } },
  { tier: 7, free: { icon: "⚔️", label: "5,000,000 ברזל" }, premium: { icon: "🛡️", label: "מגן אגדי" } },
  { tier: 8, free: { icon: "🌙", label: "5,000,000 זהב" }, premium: { icon: "👑", label: "כתר המלך" } },
];

function FreeTile({ reward, reached, claimed }: { reward: Reward; reached: boolean; claimed: boolean }) {
  return (
    <div
      className={`flex h-full flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center ${
        reached ? "border-sky-500/40 bg-gradient-to-b from-sky-900/30 to-sky-950/50" : "border-white/10 bg-black/30"
      }`}
    >
      <span className={`text-2xl ${reached ? "" : "opacity-40"}`}>{reward.icon}</span>
      <span className={`px-1 text-[10px] font-bold leading-tight ${reached ? "text-sky-200" : "text-zinc-600"}`}>
        {reward.label}
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
  reward,
  owned,
  reached,
  claimed,
  unlocking,
  delay,
}: {
  reward: Reward;
  owned: boolean;
  reached: boolean;
  claimed: boolean;
  unlocking: boolean;
  delay: number;
}) {
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
      <span className={`text-2xl ${showContentUnlocked ? "" : "opacity-40 grayscale"}`}>{reward.icon}</span>
      <span
        className={`px-1 text-[10px] font-bold leading-tight ${
          showContentUnlocked ? "text-gold-bright" : "text-gold-dim/60"
        }`}
      >
        {reward.label}
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

export function SeasonPassButton({
  level,
  xp,
  xpMax,
  hasPremium = false,
  diamonds = 0,
}: {
  level: number;
  xp: number;
  xpMax: number;
  hasPremium?: boolean;
  diamonds?: number;
}) {
  const [open, setOpen] = useState(false);
  const [owned, setOwned] = useState(hasPremium);
  const [unlocking, setUnlocking] = useState(false);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [claimed, setClaimed] = useState<number[]>([]);

  const pct = xpMax > 0 ? Math.min(100, Math.round((xp / xpMax) * 100)) : 0;
  const canAfford = diamonds >= PREMIUM_PRICE;
  const reached = (tier: number) => tier <= level;

  function handleUpgrade() {
    if (owned || unlocking) return;
    if (!canAfford) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    // cool cascade unlock
    setUnlocking(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 700);
    // total stagger: last tile delay + anim duration
    const total = (TIERS.length - 1) * 90 + 700;
    setTimeout(() => {
      setOwned(true);
      setUnlocking(false);
    }, total);
  }

  function claimReached() {
    // collect ONLY tiers the player has actually reached
    setClaimed(TIERS.filter((t) => reached(t.tier)).map((t) => t.tier));
  }

  const collectableCount = owned ? TIERS.filter((t) => reached(t.tier) && !claimed.includes(t.tier)).length : 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`btn gap-2 px-4 py-1.5 text-sm ${owned ? "btn-gold" : "btn-dark"}`}
      >
        Season Pass
        {owned ? (
          <span aria-hidden className="rounded bg-emerald-500 px-1 text-[9px] font-black text-white">
            PREMIUM
          </span>
        ) : (
          <span aria-hidden className="inline-flex items-center gap-0.5 animate-pulse rounded bg-red-500 px-1 text-[9px] font-black text-white">
            שדרג <Icon name="spark" size={11} />
          </span>
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
                Season Pass
                <span aria-hidden className="rounded bg-red-500 px-1.5 text-[10px] font-black text-white">
                  ADMIT ONE
                </span>
              </h2>
              <span className="w-8" />
            </div>

            {/* Level + XP progress */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm font-bold text-zinc-200">
                <span>רמה נוכחית: {level}</span>
                <span className="inline-flex items-center gap-1 text-zinc-400">כל פעולה יומית = XP <Icon name="spark" size={12} /></span>
              </div>
              <div className="relative mt-2 h-5 overflow-hidden rounded-full border border-gold/40 bg-black/50">
                <span
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-gold to-gold-bright"
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center gap-1 text-[11px] font-black text-black/80 nums">
                  XP {xp}/{xpMax} <Icon name="spark" size={12} />
                </span>
              </div>
            </div>

            {/* Premium status / sales CTA */}
            {owned ? (
              <div className="mt-5 rounded-lg border border-emerald-500/50 bg-emerald-950/40 p-4 text-center">
                <p className="font-black text-emerald-400">✅ Premium Pass פעיל — הצד הזהוב נפתח!</p>
                <button
                  onClick={claimReached}
                  disabled={collectableCount === 0}
                  className="btn btn-gold mt-3 px-6 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {collectableCount > 0 ? (
                    <span className="inline-flex items-center gap-1"><Icon name="gift" size={14} /> אסוף {collectableCount} תגמולים שהגעת אליהם</span>
                  ) : (
                    <span className="inline-flex items-center gap-1"><Icon name="gift" size={14} /> אין תגמולים לאיסוף</span>
                  )}
                </button>
                <p className="mt-1.5 text-[10px] text-zinc-500">אפשר לאסוף רק תגמולים מרמות שכבר עברת</p>
              </div>
            ) : (
              <div
                className={`mt-5 overflow-hidden rounded-xl border-2 border-gold/60 bg-gradient-to-br from-amber-900/40 via-amber-950/50 to-black p-4 text-center shadow-[0_0_30px_-8px_var(--gold)] ${
                  shake ? "sp-shake" : ""
                }`}
              >
                <p className="flex items-center justify-center gap-1.5 text-lg font-black text-gold-bright"><Icon name="crown" size={18} /> שדרג ל־PREMIUM</p>
                <p className="mt-1 text-sm text-amber-100/90">
                  פתח את <span className="font-black text-gold-bright">כל 8 התגמולים</span> — פי 3 שלל,
                  יהלומים ופריטים אגדיים 🔥
                </p>
                <button
                  onClick={handleUpgrade}
                  disabled={unlocking}
                  className={`btn btn-gold mt-3 w-full py-2.5 text-base font-black disabled:opacity-70 ${
                    unlocking ? "" : "animate-pulse"
                  }`}
                >
                  {unlocking ? "🔓 פותח..." : (
                    <span className="inline-flex items-center gap-1">🔓 שדרג עכשיו · {PREMIUM_PRICE} <Icon name="diamond" size={14} /></span>
                  )}
                </button>
                <p className={`mt-1.5 text-[10px] ${canAfford ? "text-amber-200/60" : "text-red-400 font-bold"}`}>
                  {canAfford ? (
                    <span className="inline-flex items-center gap-1">יש לך {diamonds} <Icon name="diamond" size={12} /> · מבצע לזמן מוגבל</span>
                  ) : (
                    <span className="inline-flex items-center gap-1">אין מספיק יהלומים ({diamonds}/{PREMIUM_PRICE} <Icon name="diamond" size={12} />)</span>
                  )}
                </p>
              </div>
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
              {TIERS.map((t, i) => {
                const isReached = reached(t.tier);
                return (
                  <div key={t.tier} className="grid grid-cols-[1fr_2.5rem_1fr] items-stretch gap-2">
                    <PremiumTile
                      reward={t.premium}
                      owned={owned}
                      reached={isReached}
                      claimed={claimed.includes(t.tier)}
                      unlocking={unlocking}
                      delay={i * 90}
                    />
                    <div className="flex items-center justify-center">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black shadow ${
                          isReached ? "bg-gold text-black" : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {t.tier}
                      </span>
                    </div>
                    <FreeTile reward={t.free} reached={isReached} claimed={claimed.includes(t.tier)} />
                  </div>
                );
              })}
            </div>

            {!owned && (
              <button
                onClick={handleUpgrade}
                disabled={unlocking}
                className={`btn btn-gold mt-5 w-full py-2.5 text-base font-black disabled:opacity-70 ${
                  unlocking ? "" : "animate-pulse"
                }`}
              >
                {unlocking ? "🔓 פותח את הצד הזהוב..." : (
                  <span className="inline-flex items-center gap-1">🔓 שדרג ל־PREMIUM · {PREMIUM_PRICE} <Icon name="diamond" size={14} /></span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
