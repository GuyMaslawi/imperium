import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { formatNumber, formatDate } from "@/lib/game/format";
import { ItemTile } from "@/components/game/ItemTile";
import { AttackAgainButton } from "@/components/game/AttackAgainButton";
import { Tip } from "@/components/ui/Tip";
import { itemDetails, uiRarityForLevel } from "@/components/game/heroItemView";
import { SLOT_META, itemDisplayName } from "@/lib/game/hero";
import { PotionBottle } from "@/components/game/PotionBottle";
import { POTION_META, potionDurationLabel } from "@/lib/game/potions";
import { Icon } from "@/components/ui/Icon";
import {
  battlePowerLedger,
  type BattlePowerSources,
  type LedgerRow,
} from "@/lib/game/battleLedger";
import { ShieldGlyph } from "@/components/game/ShieldBadges";
import { shieldMeta } from "@/lib/game/diamondShop";

export const metadata = { title: "תוצאת קרב | KRALDOR" };

const RES = [
  { key: "stolenGold", icon: <Icon name="gold" size={14} className="inline-block align-middle text-gold-bright" />, label: "זהב" },
  { key: "stolenWood", icon: <Icon name="wood" size={14} className="inline-block align-middle text-amber-600" />, label: "עץ" },
  { key: "stolenIron", icon: <Icon name="iron" size={14} className="inline-block align-middle text-slate-300" />, label: "ברזל" },
  { key: "stolenStone", icon: <Icon name="stone" size={14} className="inline-block align-middle text-stone-400" />, label: "אבן" },
] as const;

