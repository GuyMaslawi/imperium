import { requireEmpire } from "@/lib/auth";
import {
  BUILDING_META,
  MINE_MAX_LEVEL,
  PRODUCTION_BUILDING_TYPES,
  RESOURCE_META,
  mineProductionPerTick,
  mineProductionValue,
  mineUpgradeCost,
} from "@/lib/game/constants";
import { formatNumber } from "@/lib/game/format";
import { MineCard } from "@/components/game/MineCard";
import { MineSlaveQuickActions } from "@/components/game/MineSlaveQuickActions";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "ייצור | אימפריום" };

export default async function ProductionPage() {
  const empire = await requireEmpire();

  const mines = PRODUCTION_BUILDING_TYPES.map((type) => {
    const building = empire.buildings.find((b) => b.type === type);
    return {
      type,
      level: building?.level ?? 1,
      assignedSlaves: building?.slavesAssigned ?? 0,
    };
  });

  const totalSlaves = empire.army?.mineSlaves ?? 0;
  const assignedTotal = mines.reduce((sum, m) => sum + m.assignedSlaves, 0);
  const freeSlaves = Math.max(0, totalSlaves - assignedTotal);

  const summary = [
    { label: "סה\"כ עבדי מכרות", value: totalSlaves },
    { label: "עבדי מכרות מוצבים", value: assignedTotal },
    { label: "עבדי מכרות פנויים", value: freeSlaves },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">ניהול ייצור ⚒️</h1>
        <p className="mt-1 text-sm text-zinc-400">
          חלק את עבדי המכרות בין ארבעת המשאבים ושדרג את המכרות כדי להגדיל את
          הייצור לעדכון רגיל.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {summary.map(({ label, value }) => (
          <Card key={label} className="!p-4 text-center">
            <p className="text-xs text-zinc-400">{label}</p>
            <p className="text-lg font-bold tabular-nums text-gold">
              {formatNumber(value)}
            </p>
          </Card>
        ))}
      </div>

      <MineSlaveQuickActions />

      <div className="grid gap-4 md:grid-cols-2">
        {mines.map((mine) => {
          const meta = BUILDING_META[mine.type];
          const resource = meta.producedResource!;
          return (
            <MineCard
              key={mine.type}
              resource={resource}
              label={meta.label}
              icon={meta.icon}
              description={meta.description}
              level={mine.level}
              maxLevel={MINE_MAX_LEVEL}
              assignedSlaves={mine.assignedSlaves}
              freeSlaves={freeSlaves}
              resourceLabel={RESOURCE_META[resource].label}
              productionPerSlave={mineProductionValue(mine.level)}
              productionPerTick={mineProductionPerTick(mine.level, mine.assignedSlaves)}
              upgradeCost={mineUpgradeCost(mine.level)}
            />
          );
        })}
      </div>
    </div>
  );
}
