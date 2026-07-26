import Link from "next/link";
import { Icon, RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import { Tip } from "@/components/ui/Tip";
import { formatNumber } from "@/lib/game/format";
import { formatGameTime } from "@/lib/game/time";
import { BOSS_REWARD_RESOURCES, bossImage } from "@/lib/game/bosses";
import { RESOURCE_META } from "@/lib/game/constants";
import { BossAttackButton } from "@/components/game/BossAttackButton";
import type { CityBossState } from "@/server/bossState";

/**
 * The city boss, rendered as the hero slab at the top of the rankings screen.
 *
 * The whole point of the layout is the power gauge: the boss's power is fixed
 * and public, so the bar answers "am I ready yet?" at a glance, and the CTA
 * only lights up when the answer is yes. Everything else — portrait, spoils,
 * honour roll — hangs off that comparison.
 */
export function CityBossBanner({ state, cities }: { state: CityBossState; cities: number }) {
  const {
    boss,
    power,
    myPower,
    turnCost,
    myTurns,
    reward,
    heroXp,
    victoriesUsed,
    victoriesAllowed,
    refreshesAt,
    canAttack,
    wouldWin,
    myKills,
    conquerors,
  } = state;

  // Both bars are drawn against the larger of the two powers, so the weaker
  // side is visibly short rather than both reading "full".
  const scale = Math.max(power, myPower, 1);
  const bossPct = (power / scale) * 100;
  const myPct = (myPower / scale) * 100;
  const shortfall = Math.max(0, power - myPower + 1);

  const outOfTurns = myTurns < turnCost;
  const exhausted = victoriesAllowed > 0 && victoriesUsed >= victoriesAllowed;
  const disabledReason = exhausted
    ? `${boss.name} מלקק את פצעיו — חוזר בעדכון היומי הבא (${formatGameTime(refreshesAt)})`
    : outOfTurns
      ? `חסרות לך ${formatNumber(turnCost - myTurns)} תורות`
      : victoriesAllowed <= 0
        ? "בוס העיר אינו זמין כרגע"
        : "אין לך צבא — אמן חיילים קודם";

  return (
    <section
      dir="rtl"
      style={{ ["--boss-accent" as string]: boss.accent }}
      className="relative overflow-hidden rounded-2xl border border-[rgb(var(--boss-accent))]/45 bg-[#0a0709] shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_28px_80px_-30px_rgb(var(--boss-accent)/0.55)]"
    >
      {/* accent wash + vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_85%_0%,rgb(var(--boss-accent)/0.28),transparent_60%)]"
      />

      <div className="relative grid md:grid-cols-[minmax(0,300px)_1fr]">
        {/* ---------------- portrait ---------------- */}
        <div className="relative min-h-[260px] md:min-h-[420px]">
          {/* Crest underlay: if the portrait file is missing the slab still
              reads as deliberate art rather than a broken image. */}
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[rgb(var(--boss-accent)/0.35)] to-black"
          >
            <Icon name="attack" size={120} className="text-black/40" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bossImage(boss.key)}
            alt={`${boss.name} — ${boss.title}`}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/45"
          />
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 hidden w-28 bg-gradient-to-l from-transparent to-[#0a0709] md:block"
          />

          {/* tier badge */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <span className="rounded-md border border-[rgb(var(--boss-accent))]/60 bg-black/85 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.25em] text-[rgb(var(--boss-accent))]">
              עיר {cities}
            </span>
            {myKills > 0 && (
              <Tip tip={`הפלת את ${boss.name} ${myKills} פעמים בעיר הזו.`}>
                <span className="nums rounded-md border border-gold/60 bg-black/85 px-2 py-0.5 text-[11px] font-black text-gold-bright">
                  ☠ ×{myKills}
                </span>
              </Tip>
            )}
          </div>

          {/* name plate */}
          <div className="absolute inset-x-0 bottom-0 p-4 text-center">
            <p className="text-3xl font-black text-[rgb(var(--boss-accent))] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              {boss.name}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-bone-dim">
              {boss.title}
            </p>
          </div>
        </div>

        {/* ---------------- dossier ---------------- */}
        <div className="flex flex-col gap-4 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-black tracking-wide text-bone-bright">
              <Icon name="attack" size={20} className="text-[rgb(var(--boss-accent))]" />
              בוס העיר
              <span className="rounded-full border border-red-500/50 bg-red-950/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-300">
                אויב על
              </span>
            </h2>
            <span className="nums inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-panel-inset px-3 py-1 text-xs text-zinc-300">
              <Icon name="turns" size={14} className="text-gold" />
              עלות הקרב:{" "}
              <b className={outOfTurns ? "text-red-400" : "text-gold-bright"} dir="ltr">
                {formatNumber(turnCost)}
              </b>{" "}
              תורות
            </span>
          </div>

          <p className="text-sm leading-relaxed text-zinc-400">{boss.lore}</p>

          {/* -------- power gauge -------- */}
          <div className="panel-inset space-y-2.5 rounded-xl p-3.5">
            <PowerRow
              label={boss.name}
              value={power}
              pct={bossPct}
              className="bg-gradient-to-l from-[rgb(var(--boss-accent))] to-[rgb(var(--boss-accent)/0.35)]"
              tone="text-[rgb(var(--boss-accent))]"
            />
            <PowerRow
              label="כוח התקיפה שלך"
              value={myPower}
              pct={myPct}
              className="bg-gradient-to-l from-gold-bright to-gold-deep"
              tone="text-gold-bright"
            />
            <p
              className={`flex items-center gap-1.5 text-xs font-bold ${
                wouldWin ? "text-emerald-400" : "text-red-400"
              }`}
            >
              <Icon name={wouldWin ? "crown" : "shield"} size={14} />
              {wouldWin ? (
                <>הכוח שלך גובר עליו — הקרב ינוצח.</>
              ) : (
                <>
                  חסר לך{" "}
                  <span className="nums" dir="ltr">
                    {formatNumber(shortfall)}
                  </span>{" "}
                  כוח תקיפה כדי להפיל אותו.
                </>
              )}
            </p>
          </div>

          {/* -------- spoils -------- */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-gold-dim">
              <Icon name="gift" size={14} /> שלל הניצחון
            </p>
            <div className="flex flex-wrap gap-2">
              {BOSS_REWARD_RESOURCES.map((res) => (
                <span
                  key={res}
                  className="nums inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-panel-inset px-2.5 py-1.5 text-sm font-bold text-zinc-200"
                >
                  <Icon
                    name={RESOURCE_ICON[res]}
                    size={15}
                    className={RESOURCE_ICON_COLOR[res]}
                  />
                  <span dir="ltr">{formatNumber(reward[res])}</span>
                  <span className="text-[11px] font-normal text-zinc-500">
                    {RESOURCE_META[res].label}
                  </span>
                </span>
              ))}
              <Tip tip="שבויים ששוחררו ממכלאות הבוס — מצטרפים למאגר עבדי המכרות הפנוי שלך.">
                <span className="nums inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1.5 text-sm font-bold text-emerald-300">
                  ⛏️ <span dir="ltr">{formatNumber(reward.slaves)}</span>
                  <span className="text-[11px] font-normal text-emerald-500/80">עבדים</span>
                </span>
              </Tip>
              <Tip tip="הבוס תמיד מפיל ציוד גיבור — ולעולם לא ציוד פשוט.">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 px-2.5 py-1.5 text-sm font-bold text-purple-300">
                  <Icon name="spark" size={15} /> ציוד מובטח
                </span>
              </Tip>
              <span className="nums inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-panel-inset px-2.5 py-1.5 text-sm font-bold text-zinc-200">
                <Icon name="hero" size={15} className="text-gold" />
                <span dir="ltr">+{formatNumber(heroXp)}</span>
                <span className="text-[11px] font-normal text-zinc-500">ניסיון גיבור</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">
              השלל גדל עם התקדמות העונה ועם מספר הערים שלך.
            </p>
          </div>

          {/* -------- CTA -------- */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-4">
            <BossAttackButton
              bossName={boss.name}
              disabled={!canAttack}
              disabledReason={disabledReason}
              turnCost={turnCost}
            />
            <p className="text-xs text-zinc-500">
              {exhausted ? (
                <>
                  {boss.name} מלקק את פצעיו — חוזר בעדכון היומי הבא בשעה{" "}
                  <span className="nums text-gold-dim" dir="ltr">
                    {formatGameTime(refreshesAt)}
                  </span>
                </>
              ) : (
                <>
                  ניצחונות זמינים במחזור הנוכחי:{" "}
                  <span className="nums font-bold text-gold-bright" dir="ltr">
                    {Math.max(0, victoriesAllowed - victoriesUsed)}/{victoriesAllowed}
                  </span>{" "}
                  · התורות נגבות גם בתבוסה.
                </>
              )}
            </p>
          </div>

          {/* -------- honour roll -------- */}
          {conquerors.length > 0 && (
            <div className="border-t border-border-subtle pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-gold-dim">
                <Icon name="rankings" size={14} /> מפילי {boss.name}
              </p>
              <ul className="flex flex-wrap gap-2">
                {conquerors.map((c) => (
                  <li key={c.empireId}>
                    <Link
                      href={`/game/empires/${c.empireId}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1 text-xs text-zinc-200 transition-colors hover:border-gold/60 hover:text-gold-bright"
                    >
                      <Icon name="crown" size={13} className="text-gold" />
                      <span className="font-semibold">{c.empireName}</span>
                      <span className="nums text-[10px] text-gold-dim" dir="ltr">
                        ×{c.kills}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** One labelled power bar in the gauge. */
function PowerRow({
  label,
  value,
  pct,
  className,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  className: string;
  tone: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className={`text-xs font-bold ${tone}`}>{label}</span>
        <span className="nums text-sm font-black text-zinc-100" dir="ltr">
          {formatNumber(value)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-black/60 bg-white/5">
        <span
          className={`block h-full rounded-full ${className}`}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}
