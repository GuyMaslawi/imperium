"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser, logAdmin, type SessionUser } from "@/lib/admin";
import { rateLimit } from "@/lib/rateLimit";
import { getTunables } from "@/lib/game/config";
import {
  DIAMOND_PACKAGES,
  discountedPrice,
  formatIls,
  packageTotal,
} from "@/lib/game/diamondStore";
import type {
  CaptureOrderState,
  CreateOrderState,
  StoreActionState,
} from "@/lib/game/diamondStore";
import { arePurchasesLive, getPaymentProvider } from "@/server/payments";
import type { ChargeInput, PaymentProvider } from "@/server/payments";
import { markDiamondPurchaseFailed, settleDiamondPurchase } from "@/server/purchases";

// The `StoreActionState` type and the `STORE_IDLE` idle constant live in the
// client-safe `@/lib/game/diamondStore` module — a `"use server"` file may only
// export async functions, so neither the constant nor a `export type { ... }`
// re-export can originate here (the server-actions loader re-exports every
// binding of this module by name, and a type has no runtime binding — that is
// exactly what threw `ReferenceError: StoreActionState is not defined`).
// Import the type from `@/lib/game/diamondStore` instead.

/** Everything a checkout needs, once the caller has cleared every gate. */
interface CheckoutContext {
  user: SessionUser;
  empire: { id: string; name: string };
  provider: PaymentProvider;
  pkg: (typeof DIAMOND_PACKAGES)[number];
  /** Price after the admin discount — the only amount ever charged. */
  amountIls: number;
  discountPct: number;
  /** Diamonds the package grants (base + bonus). */
  total: number;
}

type Preflight =
  | { ok: true; ctx: CheckoutContext }
  | { ok: false; status: "error" | "unavailable"; message: string };

/**
 * Shared gate for every checkout entry point (one-shot charge and the
 * create-order half of an approval flow): session, ban, verified email, rate
 * limit, empire, and the pre-go-live admin-only gate. The price is computed
 * here from the package id and the live tunables — never taken from the client.
 */
async function preflight(packageId: string, limiterKey: string): Promise<Preflight> {
  const pkg = DIAMOND_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) return { ok: false, status: "error", message: "חבילה לא תקינה" };

  const user = await getSessionUser();
  if (!user) return { ok: false, status: "error", message: "יש להתחבר כדי לרכוש" };
  if (user.bannedAt) return { ok: false, status: "error", message: "החשבון חסום" };
  // Every other player-facing action resolves its actor through
  // `getActiveEmpireId`, which refuses unverified accounts. This one resolves
  // the empire itself, so it has to repeat the check — without it, an account
  // created seconds ago against an address nobody owns could reach the
  // real-money checkout, and the `userEmail` snapshot written to the
  // DiamondPurchase audit row (the record a chargeback is argued from) would
  // name an unproven address.
  if (!user.emailVerified) {
    return { ok: false, status: "error", message: "יש לאמת את כתובת האימייל לפני רכישה" };
  }

  // Rate-limit the checkout itself: every attempt writes a PENDING
  // DiamondPurchase row (and, with PayPal, opens an order) before any money
  // moves, so an unthrottled caller can inflate the audit table indefinitely.
  if (!(await rateLimit(`${limiterKey}:${user.id}`, 10, 15 * 60 * 1000))) {
    return {
      ok: false,
      status: "error",
      message: "יותר מדי נסיונות רכישה. נסה שוב מאוחר יותר.",
    };
  }

  const empire = await prisma.empire.findUnique({
    where: { userId: user.id },
    select: { id: true, name: true },
  });
  if (!empire) return { ok: false, status: "error", message: "לא נמצאה אימפריה" };

  // Interim gate: until a real payment provider is live, only admins may run a
  // (test) purchase — so no regular player earns free diamonds meanwhile.
  if (!arePurchasesLive() && user.role !== "ADMIN") {
    return {
      ok: false,
      status: "unavailable",
      message: "רכישות יהלומים ייפתחו ברגע שנחבר את מערכת התשלומים. תודה על הסבלנות!",
    };
  }

  const { diamondStore } = await getTunables();
  const discountPct = Math.min(100, Math.max(0, diamondStore.purchaseDiscountPct));

  return {
    ok: true,
    ctx: {
      user,
      empire,
      provider: getPaymentProvider(),
      pkg,
      amountIls: discountedPrice(pkg.priceIls, discountPct),
      discountPct,
      total: packageTotal(pkg),
    },
  };
}

