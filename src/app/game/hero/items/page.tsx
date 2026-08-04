import Link from "next/link";
import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { ItemCatalog } from "@/components/game/ItemCatalog";
import { catalogKey } from "@/components/game/heroItemView";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("כל הפריטים | KRALDOR") };
}

/** The complete hero item catalog: every tier level in every slot. */
export default async function HeroItemsPage() {
  const t = await getT();
  const empire = await requireEmpire();
  const hero = empire.hero;
  if (!hero) return null;

  const ownedKeys = hero.items.map((i) => catalogKey(i.slot, i.level));
  const equippedKeys = hero.items
    .filter((i) => i.equipped)
    .map((i) => catalogKey(i.slot, i.level));

  return (
    <div className="space-y-6">
      <SectionHeading title={t("כל הפריטים")} ornament="🗡" />

      <div className="flex justify-center">
        <Link href="/game/hero" className="btn btn-ghost px-4 py-2 text-sm">
          <Icon name="attack" size={16} className="inline align-[-2px]" /> {t("חזרה לגיבור")}
        </Link>
      </div>

      <ItemCatalog
        heroLevel={hero.level}
        ownedKeys={ownedKeys}
        equippedKeys={equippedKeys}
      />
    </div>
  );
}