export default async function BattleResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireEmpire();

  const report = await prisma.battleReport.findUnique({
    where: { id },
    include: { attackerEmpire: true, defenderEmpire: true },
  });
  if (!report) notFound();

  const iAmAttacker = report.attackerEmpireId === me.id;
  const iAmDefender = report.defenderEmpireId === me.id;
  if (!iAmAttacker && !iAmDefender) notFound();

  const iWon = report.winnerEmpireId === me.id;
  const myName = iAmAttacker ? report.attackerEmpire.name : report.defenderEmpire.name;
  const foe = iAmAttacker ? report.defenderEmpire : report.attackerEmpire;

  // My/foe totals + share of the power bar.
  const myPower = iAmAttacker ? report.attackerPower : report.defenderPower;
  const foePower = iAmAttacker ? report.defenderPower : report.attackerPower;
  const total = myPower + foePower;
  const myShare = total > 0 ? (myPower / total) * 100 : 50;

  const mySoldiersLost = iAmAttacker ? report.attackerSoldiersLost : report.defenderSoldiersLost;
  const foeSoldiersLost = iAmAttacker ? report.defenderSoldiersLost : report.attackerSoldiersLost;
  // Player battles no longer kill soldiers, but reports written before that
  // change still carry casualties — show the panels only when there were any.
  const hadCasualties = mySoldiersLost > 0 || foeSoldiersLost > 0;
  const aftermathPanels =
    (hadCasualties ? 2 : 0) + (report.enslavedSoldiers > 0 ? 1 : 0) + 1;

  // Plunder: attacker gains it on a win, defender loses it.
  const plunderTotal = report.stolenGold + report.stolenWood + report.stolenIron + report.stolenStone;

  // A won raid that came home empty: the defender's diamond shields held. Shown
  // to both sides — the attacker learns why there was no haul, the defender
  // sees what the purchase actually saved.
  const shieldsHeld = [
    ...(report.defenderResourceShielded ? (["resources"] as const) : []),
    ...(report.defenderSoldierShielded ? (["soldiers"] as const) : []),
  ];

  /**
   * Turn one ledger row into the line the reader sees. The arithmetic lives in
   * lib/game/battleLedger.ts; this is only the wording.
   */
  const describe = (row: LedgerRow) => {
    const pct = Math.round(row.pct ?? 0);
    switch (row.kind) {
      case "soldiers":
        return {
          label: "כוח חיילים",
          value: formatNumber(row.value),
          tip: "כוח הלחימה של החיילים בלבד (10 כוח לחייל).",
        };
      case "weapons":
        return {
          label: "כוח נשקים",
          value: formatNumber(row.value),
          tip: "תוספת הכוח מהנשקים במחסן — נשקי התקפה לתוקף, נשקי הגנה למגן. נשק מהקטגוריה הלא־נכונה לא משתתף בקרב הזה.",
        };
      case "subtotal":
        return {
          label: "סך כוח בסיס",
          value: formatNumber(row.value),
          tip: "חיילים + נשקים. כל הבונוסים שמתחת מוכפלים על הסכום הזה, בזה אחר זה.",
          strong: true,
        };
      case "defense":
        return {
          label: `יתרון המגן +${pct}%`,
          value: `+${formatNumber(row.value)}`,
          tip: `הצד המתגונן נלחם בשטח שלו ומקבל תוספת קבועה של ${pct}% על כוח הבסיס — לפני הגיבור ולפני קסמי הברית. התוקף לא מקבל אותה.`,
        };
      case "hero":
        return {
          label: `בונוס גיבור +${pct}%`,
          value: `+${formatNumber(row.value)}`,
          tip: "הגיבור מגדיל את כל כוח הצד שלו: נקודות התקפה/הגנה שהוקצו + אחוזי החפצים הלבושים (כל נקודה ואחוז = 1%). גיבור מת תורם 0%.",
        };
      case "guildSpell":
        return {
          label: `קסם ברית +${pct}%`,
          value: `+${formatNumber(row.value)}`,
          tip: "קסם ברית פעיל שהוטל מראש — קסם התקפה לתוקף, קסם הגנה למגן. פועל 24 שעות מרגע ההטלה.",
        };
      case "guildAid":
        return {
          label: "עזרת ברית",
          value: `+${formatNumber(row.value)}`,
          tip: `עזרה פסיבית: הברית מחזקת כל חבר בקרב ב־${pct}% מהכוח הצבאי המשולב של כל חבריה. זו תוספת שטוחה שנוספת בסוף, אחרי כל הכפולות — ולכן היא גדלה עם הברית, לא עם הצבא שלך.`,
        };
      case "residual":
        return {
          label: "לא פורט בדוח זה",
          value: `${row.value > 0 ? "+" : ""}${formatNumber(row.value)}`,
          tip: "הקרב הזה נרשם לפני שהדוח התחיל לתעד את כל מרכיבי הכוח (יתרון המגן ועזרת הברית). ההפרש מוצג כדי שהסכום יישאר נכון.",
        };
    }
  };

  const ledger = (side: BattlePowerSources) =>
    battlePowerLedger(side).map(describe);

  const attackerLedgerInput: BattlePowerSources = {
    soldiers: report.attackerSoldiersPower,
    weapons: report.attackerWeaponsPower,
    heroBonusPct: report.attackerHeroBonusPct,
    guildBonusPct: report.attackerGuildBonusPct,
    guildAidPct: report.attackerGuildAidPct,
    guildAidPower: report.attackerGuildAidPower,
    // The attacker never gets it — the null is the statement, not a gap.
    defenseBonusPct: null,
    total: report.attackerPower,
  };
  const defenderLedgerInput: BattlePowerSources = {
    soldiers: report.defenderSoldiersPower,
    weapons: report.defenderWeaponsPower,
    heroBonusPct: report.defenderHeroBonusPct,
    guildBonusPct: report.defenderGuildBonusPct,
    guildAidPct: report.defenderGuildAidPct,
    guildAidPower: report.defenderGuildAidPower,
    defenseBonusPct: report.defenseBonusPct,
    total: report.defenderPower,
  };

  const mySide = ledger(iAmAttacker ? attackerLedgerInput : defenderLedgerInput);
  const foeSide = ledger(iAmAttacker ? defenderLedgerInput : attackerLedgerInput);

  // Hero rewards from this battle, viewer-perspective.
  const myHeroXp = iAmAttacker ? report.attackerHeroXp : report.defenderHeroXp;
  const capturedItem =
    iAmAttacker && report.droppedItemSlot && report.droppedItemLevel && report.droppedItemRarity
      ? {
          slot: report.droppedItemSlot,
          level: report.droppedItemLevel,
          rarity: report.droppedItemRarity,
        }
      : null;
  // A winning attack can also award a wheel-of-fortune spin (wheel-luck upgrade).
  const wonWheelSpin = iAmAttacker && report.wonWheelSpin;
  // …and a potion, which goes straight to the belt under the bag.
  const capturedPotion = iAmAttacker ? report.droppedPotionKind : null;

  return (
    <div className="space-y-6">
      {/* -------- actions (kept on top, ready for the next strike) -------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <AttackAgainButton
            targetEmpireId={foe.id}
            currentTurns={me.turns}
            label={iAmAttacker ? "⚔️ תקוף שוב" : "⚔️ נקום"}
          />
          <Link href={`/game/empires/${foe.id}`} className="btn btn-ghost px-5 py-2 text-sm">
            <Icon name="crown" size={16} className="inline-block align-middle" /> לפרופיל היריב
          </Link>
          <Link href="/game/base" className="btn btn-ghost px-5 py-2 text-sm"><Icon name="base" size={16} className="inline-block align-middle" /> חזרה לבסיס</Link>
          <Link href="/game/reports" className="btn btn-ghost px-5 py-2 text-sm"><Icon name="reports" size={16} className="inline-block align-middle" /> היסטוריה</Link>
        </div>
        <p className="text-xs text-zinc-500 nums" dir="ltr">{formatDate(report.createdAt)}</p>
      </div>

      {/* -------- VS banner -------- */}
      <div className="relative overflow-hidden rounded-xl border border-border-gold/40 bg-gradient-to-b from-[#1a1210] to-[#0c0908] p-4 sm:p-6">
        {/* The banner clips its overflow, so the two name columns have to be
            allowed to shrink (min-w-0) and wrap: a phone leaves them ~90px
            each, and an empire name is routinely wider than that. */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* my side */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-emerald-500/50 bg-gradient-to-b from-emerald-900/30 to-black text-4xl shadow-[0_0_30px_-8px_rgba(52,211,153,0.5)]">
              <Icon name="hero" size={36} className="text-emerald-300" />
            </div>
            <p className="w-full break-words font-black text-emerald-300">{myName}</p>
            <p className="text-[11px] text-zinc-500">{iAmAttacker ? "תוקף" : "מגן"}</p>
          </div>

          {/* verdict */}
          <div className="flex shrink-0 flex-col items-center">
            <p
              className={`text-3xl font-black sm:text-4xl ${
                iWon ? "text-emerald-400" : "text-red-500"
              }`}
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.8)" }}
            >
              {iWon ? "ניצחון" : "תבוסה"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">מול</p>
          </div>

          {/* foe side */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-red-500/50 bg-gradient-to-b from-red-950/40 to-black text-4xl shadow-[0_0_30px_-8px_rgba(239,68,68,0.5)]">
              <Icon name="crown" size={36} className="text-red-300" />
            </div>
            <p className="w-full break-words font-black text-red-300">{foe.name}</p>
            <p className="text-[11px] text-zinc-500">{iAmAttacker ? "מגן" : "תוקף"}</p>
          </div>
        </div>

        {/* power bar */}
        <div className="mt-6">
          <div className="flex h-3 overflow-hidden rounded-full border border-black/60">
            <span style={{ width: `${myShare}%` }} className="bg-gradient-to-l from-emerald-400 to-emerald-600" />
            <span style={{ width: `${100 - myShare}%` }} className="bg-gradient-to-r from-red-500 to-red-700" />
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="nums font-bold text-emerald-300" dir="ltr">{formatNumber(myPower)}</span>
            <span className="text-zinc-500">כוח קרב</span>
            <span className="nums font-bold text-red-300" dir="ltr">{formatNumber(foePower)}</span>
          </div>
        </div>
      </div>

      {/* -------- aftermath -------- */}
      <div
        className={`grid gap-4 ${
          aftermathPanels >= 4
            ? "grid-cols-2 sm:grid-cols-4"
            : aftermathPanels === 3
              ? "sm:grid-cols-3"
              : aftermathPanels === 2
                ? "grid-cols-2"
                : ""
        }`}
      >
        {hadCasualties && (
          <>
            <div className="panel-inset rounded-xl p-4 text-center">
              <p className="text-xs text-zinc-400">אבדות שלך</p>
              <p className="nums mt-1 text-xl font-black text-red-400" dir="ltr">−{formatNumber(mySoldiersLost)} <Icon name="army" size={18} className="inline-block align-middle" /></p>
            </div>
            <div className="panel-inset rounded-xl p-4 text-center">
              <p className="text-xs text-zinc-400">אבדות היריב</p>
              <p className="nums mt-1 text-xl font-black text-emerald-400" dir="ltr">−{formatNumber(foeSoldiersLost)} <Icon name="army" size={18} className="inline-block align-middle" /></p>
            </div>
          </>
        )}
        {report.enslavedSoldiers > 0 && (
          <div className="panel-inset rounded-xl p-4 text-center">
            <Tip tip="ניצחון על מגן עם 20+ חיילים משעבד חלק מהם — ככל שצבאו גדול יותר, כך נשבים יותר. המשועבדים מצטרפים לעבדי המכרות הפנויים של התוקף (לא לאזרחים).">
              <p className="cursor-help text-xs text-zinc-400">⛓️ שועבדו למכרות</p>
            </Tip>
            <p
              className={`nums mt-1 text-xl font-black ${iAmAttacker ? "text-emerald-400" : "text-red-400"}`}
              dir="ltr"
            >
              {iAmAttacker ? "+" : "−"}{formatNumber(report.enslavedSoldiers)} <Icon name="mine" size={18} className="inline-block align-middle" />
            </p>
          </div>
        )}
        <div className="panel-inset rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-400">תורות שנוצלו</p>
          <p className="nums mt-1 text-xl font-black text-gold" dir="ltr">{formatNumber(report.turnsSpent)}</p>
        </div>
      </div>
      {!hadCasualties && (
        <p className="text-center text-xs text-zinc-500">
          קרבות מול שחקנים אינם גורמים לאבדות בחיילים — רק קרב מול בוס עיר קוטל חיילים.
        </p>
      )}

      {/* -------- hero rewards -------- */}
      {(myHeroXp > 0 || capturedItem || capturedPotion || wonWheelSpin) && (
        <div className="panel rounded-xl p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gold-bright"><Icon name="spark" size={18} className="text-crimson-bright" /> הגיבור שלך</h3>
          <div className="flex flex-wrap items-center gap-4">
            <Tip tip="ניסיון לגיבור מהקרב הזה — ניצחון בתקיפה מעניק הכי הרבה. הכמות תלויה ברמת היריב ובעד כמה הקרב היה צמוד: מחיקת יריב חלש מזכה במעט, ניצחון מול יריב שווה־כוח או חזק ממך מזכה בהרבה. כשמצטבר מספיק — הגיבור עולה רמה ומקבל נקודת גיבור ו-25 אזרחים לאימפריה.">
              <div className="panel-inset cursor-help rounded-lg p-3 text-center">
                <p className="text-[11px] text-zinc-400">ניסיון שהתקבל</p>
                <p className="nums mt-0.5 text-xl font-black text-purple-300" dir="ltr">
                  +{formatNumber(myHeroXp)}
                </p>
              </div>
            </Tip>
            {wonWheelSpin && (
              <Link
                href="/game/base"
                className="panel-inset rounded-lg p-3 text-center transition hover:border-gold/50"
              >
                <p className="text-[11px] text-zinc-400">🎡 גלגל המזל</p>
                <p className="mt-0.5 text-sm font-black text-gold-bright">
                  זכית בסיבוב גלגל מזל!
                </p>
              </Link>
            )}
            {capturedPotion && (
              <div className="flex items-center gap-3">
                <div className="w-16">
                  <PotionBottle kind={capturedPotion} className="w-full" />
                </div>
                <div>
                  <p
                    className={`text-sm font-black ${POTION_META[capturedPotion].tone}`}
                  >
                    <Icon name="potion" size={16} className="inline-block align-middle" />{" "}
                    נלכד שיקוי: {POTION_META[capturedPotion].label}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {POTION_META[capturedPotion].tagline} ·{" "}
                    {potionDurationLabel(capturedPotion)} · נוסף לתרמיל
                  </p>
                  <Link href="/game/hero" className="btn btn-ghost mt-2 px-3 py-1 text-xs">
                    <Icon name="potion" size={14} className="inline-block align-middle" /> לשיקויים
                  </Link>
                </div>
              </div>
            )}
            {capturedItem && (
              <div className="flex items-center gap-3">
                <div className="w-20">
                  <ItemTile
                    slug={SLOT_META[capturedItem.slot].slug}
                    icon={SLOT_META[capturedItem.slot].icon}
                    level={capturedItem.level}
                    rarity={uiRarityForLevel(capturedItem.level)}
                    details={itemDetails(capturedItem, me.hero?.level ?? 1)}
                  />
                </div>
                <div>
                  <p className="text-sm font-black text-gold-bright">
                    <Icon name="gift" size={16} className="inline-block align-middle" /> נלכד חפץ: {itemDisplayName(capturedItem.slot, capturedItem.level)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    רמת פריט{" "}
                    <span className="nums" dir="ltr">
                      {capturedItem.level}
                    </span>{" "}
                    · נוסף לתיק הגיבור
                  </p>
                  <Link href="/game/hero" className="btn btn-ghost mt-2 px-3 py-1 text-xs">
                    <Icon name="attack" size={14} className="inline-block align-middle" /> לציוד הגיבור
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------- power breakdowns (details, below the critical stats) -------- */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gold-bright">
          <Icon name="attack" size={18} className="text-crimson-bright" />
          מאיזה כוח הורכב הקרב
        </h3>
        {/* Both columns, itemised — the attacker's attack and the defender's
            defence, each term with the power it actually added. Reading them
            side by side is the point: the verdict was `attackerPower >
            defenderPower` and nothing else, so the row where the two columns
            diverge is the row that decided the battle. */}
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: myName,
              role: iAmAttacker ? "כוח ההתקפה שלך" : "כוח ההגנה שלך",
              tone: "emerald",
              rows: mySide,
              total: myPower,
            },
            {
              title: foe.name,
              role: iAmAttacker ? "כוח ההגנה של היריב" : "כוח ההתקפה של היריב",
              tone: "red",
              rows: foeSide,
              total: foePower,
            },
          ].map((side) => (
            <div key={side.title} className="panel rounded-xl p-4">
              <div className="mb-3 border-b border-border-subtle pb-2">
                <h4
                  className={`text-sm font-bold ${
                    side.tone === "emerald" ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {side.title}
                </h4>
                <p className="mt-0.5 text-[11px] text-zinc-500">{side.role}</p>
              </div>
              <dl className="space-y-2 text-sm">
                {side.rows.map((r) => (
                  <div
                    key={r.label}
                    className={`flex items-center justify-between gap-2 ${
                      r.strong ? "border-t border-border-subtle/60 pt-2" : ""
                    }`}
                  >
                    <Tip tip={r.tip}>
                      <dt
                        className={`cursor-help ${
                          r.strong ? "font-semibold text-zinc-300" : "text-zinc-400"
                        }`}
                      >
                        {r.label}
                      </dt>
                    </Tip>
                    <dd
                      className={`nums shrink-0 font-semibold ${
                        r.strong ? "text-zinc-100" : "text-zinc-200"
                      }`}
                      dir="ltr"
                    >
                      {r.value}
                    </dd>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border-subtle pt-2">
                  <dt className="font-bold text-zinc-300">סה״כ כוח בקרב</dt>
                  <dd className="nums font-black text-gold-bright" dir="ltr">
                    {formatNumber(side.total)}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          הקרב הוכרע בהשוואה ישירה בין שני הסכומים — התוקף מנצח רק אם כוחו גדול
          ממש מכוח המגן. שוויון נחשב הדיפה.
        </p>
      </div>

      {shieldsHeld.length > 0 && (
        <div className="panel-inset rounded-xl border-emerald-500/40 p-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center text-sm">
            {shieldsHeld.map((key) => (
              <ShieldGlyph key={key} shieldKey={key} size={14} />
            ))}
            <span className="font-bold text-emerald-300">
              {iAmAttacker ? "היעד היה מוגן" : "המגן שלך עמד"}
            </span>
            <span className="text-zinc-400">
              {shieldsHeld.map((key) => shieldMeta(key).label).join(" ו")} חסמו{" "}
              {shieldsHeld
                .map((key) => (key === "resources" ? "את הביזה" : "את השעבוד"))
                .join(" ו")}
              {iAmAttacker ? " — הקרב נוצח, אך לא נלקח דבר." : " — לא נלקח ממך דבר."}
            </span>
          </div>
        </div>
      )}

      {plunderTotal > 0 && (
        <div className="panel-gold rounded-xl p-4">
          <h3 className="mb-3 text-sm font-bold text-gold-bright">
            {iAmAttacker ? (
              <><Icon name="gold" size={16} className="inline-block align-middle text-gold-bright" /> שלל הביזה</>
            ) : (
              "💸 נבזז ממך"
            )}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RES.map((r) => (
              <div key={r.key} className="panel-inset rounded-lg p-3 text-center">
                <p className="text-[11px] text-zinc-400">{r.icon} {r.label}</p>
                <p className={`nums mt-0.5 font-black ${iAmAttacker ? "text-emerald-400" : "text-red-400"}`} dir="ltr">
                  {iAmAttacker ? "+" : "−"}{formatNumber(report[r.key])}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
