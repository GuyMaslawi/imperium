"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import {
  DEFENSE_BONUS,
  ENSLAVE_MIN_SOLDIERS,
  ENSLAVE_RATE,
  PLUNDER_RATE,
  SOLDIER_POWER,
  SPY_POWER,
  bankInterestRate,
  intelligencePowerMultiplier,
  mineProductionPerTick,
  REGULAR_TICK_MINUTES,
} from "@/lib/game/constants";
import {
  UPGRADE_LEVELS,
  bonusMultiplier,
  itemPrimaryBonus,
  itemUpgradeCost,
  matchupXpFactor,
  resetXpMultiplier,
  tierForLevel,
  upgradeStep,
  xpToNextLevel,
  RARITY_META,
  SLOT_META,
  type HeroPercentStat,
} from "@/lib/game/hero";
import { CITY_BOSSES, bossHeroXp, bossPower, bossReward, bossTurnCost } from "@/lib/game/bosses";
import { formatShort } from "./GuideUi";

/* ========================================================================
   Shared calculator chrome
   ======================================================================== */

/** Number field with a slider — the only input shape the calculators use. */
function Field({
  label,
  icon,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  hint,
}: {
  label: string;
  icon?: IconName;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-bone/85">
          {icon && <Icon name={icon} size={13} className="opacity-70" />}
          {label}
        </span>
        <span className="flex items-baseline gap-1">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const raw = Number(e.target.value);
              if (!Number.isFinite(raw)) return;
              onChange(Math.min(max, Math.max(min, raw)));
            }}
            className="w-24 rounded border border-border-subtle bg-black/50 px-1.5 py-0.5 text-left text-xs font-black text-gold-bright nums outline-none focus:border-gold/60"
            dir="ltr"
          />
          {suffix && <span className="text-[10px] text-zinc-500">{suffix}</span>}
        </span>
      </span>
      <input
        type="range"
        className="guide-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      {hint && <span className="mt-0.5 block text-[10px] text-zinc-500">{hint}</span>}
    </label>
  );
}

/** The calculator frame: a gold panel with a titled header. */
function CalcShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="panel-gold rounded-xl p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-gold-bright">
        <Icon name="upgrades" size={15} />
        {title}
      </p>
      {children}
    </div>
  );
}

