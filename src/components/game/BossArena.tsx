"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon, RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import { LivingPortrait } from "@/components/game/LivingPortrait";
import { formatNumber } from "@/lib/game/format";
import { cityName } from "@/lib/game/cities";
import { BOSS_REWARD_RESOURCES, bossImage } from "@/lib/game/bosses";
import { BOSS_MOVE_META, BOSS_TACTIC_META } from "@/lib/game/bossBattle";
import { pollBossArena } from "@/server/actions/boss";
import type { BossArenaState } from "@/server/bossBattleState";

/** How often to ask the server what has happened. */
const POLL_MS = 3_000;

/**
 * The arena: an assault playing itself out.
 *
 * There is nothing to press. The battle was decided the moment the player sent the
 * army, and this screen is its reveal — a round lands every ten seconds or so,
 * the tyrant's health drains, and when the clock runs out the verdict replaces it.
 *
 * Which makes the *leaving* the important interaction. The whole reason the fight
 * is timed rather than instant is that a player can walk away mid-battle and be
 * told what happened wherever they are (the inbox poll settles it and pops a
 * toast), so this screen says so out loud rather than trapping them here.
 *
 * The client holds no authority and no secrets: `revealed` only ever contains
 * rounds whose moment has passed, because the server filters the plan by elapsed
 * time before sending it. Polling — rather than a local timer walking a full
 * script — is what keeps that true.
 */
