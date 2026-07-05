import { requireEmpire } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { WeaponsTabs, type WeaponsTabData } from "@/components/game/WeaponsTabs";
import {
  INITIAL_WEAPON_UNLOCKED_TIER,
  MAX_WEAPON_TIER,
  WEAPON_CATEGORIES,
  WEAPON_CATEGORY_META,
  weaponsOfCategory,
  weaponsPower,
  weaponTierUnlockCost,
} from "@/lib/game/weapons";

export const metadata = { title: "נשקים | אימפריום" };

const TAB_POWER_LABELS = {
  ATTACK: "כוח התקפה כולל מנשקים",
  DEFENSE: "כוח הגנה כולל מנשקים",
  SPY: "כוח ריגול כולל מנשקים",
} as const;

export default async function WeaponsPage() {
  const empire = await requireEmpire();

  const ownedByKey = new Map(
    empire.weapons.map((w) => [w.weaponKey, w.quantity])
  );

  const tabs: WeaponsTabData[] = WEAPON_CATEGORIES.map((category) => {
    const meta = WEAPON_CATEGORY_META[category];
    const unlockedTier =
      empire.weaponUnlocks.find((u) => u.category === category)?.unlockedTier ??
      INITIAL_WEAPON_UNLOCKED_TIER;
    return {
      category,
      label: meta.label,
      icon: meta.icon,
      totalPowerLabel: TAB_POWER_LABELS[category],
      totalPower: weaponsPower(empire.weapons, category),
      unlockedTier,
      maxTier: MAX_WEAPON_TIER,
      unlockCost: weaponTierUnlockCost(unlockedTier),
      weapons: weaponsOfCategory(category).map((weapon) => ({
        weapon,
        owned: ownedByKey.get(weapon.key) ?? 0,
      })),
    };
  });

  const available = {
    gold: Math.floor(empire.gold),
    wood: Math.floor(empire.wood),
    iron: Math.floor(empire.iron),
    stone: Math.floor(empire.stone),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">נשקים 🗡️</h1>
        <p className="mt-1 text-sm text-zinc-400">
          קנה נשקים, שדרג גישה לנשקים מתקדמים וחזק את האימפריה שלך.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tabs.map((tab) => (
          <Card key={tab.category} className="flex items-center gap-3 !p-4">
            <span aria-hidden className="text-3xl">{tab.icon}</span>
            <div>
              <p className="text-xs text-zinc-400">
                {WEAPON_CATEGORY_META[tab.category].powerLabel}
              </p>
              <p className="text-lg font-black text-gold">
                ⚡ {tab.totalPower.toLocaleString("he-IL")}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <WeaponsTabs tabs={tabs} available={available} />
    </div>
  );
}