/** Open the PENDING audit row that a charge (or PayPal order) settles against. */
async function openPurchaseRow(ctx: CheckoutContext) {
  return prisma.diamondPurchase.create({
    data: {
      empireId: ctx.empire.id,
      userId: ctx.user.id,
      userEmail: ctx.user.email,
      empireName: ctx.empire.name,
      packageId: ctx.pkg.id,
      diamonds: ctx.total,
      baseDiamonds: ctx.pkg.diamonds,
      bonusDiamonds: ctx.pkg.bonus,
      priceIls: ctx.amountIls,
      basePriceIls: ctx.pkg.priceIls,
      discountPct: ctx.discountPct,
      currency: "ILS",
      provider: ctx.provider.name,
      // No real money moves in test mode (mock provider / PayPal sandbox) —
      // flag it so real revenue reports separately from test purchases.
      isTest: ctx.provider.isTestMode,
      status: "PENDING",
    },
  });
}

/** Admin test purchases (pre-go-live) leave a trail in the admin audit log. */
async function logTestPurchase(input: {
  user: SessionUser;
  provider: PaymentProvider;
  empireId: string | null;
  packageId: string;
  diamonds: number;
  priceIls: number;
}): Promise<void> {
  if (!input.provider.isTestMode || input.user.role !== "ADMIN") return;
  await logAdmin(
    { id: input.user.id, email: input.user.email },
    {
      action: "diamondStore.testPurchase",
      targetType: "empire",
      targetId: input.empireId ?? "",
      summary: `רכישת בדיקה: ${input.diamonds} יהלומים (${input.packageId}) תמורת ${formatIls(input.priceIls)}`,
      details: {
        packageId: input.packageId,
        diamonds: input.diamonds,
        priceIls: input.priceIls,
        provider: input.provider.name,
      },
    }
  );
}

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
  try {
    const gate = await preflight(String(formData.get("packageId") ?? ""), "purchase");
    if (!gate.ok) return { status: gate.status, message: gate.message };
    const ctx = gate.ctx;

    // PayPal (and any other approval-based provider) cannot be charged from a
    // single server call — the buyer has to approve first. The store renders
    // the PayPal buttons instead of this form whenever such a provider is
    // active, so reaching here means a stale page or a hand-rolled request.
    if (ctx.provider.kind !== "direct") {
      return {
        status: "error",
        message: "יש להשלים את התשלום דרך כפתור PayPal. רענן את הדף ונסה שוב.",
      };
    }

    // Record the attempt up front (rich snapshot) so even a declined/abandoned
    // charge is fully audited.
    const purchase = await openPurchaseRow(ctx);

    const charge: ChargeInput = {
      empireId: ctx.empire.id,
      packageId: ctx.pkg.id,
      amountIls: ctx.amountIls,
      description: `רכישת ${ctx.total} יהלומים (${ctx.pkg.id})`,
    };
    const result = await ctx.provider.charge(charge);

    if (!result.ok) {
      await prisma.diamondPurchase.update({
        where: { id: purchase.id },
        data: { status: "FAILED", failureReason: result.reason },
      });
      return { status: "error", message: "התשלום נכשל — לא חויבת. נסה שוב." };
    }

    // Settle atomically, guarding the PENDING→PAID transition so the diamonds
    // are credited only if *this* call is the one that flipped the row. A
    // retried/duplicated settlement finds the row already PAID and credits
    // nothing — see `settleDiamondPurchase` for the same guard on the PayPal path.
    await prisma.$transaction(async (tx) => {
      const settled = await tx.diamondPurchase.updateMany({
        where: { id: purchase.id, status: "PENDING" },
        data: {
          status: "PAID",
          providerRef: result.providerRef,
          paidAt: new Date(),
        },
      });
      if (settled.count === 0) return;
      await tx.empire.update({
        where: { id: ctx.empire.id },
        data: { diamonds: { increment: ctx.total } },
      });
    });

    await logTestPurchase({
      user: ctx.user,
      provider: ctx.provider,
      empireId: ctx.empire.id,
      packageId: ctx.pkg.id,
      diamonds: ctx.total,
      priceIls: ctx.amountIls,
    });

    revalidatePath("/game", "layout");
    return {
      status: "success",
      diamonds: ctx.total,
      message: ctx.provider.isTestMode
        ? `רכישת בדיקה: נזקפו ${ctx.total.toLocaleString("he-IL")} יהלומים.`
        : `נזקפו ${ctx.total.toLocaleString("he-IL")} יהלומים לחשבונך!`,
    };
  } catch {
    return { status: "error", message: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ PayPal checkout ----------------------------- */

/**
 * Step 1 of the PayPal flow: open an order for one package and hand its id to
 * the browser SDK, which takes the buyer through approval.
 *
 * The amount is derived here from the package id and the live discount tunable
 * — the client sends nothing but the package id, so there is no price to
 * tamper with. The `DiamondPurchase` row is written *before* the order exists
 * (its id becomes PayPal's `custom_id`/`invoice_id`), so an order can never
 * come back referring to a purchase we never opened.
 */
export async function createDiamondOrder(packageId: string): Promise<CreateOrderState> {
  try {
    const gate = await preflight(String(packageId ?? ""), "order");
    if (!gate.ok) return { ok: false, message: gate.message };
    const ctx = gate.ctx;

    if (ctx.provider.kind !== "order") {
      return { ok: false, message: "PayPal אינו מחובר כרגע. נסה שוב מאוחר יותר." };
    }

    const purchase = await openPurchaseRow(ctx);

    const order = await ctx.provider.createOrder({
      purchaseId: purchase.id,
      empireId: ctx.empire.id,
      packageId: ctx.pkg.id,
      amountIls: ctx.amountIls,
      description: `${ctx.total} יהלומים — ${ctx.pkg.name}`,
    });

    if (!order.ok) {
      console.error("[paypal] createOrder failed:", order.reason);
      await prisma.diamondPurchase.update({
        where: { id: purchase.id },
        data: { status: "FAILED", failureReason: order.reason },
      });
      return { ok: false, message: "לא ניתן לפתוח תשלום מול PayPal כרגע. נסה שוב." };
    }

    // `providerRef` is unique, so the order id can only ever be attached to
    // this one purchase row — a replayed webhook or capture for it can never
    // settle a second row.
    await prisma.diamondPurchase.update({
      where: { id: purchase.id },
      data: { providerRef: order.orderId },
    });

    return { ok: true, orderId: order.orderId };
  } catch (err) {
    console.error("[paypal] createDiamondOrder:", err);
    return { ok: false, message: "אירעה שגיאה בפתיחת התשלום, נסה שוב" };
  }
}

/**
 * Step 2 of the PayPal flow: capture the order the buyer just approved and
 * credit the diamonds.
 *
 * The order id arrives from the browser, so it is only ever used to look up a
 * PENDING row that belongs to *this* user; the captured amount and currency are
 * then checked against the price stored on that row before anything is
 * credited. Crediting itself goes through {@link settleDiamondPurchase}, which
 * is idempotent — this call and the `PAYMENT.CAPTURE.COMPLETED` webhook race
 * freely and only one of them can credit.
 */
export async function captureDiamondOrder(orderId: string): Promise<CaptureOrderState> {
  const id = String(orderId ?? "").trim();
  // PayPal order ids are short uppercase alphanumerics; refuse anything else
  // rather than interpolate it into an API path.
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    return { ok: false, message: "מזהה תשלום לא תקין" };
  }

  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "יש להתחבר כדי לרכוש" };
    if (user.bannedAt) return { ok: false, message: "החשבון חסום" };
    if (!(await rateLimit(`capture:${user.id}`, 20, 15 * 60 * 1000))) {
      return { ok: false, message: "יותר מדי נסיונות. נסה שוב מאוחר יותר." };
    }

    const provider = getPaymentProvider();
    if (provider.kind !== "order") {
      return { ok: false, message: "PayPal אינו מחובר כרגע." };
    }

    const purchase = await prisma.diamondPurchase.findUnique({
      where: { providerRef: id },
      select: {
        id: true,
        userId: true,
        diamonds: true,
        status: true,
        empireId: true,
        packageId: true,
        priceIls: true,
      },
    });
    if (!purchase || purchase.userId !== user.id) {
      return { ok: false, message: "לא נמצאה רכישה תואמת" };
    }
    if (purchase.status === "PAID") {
      // The webhook (or a double-click) got here first — report the credit that
      // already happened instead of a confusing failure.
      return {
        ok: true,
        diamonds: purchase.diamonds,
        message: `הרכישה כבר נזקפה: ${purchase.diamonds.toLocaleString("he-IL")} יהלומים.`,
      };
    }
    if (purchase.status !== "PENDING") {
      return { ok: false, message: "הרכישה כבר נסגרה. פנה לתמיכה אם חויבת." };
    }

    const capture = await provider.captureOrder(id);
    if (!capture.ok) {
      console.error("[paypal] capture failed:", capture.reason);
      await markDiamondPurchaseFailed({ purchaseId: purchase.id }, capture.reason);
      return {
        ok: false,
        message: capture.message ?? "התשלום לא הושלם — לא חויבת. נסה שוב.",
      };
    }

    // PayPal echoes our purchase id back as `custom_id`; if it disagrees with
    // the row this order was opened for, something is wrong with the order and
    // nothing gets credited.
    if (capture.purchaseId && capture.purchaseId !== purchase.id) {
      console.error(
        `[paypal] capture ${capture.captureId} custom_id ${capture.purchaseId} ≠ purchase ${purchase.id}`
      );
      return { ok: false, message: "אי-התאמה בפרטי התשלום. פנה לתמיכה." };
    }

    const settled = await settleDiamondPurchase({
      purchaseId: purchase.id,
      captureId: capture.captureId,
      amount: capture.amount,
      currency: capture.currency,
      userId: user.id,
    });

    switch (settled.outcome) {
      case "credited": {
        await logTestPurchase({
          user,
          provider,
          empireId: purchase.empireId,
          packageId: purchase.packageId,
          diamonds: purchase.diamonds,
          priceIls: purchase.priceIls,
        });
        revalidatePath("/game", "layout");
        return {
          ok: true,
          diamonds: settled.diamonds,
          message: provider.isTestMode
            ? `רכישת בדיקה: נזקפו ${settled.diamonds.toLocaleString("he-IL")} יהלומים.`
            : `נזקפו ${settled.diamonds.toLocaleString("he-IL")} יהלומים לחשבונך!`,
        };
      }
      case "already-settled":
        revalidatePath("/game", "layout");
        return {
          ok: true,
          diamonds: purchase.diamonds,
          message: `הרכישה כבר נזקפה: ${purchase.diamonds.toLocaleString("he-IL")} יהלומים.`,
        };
      case "mismatch":
        return { ok: false, message: "אי-התאמה בסכום התשלום. פנה לתמיכה." };
      default:
        return { ok: false, message: "לא נמצאה רכישה תואמת" };
    }
  } catch (err) {
    console.error("[paypal] captureDiamondOrder:", err);
    return { ok: false, message: "אירעה שגיאה בסיום התשלום. אם חויבת — פנה לתמיכה." };
  }
}
