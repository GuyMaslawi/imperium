"use client";

import { useEffect, useState, useTransition } from "react";
import { Icon, RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import {
  claimAchievements,
  type AchievementsState,
  type AchievementView,
} from "@/server/actions/achievements";

const heNum = (n: number) => Math.round(n).toLocaleString("he-IL");

function ProgressBar({ item }: { item: AchievementView }) {
  const pct = item.goal > 0 ? Math.min(100, (item.progress / item.goal) * 100) : 0;
  return (
    <div className="mt-1.5">
      <div className="relative h-1.5 overflow-hidden rounded-full bg-black/50">
        <span
          className={`absolute inset-y-0 right-0 rounded-full ${
            item.claimed
              ? "bg-emerald-500/70"
              : item.unlocked
                ? "bg-gradient-to-l from-gold to-gold-bright"
                : "bg-zinc-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="nums mt-0.5 block text-[10px] text-zinc-500" dir="ltr">
        {heNum(item.progress)} / {heNum(item.goal)}
      </span>
    </div>
  );
}

function Row({ item }: { item: AchievementView }) {
  const rewardIcon = RESOURCE_ICON[item.rewardKind];
  const rewardTint = RESOURCE_ICON_COLOR[item.rewardKind];

  return (
    <div
      className={`panel flex items-center justify-between gap-3 rounded-xl p-3.5 transition ${
        item.unlocked && !item.claimed
          ? "border-gold/60 shadow-[0_0_18px_-8px_var(--gold)]"
          : ""
      }`}
    >
      {/* right: medallion + name + progress */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-panel-inset ${
            item.claimed
              ? "border-emerald-500/50"
              : item.unlocked
                ? "border-gold/70"
                : "border-white/10"
          }`}
        >
          <Icon
            name={item.icon}
            size={22}
            className={
              item.claimed
                ? "text-emerald-400"
                : item.unlocked
                  ? "text-gold-bright"
                  : "text-zinc-600"
            }
          />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate font-bold ${
              item.unlocked ? "text-zinc-100" : "text-zinc-400"
            }`}
          >
            {item.name}
          </p>
          <p className="truncate text-[11px] text-zinc-500">{item.hint}</p>
          {/* A 1-of-1 milestone has nothing to track — the status pill says it all. */}
          {item.goal > 1 && !item.claimed && <ProgressBar item={item} />}
        </div>
      </div>

      {/* left: reward + state */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`nums flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${
            item.claimed
              ? "bg-emerald-500/15 text-emerald-300/60"
              : "bg-emerald-500/20 text-emerald-300"
          }`}
        >
          <span dir="ltr">{heNum(item.rewardAmount)}</span>
          <Icon name={rewardIcon} size={14} className={rewardTint} aria-hidden />
        </span>
        {item.claimed ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <span aria-hidden>✓</span> נאסף
          </span>
        ) : item.unlocked ? (
          <span className="flex items-center gap-1 text-xs font-black text-gold-bright">
            <Icon name="gift" size={12} /> מוכן לאיסוף
          </span>
        ) : (
          <span className="text-xs font-semibold text-zinc-600">🔒 נעול</span>
        )}
      </div>
    </div>
  );
}

export function AchievementList({ initial }: { initial: AchievementsState }) {
  const [state, setState] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The page re-renders with fresh server state after every claim
  // (revalidatePath), so adopt it rather than drifting on stale local state.
  useEffect(() => setState(initial), [initial]);

  const { items, collectable, claimed, total } = state;

  function handleClaim() {
    if (pending || collectable === 0) return;
    startTransition(async () => {
      const res = await claimAchievements();
      if (res.ok && res.state) {
        setState(res.state);
        setNotice(res.message ?? null);
      } else {
        setNotice(res.error ?? "האיסוף נכשל");
      }
    });
  }

  // Ready-to-collect first, then still-locked, then the ones already banked —
  // so what the player can act on is always at the top.
  const ordered = [...items].sort(
    (a, b) => rank(a) - rank(b) || items.indexOf(a) - items.indexOf(b)
  );

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex flex-col items-center gap-2">
        <span
          className="nums rounded-full border border-gold/40 bg-panel-inset px-3 py-0.5 text-sm font-bold text-gold"
          dir="ltr"
        >
          {claimed}/{total}
        </span>
        <button
          onClick={handleClaim}
          disabled={collectable === 0 || pending}
          className="btn btn-gold px-6 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            "אוסף..."
          ) : collectable > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="gift" size={14} /> אסוף {collectable} תגמולים
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Icon name="gift" size={14} /> אין תגמולים לאיסוף
            </span>
          )}
        </button>
      </div>

      {notice && (
        <p className="rounded-lg border border-gold/40 bg-amber-950/40 p-2 text-center text-xs font-bold text-amber-100">
          {notice}
        </p>
      )}

      <div className="space-y-2.5">
        {ordered.map((a) => (
          <Row key={a.key} item={a} />
        ))}
      </div>
    </div>
  );
}

/** Sort bucket: 0 = collect now, 1 = in progress, 2 = already collected. */
function rank(a: AchievementView): number {
  if (a.claimed) return 2;
  return a.unlocked ? 0 : 1;
}
