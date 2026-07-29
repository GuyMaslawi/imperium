"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Meter } from "@/components/ui/Meter";
import { Tip } from "@/components/ui/Tip";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerNow } from "@/components/game/HeroPotions";
import { collectHeroQuest, startHeroQuest } from "@/server/actions/heroQuests";
import type { ActionState } from "@/server/actions/game";
import { formatNumber } from "@/lib/game/format";
import {
  HERO_QUESTS,
  heroQuestByTier,
  heroQuestDurationLabel,
  heroQuestTurnCost,
  heroQuestXp,
} from "@/lib/game/heroQuests";

/**
 * מסעות הגיבור — the expedition board on the hero page.
 *
 * One rung per city the empire holds, and one hero to send up them. The rung
 * he is currently on lifts out of the list into a banner with a live clock;
 * everything else stays a row you can read the price of at a glance.
 *
 * What the board deliberately does *not* show is the payout. The rows quote the
 * price in turns, the length of the road and the odds of loot — never the haul.
 * It isn't withheld, it genuinely isn't decided: every run rolls its own fortune
 * on the server (see lib/game/heroQuests.ts), and the number only exists once he
 * walks back through the gate. So this component never receives a reward at all,
 * which is the only way a hidden number stays hidden in a client bundle.
 *
 * All timing runs in SERVER time (`useServerNow`), for the same reason the
 * potion belt does: a browser clock two minutes fast would offer a "collect"
 * button the server then refuses.
 */

/** "3:04:12" over an hour, "04:12" under it — the shape the wait deserves. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export interface ActiveHeroQuest {
  tier: number;
  /** Epoch ms — Dates don't survive the server/client boundary as Dates. */
  startedAt: number;
  endsAt: number;
  /** The one thing about the outcome that is fixed per rung, so it is shown. */
  xp: number;
}

export interface HeroQuestBoardProps {
  /** Cities the empire holds — the highest quest tier it may send the hero on. */
  cities: number;
  /** Turns in hand, for the affordability hint on each rung. */
  turns: number;
  /** A fallen hero cannot depart (a quest already under way still finishes). */
  heroDead: boolean;
  /** The quest he is on now, finished or not, or null when he is home. */
  active: ActiveHeroQuest | null;
  /** The server's own clock at render time — see useServerNow. */
  serverNow: number;
  /** False when an admin has closed the board (the heroQuest.enabled tunable). */
  open: boolean;
}

export function HeroQuestBoard({
  cities,
  turns,
  heroDead,
  active,
  serverNow,
  open,
}: HeroQuestBoardProps) {
  const router = useRouter();
  const now = useServerNow(serverNow);
  const [msg, setMsg] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const done = active !== null && active.endsAt <= now;

  // The moment the hero is due home, let the server re-render: the row is
  // collectable now, and only a fresh render can say so with authority.
  useEffect(() => {
    if (!done) return;
    const timeout = setTimeout(() => router.refresh(), 1000);
    return () => clearTimeout(timeout);
  }, [done, router]);

  const send = (tier: number) => {
    const fd = new FormData();
    fd.set("tier", String(tier));
    startTransition(async () => setMsg(await startHeroQuest({}, fd)));
  };
  const collect = () => {
    startTransition(async () => setMsg(await collectHeroQuest()));
  };

  return (
    <section className="panel rounded-2xl border border-border-gold-strong p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Tip tip="הגיבור יוצא למסע אחד בכל פעם. כל עיר שאתה מקים פותחת מסע ארוך יותר — והשלל של כל המסעות גדל עם מספר הערים שלך ועם התקדמות העונה.">
          <h2 className="flex cursor-help items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <span aria-hidden>🧭</span> מסעות הגיבור
          </h2>
        </Tip>
        <span className="text-[11px] text-zinc-500">
          נפתחו {Math.min(cities, HERO_QUESTS.length)} מתוך {HERO_QUESTS.length}
        </span>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
        <b className="text-zinc-300">אף אחד לא יודע מה יחזור מהדרך.</b> כל מסע מגלגל
        את מזלו שלו — לפעמים הגיבור חוזר חבול ועם מעט, ולפעמים נגררת אחריו עגלה שלמה.
        מה שכן בטוח: השלל גדל עם מספר הערים שלך ועם התקדמות העונה, וכל מסע משלם אותו
        ממוצע <b className="text-zinc-300">לכל שעה</b>. המסעות הארוכים קונים מחיר
        תורות נמוך יותר לשעה וסיכויי שלל גבוהים בהרבה; הקצרים קונים חפצים לשעה ואת
        החופש להגיב. הגיבור ממשיך להעניק את כל הבונוסים שלו גם בזמן שהוא בדרכים.
      </p>

      {!open && (
        <p className="mt-3 rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-xs text-zinc-400">
          לוח המסעות סגור כרגע.
        </p>
      )}

      {active && (
        <ActiveQuestBanner
          active={active}
          now={now}
          pending={pending}
          onCollect={collect}
        />
      )}

      <ul className="mt-3 space-y-2">
        {HERO_QUESTS.map((quest) => (
          <QuestRow
            key={quest.key}
            tier={quest.tier}
            unlocked={quest.tier <= cities}
            turns={turns}
            busy={active !== null}
            heroDead={heroDead}
            disabled={pending || !open}
            onSend={() => send(quest.tier)}
          />
        ))}
      </ul>

      {(msg.error || msg.success) && (
        <div className="mt-3">
          <FormMessage error={msg.error} success={msg.success} />
        </div>
      )}
    </section>
  );
}

