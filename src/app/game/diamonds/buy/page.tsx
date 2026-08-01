import { requireEmpire } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getTunables } from "@/lib/game/config";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { getCheckoutConfig } from "@/server/payments";
import { DiamondStore } from "@/components/game/DiamondStore";
import { DiamondsHeader } from "@/components/game/DiamondsHeader";

export const metadata = { title: "רכישת יהלומים | KRALDOR" };

export default async function BuyDiamondsPage() {
  const empire = await requireEmpire();
  const diamonds = Math.floor(empire.diamonds);
  const { diamondStore } = await getTunables();
  const discountPct = Math.min(100, Math.max(0, diamondStore.purchaseDiscountPct));

  const checkout = getCheckoutConfig();
  // Before go-live only admins may actually pay, so only they get the PayPal
  // buttons. Everyone else gets the store chained shut — the packages stay on
  // display, but the seal says so up front instead of letting a click travel all
  // the way to a "coming soon" modal.
  const canPay = checkout.live || (await isAdmin());
  const paypalClientId = canPay ? checkout.paypalClientId : null;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="רכישת יהלומים"
        ornament={<Icon name="diamond" size={22} className="text-cyan-300" />}
      />

      <DiamondsHeader
        diamonds={diamonds}
        active="buy"
        note="יהלומים פותחים האצות ייצור, קסמי חנות, חבילות תורות ועוד. ככל שהחבילה גדולה יותר — כך מקבלים יותר יהלומים לכל שקל."
      />

      <DiamondStore
        discountPct={discountPct}
        purchasesLive={checkout.live}
        locked={!canPay}
        paypalClientId={paypalClientId}
        testMode={checkout.testMode}
      />
    </div>
  );
}
