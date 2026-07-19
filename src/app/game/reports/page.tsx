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
    prisma.spyReport.findMany({
      where: { attackerEmpireId: empire.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { defenderEmpire: true },
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

  const spyRows: SpyRow[] = spies.map((report) => ({
    id: report.id,
    createdAt: formatDate(report.createdAt),
    isNew: report.createdAt > seenAt,
    rival: report.defenderEmpire.name,
    success: report.success,
    turnsSpent: report.turnsSpent,
    finalChance: report.finalChance,
    weaponsBonus: report.weaponsBonus,
    revealedGold: report.revealedGold ?? 0,
    revealedWood: report.revealedWood ?? 0,
    revealedIron: report.revealedIron ?? 0,
    revealedStone: report.revealedStone ?? 0,
    revealedSoldiers: report.revealedSoldiers ?? 0,
    revealedSpies: report.revealedSpies ?? 0,
    revealedMineSlaves: report.revealedMineSlaves ?? 0,
  }));

  return (
    <div className="space-y-6">
      <MarkSeen action={markReportsSeen} />
      <SectionHeading title="היסטוריה" subtitle="BATTLE HISTORY" ornament={<Icon name="reports" size={22} className="text-crimson" />} />

      <ReportsTabs battles={battleRows} spies={spyRows} />
    </div>
  );
}
