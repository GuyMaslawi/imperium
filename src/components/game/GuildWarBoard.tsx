"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { formatCompact, formatNumber } from "@/lib/game/format";
import {
  GUILD_WAR_END_LABEL,
  GUILD_WAR_MIN_GUILDS,
  GUILD_WAR_ROUNDS,
  GUILD_WAR_START_LABEL,
  GUILD_WAR_PHASE_LABEL,
  livePollMs,
  registrationWarStart,
  type GuildWarLiveState,
  type GuildWarPhase,
} from "@/lib/game/guildWar";
import { getGuildWarLive } from "@/server/actions/guildWar";

export interface GuildWarBoardProps {
  /** Server-rendered snapshot; the poll takes over from here. */
  initial: GuildWarLiveState;
}

/* ------------------------------ small helpers ------------------------------ */

function pad(value: number): string {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

/** mm:ss, or h:mm:ss once there is more than an hour to wait. */
function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * "לפני 12 שנ׳". Deliberately relative rather than a wall clock: the feed is
 * server-rendered before it is hydrated, and a formatted local time would
 * differ between the server's timezone and the reader's.
 */
function since(at: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 5) return "עכשיו";
  if (seconds < 60) return `לפני ${seconds} שנ׳`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  return `לפני ${Math.round(minutes / 60)} שע׳`;
}

const RANK_MEDAL = ["🥇", "🥈", "🥉"];

/** Fixed, so the server and the client draw the same embers. */
const EMBERS = [6, 17, 29, 38, 47, 55, 63, 72, 81, 91];

