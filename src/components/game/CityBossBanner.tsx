import Link from "next/link";
import { Icon, RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import { Tip } from "@/components/ui/Tip";
import { formatNumber } from "@/lib/game/format";
import { BOSS_REWARD_RESOURCES, bossImage } from "@/lib/game/bosses";
import {
  BOSS_CHIP_SHARE,
  BOSS_GRADE_BONUS,
  BOSS_KILL_SHARE,
  BOSS_MOVE_META,
  BOSS_MOVE_COUNTER,
  BOSS_READ_CHANCE_MAX,
  BOSS_ROUT_LOSS_FRACTION,
  BOSS_TACTIC_META,
} from "@/lib/game/bossBattle";
import { cityFullName, cityName } from "@/lib/game/cities";
import { RESOURCE_META } from "@/lib/game/constants";
import { BossAttackButton } from "@/components/game/BossAttackButton";
import { BossCountdown } from "@/components/game/BossCountdown";
import { LivingPortrait } from "@/components/game/LivingPortrait";
import type { CityBossState } from "@/server/bossState";

/**
 * The city boss, as a compact slab above the rankings ladder.
 *
 * It has been on a diet. The first version was a double power gauge answering "am
 * I ready yet?", because the fight was one all-or-nothing comparison; the second
 * added a health bar, a sortie projection and a tactic legend, and ran tall enough
 * to push the ladder — the actual subject of this screen — under the fold.
 *
 * Now that the assault runs itself there are only four things a player needs here,
 * and they fit in one row each: who he is, how much life is left, when he comes
 * back if he is dead, and the one button. Everything explanatory — the haul, how
 * the army fights, the lore, the honour roll — is behind the disclosure, which is
 * where reference material belongs when it is read once and never again.
 */
export function CityBossBanner({ state, cities }: { state: CityBossState; cities: number }) {
  const {
    boss,
    power,
    myPower,
    turnCost,
    myTurns,
    hp,
    maxHp,
    sorties,
    revivesAt,
    reviveMs,
    serverNow,
    lifeHaul,
    heroXp,
    expectedSortieDamage,
    sortiesToKill,
    roundsPerSortie,
    readChance,
    soldiers,
    expectedSortieLosses,
    expectedSortieLoot,
    armyPower,
    weaponPower,
    heroBonusPct,
    guildBonusPct,
    guildAidPower,
    heroLevel,
    heroAlive,
    activeBattleId,
    activeEndsAt,
    canAttack,
    myKills,
    conquerors,
  } = state;

  const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  const woundedPct = 100 - hpPct;
  const outOfTurns = myTurns < turnCost;
  const dead = revivesAt != null;

  // The trade, priced before anything is spent. `bitePct` is the share of the
  // *remaining* pool one assault takes off, which is what the loot is paid on —
  // and the number that says, without any adjectives, whether this fight is worth
  // marching to yet.
  const bitePct = hp > 0 ? Math.min(100, (expectedSortieDamage / hp) * 100) : 0;
  const lossPct = soldiers > 0 ? (expectedSortieLosses / soldiers) * 100 : 0;
  // Four or more assaults is a fortnight of banked turns for the tyrant of your
  // own city: past that the honest advice is to grow first, and say why.
  const outmatched = soldiers > 0 && sortiesToKill > 3;

  const disabledReason = dead
    ? `${boss.name} מת — הוא קם לתחייה בעוד רגע`
    : activeBattleId
      ? "הקרב הנוכחי עוד רץ"
      : outOfTurns
        ? `חסרות לך ${formatNumber(turnCost - myTurns)} תורות`
        : "אין לך צבא — אמן חיילים קודם";

  return (
    <section
      dir="rtl"
      style={{ ["--boss-accent" as string]: boss.accent }}
      className="relative overflow-hidden rounded-2xl border border-[rgb(var(--boss-accent))]/45 bg-[#0a0709] shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_20px_60px_-30px_rgb(var(--boss-accent)/0.55)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_85%_0%,rgb(var(--boss-accent)/0.26),transparent_60%)]"
      />

      <div className="relative grid grid-cols-[112px_1fr] sm:grid-cols-[150px_1fr] lg:grid-cols-[180px_1fr]">
        {/* ---------------- portrait ----------------
            The tyrant is the subject of this block, so he gets the room to read
            as a character rather than as a list bullet: a wide column with a
            floor under it, so the art keeps its presence even when the dossier
            beside it collapses to four short rows. At this size the portrait is
            also finally worth the expensive tier — every boss ships a depth map
            (public/boss/*-depth.png), so `rich` buys real volume here where it
            would have been wasted on the 76px strip this used to be. */}
        <div className="relative min-h-[200px] sm:min-h-[240px]">
          {/* Crest underlay: a missing portrait file still reads as deliberate art
              rather than as a broken image. */}
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[rgb(var(--boss-accent)/0.35)] to-black"
          >
            <Icon name="attack" size={56} className="text-black/40" />
          </div>
          <LivingPortrait
            src={bossImage(boss.key)}
            alt={`${boss.name} — ${boss.title}`}
            className={`absolute inset-0 ${dead ? "grayscale" : ""}`}
            accent={boss.accent}
            embers={dead ? 0 : 8}
            tilt={9}
            drift={20}
            rich={!dead}
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25"
            />
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 w-8 bg-gradient-to-l from-transparent to-[#0a0709] sm:w-10"
            />
          </LivingPortrait>
          {myKills > 0 && (
            <div className="absolute inset-x-0 bottom-1.5 flex justify-center">
              <Tip tip={`הפלת את ${boss.name} ${myKills} פעמים בעיר הזו.`}>
                <span className="nums rounded border border-gold/60 bg-black/85 px-1.5 text-[10px] font-black text-gold-bright">
                  ☠ ×{myKills}
                </span>
              </Tip>
            </div>
          )}
        </div>

        {/* ---------------- dossier ---------------- */}
        <div className="flex min-w-0 flex-col gap-2 p-3 sm:p-3.5">
          {/* identity — one line */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <p className="min-w-0 truncate text-lg font-black leading-tight text-[rgb(var(--boss-accent))]">
              {boss.name}
              <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.2em] text-bone-dim">
                {boss.title}
              </span>
            </p>
            <Tip tip={`${boss.name} שולט ב${cityFullName(cities)} — עיר מספר ${cities}.`}>
              <span className="cursor-help shrink-0 rounded border border-[rgb(var(--boss-accent))]/60 bg-black/60 px-1.5 py-0.5 text-[10px] font-black text-[rgb(var(--boss-accent))]">
                עיר {cityName(cities)}
              </span>
            </Tip>
          </div>

          {/* health, or the revive clock in its place — one row either way */}
          {dead ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-gold/30 bg-black/40 px-2.5 py-2">
              <span className="text-xs font-bold text-gold-bright">
                <Icon name="crown" size={13} className="inline-block align-middle" /> {boss.name}{" "}
                הופל
              </span>
              <span className="text-xs text-zinc-400">— קם לתחייה בעוד</span>
              <BossCountdown
                endsAt={revivesAt.getTime()}
                serverNow={serverNow}
                totalMs={reviveMs}
              />
            </div>
          ) : (
            <div>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-bold text-[rgb(var(--boss-accent))]">
                  חיי הבוס
                </span>
                <span className="nums text-xs font-black text-zinc-100" dir="ltr">
                  {formatNumber(Math.round(hp))} / {formatNumber(maxHp)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-black/60 bg-white/5">
                <span
                  className="block h-full rounded-full bg-gradient-to-l from-[rgb(var(--boss-accent))] to-[rgb(var(--boss-accent)/0.35)]"
                  style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
                />
              </div>
              {woundedPct >= 1 && (
                <p className="mt-1 text-[11px] text-zinc-500">
                  פצוע ב־
                  <span className="nums text-zinc-300" dir="ltr">
                    {Math.round(woundedPct)}%
                  </span>{" "}
                  מ־
                  <span className="nums" dir="ltr">
                    {sorties}
                  </span>{" "}
                  {sorties === 1 ? "תקיפה" : "תקיפות"} — הפצעים נשארים עד שהוא נופל
                </p>
              )}
            </div>
          )}

          {/* ---------------- the trade, before you pay for it ----------------
              Both halves of it, side by side. The blood used to be invisible
              until the report — you marched, lost a fifth of the army and found
              out afterwards, which is exactly how a fight starts reading as a
              scam. Damage, loot and casualties are all projections from the same
              formulas the assault resolves with (see bossExpectedSortie*). */}
          {!dead && !activeBattleId && soldiers > 0 && (
            <div className="grid gap-x-3 gap-y-1.5 rounded-lg border border-border-subtle bg-black/40 px-2.5 py-2 text-[11px] sm:grid-cols-3">
              <div>
                <p className="font-bold text-gold-dim">תקיפה אחת תוריד לו</p>
                <p className="nums mt-0.5 text-right font-black text-gold-bright" dir="ltr">
                  ~{formatNumber(Math.round(expectedSortieDamage))}
                  <span className="font-normal text-zinc-500"> ({Math.round(bitePct)}%)</span>
                </p>
              </div>
              <div>
                <p className="font-bold text-gold-dim">ותשלם לך בערך</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {BOSS_REWARD_RESOURCES.map((res) => (
                    <span
                      key={res}
                      className="nums inline-flex items-center gap-0.5 font-bold text-zinc-200"
                    >
                      <Icon
                        name={RESOURCE_ICON[res]}
                        size={11}
                        className={RESOURCE_ICON_COLOR[res]}
                      />
                      <span dir="ltr">{formatNumber(expectedSortieLoot[res])}</span>
                    </span>
                  ))}
                  {expectedSortieLoot.slaves > 0 && (
                    <span className="nums inline-flex items-center gap-0.5 font-bold text-emerald-300">
                      <Icon name="mine" size={11} />
                      <span dir="ltr">{expectedSortieLoot.slaves}</span>
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="font-bold text-gold-dim">ותעלה לך</p>
                <p className="nums mt-0.5 text-right font-black text-red-300" dir="ltr">
                  ~{formatNumber(Math.round(expectedSortieLosses))} ⚔
                  <span className="font-normal text-zinc-500"> ({Math.round(lossPct)}%)</span>
                </p>
              </div>
            </div>
          )}

          {/* The one sentence a player under the wall was never told: this is a
              bad trade *right now*, and here is the lever that changes it. */}
          {!dead && !activeBattleId && outmatched && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-200/90">
              <b>{boss.name} עדיין חזק ממך.</b> בקצב הזה צריך כ־
              <span className="nums" dir="ltr">
                {Number.isFinite(sortiesToKill) ? sortiesToKill : "∞"}
              </span>{" "}
              תקיפות כדי להפיל אותו, וכל אחת עולה{" "}
              <span className="nums" dir="ltr">
                {formatNumber(turnCost)}
              </span>{" "}
              תורות ובערך{" "}
              <span className="nums" dir="ltr">
                {formatNumber(Math.round(expectedSortieLosses))}
              </span>{" "}
              חיילים. השלל הגדול (
              <span className="nums" dir="ltr">
                {Math.round(BOSS_KILL_SHARE * 100)}%
              </span>{" "}
              ממנו + הציוד) משולם רק בהפלה — עדיף לגדל צבא ולהעלות את הגיבור, ואז לתקוף.
            </p>
          )}

          {/* the one button */}
          <div className="flex flex-wrap items-center gap-2">
            {activeBattleId && activeEndsAt ? (
              <Link
                href="/game/boss/battle"
                className="btn btn-gold inline-flex items-center gap-2 px-4 py-2 text-sm font-black"
              >
                <Icon name="attack" size={16} className="inline-block align-middle" /> הקרב רץ —
                צפה בו
                <BossCountdown endsAt={activeEndsAt.getTime()} serverNow={serverNow} compact />
              </Link>
            ) : (
              <BossAttackButton
                bossName={boss.name}
                disabled={!canAttack}
                disabledReason={disabledReason}
                turnCost={turnCost}
                wounded={woundedPct >= 1 && !dead}
              />
            )}

            <Tip
              tip={`תקיפה עולה ${turnCost.toLocaleString("he-IL")} תורות ורצה כדקה. הצבא נלחם לבד ${roundsPerSortie} סבבים — תקבל הודעה עם השלל כשהקרב נגמר, גם אם עברת לדף אחר.`}
            >
              <span className="nums inline-flex cursor-help items-center gap-1.5 rounded-full border border-border-subtle bg-panel-inset px-2.5 py-1 text-xs text-zinc-300">
                <Icon name="turns" size={13} className="text-emerald-400" />
                <b className={outOfTurns ? "text-red-400" : "text-gold-bright"} dir="ltr">
                  {formatNumber(turnCost)}
                </b>{" "}
                תורות
              </span>
            </Tip>
            {!canAttack && !dead && !activeBattleId && (
              <span className="text-[11px] font-semibold text-red-400">{disabledReason}</span>
            )}
          </div>

          {/* ---------------- everything read once, folded away ---------------- */}
          <details className="group border-t border-border-subtle pt-2">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-bold text-gold-dim transition-colors hover:text-gold-bright [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden
                className="inline-block transition-transform group-open:rotate-90 rtl:-scale-x-100"
              >
                ▸
              </span>
              שלל, איך הקרב עובד, וסיפור הרקע
              {conquerors.length > 0 && <> · מפילי {boss.name}</>}
            </summary>

            <div className="mt-3 space-y-3.5">
              {/* -------- how the fight goes, now that it fights itself -------- */}
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dim">
                  <Icon name="attack" size={13} /> איך הקרב עובד
                </p>
                <p className="text-xs leading-relaxed text-zinc-400">
                  לוחצים תקיפה פעם אחת. הצבא יוצא ל־
                  <b className="nums">{roundsPerSortie}</b> סבבים לאורך כדקה, ובכל סבב הקצינים
                  מנסים לקרוא את המהלך של {boss.name} ולענות עליו. קריאה נכונה מכפילה את הנזק
                  ומבטלת כמעט את האבדות; קריאה שגויה עושה את ההפוך. הסיכוי לקרוא נכון תלוי{" "}
                  <b>ברמת הגיבור שלך</b> — כרגע{" "}
                  <b className="nums text-gold-bright" dir="ltr">
                    {Math.round(readChance * 100)}%
                  </b>
                  . אבדות של{" "}
                  <span className="nums" dir="ltr">
                    {Math.round(BOSS_ROUT_LOSS_FRACTION * 100)}%
                  </span>{" "}
                  מבריחות את הצבא באמצע הקרב.
                </p>
                <ul className="mt-2 space-y-1">
                  {(["SMASH", "SWEEP", "EXPOSED"] as const).map((move) => {
                    const meta = BOSS_MOVE_META[move];
                    const counter = BOSS_TACTIC_META[BOSS_MOVE_COUNTER[move]];
                    return (
                      <li
                        key={move}
                        className="flex flex-wrap items-center gap-x-2 rounded border border-border-subtle bg-panel-inset px-2 py-1 text-[11px]"
                      >
                        <span aria-hidden>{meta.icon}</span>
                        <b className={meta.tone}>{meta.label}</b>
                        <span aria-hidden className="text-zinc-600">
                          ←
                        </span>
                        <span aria-hidden>{counter.icon}</span>
                        <b className="text-zinc-200">{counter.label}</b>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  תקיפה אחת שלך מורידה בממוצע{" "}
                  <span className="nums text-gold-dim" dir="ltr">
                    {formatNumber(Math.round(expectedSortieDamage))}
                  </span>{" "}
                  חיים —{" "}
                  {Number.isFinite(sortiesToKill) ? (
                    <>
                      כ־
                      <span className="nums text-gold-dim" dir="ltr">
                        {sortiesToKill}
                      </span>{" "}
                      {sortiesToKill === 1 ? "תקיפה" : "תקיפות"} להפלה
                    </>
                  ) : (
                    <>אמן צבא כדי להתחיל</>
                  )}
                  . כוח הבוס{" "}
                  <span className="nums" dir="ltr">
                    {formatNumber(power)}
                  </span>{" "}
                  מול כוח התקיפה שלך{" "}
                  <span className="nums" dir="ltr">
                    {formatNumber(Math.round(myPower))}
                  </span>
                  .
                </p>
              </div>

              {/* -------- the two levers, and where the player stands on each --------
                  "What do I do to win?" had no answer anywhere in the game. It
                  has exactly two, and they are not interchangeable: attack power
                  is the whole damage side, and the hero is the whole casualty
                  side — nothing else in the empire touches the blood price. */}
              <div className="border-t border-border-subtle pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dim">
                  <Icon name="spark" size={13} /> איך מגדילים את הסיכויים
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {/* damage side */}
                  <div className="rounded-lg border border-border-subtle bg-panel-inset p-2.5">
                    <p className="text-[11px] font-bold text-emerald-300">
                      <Icon name="attack" size={12} className="inline-block align-middle" /> כדי
                      לפגוע בו יותר — כוח תקיפה
                    </p>
                    <p className="nums mt-1 text-[11px] leading-relaxed text-zinc-400" dir="rtl">
                      (חיילים{" "}
                      <b className="text-zinc-200" dir="ltr">
                        {formatNumber(armyPower)}
                      </b>{" "}
                      + נשקי תקיפה{" "}
                      <b className="text-zinc-200" dir="ltr">
                        {formatNumber(weaponPower)}
                      </b>
                      ) × גיבור{" "}
                      <b className="text-zinc-200" dir="ltr">
                        +{Math.round(heroBonusPct)}%
                      </b>{" "}
                      × גילדה{" "}
                      <b className="text-zinc-200" dir="ltr">
                        +{Math.round(guildBonusPct)}%
                      </b>
                      {guildAidPower > 0 && (
                        <>
                          {" "}
                          + סיוע{" "}
                          <b className="text-zinc-200" dir="ltr">
                            {formatNumber(Math.round(guildAidPower))}
                          </b>
                        </>
                      )}{" "}
                      ={" "}
                      <b className="text-gold-bright" dir="ltr">
                        {formatNumber(Math.round(myPower))}
                      </b>
                    </p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
                      הנזק בכל סבב הוא אחוז מהכוח הזה — כל{" "}
                      <span className="nums" dir="ltr">
                        100
                      </span>{" "}
                      חיילים מוסיפים{" "}
                      <span className="nums" dir="ltr">
                        1,000
                      </span>{" "}
                      כוח, ונשקי תקיפה מוסיפים בלי לעלות בדם. שיקוי כוח, באפ גילדה וציוד גיבור
                      נספרים גם הם.
                    </p>
                  </div>

                  {/* casualty side */}
                  <div className="rounded-lg border border-border-subtle bg-panel-inset p-2.5">
                    <p className="text-[11px] font-bold text-sky-300">
                      <Icon name="hero" size={12} className="inline-block align-middle" /> כדי לספוג
                      פחות — הגיבור
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                      אבדות נקבעות רק לפי אם הקצינים קראו את המהלך נכון. גיבור רמה{" "}
                      <b className="nums text-zinc-200" dir="ltr">
                        {heroLevel}
                      </b>{" "}
                      קורא נכון{" "}
                      <b className="nums text-gold-bright" dir="ltr">
                        {Math.round(readChance * 100)}%
                      </b>{" "}
                      מהמהלכים, וסבב שנקרא נכון עולה כשליש מהדם של סבב שגוי — ומכפיל את הנזק.
                    </p>
                    {!heroAlive ? (
                      <p className="mt-1.5 rounded border border-red-500/40 bg-red-950/30 px-2 py-1 text-[11px] font-bold text-red-300">
                        הגיבור שלך מת — הקצינים מנחשים, אין זעם, והאבדות כמעט מוכפלות. החייה אותו
                        לפני שתתקוף.
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
                        כל רמה מוסיפה לסיכוי הקריאה (עד{" "}
                        <span className="nums" dir="ltr">
                          {Math.round(BOSS_READ_CHANCE_MAX * 100)}%
                        </span>
                        ) ומחזקת את מכת הזעם. גיבור מת מאבד את שניהם.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* -------- spoils -------- */}
              <div className="border-t border-border-subtle pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dim">
                  <Icon name="gift" size={13} /> שלל מלא על הבוס הזה
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {BOSS_REWARD_RESOURCES.map((res) => (
                    <span
                      key={res}
                      className="nums inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-panel-inset px-2 py-1 text-xs font-bold text-zinc-200"
                    >
                      <Icon
                        name={RESOURCE_ICON[res]}
                        size={13}
                        className={RESOURCE_ICON_COLOR[res]}
                      />
                      <span dir="ltr">{formatNumber(lifeHaul[res])}</span>
                      <span className="text-[10px] font-normal text-zinc-500">
                        {RESOURCE_META[res].label}
                      </span>
                    </span>
                  ))}
                  <Tip tip="שבויים ששוחררו ממכלאות הבוס — מצטרפים למאגר עבדי המכרות הפנוי שלך.">
                    <span className="nums inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2 py-1 text-xs font-bold text-emerald-300">
                      <Icon name="mine" size={13} />
                      <span dir="ltr">{formatNumber(lifeHaul.slaves)}</span>
                      <span className="text-[10px] font-normal text-emerald-500/80">עבדים</span>
                    </span>
                  </Tip>
                  <Tip tip="הבוס תמיד מפיל ציוד גיבור — ולעולם לא ציוד פשוט. דירוג קרב מושלם (S) מעלה את הרצפה בדרגה.">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 px-2 py-1 text-xs font-bold text-purple-300">
                      <Icon name="spark" size={13} /> ציוד מובטח בהפלה
                    </span>
                  </Tip>
                  <span className="nums inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-panel-inset px-2 py-1 text-xs font-bold text-zinc-200">
                    <Icon name="hero" size={13} className="text-gold" />
                    <span dir="ltr">+{formatNumber(heroXp)}</span>
                    <span className="text-[10px] font-normal text-zinc-500">ניסיון</span>
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  <span className="nums" dir="ltr">
                    {Math.round(BOSS_CHIP_SHARE * 100)}%
                  </span>{" "}
                  מהשלל משולם לפי הנזק שאתה מספיק לגרום — גם בתקיפה שלא הפילה אותו. השאר (
                  <span className="nums" dir="ltr">
                    {Math.round(BOSS_KILL_SHARE * 100)}%
                  </span>
                  ) הוא אוצר ההפלה, שגדל עד{" "}
                  <span className="nums" dir="ltr">
                    ×{BOSS_GRADE_BONUS.S}
                  </span>{" "}
                  בקרב מושלם. השלל גדל עם התקדמות העונה ועם מספר הערים שלך.
                </p>
              </div>

              <p className="border-t border-border-subtle pt-3 text-xs leading-relaxed text-zinc-400">
                {boss.lore}
              </p>

              {/* -------- honour roll -------- */}
              {conquerors.length > 0 && (
                <div className="border-t border-border-subtle pt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dim">
                    <Icon name="rankings" size={13} /> מפילי {boss.name}
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
          </details>
        </div>
      </div>
    </section>
  );
}