/** One line of the derivation shown under a calculator. */
function Step({
  label,
  value,
  tone = "text-zinc-300",
  strong,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b border-white/5 py-1 last:border-0 ${
        strong ? "text-sm" : "text-xs"
      }`}
    >
      <span className={strong ? "font-black text-bone-bright" : "text-zinc-400"}>{label}</span>
      <span className={`nums ${strong ? "text-base font-black" : "font-bold"} ${tone}`} dir="ltr">
        {value}
      </span>
    </div>
  );
}

/** The single headline number a calculator exists to produce. */
function Result({
  label,
  value,
  sub,
  tone = "text-gold-bright",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="panel-inset rounded-xl px-4 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-dim">{label}</p>
      <p className={`text-2xl font-black nums ${tone}`} dir="ltr">
        {value}
      </p>
      {sub && <p className="text-[11px] text-zinc-400">{sub}</p>}
    </div>
  );
}

const int = (v: number) => Math.floor(v).toLocaleString("he-IL");

/* ========================================================================
   1. Mine production
   ======================================================================== */

/**
 * Mirrors `applyPendingUpdates` + `mineProductionBreakdown`: the raw per-slave
 * yield times the city count, then the multiplicative bonuses in the same order
 * the game clock applies them, and finally the relic's flat amount on top.
 */
export function ProductionCalc({ globalMultiplier = 1 }: { globalMultiplier?: number }) {
  const [level, setLevel] = useState(40);
  const [slaves, setSlaves] = useState(60);
  const [cities, setCities] = useState(3);
  const [heroPct, setHeroPct] = useState(20);
  const [guildPct, setGuildPct] = useState(0);
  const [flat, setFlat] = useState(0);
  const [potion, setPotion] = useState(false);

  // Same order the game clock uses in applyPendingUpdates: raw yield → cities →
  // hero → guild → potion → the global admin scalar, then the relic's flat add.
  const base = mineProductionPerTick(level, slaves);
  const afterCities = base * cities;
  const afterHero = afterCities * bonusMultiplier(heroPct);
  const afterGuild = afterHero * bonusMultiplier(guildPct);
  const afterPotion = afterGuild * (potion ? 2 : 1);
  const afterGlobal = afterPotion * globalMultiplier;
  const total = afterGlobal + flat;

  return (
    <CalcShell title="מחשבון תפוקת מכרה">
      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
        <Field label="רמת המכרה" icon="mine" value={level} onChange={setLevel} max={250}
          hint={`כל עבד מפיק ${level * 2} יחידות בעדכון`} />
        <Field label="עבדי מכרות משובצים" icon="army" value={slaves} onChange={setSlaves} max={5000} />
        <Field label="מספר ערים" icon="base" value={cities} onChange={setCities} min={1} max={10}
          hint={`מכפיל ×${cities}`} />
        <Field label="בונוס גיבור (משאבים)" icon="hero" value={heroPct} onChange={setHeroPct} max={200} suffix="%" />
        <Field label="קסם ברית — משאבים" icon="guild" value={guildPct} onChange={setGuildPct} max={30} suffix="%" />
        <Field label="חפץ פרי־שטן (קבוע לעדכון)" icon="spark" value={flat} onChange={setFlat} max={200} />
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-bold text-emerald-300">
        <input
          type="checkbox"
          checked={potion}
          onChange={(e) => setPotion(e.target.checked)}
          className="h-4 w-4 accent-emerald-500"
        />
        <Icon name="potion" size={14} /> שיקוי השפע פעיל (×2)
      </label>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="panel-inset rounded-xl px-3 py-2">
          <Step label="בסיס — עבדים × (רמה × 2)" value={int(base)} />
          <Step label={`ערים ×${cities}`} value={`+ ${int(afterCities - base)}`} tone="text-sky-300" />
          <Step label={`גיבור +${heroPct}%`} value={`+ ${int(afterHero - afterCities)}`} tone="text-purple-300" />
          <Step label={`ברית +${guildPct}%`} value={`+ ${int(afterGuild - afterHero)}`} tone="text-emerald-300" />
          {potion && (
            <Step label="שיקוי השפע ×2" value={`+ ${int(afterPotion - afterGuild)}`} tone="text-emerald-300" />
          )}
          {globalMultiplier !== 1 && (
            <Step
              label={`מכפיל שרת גלובלי ×${globalMultiplier}`}
              value={`+ ${int(afterGlobal - afterPotion)}`}
              tone="text-gold"
            />
          )}
          <Step label="חפץ — תוספת קבועה" value={`+ ${int(flat)}`} tone="text-gold" />
          <Step label="סה״כ לעדכון רגיל" value={int(total)} strong tone="text-gold-bright" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-56 lg:grid-cols-1">
          <Result label={`כל ${REGULAR_TICK_MINUTES} דקות`} value={formatShort(total)} />
          <Result label="לשעה" value={formatShort(total * 12)} tone="text-bone-bright" />
          <Result label="ליממה" value={formatShort(total * 288)} tone="text-emerald-300" />
        </div>
      </div>
    </CalcShell>
  );
}

/* ========================================================================
   2. Battle
   ======================================================================== */

/**
 * Mirrors the resolution in `attackEmpire` exactly: both sides multiply their
 * own troops, the defender additionally by the flat +20% wall bonus, and guild
 * aid is added after every multiplier. Strictly-greater attack power wins.
 */
export function BattleCalc({
  defenseBonus = DEFENSE_BONUS,
  plunderRate = PLUNDER_RATE,
  enslaveRate = ENSLAVE_RATE,
  enslaveMin = ENSLAVE_MIN_SOLDIERS,
}: {
  defenseBonus?: number;
  plunderRate?: number;
  enslaveRate?: number;
  enslaveMin?: number;
}) {
  // Defaults deliberately land on a win, so the spoils row below demonstrates
  // plunder and enslavement instead of showing three zeros on first render.
  const [aSoldiers, setASoldiers] = useState(2000);
  const [aWeapons, setAWeapons] = useState(55000);
  const [aHero, setAHero] = useState(25);
  const [aGuild, setAGuild] = useState(0);
  const [aAid, setAAid] = useState(0);

  const [dSoldiers, setDSoldiers] = useState(1800);
  const [dWeapons, setDWeapons] = useState(35000);
  const [dHero, setDHero] = useState(20);
  const [dGuild, setDGuild] = useState(0);
  const [dAid, setDAid] = useState(0);

  const [dGold, setDGold] = useState(500_000);

  const aBase = aSoldiers * SOLDIER_POWER + aWeapons;
  const aAfterHero = aBase * bonusMultiplier(aHero);
  const aAfterGuild = aAfterHero * bonusMultiplier(aGuild);
  const aTotal = aAfterGuild + aAid;

  const dBase = dSoldiers * SOLDIER_POWER + dWeapons;
  const dAfterWall = dBase * defenseBonus;
  const dAfterHero = dAfterWall * bonusMultiplier(dHero);
  const dAfterGuild = dAfterHero * bonusMultiplier(dGuild);
  const dTotal = dAfterGuild + dAid;

  const win = aTotal > dTotal;
  const share = aTotal + dTotal > 0 ? (aTotal / (aTotal + dTotal)) * 100 : 50;
  const plunder = win ? Math.floor(dGold * plunderRate) : 0;
  const enslaved =
    win && dSoldiers >= enslaveMin
      ? Math.min(dSoldiers, Math.max(1, Math.floor(dSoldiers * enslaveRate)))
      : 0;

  return (
    <CalcShell title="מחשבון קרב">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* attacker */}
        <div className="rounded-xl border border-red-500/25 bg-red-950/15 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-red-300">
            <Icon name="attack" size={15} /> התוקף
          </p>
          <div className="grid gap-3">
            <Field label="חיילים" icon="army" value={aSoldiers} onChange={setASoldiers} max={100000} step={10}
              hint={`${int(aSoldiers * SOLDIER_POWER)} כוח (${SOLDIER_POWER} לחייל)`} />
            <Field label="כוח נשקי התקפה" icon="factory" value={aWeapons} onChange={setAWeapons} max={5_000_000} step={1000} />
            <Field label="בונוס גיבור — התקפה" icon="hero" value={aHero} onChange={setAHero} max={300} suffix="%" />
            <Field label="קסם ברית — התקפה" icon="guild" value={aGuild} onChange={setAGuild} max={30} suffix="%" />
            <Field label="עזרת ברית (כוח קבוע)" icon="shield" value={aAid} onChange={setAAid} max={1_000_000} step={1000} />
          </div>
        </div>

        {/* defender */}
        <div className="rounded-xl border border-sky-500/25 bg-sky-950/15 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-sky-300">
            <Icon name="shield" size={15} /> המגן
          </p>
          <div className="grid gap-3">
            <Field label="חיילים" icon="army" value={dSoldiers} onChange={setDSoldiers} max={100000} step={10}
              hint={`${int(dSoldiers * SOLDIER_POWER)} כוח (${SOLDIER_POWER} לחייל)`} />
            <Field label="כוח נשקי הגנה" icon="factory" value={dWeapons} onChange={setDWeapons} max={5_000_000} step={1000} />
            <Field label="בונוס גיבור — הגנה" icon="hero" value={dHero} onChange={setDHero} max={300} suffix="%" />
            <Field label="קסם ברית — הגנה" icon="guild" value={dGuild} onChange={setDGuild} max={30} suffix="%" />
            <Field label="עזרת ברית (כוח קבוע)" icon="shield" value={dAid} onChange={setDAid} max={1_000_000} step={1000} />
          </div>
        </div>
      </div>

      {/* the two derivations, side by side */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="panel-inset rounded-xl px-3 py-2">
          <Step label="חיילים + נשקי התקפה" value={int(aBase)} />
          <Step label={`גיבור +${aHero}%`} value={`+ ${int(aAfterHero - aBase)}`} tone="text-purple-300" />
          <Step label={`ברית +${aGuild}%`} value={`+ ${int(aAfterGuild - aAfterHero)}`} tone="text-emerald-300" />
          <Step label="עזרת ברית" value={`+ ${int(aAid)}`} tone="text-emerald-300" />
          <Step label="כוח התקפה סופי" value={int(aTotal)} strong tone="text-red-300" />
        </div>
        <div className="panel-inset rounded-xl px-3 py-2">
          <Step label="חיילים + נשקי הגנה" value={int(dBase)} />
          <Step
            label={`בונוס מגן +${Math.round((defenseBonus - 1) * 100)}%`}
            value={`+ ${int(dAfterWall - dBase)}`}
            tone="text-sky-300"
          />
          <Step label={`גיבור +${dHero}%`} value={`+ ${int(dAfterHero - dAfterWall)}`} tone="text-purple-300" />
          <Step label={`ברית +${dGuild}%`} value={`+ ${int(dAfterGuild - dAfterHero)}`} tone="text-emerald-300" />
          <Step label="עזרת ברית" value={`+ ${int(dAid)}`} tone="text-emerald-300" />
          <Step label="כוח הגנה סופי" value={int(dTotal)} strong tone="text-sky-300" />
        </div>
      </div>

      {/* the duel bar + verdict */}
      <div className="mt-4">
        <div className="flex h-3 overflow-hidden rounded-full border border-border-subtle bg-black/60">
          <span className="bg-gradient-to-l from-red-500 to-red-700" style={{ width: `${share}%` }} />
          <span className="flex-1 bg-gradient-to-r from-sky-500 to-sky-700" />
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-bold">
          <span className="text-red-300">תוקף {share.toFixed(1)}%</span>
          <span className="text-sky-300">מגן {(100 - share).toFixed(1)}%</span>
        </div>
      </div>

      <div
        className={`mt-3 rounded-xl border px-4 py-3 text-center text-sm font-black ${
          win
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            : "border-red-500/40 bg-red-500/10 text-red-300"
        }`}
      >
        {win ? "התקיפה מצליחה — ההגנה נפרצת" : "התקיפה נהדפת — המגן מחזיק"}
        <span className="mx-2 text-zinc-500">|</span>
        <span className="nums" dir="ltr">
          {int(aTotal)} {win ? ">" : "≤"} {int(dTotal)}
        </span>
      </div>

      {/* spoils */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Field label="זהב זמין אצל המגן" icon="gold" value={dGold} onChange={setDGold} max={100_000_000} step={10_000}
            hint="מה שבמחסן מוגן ולא נבזז" />
        </div>
        <Result
          label={`ביזת זהב (${Math.round(plunderRate * 100)}%)`}
          value={formatShort(plunder)}
          sub={win ? "מכל משאב בנפרד" : "אין ביזה בהפסד"}
        />
        <Result
          label="חיילים שנשבים"
          value={int(enslaved)}
          sub={dSoldiers < enslaveMin ? `דורש ${enslaveMin}+ חיילים למגן` : "מצטרפים כעבדי מכרות"}
          tone="text-bone-bright"
        />
      </div>
    </CalcShell>
  );
}

/* ========================================================================
   3. Spy
   ======================================================================== */

/** Mirrors `spyOnEmpire`: a deterministic comparison of intelligence power. */
export function SpyCalc() {
  const [aSpies, setASpies] = useState(300);
  const [aWeapons, setAWeapons] = useState(8000);
  const [aIntel, setAIntel] = useState(8);
  const [aHero, setAHero] = useState(15);
  const [aGuild, setAGuild] = useState(0);

  const [dSpies, setDSpies] = useState(250);
  const [dWeapons, setDWeapons] = useState(6000);
  const [dIntel, setDIntel] = useState(6);

  const aRaw = aSpies * SPY_POWER + aWeapons;
  const aMult = intelligencePowerMultiplier(aIntel) + (aHero + aGuild) / 100;
  const aTotal = aRaw * aMult;

  const dRaw = dSpies * SPY_POWER + dWeapons;
  const dMult = intelligencePowerMultiplier(dIntel);
  const dTotal = dRaw * dMult;

  const success = aTotal > dTotal;

  return (
    <CalcShell title="מחשבון ריגול">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-purple-500/25 bg-purple-950/15 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-purple-300">
            <Icon name="spy" size={15} /> המרגל
          </p>
          <div className="grid gap-3">
            <Field label="מרגלים" icon="spy" value={aSpies} onChange={setASpies} max={50000} step={5}
              hint={`${int(aSpies * SPY_POWER)} כוח (${SPY_POWER} למרגל)`} />
            <Field label="כוח נשקי ריגול" icon="factory" value={aWeapons} onChange={setAWeapons} max={2_000_000} step={500} />
            <Field label="רמת שדרוג מודיעין" icon="upgrades" value={aIntel} onChange={setAIntel} max={15}
              hint={`מכפיל ×${intelligencePowerMultiplier(aIntel).toFixed(1)}`} />
            <Field label="בונוס גיבור — ריגול" icon="hero" value={aHero} onChange={setAHero} max={200} suffix="%" />
            <Field label="קסם ברית — ריגול" icon="guild" value={aGuild} onChange={setAGuild} max={30} suffix="%" />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-500/25 bg-zinc-900/30 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-zinc-300">
            <Icon name="shield" size={15} /> היעד
          </p>
          <div className="grid gap-3">
            <Field label="מרגלים" icon="spy" value={dSpies} onChange={setDSpies} max={50000} step={5} />
            <Field label="כוח נשקי ריגול" icon="factory" value={dWeapons} onChange={setDWeapons} max={2_000_000} step={500} />
            <Field label="רמת שדרוג מודיעין" icon="upgrades" value={dIntel} onChange={setDIntel} max={15}
              hint={`מכפיל ×${intelligencePowerMultiplier(dIntel).toFixed(1)}`} />
          </div>
          <p className="mt-3 rounded-lg bg-black/40 px-2 py-1.5 text-[10px] leading-relaxed text-zinc-500">
            ליעד אין בונוס גיבור או קסם בהגנה מפני ריגול — רק מרגלים, נשקי ריגול
            ושדרוג המודיעין שלו.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="panel-inset rounded-xl px-3 py-2">
          <Step label="מרגלים + נשקי ריגול" value={int(aRaw)} />
          <Step label={`מכפיל: 1 + ${aIntel}×0.1 + ${aHero + aGuild}%`} value={`×${aMult.toFixed(2)}`} tone="text-purple-300" />
          <Step label="כוח מודיעין תוקף" value={int(aTotal)} strong tone="text-purple-300" />
        </div>
        <div className="panel-inset rounded-xl px-3 py-2">
          <Step label="מרגלים + נשקי ריגול" value={int(dRaw)} />
          <Step label={`מכפיל: 1 + ${dIntel}×0.1`} value={`×${dMult.toFixed(2)}`} tone="text-zinc-300" />
          <Step label="כוח מודיעין יעד" value={int(dTotal)} strong tone="text-zinc-300" />
        </div>
      </div>

      <div
        className={`mt-3 rounded-xl border px-4 py-3 text-center text-sm font-black ${
          success
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            : "border-red-500/40 bg-red-500/10 text-red-300"
        }`}
      >
        {success ? "המשימה מצליחה — הדוח נפתח" : "המרגל נתפס — היעד מקבל התראה"}
        <span className="mx-2 text-zinc-500">|</span>
        <span className="nums" dir="ltr">
          {int(aTotal)} {success ? ">" : "≤"} {int(dTotal)}
        </span>
      </div>
    </CalcShell>
  );
}

/* ========================================================================
   4. Bank
   ======================================================================== */

/** Mirrors the interest loop in `applyPendingUpdates` — floored, compounding. */
export function BankCalc() {
  const [balance, setBalance] = useState(1_000_000);
  const [level, setLevel] = useState(10);
  const [days, setDays] = useState(7);

  const rate = bankInterestRate(level);
  const updates = days * 2;
  const { final, history } = useMemo(() => {
    let b = balance;
    const points: number[] = [b];
    for (let i = 0; i < updates; i++) {
      b += Math.floor(b * rate);
      points.push(b);
    }
    return { final: b, history: points };
  }, [balance, rate, updates]);

  const max = history[history.length - 1] || 1;

  return (
    <CalcShell title="מחשבון ריבית בנק">
      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-3">
        <Field label="זהב מופקד" icon="bank" value={balance} onChange={setBalance} max={1_000_000_000} step={10_000} />
        <Field label="רמת שדרוג ריבית" icon="upgrades" value={level} onChange={setLevel} max={15}
          hint={`${Math.round(rate * 100)}% בכל עדכון יומי`} />
        <Field label="ימים" icon="turns" value={days} onChange={setDays} min={1} max={60}
          hint={`${updates} עדכונים יומיים (2 ליום)`} />
      </div>

      {/* compounding curve */}
      <div className="mt-4 flex h-24 items-end gap-[2px] rounded-xl bg-black/40 p-2">
        {history.map((v, i) => (
          <span
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-gold-deep to-gold-bright"
            style={{ height: `${Math.max(3, (v / max) * 100)}%` }}
            title={`עדכון ${i}: ${int(v)}`}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Result label="יתרה בסוף התקופה" value={formatShort(final)} />
        <Result label="רווח מריבית" value={`+${formatShort(final - balance)}`} tone="text-emerald-300" />
        <Result
          label="גידול"
          value={`×${(final / Math.max(1, balance)).toFixed(2)}`}
          sub={`${Math.round(rate * 100)}% × ${updates} עדכונים, בריבית דריבית`}
          tone="text-bone-bright"
        />
      </div>
    </CalcShell>
  );
}

/* ========================================================================
   5. Hero XP
   ======================================================================== */

/** Mirrors `attackWinXp` + `applyHeroXp`, including the class and potion multipliers. */
export function HeroXpCalc() {
  const [level, setLevel] = useState(20);
  const [foeLevel, setFoeLevel] = useState(25);
  const [foeResets, setFoeResets] = useState(0);
  const [ownPower, setOwnPower] = useState(120_000);
  const [foePower, setFoePower] = useState(90_000);
  const [shadow, setShadow] = useState(false);
  const [potion, setPotion] = useState(false);

  const base = 40 + foeLevel * 10;
  const matchup = matchupXpFactor(ownPower, foePower);
  const prestige = resetXpMultiplier(foeResets);
  const raw = Math.round(base * matchup * prestige);
  const withClass = Math.round(raw * (shadow ? 1.1 : 1));
  const gain = withClass * (potion ? 2 : 1);

  const need = xpToNextLevel(level);
  const wins = gain > 0 ? Math.ceil(need / gain) : 0;

  return (
    <CalcShell title="מחשבון ניסיון גיבור">
      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
        <Field label="רמת הגיבור שלך" icon="hero" value={level} onChange={setLevel} min={1} max={99}
          hint={`דרושות ${int(need)} נק׳ ניסיון לרמה הבאה`} />
        <Field label="רמת גיבור היריב" icon="hero" value={foeLevel} onChange={setFoeLevel} min={1} max={100} />
        <Field label="איפוסי היריב (↻)" icon="crown" value={foeResets} onChange={setFoeResets} max={20}
          hint={`מכפיל ×${prestige.toFixed(2)}`} />
        <Field label="כוח התקפה שלך" icon="attack" value={ownPower} onChange={setOwnPower} max={50_000_000} step={5000} />
        <Field label="כוח הגנת היריב" icon="shield" value={foePower} onChange={setFoePower} max={50_000_000} step={5000}
          hint={`יחס קרב ×${matchup.toFixed(2)}`} />
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-purple-300">
          <input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} className="h-4 w-4 accent-purple-500" />
          מקצוע הצל (+10% ניסיון)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gold-bright">
          <input type="checkbox" checked={potion} onChange={(e) => setPotion(e.target.checked)} className="h-4 w-4 accent-amber-500" />
          <Icon name="potion" size={14} /> שיקוי הניסיון (×2)
        </label>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="panel-inset rounded-xl px-3 py-2">
          <Step label={`בסיס — 40 + ${foeLevel}×10`} value={int(base)} />
          <Step label={`יחס קרב ×${matchup.toFixed(2)}`} value={`= ${int(base * matchup)}`} tone="text-sky-300" />
          <Step label={`יוקרת יריב ×${prestige.toFixed(2)}`} value={`= ${int(raw)}`} tone="text-purple-300" />
          {shadow && <Step label="מקצוע הצל ×1.1" value={`= ${int(withClass)}`} tone="text-purple-300" />}
          {potion && <Step label="שיקוי הניסיון ×2" value={`= ${int(gain)}`} tone="text-gold" />}
          <Step label="ניסיון לניצחון אחד" value={int(gain)} strong tone="text-gold-bright" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-56 lg:grid-cols-1">
          <Result label="ניסיון לניצחון" value={int(gain)} />
          <Result label="ניצחונות לרמה הבאה" value={int(wins)} tone="text-emerald-300" sub={`${int(need)} נק׳ ניסיון`} />
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        יחס הקרב נגזר מ־<span className="nums" dir="ltr">0.3 + (כוח היריב ÷ כוחך) × 1.4</span> ונחסם
        בטווח <span className="nums" dir="ltr">0.3–2.0</span> — לרמוס יריב חלש משתלם פחות מלנצח יריב
        שקול, וניצחון על חזק ממך משלם הכי הרבה.
      </p>
    </CalcShell>
  );
}

/* ========================================================================
   6. Item upgrade ladder
   ======================================================================== */

const PERCENT_SLOTS: Record<HeroPercentStat, string> = {
  attack: "התקפה",
  defense: "הגנה",
  spy: "ריגול",
};

/** Mirrors `itemUpgradeCost` — the geometric ladder from 3M to 700B. */
export function ItemUpgradeCalc() {
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(19);

  const from = UPGRADE_LEVELS[Math.min(fromIdx, UPGRADE_LEVELS.length - 1)];
  const to = UPGRADE_LEVELS[Math.max(toIdx, fromIdx)];

  const { total, steps } = useMemo(() => {
    let sum = 0;
    let count = 0;
    for (const lvl of UPGRADE_LEVELS) {
      if (lvl >= from && lvl < to) {
        sum += itemUpgradeCost(lvl) ?? 0;
        count += 1;
      }
    }
    return { total: sum, steps: count };
  }, [from, to]);

  const nextCost = itemUpgradeCost(from);
  const rarity = tierForLevel(to);
  const swordBonus = itemPrimaryBonus("SWORD", to).value;
  const relicBonus = itemPrimaryBonus("RELIC", to).value;
  const bootsBonus = itemPrimaryBonus("BOOTS", to).value;

  return (
    <CalcShell title="מחשבון שדרוג חפצים">
      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
        <Field
          label="מרמת חפץ"
          icon="spark"
          value={fromIdx}
          onChange={(v) => {
            setFromIdx(v);
            if (v > toIdx) setToIdx(v);
          }}
          max={UPGRADE_LEVELS.length - 1}
          hint={`רמה ${from} · ${RARITY_META[tierForLevel(from)].label} · דרגה ${upgradeStep(from)}/40`}
        />
        <Field
          label="עד רמת חפץ"
          icon="spark"
          value={toIdx}
          onChange={(v) => setToIdx(Math.max(v, fromIdx))}
          min={0}
          max={UPGRADE_LEVELS.length - 1}
          hint={`רמה ${to} · ${RARITY_META[rarity].label} · דרגה ${upgradeStep(to)}/40`}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Result label="מחיר השדרוג הבא" value={nextCost ? formatShort(nextCost) : "—"} sub="זהב" />
        <Result label={`עלות כוללת (${steps} שדרוגים)`} value={formatShort(total)} sub="זהב" tone="text-bone-bright" />
        <Result
          label={`הבונוס ברמה ${to}`}
          value={`+${swordBonus}%`}
          sub={`חרב · ${PERCENT_SLOTS.attack}`}
          tone="text-emerald-300"
        />
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div className="panel-inset rounded-lg px-3 py-2">
          <p className="text-[10px] text-zinc-500">{SLOT_META.RELIC.label} (משאבים — ראשי)</p>
          <p className="font-black text-gold-bright nums" dir="ltr">+{relicBonus}</p>
          <p className="text-[10px] text-zinc-500">משאבים בכל עדכון רגיל</p>
        </div>
        <div className="panel-inset rounded-lg px-3 py-2">
          <p className="text-[10px] text-zinc-500">{SLOT_META.BOOTS.label} (אזרחים — ראשי)</p>
          <p className="font-black text-gold-bright nums" dir="ltr">+{bootsBonus}</p>
          <p className="text-[10px] text-zinc-500">אזרחים בכל עדכון יומי</p>
        </div>
        <div className="panel-inset rounded-lg px-3 py-2">
          <p className="text-[10px] text-zinc-500">{SLOT_META.WINGS.label} (תורות — ראשי)</p>
          <p className="font-black text-gold-bright nums" dir="ltr">
            +{itemPrimaryBonus("WINGS", to).value}
          </p>
          <p className="text-[10px] text-zinc-500">תורות בכל עדכון יומי</p>
        </div>
      </div>
    </CalcShell>
  );
}

/* ========================================================================
   7. City-boss ladder
   ======================================================================== */

/** The ten bosses, with rewards recomputed live for a chosen season day. */
export function BossLadder({
  powerMultiplier = 1,
  rewardMultiplier = 1,
}: {
  powerMultiplier?: number;
  rewardMultiplier?: number;
}) {
  const [day, setDay] = useState(1);

  return (
    <div className="space-y-3">
      <div className="panel-gold rounded-xl p-4">
        <Field
          label="יום בעונה"
          icon="turns"
          value={day}
          onChange={setDay}
          min={1}
          max={90}
          hint="השלל גדל ב־20% מהבסיס בכל יום שעובר בעונה"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
        {CITY_BOSSES.map((boss) => {
          const reward = bossReward(boss.tier, day, rewardMultiplier);
          return (
            <article
              key={boss.key}
              className="relative overflow-hidden rounded-xl border p-3"
              style={{
                borderColor: `rgb(${boss.accent} / 0.35)`,
                background: `linear-gradient(270deg, rgb(${boss.accent} / 0.10), rgba(10,9,12,0.85) 60%)`,
              }}
            >
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/boss/${boss.key}.jpg`}
                  alt={boss.name}
                  loading="lazy"
                  className="h-24 w-20 shrink-0 rounded-lg object-cover"
                  style={{ boxShadow: `0 0 24px -8px rgb(${boss.accent} / 0.9)` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5">
                    <span className="rounded bg-black/50 px-1.5 text-[10px] font-black text-bone nums">
                      עיר {boss.tier}
                    </span>
                    <span className="truncate font-black" style={{ color: `rgb(${boss.accent})` }}>
                      {boss.name}
                    </span>
                  </p>
                  <p className="text-[11px] text-zinc-400">{boss.title}</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                    <span className="flex items-center gap-1 text-red-300">
                      <Icon name="attack" size={12} /> כוח
                      <b className="nums" dir="ltr">{formatShort(bossPower(boss.tier, powerMultiplier))}</b>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-300">
                      <Icon name="turns" size={12} /> תורות
                      <b className="nums" dir="ltr">{int(bossTurnCost(boss.tier))}</b>
                    </span>
                    <span className="flex items-center gap-1 text-gold-bright">
                      <Icon name="gold" size={12} /> שלל
                      <b className="nums" dir="ltr">{formatShort(reward.gold)}</b>
                    </span>
                    <span className="flex items-center gap-1 text-purple-300">
                      <Icon name="spark" size={12} /> ניסיון
                      <b className="nums" dir="ltr">{int(bossHeroXp(boss.tier))}</b>
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{boss.lore}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
