import Link from "next/link";
import { requireEmpire } from "@/lib/auth";
import { getTunables } from "@/lib/game/config";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";
import { arePurchasesLive } from "@/server/payments";
import { DiamondStore } from "@/components/game/DiamondStore";

export const metadata = { title: "רכישת יהלומים | WARZONE" };

export default async function BuyDiamondsPage() {
  const empire = await requireEmpire();
  const diamonds = Math.floor(empire.diamonds);
  const { diamondStore } = await getTunables();
  const discountPct = Math.min(100, Math.max(0, diamondStore.purchaseDiscountPct));

  return (
    <div className="space-y-6">
      <SectionHeading
        title="רכישת יהלומים"
        subtitle="GET DIAMONDS"
        ornament={<Icon name="diamond" size={22} className="text-sky-300" />}
      />

      {/* hero / balance banner */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-400/25 bg-gradient-to-l from-sky-500/12 via-panel to-panel p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 -top-14 h-44 w-44 rounded-full bg-sky-400/15 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-black text-sky-100">
              <Icon name="diamond" size={22} className="text-sky-300" />
              יהלומים — המטבע היוקרתי של האימפריום
            </h2>
            <p className="mt-1 max-w-lg text-sm text-zinc-400">
              יהלומים פותחים האצות ייצור, קסמי חנות, חבילות תורות ועוד. בחר חבילה
              והזנק את האימפריה שלך קדימה.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-sky-400/30 bg-panel-inset px-4 py-2.5">
            <span className="text-xs text-zinc-400">היתרה שלך</span>
            <span className="nums text-2xl font-black text-sky-300" dir="ltr">
              {formatNumber(diamonds)}
            </span>
            <Icon name="diamond" size={18} className="text-sky-300" />
          </div>
        </div>
      </div>

      <DiamondStore discountPct={discountPct} purchasesLive={arePurchasesLive()} />

      <div className="flex justify-center">
        <Link
          href="/game/diamonds"
          className="btn btn-ghost px-4 py-2 text-sm"
        >
          <Icon name="shop" size={16} /> לחנות היהלומים — הוצאת יהלומים
        </Link>
      </div>
    </div>
  );
}