export function BossArena({ initial }: { initial: BossArenaState }) {
  const router = useRouter();
  const [state, setState] = useState<BossArenaState>(initial);
  const [now, setNow] = useState(initial.serverNow);
  // Server-clock skew, measured in an effect rather than during render: reading
  // the wall clock while rendering is impure, and the countdown has to agree with
  // the server anyway, since the server is what decides when the assault ends.
  const skew = useRef(0);
  const seen = useRef(initial.revealed.length);
  const [flash, setFlash] = useState<{ correct: boolean; fury: boolean } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);

  useEffect(() => {
    skew.current = initial.serverNow - Date.now();
  }, [initial.serverNow]);

  /** Ask the server what has landed; hand over to the report once it settles. */
  const poll = useCallback(async () => {
    if (done.current) return;
    const res = await pollBossArena();
    if (res.fightId) {
      done.current = true;
      router.push(`/game/boss/${res.fightId}`);
      return;
    }
    if (res.state) {
      skew.current = res.state.serverNow - Date.now();
      // Newly landed rounds flash here, where they arrive, rather than in an
      // effect watching `state` — the strike is an event, not derived state.
      if (res.state.revealed.length > seen.current) {
        seen.current = res.state.revealed.length;
        const landed = res.state.revealed.at(-1);
        if (landed) {
          setFlash({ correct: landed.correct, fury: landed.furyUsed });
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlash(null), 900);
        }
      }
      setState(res.state);
    } else {
      // No running assault and no report id — someone else settled it. The banner
      // knows what to show.
      done.current = true;
      router.replace("/game/rankings");
    }
  }, [router]);

  // One clock for the countdown, one poll for the content.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now() + skew.current), 250);
    const beat = setInterval(() => void poll(), POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(beat);
    };
  }, [poll]);

  // Poll immediately once the clock runs out, rather than waiting out the beat —
  // the settle is what produces the report, and the player is watching for it.
  useEffect(() => {
    if (now >= state.endsAt && !done.current) void poll();
  }, [now, state.endsAt, poll]);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const msLeft = Math.max(0, state.endsAt - now);
  const secondsLeft = Math.ceil(msLeft / 1000);
  const elapsedPct = Math.min(
    100,
    ((now - state.startedAt) / Math.max(1, state.endsAt - state.startedAt)) * 100
  );
  const hpPct = state.bossMaxHp > 0 ? (state.bossHp / state.bossMaxHp) * 100 : 0;
  const damagePct =
    state.bossMaxHp > 0 ? (Math.min(state.damageSoFar, state.bossHpAtStart) / state.bossMaxHp) * 100 : 0;
  const furyPct = (state.fury / state.furyMax) * 100;
  const lossPct =
    state.soldiersAtStart > 0 ? (state.soldiersLostSoFar / state.soldiersAtStart) * 100 : 0;
  const last = state.revealed.at(-1);
  const over = msLeft <= 0;

  return (
    <div
      dir="rtl"
      className="space-y-4"
      style={{ ["--boss-accent" as string]: state.boss.accent }}
    >
      {/* ---------------- the battle ---------------- */}
      <section className="ba-stage relative overflow-hidden rounded-2xl border border-[rgb(var(--boss-accent))]/45 bg-[#0a0709]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgb(var(--boss-accent)/0.3),transparent_62%)]"
        />
        {flash && (
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 z-20 ${
              flash.fury ? "ba-flash-fury" : flash.correct ? "ba-flash-good" : "ba-flash-bad"
            }`}
          />
        )}

        <div className="relative grid gap-4 p-4 sm:grid-cols-[minmax(0,180px)_1fr] sm:p-5">
          {/* portrait */}
          <div className="relative mx-auto h-[200px] w-[145px] overflow-hidden rounded-xl border border-[rgb(var(--boss-accent))]/50 sm:mx-0 sm:h-[220px] sm:w-full">
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[rgb(var(--boss-accent)/0.35)] to-black"
            >
              <Icon name="attack" size={70} className="text-black/40" />
            </div>
            <LivingPortrait
              src={bossImage(state.boss.key)}
              alt={`${state.boss.name} — ${state.boss.title}`}
              className={`absolute inset-0 ${
                flash ? (flash.correct ? "ba-boss-hit" : "ba-boss-roar") : ""
              }`}
              accent={state.boss.accent}
              embers={10}
              tilt={7}
              drift={22}
              rich
            >
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent"
              />
            </LivingPortrait>
            {flash && last && last.damage > 0 && (
              <span
                aria-hidden
                className="nums ba-damage absolute inset-x-0 top-5 z-10 text-center text-2xl font-black text-gold-bright"
                dir="ltr"
              >
                −{formatNumber(last.damage)}
              </span>
            )}
          </div>

          {/* name, health, the clock */}
          <div className="flex min-w-0 flex-col justify-center gap-3">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <div className="min-w-0">
                <p className="text-xl font-black leading-tight text-[rgb(var(--boss-accent))] sm:text-2xl">
                  {state.boss.name}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-bone-dim">
                  {state.boss.title} · עיר {cityName(state.cityTier)}
                </p>
              </div>
              <span
                className={`nums shrink-0 rounded-md border px-2.5 py-1 text-xs font-black ${
                  over
                    ? "border-gold/60 bg-gold/10 text-gold-bright"
                    : "border-[rgb(var(--boss-accent))]/50 bg-black/60 text-[rgb(var(--boss-accent))]"
                }`}
              >
                {over ? (
                  "מסכמים…"
                ) : (
                  <>
                    נותרו <span dir="ltr">{secondsLeft}</span> שנ׳
                  </>
                )}
              </span>
            </div>

            {/* the tyrant's health, with this assault's damage marked behind it */}
            <div>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="font-bold text-[rgb(var(--boss-accent))]">חיי הבוס</span>
                <span className="nums font-black text-zinc-100" dir="ltr">
                  {formatNumber(Math.round(state.bossHp))} / {formatNumber(state.bossMaxHp)}
                </span>
              </div>
              <div className="relative h-4 overflow-hidden rounded-full border border-black/60 bg-white/5">
                <span
                  className="ba-hp absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-[rgb(var(--boss-accent))] to-[rgb(var(--boss-accent)/0.4)]"
                  style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
                />
                <span
                  aria-hidden
                  className="absolute inset-y-0 rounded-l-full bg-gold/25"
                  style={{
                    right: `${Math.max(0, Math.min(100, hpPct))}%`,
                    width: `${Math.max(0, Math.min(100 - hpPct, damagePct))}%`,
                  }}
                />
              </div>
            </div>

            {/* the assault's own clock */}
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <span
                  className="block h-full rounded-full bg-gradient-to-l from-gold-bright to-gold-deep transition-[width] duration-300 ease-linear"
                  style={{ width: `${elapsedPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-500">
                סבב{" "}
                <span className="nums" dir="ltr">
                  {state.revealed.length}
                </span>{" "}
                מתוך{" "}
                <span className="nums" dir="ltr">
                  {state.totalRounds}
                </span>{" "}
                · הצבא נלחם לבד — אין מה ללחוץ
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- you can go ---------------- */}
      <section className="panel-inset flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
        <p className="text-xs text-zinc-400">
          <span aria-hidden className="mr-1">
            📨
          </span>
          אפשר לצאת ולעשות דברים אחרים — כשהקרב ייגמר תקבל הודעה עם כל השלל.
        </p>
        <div className="flex gap-2">
          <Link href="/game/base" className="btn btn-ghost px-4 py-1.5 text-xs">
            <Icon name="base" size={14} className="inline-block align-middle" /> לבסיס
          </Link>
          <Link href="/game/rankings" className="btn btn-ghost px-4 py-1.5 text-xs">
            <Icon name="rankings" size={14} className="inline-block align-middle" /> לדירוג
          </Link>
        </div>
      </section>

      {/* ---------------- your side ---------------- */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="panel-inset rounded-xl p-4">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <Icon name="army" size={14} /> הצבא שלך
            </span>
            <span className="nums text-sm font-black text-zinc-100" dir="ltr">
              {formatNumber(state.soldiersAtStart - state.soldiersLostSoFar)}
              <span className="text-xs font-normal text-zinc-500">
                {" "}
                / {formatNumber(state.soldiersAtStart)}
              </span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full border border-black/60 bg-white/5">
            <span
              className="block h-full rounded-full bg-gradient-to-l from-amber-400 to-amber-700 transition-[width] duration-500"
              style={{ width: `${Math.min(100, (lossPct / (state.routLine * 100)) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            אבדות עד כה:{" "}
            <span className="nums text-red-300" dir="ltr">
              {formatNumber(state.soldiersLostSoFar)}
            </span>{" "}
            ({Math.round(lossPct)}%). הצבא נסוג אם יאבד{" "}
            <span className="nums" dir="ltr">
              {Math.round(state.routLine * 100)}%
            </span>
            .
          </p>
          <div className="mt-2">
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
              <span className="font-bold text-gold-dim">זעם הגיבור</span>
              <span className="nums text-zinc-500" dir="ltr">
                {Math.round(furyPct)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-black/60 bg-white/5">
              <span
                className={`block h-full rounded-full bg-gradient-to-l from-gold-bright to-crimson transition-[width] duration-500 ${
                  furyPct >= 100 ? "ba-fury-bar" : ""
                }`}
                style={{ width: `${Math.min(100, furyPct)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              מתמלא בכל סבב. כשהוא מתמלא הגיבור משתחרר במכה אחת גדולה.
            </p>
          </div>
        </div>

        {/* the running loot */}
        <div className="panel-gold rounded-xl p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-gold-bright">
            <Icon name="gift" size={14} /> שלל שנצבר עד כה
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BOSS_REWARD_RESOURCES.map((res) => (
              <span
                key={res}
                className="nums inline-flex items-center gap-1 rounded-md border border-border-subtle bg-black/40 px-1.5 py-1 text-[11px] font-bold text-zinc-200"
              >
                <Icon name={RESOURCE_ICON[res]} size={12} className={RESOURCE_ICON_COLOR[res]} />
                <span dir="ltr">{formatNumber(state.earned[res])}</span>
              </span>
            ))}
            {state.earned.slaves > 0 && (
              <span className="nums inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-950/40 px-1.5 py-1 text-[11px] font-bold text-emerald-300">
                <Icon name="mine" size={12} />
                <span dir="ltr">{state.earned.slaves}</span>
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            נצבר לפי הנזק שנגרם עד כה. הפלת הבוס משלמת את האוצר כולו מעל זה, והכול משולם בסוף
            הקרב.
          </p>
        </div>
      </section>

      {/* ---------------- what has happened ---------------- */}
      <section className="panel rounded-xl p-3">
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dim">
          יומן הקרב
        </p>
        {state.revealed.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-zinc-500">
            הכוחות מתקרבים לשער…
          </p>
        ) : (
          <ul className="space-y-1">
            {[...state.revealed].reverse().map((entry) => (
              <li
                key={entry.round}
                className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5 text-[11px] odd:bg-white/[0.03] ${
                  entry.round === state.revealed.length ? "ba-log-in" : ""
                }`}
              >
                <span className="nums w-8 shrink-0 text-zinc-500" dir="ltr">
                  #{entry.round}
                </span>
                <span className="shrink-0 text-zinc-400">
                  {BOSS_MOVE_META[entry.move]?.label ?? entry.move}
                </span>
                <span aria-hidden className="text-zinc-600">
                  ←
                </span>
                <span
                  className={`shrink-0 font-bold ${
                    entry.furyUsed ? "text-gold-bright" : "text-zinc-200"
                  }`}
                >
                  {BOSS_TACTIC_META[entry.tactic]?.label ?? entry.tactic}
                </span>
                <span
                  className={`shrink-0 font-bold ${
                    entry.correct ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {entry.furyUsed ? "🔥" : entry.correct ? "✔ קריאה נכונה" : "✘ קריאה שגויה"}
                </span>
                <span className="nums mr-auto shrink-0 font-bold text-gold-bright" dir="ltr">
                  −{formatNumber(entry.damage)}
                </span>
                <span className="nums shrink-0 text-red-300" dir="ltr">
                  −{formatNumber(entry.soldiersLost)} ⚔
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
