import { requireEmpire } from "@/lib/auth";
import {
  STORAGE_META,
  STORAGE_TYPES,
  storageCapacityForLevel,
  storageUpgradeCost,
} from "@/lib/game/constants";
import { formatNumber } from "@/lib/game/format";
import { StorageCard } from "@/components/game/StorageCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "מחסנים | אימפריום" };

export default async function StoragePage() {
  const empire = await requireEmpire();

  const available = {
    gold: empire.gold,
    wood: empire.wood,
    iron: empire.iron,
    stone: empire.stone,
  } as const;

  const totalStored = empire.storages.reduce(
    (sum, s) => sum + s.storedAmount,
    0
  );
  const totalCapacity = STORAGE_TYPES.reduce((sum, type) => {
    const level =
      empire.storages.find((s) => s.resourceType === type)?.level ?? 1;
    return sum + storageCapacityForLevel(level);
  }, 0);
  const totalFillPct =
    totalCapacity > 0
      ? Math.round(Math.min(1, totalStored / totalCapacity) * 100)
      : 0;

  const summaryTotals = [
    { label: "משאבים מאוחסנים", value: formatNumber(Math.floor(totalStored)) },
    { label: "קיבולת כוללת", value: formatNumber(totalCapacity) },
    { label: "ניצול כולל", value: `${totalFillPct}%` },
  ];

  return (
    <div className="space-y-6">
      <SectionHeading title="מחסנים" subtitle="STORAGE" ornament="🏛️" />

      {/* -------- warehouse network summary -------- */}
      <div className="panel-gold rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <span aria-hidden>🏗️</span>
            מערך המחסנים
          </h2>
          <div className="grid flex-1 grid-cols-3 gap-3 sm:max-w-md">
            {summaryTotals.map((total) => (
              <div key={total.label} className="text-center">
                <p className="nums text-lg font-black text-gold-bright" dir="ltr">
                  {total.value}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-gold-dim">
                  {total.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="panel-inset rounded-xl p-4 text-sm text-zinc-400">
        <Icon name="shield" size={16} className="inline align-[-2px]" /> המחסן מגן רק על משאבים שהפקדת אליו. משאבים זמינים אינם מוגנים
        ויכולים להיגנב בתקיפה.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STORAGE_TYPES.map((type) => {
          const meta = STORAGE_META[type];
          const storage = empire.storages.find((s) => s.resourceType === type);
          const level = storage?.level ?? 1;
          return (
            <StorageCard
              key={type}
              resourceType={type}
              label={meta.label}
              icon={meta.icon}
              level={level}
              available={available[meta.resourceKey]}
              stored={storage?.storedAmount ?? 0}
              capacity={storageCapacityForLevel(level)}
              upgradeCost={storageUpgradeCost(level)}
            />
          );
        })}
      </div>
    </div>
  );
}
