import { requireEmpire } from "@/lib/auth";
import {
  EMPIRE_UPGRADE_META,
  EMPIRE_UPGRADE_TYPES,
  empireUpgradeCostFor,
} from "@/lib/game/constants";
import { UpgradeCard } from "@/components/game/UpgradeCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "שדרוגים | אימפריום" };

export default async function UpgradesPage() {
  const empire = await requireEmpire();

  const available = {
    gold: Math.floor(empire.gold),
    wood: Math.floor(empire.wood),
    iron: Math.floor(empire.iron),
    stone: Math.floor(empire.stone),
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="שדרוגים"
        subtitle="UPGRADES"
        ornament={<Icon name="upgrades" size={22} className="text-crimson" />}
      />

      <p className="panel-inset rounded-xl p-4 text-center text-sm text-zinc-400">
        שדרוגי אימפריה קבועים שמשפרים אזרחים, יהלומים, מודיעין, בנקאות וקבלת תורות.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              available={available}
              isMaxLevel={isMaxLevel}
            />
          );
        })}
      </div>
    </div>
  );
}
