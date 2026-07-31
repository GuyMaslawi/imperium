import type { CSSProperties } from "react";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/game/format";
import { markReportsSeen } from "@/server/actions/messages";
import { MarkSeen } from "@/components/game/MarkSeen";
import {
  ReportsTabs,
  type BattleRow,
  type SpyRow,
} from "@/components/game/ReportsTabs";

export const metadata = { title: "דוחות | קראלדור" };

/** The stack of dispatches on the desk — how far each sheet is turned. */
const PAPERS = ["-11deg", "6deg", "-2deg"];

export default async function ReportsPage() {
  const empire = await requireEmpire();

  const [battles, spies] = await Promise.all([
    prisma.battleReport.findMany({
      where: {
        OR: [{ attackerEmpireId: empire.id }, { defenderEmpireId: empire.id }],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { attackerEmpire: true, defenderEmpire: true },
    }),
    // Missions I sent, plus enemy spies my defenses caught. A *successful*
    // enemy mission is deliberately not listed: stealth is the whole point of
    // spying, and the game only ever tells the defender about a caught spy
    // (see the SPY message in spyOnEmpire).
    prisma.spyReport.findMany({
      where: {
        OR: [
          { attackerEmpireId: empire.id },
          { defenderEmpireId: empire.id, success: false },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { attackerEmpire: true, defenderEmpire: true },
    }),
  ]);

  // Reports that arrived since the player's last visit get a "new" marker —
  // but only for things done *to* me. My own attacks and spy missions are
  // never "news" to me, so they never carry a marker or feed a tab badge.
  const seenAt = empire.reportsSeenAt;
  const isIncomingNew = (createdAt: Date, isAttacker: boolean) =>
    !isAttacker && createdAt > seenAt;

  const battleRows: BattleRow[] = battles.map((report) => {
    const isAttacker = report.attackerEmpireId === empire.id;
    const won = report.winnerEmpireId === empire.id;
    const rival = isAttacker
      ? report.defenderEmpire.name
      : report.attackerEmpire.name;
    const myLossSoldiers = isAttacker
      ? report.attackerSoldiersLost
      : report.defenderSoldiersLost;
    const totalStolen =
      report.stolenGold +
      report.stolenWood +
      report.stolenIron +
      report.stolenStone;

    return {
      id: report.id,
      createdAt: formatDate(report.createdAt),
      isNew: isIncomingNew(report.createdAt, isAttacker),
      rival,
      isAttacker,
      won,
      attackerPower: report.attackerPower,
      defenderPower: report.defenderPower,
      attackerSoldiersPower: report.attackerSoldiersPower,
      attackerWeaponsPower: report.attackerWeaponsPower,
      defenderSoldiersPower: report.defenderSoldiersPower,
      defenderWeaponsPower: report.defenderWeaponsPower,
      myLossSoldiers,
      turnsSpent: report.turnsSpent,
      stolenGold: report.stolenGold,
      stolenWood: report.stolenWood,
      stolenIron: report.stolenIron,
      stolenStone: report.stolenStone,
      totalStolen,
      plunderIsMine: isAttacker === won,
    };
  });

  const spyRows: SpyRow[] = spies.map((report) => {
    const isAttacker = report.attackerEmpireId === empire.id;
    return {
      id: report.id,
      createdAt: formatDate(report.createdAt),
      isNew: isIncomingNew(report.createdAt, isAttacker),
      rival: isAttacker
        ? report.defenderEmpire.name
        : report.attackerEmpire.name,
      isAttacker,
      success: report.success,
      turnsSpent: report.turnsSpent,
      finalChance: report.finalChance,
      weaponsBonus: report.weaponsBonus,
      attackerIntel: report.attackerIntel,
      defenderIntel: report.defenderIntel,
      // Nothing was revealed to me by an enemy spy I caught — zero the intel
      // columns rather than leak the snapshot the report happens to carry.
      revealedGold: isAttacker ? report.revealedGold ?? 0 : 0,
      revealedWood: isAttacker ? report.revealedWood ?? 0 : 0,
      revealedIron: isAttacker ? report.revealedIron ?? 0 : 0,
      revealedStone: isAttacker ? report.revealedStone ?? 0 : 0,
      revealedSoldiers: isAttacker ? report.revealedSoldiers ?? 0 : 0,
      revealedSpies: isAttacker ? report.revealedSpies ?? 0 : 0,
      revealedMineSlaves: isAttacker ? report.revealedMineSlaves ?? 0 : 0,
    };
  });

  // What arrived since the last visit — the same "done to me" rule the row
  // markers use, counted once for the desk's tally plate.
  const freshCount =
    battleRows.filter((r) => r.isNew).length + spyRows.filter((r) => r.isNew).length;

  return (
    <div className="space-y-6">
      <MarkSeen action={markReportsSeen} clears="reports" />
      <SectionHeading title="היסטוריה" ornament={<Icon name="reports" size={22} className="text-crimson" />} />

      {/* -------- the dispatch desk --------
          A candle, a stack of dispatches and the day's tally. The "מאז ביקורך
          האחרון" plate counts only what was done *to* you: your own attacks
          are never news, which is the same rule the row markers follow. */}
      <div className="panel-gold disp-desk rounded-2xl p-4">
        <span className="disp-candle" aria-hidden>
          <span className="disp-flame" />
        </span>
        <span className="disp-papers" aria-hidden>
          {PAPERS.map((r) => (
            <span key={r} style={{ "--r": r } as CSSProperties} />
          ))}
        </span>

        <div className="disp-body">
          <h2 className="mb-3 flex items-center justify-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <Icon name="reports" size={20} className="text-crimson-bright" />
            שולחן המבצעים
          </h2>
          <div className="mx-auto grid max-w-lg grid-cols-3 gap-2.5">
            {[
              { label: "דוחות קרב", value: battleRows.length },
              { label: "משימות ריגול", value: spyRows.length },
              { label: "מאז ביקורך האחרון", value: freshCount },
            ].map(({ label, value }, index) => (
              <div
                key={label}
                className="panel-inset disp-plate rounded-lg p-2.5 text-center"
                style={{ "--i": index } as CSSProperties}
              >
                <p className="text-[11px] text-gold-dim">{label}</p>
                <p className="nums mt-0.5 text-lg font-black text-gold-bright" dir="ltr">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ReportsTabs battles={battleRows} spies={spyRows} />
    </div>
  );
}
