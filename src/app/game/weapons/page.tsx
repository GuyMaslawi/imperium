import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
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

const TAB_PARAM_TO_CATEGORY: Record<string, "ATTACK" | "DEFENSE" | "SPY"> = {
  attack: "ATTACK",
  defense: "DEFENSE",
  spy: "SPY",
};

export default async function WeaponsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const empire = await requireEmpire();
  const { tab } = await searchParams;
  const initialCategory =
    typeof tab === "string" ? TAB_PARAM_TO_CATEGORY[tab] : undefined;

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
      <SectionHeading title="חנות נשקים" subtitle="SHOP" ornament="🛍️" />

      <div className="grid gap-4 sm:grid-cols-3">
        {tabs.map((tab) => (
          <div
            key={tab.category}
            className="panel rounded-xl p-4 flex items-center gap-3"
          >
            <span aria-hidden className="text-3xl">{tab.icon}</span>
            <div>
              <p className="text-xs text-gold-dim">
                {WEAPON_CATEGORY_META[tab.category].powerLabel}
              </p>
              <p className="text-lg font-black text-gold-bright">
                <Icon name="spark" size={16} className="inline align-[-2px]" />{" "}
                <span className="nums" dir="ltr">
                  {tab.totalPower.toLocaleString("he-IL")}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <WeaponsTabs tabs={tabs} available={available} initialCategory={initialCategory} />
    </div>
  );
}