/* ------------------------------ the running quest ------------------------------ */

function ActiveQuestBanner({
  active,
  now,
  pending,
  onCollect,
}: {
  active: ActiveHeroQuest;
  now: number;
  pending: boolean;
  onCollect: () => void;
}) {
  const quest = heroQuestByTier(active.tier);
  if (!quest) return null;

  const total = Math.max(1, active.endsAt - active.startedAt);
  const elapsed = Math.min(total, Math.max(0, now - active.startedAt));
  const done = active.endsAt <= now;

  return (
    <div
      className="mt-3 rounded-xl border p-3.5"
      style={{
        borderColor: `rgb(${quest.accent} / 0.55)`,
        background: `linear-gradient(to bottom, rgb(${quest.accent} / 0.12), transparent)`,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h3 className="flex items-center gap-2 text-sm font-black text-bone">
          <span aria-hidden className="text-lg">
            {quest.sigil}
          </span>
          {quest.name}
        </h3>
        <span
          className="nums flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1 text-xs font-bold"
          style={{ color: `rgb(${quest.accent})` }}
          dir="ltr"
        >
          {done ? "חזר!" : formatCountdown(active.endsAt - now)}
        </span>
      </div>

      <Meter className="mt-2.5" value={elapsed} max={total} />

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <MysteryChip
          done={done}
          tip={
            done
              ? "לחץ כדי לראות מה הוא הביא — השלל, המזל שליווה אותו, וכל מה שנפל בדרך."
              : "השלל נקבע ברגע שהוא יצא לדרך, אבל אף אחד בעיר עוד לא יודע מה יש בשק. הוא ייספר כשיחזור."
          }
        />
        <XpChip xp={active.xp} />
      </div>

      <button
        type="button"
        onClick={onCollect}
        disabled={!done || pending}
        className={`btn mt-3 w-full py-2 text-sm ${done ? "btn-gold" : "btn-ghost"}`}
      >
        {pending
          ? "אוסף…"
          : done
            ? "קבל את פני הגיבור ואסוף את השלל"
            : "הגיבור בדרכים…"}
      </button>
    </div>
  );
}

/* ------------------------------ one rung ------------------------------ */

function QuestRow({
  tier,
  unlocked,
  turns,
  busy,
  heroDead,
  disabled,
  onSend,
}: {
  tier: number;
  unlocked: boolean;
  turns: number;
  busy: boolean;
  heroDead: boolean;
  disabled: boolean;
  onSend: () => void;
}) {
  const quest = heroQuestByTier(tier);
  if (!quest) return null;

  const cost = heroQuestTurnCost(tier);
  const affordable = turns >= cost;
  // Every reason the button can be dead, most specific first — the row states
  // exactly one of them rather than greying out silently.
  const blocked = !unlocked
    ? `נפתח עם העיר ה-${tier}`
    : heroDead
      ? "הגיבור מת"
      : busy
        ? "הגיבור כבר במסע"
        : !affordable
          ? `חסרות ${(cost - turns).toLocaleString("he-IL")} תורות`
          : null;

  return (
    <li
      className={`panel-inset rounded-xl p-3 transition ${unlocked ? "" : "opacity-45"}`}
      // A 3px stripe in the quest's own colour down the leading edge — the one
      // thing that keeps ten near-identical rows from reading as a wall.
      style={
        unlocked
          ? {
              borderInlineStartColor: `rgb(${quest.accent} / 0.75)`,
              borderInlineStartWidth: "3px",
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-[13rem] flex-1">
          <h3 className="flex items-center gap-2 text-sm font-bold text-bone">
            <span aria-hidden>{unlocked ? quest.sigil : "🔒"}</span>
            {quest.name}
            <span className="rounded-md border border-border-subtle px-1.5 py-px text-[10px] font-bold text-zinc-400">
              {heroQuestDurationLabel(tier)}
            </span>
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{quest.lore}</p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <MysteryChip tip="השלל של המסע הזה לא ידוע מראש: כל יציאה מגלגלת את מזלה שלה — לפעמים מעט, לפעמים עגלה שלמה. הגודל הממוצע נגזר ממספר הערים שלך ומיום העונה, ואותו לכל שעת מסע בכל הדרגות." />
            <XpChip xp={heroQuestXp(tier)} />
            <Tip
              tip={`סיכוי לחפץ גיבור בסיום המסע: ${Math.round(quest.itemChance * 100)}% · סיכוי לשיקוי: ${Math.round(quest.potionChance * 100)}% — שתי הגרלות נפרדות, ומסע יכול להחזיר את שניהם.`}
            >
              <span className="nums flex cursor-help items-center gap-1 rounded-lg border border-violet-400/30 bg-violet-950/30 px-1.5 py-0.5 text-[11px] font-bold text-violet-300">
                <span aria-hidden>🎁</span>
                <span dir="ltr">
                  {Math.round(quest.itemChance * 100)}% / {Math.round(quest.potionChance * 100)}%
                </span>
              </span>
            </Tip>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-1.5">
          <Tip tip={`עלות שליחה: ${cost.toLocaleString("he-IL")} תורות — ${(cost / (quest.hours || 1)).toFixed(1)} לכל שעת מסע.`}>
            <span
              className={`nums flex cursor-help items-center justify-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                affordable
                  ? "border-emerald-400/30 bg-emerald-950/30 text-emerald-300"
                  : "border-red-500/30 bg-red-950/30 text-red-300"
              }`}
            >
              <Icon name="turns" size={12} />
              <span dir="ltr">{cost.toLocaleString("he-IL")}</span>
            </span>
          </Tip>
          <button
            type="button"
            onClick={onSend}
            disabled={disabled || blocked !== null}
            title={blocked ?? undefined}
            className="btn btn-ghost min-w-[7.5rem] px-3 py-1.5 text-xs"
          >
            {blocked ?? "שלח למסע"}
          </button>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------ shared bits ------------------------------ */

/**
 * Where the payout used to be printed. It stands in for four resource chips and
 * two people chips, and it is the whole feature: an unread number keeps the
 * player coming back to the page, a read one turns the quest into arithmetic.
 *
 * The icons are the six things a quest *can* bring home — the player still knows
 * what kind of haul to expect, just never how big.
 */
function MysteryChip({ tip, done = false }: { tip: string; done?: boolean }) {
  return (
    <Tip tip={tip}>
      <span
        className={`flex cursor-help items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
          done
            ? "border-gold/50 bg-gold/15 text-gold-bright"
            : "border-border-subtle bg-black/30 text-zinc-400"
        }`}
      >
        <span className="flex items-center gap-0.5 opacity-70" aria-hidden>
          <Icon name="gold" size={12} />
          <Icon name="wood" size={12} />
          <Icon name="iron" size={12} />
          <Icon name="stone" size={12} />
        </span>
        <span dir="ltr" className="tracking-[0.2em]">
          ???
        </span>
        <span>{done ? "מחכה בשער" : "שלל לא ידוע"}</span>
      </span>
    </Tip>
  );
}

/** XP is the one payout that *is* fixed per rung, so it stays on the row. */
function XpChip({ xp }: { xp: number }) {
  return (
    <Tip tip="ניסיון לגיבור — הדבר היחיד במסע שידוע מראש: הוא נקבע לפי דרגת המסע בלבד ולא מושפע ממזל.">
      <span
        className="nums flex cursor-help items-center gap-1 rounded-lg border border-gold/30 bg-gold/10 px-1.5 py-0.5 text-[11px] font-bold text-gold-bright"
        dir="ltr"
      >
        <span aria-hidden>✦</span>
        {formatNumber(xp)}
      </span>
    </Tip>
  );
}
