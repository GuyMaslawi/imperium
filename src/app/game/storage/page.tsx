import { requireEmpire } from "@/lib/auth";
import {
  STORAGE_META,
  STORAGE_TYPES,
  storageCapacityForLevel,
  storageUpgradeCost,
} from "@/lib/game/constants";
import { StorageCard } from "@/components/game/StorageCard";

export const metadata = { title: "מחסנים | אימפריום" };

export default async function StoragePage() {
  const empire = await requireEmpire();

  const available = {
    gold: empire.gold,
    wood: empire.wood,
    iron: empire.iron,
    stone: empire.stone,
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">מחסנים 🏛️</h1>
        <p className="mt-1 text-sm text-zinc-400">
          אחסן משאבים, משוך אותם בעת הצורך ושדרג את קיבולת המחסנים שלך.
        </p>
      </div>

      <p className="rounded-xl border border-border-subtle bg-surface p-4 text-sm text-zinc-400">
        🛡️ המחסן מגן רק על משאבים שהפקדת אליו. משאבים זמינים אינם מוגנים
        ויכולים להיגנב בתקיפה.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
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
