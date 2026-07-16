import Link from "next/link";
import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ItemCatalog } from "@/components/game/ItemCatalog";
import { catalogKey } from "@/components/game/heroItemView";

export const metadata = { title: "כל הפריטים | WARZONE" };

/** The complete hero item catalog: levels 1–100 in every rarity and slot. */
export default async function HeroItemsPage() {
  const empire = await requireEmpire();
  const hero = empire.hero;
  if (!hero) return null;

  const ownedKeys = hero.items.map((i) => catalogKey(i.slot, i.level, i.rarity));
  const equippedKeys = hero.items
    .filter((i) => i.equipped)
    .map((i) => catalogKey(i.slot, i.level, i.rarity));

  return (
    <div className="space-y-6">
      <SectionHeading title="כל הפריטים" subtitle="ITEM CATALOG" ornament="🗡" />

      <div className="flex justify-center">
        <Link href="/game/hero" className="btn btn-ghost px-4 py-2 text-sm">
          ⚔ חזרה לגיבור
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