function Embers() {
  return (
    <>
      {EMBERS.map((left, index) => (
        <span
          key={left}
          className="gw-ember"
          style={{
            left: `${left}%`,
            animationDuration: `${4.5 + (index % 5) * 0.9}s`,
            animationDelay: `${(index % 7) * 0.8}s`,
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------ the board ------------------------------ */

export function GuildWarBoard({ initial }: GuildWarBoardProps) {
  const router = useRouter();
  const [state, setState] = useState<GuildWarLiveState>(initial);

  // The clock runs in SERVER time. The window is enforced server-side, so a
  // skewed device must not be shown a countdown the server disagrees with —
  // and seeding from serverNow makes the first client render identical to the
  // server's, which is what keeps hydration quiet.
  const [now, setNow] = useState(initial.serverNow);
  const skew = useRef(0);

  useEffect(() => {
    skew.current = state.serverNow - Date.now();
  }, [state.serverNow]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + skew.current), 1000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    const next = await getGuildWarLive();
    if (next) setState(next);
  }, []);

  // This poll is not just a read: it is what actually drives the campaign. The
  // game has no cron, so the server fights whatever rounds have come due each
  // time it is asked (see advanceLiveWars).
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, livePollMs(state.phase));
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, state.phase]);

  // Crossing the bell (or the closing horn) changes what the page itself
  // renders, so the server component has to be re-run, not just the poll.
  const phaseRef = useRef(state.phase);
  useEffect(() => {
    if (phaseRef.current !== state.phase) {
      phaseRef.current = state.phase;
      router.refresh();
    }
  }, [state.phase, router]);

  const { phase } = state;
  const live = phase === "LIVE";
  const decided = phase === "SETTLED" || phase === "CANCELLED";

  const target =
    phase === "REGISTRATION"
      ? state.startsAt
      : live
        ? state.endsAt
        : decided
          ? registrationWarStart(new Date(now)).getTime()
          : state.endsAt;
  const remaining = Math.max(0, target - now);
  const urgent = live && remaining <= 5 * 60_000;

  const countdownLabel =
    phase === "REGISTRATION"
      ? "הקרב נפתח בעוד"
      : live
        ? "נותר לקרב"
        : phase === "SETTLING"
          ? "סופרים את הנקודות"
          : "המלחמה הבאה בעוד";

  const leaderScore = Math.max(1, ...state.scoreboard.map((row) => row.score));
  const newestId = state.feed[0]?.id;

  return (
    <div className="space-y-4">
      <Arena
        state={state}
        live={live}
        decided={decided}
        countdownLabel={countdownLabel}
        remaining={remaining}
        urgent={urgent}
      />

      {!state.valid && !decided && (
        <p className="panel-inset rounded-lg px-3 py-2 text-center text-xs text-amber-300/90">
          נרשמו {state.guildCount} בריתות. צריך לפחות {GUILD_WAR_MIN_GUILDS} כדי
          שהמלחמה תתקיים — אחרת הערב מתבטל ואף אחד לא מקבל פרס.
        </p>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-4">
          <Scoreboard state={state} leaderScore={leaderScore} decided={decided} />
          <Fighters state={state} />
        </div>

        <Feed state={state} now={now} newestId={newestId} />
      </div>
    </div>
  );
}

/* ------------------------------ arena banner ------------------------------ */

function Arena({
  state,
  live,
  decided,
  countdownLabel,
  remaining,
  urgent,
}: {
  state: GuildWarLiveState;
  live: boolean;
  decided: boolean;
  countdownLabel: string;
  remaining: number;
  urgent: boolean;
}) {
  const champion = state.scoreboard.find((row) => row.rank === 1);
  return (
    <div className={`gw-arena rounded-xl p-5 sm:p-7 ${live ? "is-live" : ""}`}>
      {live && <Embers />}

      <div className="relative flex flex-col items-center gap-4 text-center">
        <PhaseBadge phase={state.phase} />

        <div className="flex items-center gap-4">
          <Icon
            name="attack"
            size={44}
            className="gw-clash text-gold-bright"
            title="מלחמת בריתות"
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dim">
              {countdownLabel}
            </p>
            <p
              className={`gw-clock text-4xl font-black sm:text-5xl ${
                urgent ? "is-urgent" : ""
              }`}
              dir="ltr"
            >
              {state.phase === "SETTLING" ? "—" : clock(remaining)}
            </p>
          </div>
          <Icon
            name="attack"
            size={44}
            className="gw-clash text-gold-bright"
            aria-hidden
          />
        </div>

        {state.phase === "CANCELLED" ? (
          <p className="max-w-md text-sm text-zinc-400">
            פחות מ־{GUILD_WAR_MIN_GUILDS} בריתות נרשמו, ולכן המלחמה לא התקיימה.
            אין מנצחת ואין פרסים.
          </p>
        ) : decided && champion ? (
          <p className="text-sm text-zinc-300">
            👑 <span className="font-black text-gold-bright">{champion.guildName}</span>{" "}
            כבשה את הזירה עם{" "}
            <span className="nums font-bold text-gold-bright" dir="ltr">
              {formatNumber(champion.score)}
            </span>{" "}
            נקודות — הפרס מחולק שווה בשווה לכל חברי הברית
          </p>
        ) : (
          <p className="max-w-lg text-sm leading-relaxed text-zinc-400">
            הקרב מתנהל <span className="font-bold text-zinc-200">אוטומטית</span> בין{" "}
            <span className="nums font-bold text-gold-bright" dir="ltr">
              {GUILD_WAR_START_LABEL}
            </span>{" "}
            ל־
            <span className="nums font-bold text-gold-bright" dir="ltr">
              {GUILD_WAR_END_LABEL}
            </span>{" "}
            (שעון ישראל) — אין מה ללחוץ, המערכת מנהלת את כל ההתנגשויות לבד.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <Stat label="בריתות בזירה" value={state.guildCount} />
          {state.myGuildName && (
            <Stat label="הברית שלך" value={state.myGuildName} tone="gold" />
          )}
          {(live || state.phase === "SETTLING") && (
            <Stat label="סבב" value={`${state.round}/${GUILD_WAR_ROUNDS}`} tone="gold" />
          )}
        </div>

        {live && (
          <div className="w-full max-w-md">
            <div className="gw-bar h-1.5">
              <span style={{ width: `${(state.round / GUILD_WAR_ROUNDS) * 100}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: GuildWarPhase }) {
  const live = phase === "LIVE";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black tracking-wide ${
        live
          ? "border-red-500/60 bg-red-950/50 text-red-200"
          : phase === "CANCELLED"
            ? "border-zinc-700 bg-black/40 text-zinc-400"
            : "border-border-gold bg-black/40 text-gold-bright"
      }`}
    >
      {live && <span className="gw-live-dot" />}
      {GUILD_WAR_PHASE_LABEL[phase]}
    </span>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string | number;
  tone?: "muted" | "gold";
}) {
  return (
    <span className="panel-inset flex items-center gap-1.5 rounded-full px-3 py-1">
      <span className="text-zinc-500">{label}</span>
      <span
        className={`nums font-bold ${tone === "gold" ? "text-gold-bright" : "text-zinc-200"}`}
        dir={typeof value === "number" ? "ltr" : undefined}
      >
        {value}
      </span>
    </span>
  );
}

/* ------------------------------ scoreboard ------------------------------ */

function Scoreboard({
  state,
  leaderScore,
  decided,
}: {
  state: GuildWarLiveState;
  leaderScore: number;
  decided: boolean;
}) {
  return (
    <div className="panel rounded-xl p-4">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
        <Icon name="rankings" size={18} className="text-crimson" />
        טבלת הזירה
      </h2>

      {state.scoreboard.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          אף ברית לא נרשמה עדיין למלחמה הקרובה — היו הראשונים.
        </p>
      ) : (
        <ul className="space-y-2">
          {state.scoreboard.map((row) => {
            const pct = Math.max(row.score > 0 ? 3 : 0, (row.score / leaderScore) * 100);
            return (
              <li
                key={row.guildId}
                className={`gw-row rounded-lg p-3 ${row.mine ? "is-mine" : ""} ${
                  decided && row.rank === 1 ? "is-champion" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="w-7 shrink-0 text-center text-lg" aria-hidden>
                    {RANK_MEDAL[row.rank - 1] ?? (
                      <span className="nums text-sm text-zinc-500">{row.rank}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-bold text-zinc-100">
                    {row.guildName}
                    {row.mine && (
                      <span className="mr-2 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-black text-gold-bright">
                        הברית שלך
                      </span>
                    )}
                  </span>
                  <span className="nums text-lg font-black text-gold-bright" dir="ltr">
                    {formatNumber(row.score)}
                  </span>
                </div>

                <div className={`gw-bar mt-2 h-2 gw-rank-${row.rank}`}>
                  <span style={{ width: `${Math.min(100, pct)}%` }} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                  <span>
                    ניצחונות{" "}
                    <span className="nums text-emerald-300" dir="ltr">
                      {row.wins}
                    </span>
                  </span>
                  <span>
                    הפסדים{" "}
                    <span className="nums text-zinc-400" dir="ltr">
                      {row.losses}
                    </span>
                  </span>
                  {row.rewardLabel && (
                    <span className="mr-auto font-bold text-gold-bright">
                      🎁 {row.rewardLabel}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------ fighters ------------------------------ */

function Fighters({ state }: { state: GuildWarLiveState }) {
  if (state.fighters.length === 0) return null;
  return (
    <div className="panel rounded-xl p-4">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
        <Icon name="hero" size={18} className="text-crimson" />
        לוחמי המלחמה
      </h2>
      <p className="mb-3 text-[11px] text-zinc-500">
        המערכת מסובבת חבר אחר של כל ברית לכל סבב — הטבלה מראה מי הביא הכי הרבה
        נקודות. אין כאן פרס אישי.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-right text-xs text-gold-dim">
              <th className="pb-2 pr-2 font-semibold">#</th>
              <th className="pb-2 font-semibold">לוחם</th>
              <th className="pb-2 font-semibold">ברית</th>
              <th className="pb-2 font-semibold">פריצות</th>
              <th className="pb-2 font-semibold">הדיפות</th>
              <th className="pb-2 pl-2 font-semibold">נקודות</th>
            </tr>
          </thead>
          <tbody>
            {state.fighters.map((fighter, index) => (
              <tr
                key={fighter.empireId}
                className={`border-b border-border-subtle last:border-0 ${
                  fighter.me ? "bg-gold/8" : ""
                }`}
              >
                <td className="py-2 pr-2 text-zinc-500">
                  <span className="nums" dir="ltr">
                    {index + 1}
                  </span>
                </td>
                <td className="py-2 font-semibold text-zinc-100">
                  {fighter.name}
                  {fighter.me && (
                    <span className="mr-2 text-[10px] font-black text-gold-bright">
                      (אתה)
                    </span>
                  )}
                </td>
                <td className="py-2 text-zinc-400">{fighter.guildName}</td>
                <td className="py-2">
                  <span className="nums text-zinc-300" dir="ltr">
                    {fighter.wins}
                  </span>
                </td>
                <td className="py-2">
                  <span className="nums text-zinc-300" dir="ltr">
                    {fighter.holds}
                  </span>
                </td>
                <td className="py-2 pl-2">
                  <span className="nums font-black text-gold-bright" dir="ltr">
                    {formatNumber(fighter.points)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ live feed ------------------------------ */

function Feed({
  state,
  now,
  newestId,
}: {
  state: GuildWarLiveState;
  now: number;
  newestId: string | undefined;
}) {
  return (
    <div className="panel rounded-xl p-4">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
        <Icon name="reports" size={18} className="text-crimson" />
        שידור חי מהזירה
        {state.phase === "LIVE" && <span className="gw-live-dot" />}
      </h2>

      {state.feed.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          {state.phase === "LIVE"
            ? "הזירה נפתחת — הסבב הראשון עוד רגע."
            : "עוד לא היו קרבות במלחמה הזו."}
        </p>
      ) : (
        <ul className="max-h-[34rem] space-y-2 overflow-y-auto pl-1">
          {state.feed.map((item) => (
            <li
              key={item.id}
              className={`gw-feed-item rounded-lg p-2.5 text-xs ${
                item.won ? "is-breakthrough" : "is-hold"
              } ${item.id === newestId ? "is-fresh" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-black tracking-wide">
                  {item.won ? (
                    <span className="text-orange-300">💥 פריצה</span>
                  ) : (
                    <span className="text-emerald-300">🛡️ הדיפה</span>
                  )}
                  <span className="nums rounded bg-black/40 px-1.5 text-[10px] text-zinc-500" dir="ltr">
                    #{item.round + 1}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="nums font-black text-gold-bright" dir="ltr">
                    +{item.points}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {since(item.at, now)}
                  </span>
                </span>
              </div>

              <p className="mt-1 leading-relaxed text-zinc-300">
                <span className={item.mine ? "font-bold text-gold-bright" : "font-semibold"}>
                  {item.attackerName}
                </span>{" "}
                <span className="text-zinc-600">({item.attackerGuildName})</span>{" "}
                <span aria-hidden className="text-zinc-500">
                  ⟵
                </span>{" "}
                <span className={item.mine ? "font-bold text-gold-bright" : "font-semibold"}>
                  {item.defenderName}
                </span>{" "}
                <span className="text-zinc-600">({item.defenderGuildName})</span>
              </p>

              <p className="mt-0.5 text-[10px] text-zinc-600">
                <span className="nums" dir="ltr">
                  {formatCompact(Math.round(item.attackerPower))}
                </span>{" "}
                מול{" "}
                <span className="nums" dir="ltr">
                  {formatCompact(Math.round(item.defenderPower))}
                </span>{" "}
                — הנקודות ל{item.won ? item.attackerGuildName : item.defenderGuildName}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
