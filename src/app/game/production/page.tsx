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
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata = { title: "ייצור | אימפריום" };

export default async function ProductionPage() {
  const empire = await requireEmpire();

  const mines = PRODUCTION_BUILDING_TYPES.map((type) => {
    const building = empire.buildings.find((b) => b.type === type);
    return {
      type,
      level: building?.level ?? 0,
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
      <SectionHeading title="מכונות" subtitle="WAR MACHINES" ornament="⚙️" />

      <div className="panel-gold rounded-xl p-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
          <span aria-hidden>⚒️</span>
          מפעלים ותעשייה
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {summary.map(({ label, value }) => (
            <div key={label} className="panel-inset rounded-lg p-3 text-center">
              <p className="text-xs text-gold-dim">{label}</p>
              <p className="nums mt-0.5 text-lg font-bold text-gold-bright" dir="ltr">
                {formatNumber(value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <MineSlaveQuickActions />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
