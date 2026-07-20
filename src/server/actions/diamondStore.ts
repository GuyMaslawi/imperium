"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser, logAdmin } from "@/lib/admin";
import { getTunables } from "@/lib/game/config";
import {
  DIAMOND_PACKAGES,
  discountedPrice,
  formatIls,
  packageTotal,
} from "@/lib/game/diamondStore";
import {
  arePurchasesLive,
  getPaymentProvider,
  type ChargeInput,
} from "@/server/payments";

/**
 * Result of a diamond-package checkout.
 * - `unavailable`: purchases are gated (no real provider yet) and the caller
 *   isn't an admin — shown as a friendly "coming soon", not an error.
 */
export interface StoreActionState {
  status: "idle" | "success" | "error" | "unavailable";
  message?: string;
  /** Total diamonds credited on a successful purchase. */
  diamonds?: number;
}

export const STORE_IDLE: StoreActionState = { status: "idle" };

/**
 * Buy a diamond package for real money. The price is recomputed server-side
 * (never trusted from the client), each attempt is recorded as a rich
 * {@link "@prisma/client".DiamondPurchase} audit row (buyer + empire snapshots,
 * base/bonus split, list vs. charged price, currency), and on a successful
 * charge the diamonds are credited in the same transaction that flips the row
 * to PAID. Payment goes through the swappable {@link getPaymentProvider} seam —
 * a mock provider today, whose charges are flagged `isTest`. Until a real
 * provider is live ({@link arePurchasesLive}), only admins can complete a
 * purchase, and every such test purchase is also written to the admin audit log.
 */
export async function purchaseDiamondPackage(
  _prev: StoreActionState,
  formData: FormData
): Promise<StoreActionState> {
  const packageId = String(formData.get("packageId") ?? "");
  const pkg = DIAMOND_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) return { status: "error", message: "חבילה לא תקינה" };

  try {
    const user = await getSessionUser();
    if (!user) return { status: "error", message: "יש להתחבר כדי לרכוש" };
    if (user.bannedAt) return { status: "error", message: "החשבון חסום" };

    const empire = await prisma.empire.findUnique({
      where: { userId: user.id },
      select: { id: true, name: true },
    });
    if (!empire) return { status: "error", message: "לא נמצאה אימפריה" };

    // Interim gate: until a real payment provider is live, only admins may run
    // a (mock) purchase — so no regular player earns free diamonds meanwhile.
    const live = arePurchasesLive();
    if (!live && user.role !== "ADMIN") {
      return {
        status: "unavailable",
        message:
          "רכישות יהלומים ייפתחו ברגע שנחבר את מערכת התשלומים. תודה על הסבלנות!",
      };
    }

    const { diamondStore } = await getTunables();
    const discountPct = Math.min(100, Math.max(0, diamondStore.purchaseDiscountPct));
    const amountIls = discountedPrice(pkg.priceIls, discountPct);
    const total = packageTotal(pkg);
    const provider = getPaymentProvider();
    // No real money moves through the mock provider — flag it so real revenue
    // can be reported separately from admin test purchases.
    const isTest = provider.name === "mock";

    // Record the attempt up front (rich snapshot) so even a declined/abandoned
    // charge is fully audited.
    const purchase = await prisma.diamondPurchase.create({
      data: {
        empireId: empire.id,
        userId: user.id,
        userEmail: user.email,
        empireName: empire.name,
        packageId: pkg.id,
        diamonds: total,
        baseDiamonds: pkg.diamonds,
        bonusDiamonds: pkg.bonus,
        priceIls: amountIls,
        basePriceIls: pkg.priceIls,
        discountPct,
        currency: "ILS",
        provider: provider.name,
        isTest,
        status: "PENDING",
      },
    });

    const charge: ChargeInput = {
      empireId: empire.id,
      packageId: pkg.id,
      amountIls,
      description: `רכישת ${total} יהלומים (${pkg.id})`,
    };
    const result = await provider.charge(charge);

    if (!result.ok) {
      await prisma.diamondPurchase.update({
        where: { id: purchase.id },
        data: { status: "FAILED", failureReason: result.reason },
      });
      return { status: "error", message: "התשלום נכשל — לא חויבת. נסה שוב." };
    }

    // Settle atomically: credit the diamonds and mark the row PAID together.
    await prisma.$transaction([
      prisma.empire.update({
        where: { id: empire.id },
        data: { diamonds: { increment: total } },
      }),
      prisma.diamondPurchase.update({
        where: { id: purchase.id },
        data: {
          status: "PAID",
          providerRef: result.providerRef,
          paidAt: new Date(),
        },
      }),
    ]);

    // Admins running mock purchases before go-live leave an audit trail too.
    if (isTest && user.role === "ADMIN") {
      await logAdmin(
        { id: user.id, email: user.email },
        {
          action: "diamondStore.testPurchase",
          targetType: "empire",
          targetId: empire.id,
          summary: `רכישת בדיקה: ${total} יהלומים (${pkg.id}) תמורת ${formatIls(amountIls)}`,
          details: { packageId: pkg.id, diamonds: total, priceIls: amountIls, provider: provider.name },
        }
      );
    }

    revalidatePath("/game", "layout");
    return {
      status: "success",
      diamonds: total,
      message: isTest
        ? `רכישת בדיקה: נזקפו ${total.toLocaleString("he-IL")} יהלומים.`
        : `נזקפו ${total.toLocaleString("he-IL")} יהלומים לחשבונך!`,
    };
  } catch {
    return { status: "error", message: "אירעה שגיאה, נסה שוב" };
  }
}
