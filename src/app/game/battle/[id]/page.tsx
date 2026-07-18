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

export const metadata = { title: "תוצאת קרב | WARZONE" };

const RES = [
  { key: "stolenGold", icon: "🪙", label: "זהב" },
  { key: "stolenWood", icon: "🪵", label: "עץ" },
  { key: "stolenIron", icon: "⚙️", label: "ברזל" },
  { key: "stolenStone", icon: "🪨", label: "אבן" },
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

  // Plunder: attacker gains it on a win, defender loses it.
  const plunderTotal = report.stolenGold + report.stolenWood + report.stolenIron + report.stolenStone;

  const breakdown = (
    soldiers: number | null,
    weapons: number | null,
    heroBonusPct: number | null,
    guildBonusPct: number | null
  ) => [
    {
      label: "כוח חיילים",
      value: formatNumber(soldiers ?? 0),
      tip: "כוח הלחימה של החיילים בלבד (10 כוח לחייל)",
    },
    {
      label: "כוח נשקים",
      value: formatNumber(weapons ?? 0),
      tip: "תוספת הכוח מהנשקים שנקנו במפעל (התקפה לתוקף, הגנה למגן)",
    },
    ...(heroBonusPct != null
      ? [
          {
            label: "בונוס גיבור",
            value: `+${heroBonusPct}%`,
            tip: "הגיבור מגדיל את כל כוח הצד שלו באחוזים: נקודות שהוקצו + חפצים לבושים (כל נקודה/אחוז חפץ = +1%)",
          },
        ]
      : []),
    ...(guildBonusPct != null && guildBonusPct > 0
      ? [
          {
            label: "קסם ברית",
            value: `+${guildBonusPct}%`,
            tip: "קסם ברית פעיל (התקפה לתוקף, הגנה למגן) מגדיל את כל כוח הצד שלו באחוזים",
          },
        ]
      : []),
  ];
  const mySide = iAmAttacker
    ? breakdown(report.attackerSoldiersPower, report.attackerWeaponsPower, report.attackerHeroBonusPct, report.attackerGuildBonusPct)
    : breakdown(report.defenderSoldiersPower, report.defenderWeaponsPower, report.defenderHeroBonusPct, report.defenderGuildBonusPct);
  const foeSide = iAmAttacker
    ? breakdown(report.defenderSoldiersPower, report.defenderWeaponsPower, report.defenderHeroBonusPct, report.defenderGuildBonusPct)
    : breakdown(report.attackerSoldiersPower, report.attackerWeaponsPower, report.attackerHeroBonusPct, report.attackerGuildBonusPct);

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
            👑 לפרופיל היריב
          </Link>
          <Link href="/game/base" className="btn btn-ghost px-5 py-2 text-sm">🏰 חזרה לבסיס</Link>
          <Link href="/game/reports" className="btn btn-ghost px-5 py-2 text-sm">📜 היסטוריה</Link>
        </div>
        <p className="text-xs text-zinc-500 nums" dir="ltr">{formatDate(report.createdAt)}</p>
      </div>

      {/* -------- VS banner -------- */}
      <div className="relative overflow-hidden rounded-xl border border-border-gold/40 bg-gradient-to-b from-[#1a1210] to-[#0c0908] p-6">
        <div className="flex items-center justify-between gap-4">
          {/* my side */}
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-emerald-500/50 bg-gradient-to-b from-emerald-900/30 to-black text-4xl shadow-[0_0_30px_-8px_rgba(52,211,153,0.5)]">
              🏹
            </div>
            <p className="font-black text-emerald-300">{myName}</p>
            <p className="text-[11px] text-zinc-500">{iAmAttacker ? "תוקף" : "מגן"}</p>
          </div>

          {/* verdict */}
          <div className="flex flex-col items-center">
            <p
              className={`text-4xl font-black tracking-widest ${
                iWon ? "text-emerald-400" : "text-red-500"
              }`}
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.8)" }}
            >
              {iWon ? "WIN" : "LOSE"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">VS</p>
          </div>

          {/* foe side */}
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-red-500/50 bg-gradient-to-b from-red-950/40 to-black text-4xl shadow-[0_0_30px_-8px_rgba(239,68,68,0.5)]">
              👑
            </div>
            <p className="font-black text-red-300">{foe.name}</p>
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

      {/* -------- power breakdowns -------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: myName, tone: "emerald", rows: mySide, total: myPower },
          { title: foe.name, tone: "red", rows: foeSide, total: foePower },
        ].map((side) => (
          <div key={side.title} className="panel rounded-xl p-4">
            <h3
              className={`mb-3 border-b border-border-subtle pb-2 text-sm font-bold ${
                side.tone === "emerald" ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {side.title}
            </h3>
            <dl className="space-y-2 text-sm">
              {side.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <Tip tip={r.tip}>
                    <dt className="cursor-help text-zinc-400">{r.label}</dt>
                  </Tip>
                  <dd className="nums font-semibold text-zinc-200" dir="ltr">{r.value}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border-subtle pt-2">
                <dt className="text-zinc-300">סה״כ כוח</dt>
                <dd className="nums font-black text-gold-bright" dir="ltr">{formatNumber(side.total)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {/* -------- aftermath -------- */}
      <div className={`grid gap-4 ${report.enslavedSoldiers > 0 ? "grid-cols-2 sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <div className="panel-inset rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-400">אבדות שלך</p>
          <p className="nums mt-1 text-xl font-black text-red-400" dir="ltr">−{formatNumber(mySoldiersLost)} 🪖</p>
        </div>
        <div className="panel-inset rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-400">אבדות היריב</p>
          <p className="nums mt-1 text-xl font-black text-emerald-400" dir="ltr">−{formatNumber(foeSoldiersLost)} 🪖</p>
        </div>
        {report.enslavedSoldiers > 0 && (
          <div className="panel-inset rounded-xl p-4 text-center">
            <Tip tip="ניצחון על מגן עם 20+ חיילים משעבד חלק מהם — ככל שצבאו גדול יותר, כך נשבים יותר. המשועבדים מצטרפים לעבדי המכרות הפנויים של התוקף (לא לאזרחים).">
              <p className="cursor-help text-xs text-zinc-400">⛓️ שועבדו למכרות</p>
            </Tip>
            <p
              className={`nums mt-1 text-xl font-black ${iAmAttacker ? "text-emerald-400" : "text-red-400"}`}
              dir="ltr"
            >
              {iAmAttacker ? "+" : "−"}{formatNumber(report.enslavedSoldiers)} ⛏️
            </p>
          </div>
        )}
        <div className="panel-inset rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-400">תורות שנוצלו</p>
          <p className="nums mt-1 text-xl font-black text-gold" dir="ltr">{formatNumber(report.turnsSpent)}</p>
        </div>
      </div>

      {/* -------- hero rewards -------- */}
      {(myHeroXp > 0 || capturedItem) && (
        <div className="panel rounded-xl p-4">
          <h3 className="mb-3 text-sm font-bold text-gold-bright">✨ הגיבור שלך</h3>
          <div className="flex flex-wrap items-center gap-4">
            <Tip tip="ניסיון לגיבור מהקרב הזה — ניצחון בתקיפה מעניק הכי הרבה (תלוי ברמת גיבור היריב). כשמצטבר מספיק — הגיבור עולה רמה ומקבל נקודה.">
              <div className="panel-inset cursor-help rounded-lg p-3 text-center">
                <p className="text-[11px] text-zinc-400">ניסיון שהתקבל</p>
                <p className="nums mt-0.5 text-xl font-black text-purple-300" dir="ltr">
                  +{formatNumber(myHeroXp)} XP
                </p>
              </div>
            </Tip>
            {capturedItem && (
              <div className="flex items-center gap-3">
                <div className="w-20">
                  <ItemTile
                    slug={SLOT_META[capturedItem.slot].slug}
                    icon={SLOT_META[capturedItem.slot].icon}
                    level={capturedItem.level}
                    rarity={uiRarityForLevel(capturedItem.level)}
                    details={itemDetails(capturedItem, me.hero?.level ?? 1)}
                    tooltipBelow
                  />
                </div>
                <div>
                  <p className="text-sm font-black text-gold-bright">
                    🎁 נלכד חפץ: {itemDisplayName(capturedItem.slot, capturedItem.level)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    רמת פריט{" "}
                    <span className="nums" dir="ltr">
                      {capturedItem.level}
                    </span>{" "}
                    · נוסף לתיק הגיבור
                  </p>
                  <Link href="/game/hero" className="btn btn-ghost mt-2 px-3 py-1 text-xs">
                    ⚔ לציוד הגיבור
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {plunderTotal > 0 && (
        <div className="panel-gold rounded-xl p-4">
          <h3 className="mb-3 text-sm font-bold text-gold-bright">
            {iAmAttacker ? "💰 שלל הביזה" : "💸 נבזז ממך"}
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
