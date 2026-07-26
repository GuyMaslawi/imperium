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

export const metadata = { title: "דוחות | אימפריום" };

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

  // Reports that arrived since the player's last visit get a "new" marker.
  const seenAt = empire.reportsSeenAt;

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
      isNew: report.createdAt > seenAt,
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
      isNew: report.createdAt > seenAt,
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

  return (
    <div className="space-y-6">
      <MarkSeen action={markReportsSeen} />
      <SectionHeading title="היסטוריה" subtitle="BATTLE HISTORY" ornament={<Icon name="reports" size={22} className="text-crimson" />} />

      <ReportsTabs battles={battleRows} spies={spyRows} />
    </div>
  );
}
