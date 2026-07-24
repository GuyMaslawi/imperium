import Link from "next/link";
import { requireEmpire } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";
import { bankInterestRate } from "@/lib/game/constants";
import { DiamondShop } from "@/components/game/DiamondShop";
import {
  BOOSTABLE_RESOURCES,
  RESOURCE_BOOST_KIND,
  TURN_PACKAGES,
} from "@/lib/game/diamondShop";

export const metadata = { title: "יהלומים | WARZONE" };

export default async function DiamondsPage() {
  const empire = await requireEmpire();
  const now = new Date();
  const diamonds = Math.floor(empire.diamonds);

  // Diamond effects for this empire (timed boosts + cooldowns).
  const effects = await prisma.diamondEffect.findMany({
    where: { empireId: empire.id },
  });
  const byKind = new Map(effects.map((e) => [e.kind, e]));

  const boosts = BOOSTABLE_RESOURCES.map((resource) => {
    const e = byKind.get(RESOURCE_BOOST_KIND[resource]);
    const active = e?.activeUntil != null && e.activeUntil > now;
    return {
      resource,
      pct: active ? e!.magnitude : 0,
      activeUntil: active ? e!.activeUntil!.toISOString() : null,
    };
  });

  // Per-package turn cooldowns: each package recharges independently.
  const turnReadyAt = TURN_PACKAGES.map((pkg) => {
    const e = byKind.get(pkg.cooldownKind);
    return e?.readyAt != null && e.readyAt > now ? e.readyAt.toISOString() : null;
  });

  const discountEffect = byKind.get("SHOP_DISCOUNT");
  const discountActiveUntil =
    discountEffect?.activeUntil != null && discountEffect.activeUntil > now
      ? discountEffect.activeUntil.toISOString()
      : null;

  const hero = empire.hero;
  const allocatedPoints =
    (hero?.attackPoints ?? 0) + (hero?.defensePoints ?? 0) + (hero?.resourcePoints ?? 0);
  const activeSeason = await prisma.gameSeason.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  const pointsResetUsed = hero?.pointsResetSeasonId === (activeSeason?.id ?? "none");

  const bankBalance = empire.bankAccount?.goldBalance ?? 0;
  const interestLevel =
    empire.upgrades.find((u) => u.type === "BANK_DAILY_INTEREST")?.level ?? 1;
  const interestPreview = Math.floor(bankBalance * bankInterestRate(interestLevel));
  const bankEffect = byKind.get("BANK_INTEREST");
  const bankReadyAt =
    bankEffect?.readyAt != null && bankEffect.readyAt > now
      ? bankEffect.readyAt.toISOString()
      : null;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="יהלומים"
        subtitle="DIAMONDS"
        ornament={<Icon name="diamond" size={22} className="text-sky-300" />}
      />

      {/* -------- balance -------- */}
      <div className="panel-gold flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
          <Icon name="diamond" size={18} className="text-sky-300" />
          חנות יהלומים
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/game/diamonds/buy"
            className="flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-1.5 text-sm font-black text-black transition-colors hover:bg-sky-400"
          >
            <Icon name="shop" size={16} /> רכישת יהלומים
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">היתרה שלך:</span>
            <span className="nums text-2xl font-black text-sky-300" dir="ltr">
              {formatNumber(diamonds)}
            </span>
            <span className="flex items-center rounded-full border border-sky-400/40 bg-panel-inset px-2 py-0.5 text-sm">
              <Icon name="diamond" size={16} className="text-sky-300" />
            </span>
          </div>
        </div>
      </div>

      <DiamondShop
        diamonds={diamonds}
        boosts={boosts}
        turnReadyAt={turnReadyAt}
        discountActiveUntil={discountActiveUntil}
        allocatedPoints={allocatedPoints}
        pointsResetUsed={pointsResetUsed}
        interestPreview={interestPreview}
        bankReadyAt={bankReadyAt}
      />
    </div>
  );
}
