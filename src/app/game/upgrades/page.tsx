import { requireEmpire } from "@/lib/auth";
import {
  EMPIRE_UPGRADE_META,
  EMPIRE_UPGRADE_TYPES,
  empireUpgradeCostFor,
} from "@/lib/game/constants";
import { UpgradeCard } from "@/components/game/UpgradeCard";

export const metadata = { title: "שדרוגים | אימפריום" };

export default async function UpgradesPage() {
  const empire = await requireEmpire();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">שדרוגים 📈</h1>
        <p className="mt-1 text-sm text-zinc-400">
          שדרוגי אימפריה קבועים שמשפרים אזרחים, מודיעין, בנקאות וקבלת תורות.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {EMPIRE_UPGRADE_TYPES.map((type) => {
          const meta = EMPIRE_UPGRADE_META[type];
          const upgrade = empire.upgrades.find((u) => u.type === type);
          const level = upgrade?.level ?? 1;
          const isMaxLevel = meta.maxLevel !== undefined && level >= meta.maxLevel;
          return (
            <UpgradeCard
              key={type}
              upgradeType={type}
              label={meta.label}
              icon={meta.icon}
              description={meta.description}
              level={level}
              currentEffect={meta.effectLabel(level)}
              nextEffect={meta.effectLabel(level + 1)}
              upgradeCost={empireUpgradeCostFor(type, level)}
              isMaxLevel={isMaxLevel}
            />
          );
        })}
      </div>
    </div>
  );
}
