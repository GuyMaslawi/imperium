import "server-only";

import { prisma } from "@/lib/prisma";
import { logError } from "@/server/errorLog";
import { asGrowProvider, growProvider } from "@/server/grow";
import { settleDiamondPurchase, type SettleOutcome } from "@/server/purchases";

/**
 * Settling a Grow order — the single code path both settlement triggers run
 * through.
 *
 * A hosted-checkout payment is announced twice, in a racing, unordered way:
 *
 * - the **buyer's browser** comes back to `/game/diamonds/buy/success`, and
 * - **Grow's server** POSTs `/api/pay/grow/[secret]`, possibly first, possibly
 *   twice, possibly an hour later after retries.
 *
 * Both call {@link settleGrowOrder}. Neither is trusted for anything but the
 * *identity* of the order: the amount and the paid/unpaid state come from asking
 * Grow directly (`captureOrder`), and the crediting itself goes through
 * `settleDiamondPurchase`, whose guarded PENDING→PAID flip means the loser of
 * the race credits nothing.
 *
 * Nothing here fails a purchase that merely isn't paid *yet*. A row stays
 * PENDING until Grow says the money moved, because the buyer may still be on the
 * payment page — marking it FAILED on the first look would make the real
 * callback, arriving seconds later, land on a row that can no longer be settled.
 */

export interface GrowSettleResult {
  outcome: SettleOutcome | "unconfigured" | "unverified" | "not-found";
  diamonds: number;
  purchaseId: string | null;
  /** Why verification did not go through, for the log / admin view. */
  reason?: string;
}

const NOTHING: GrowSettleResult = { outcome: "not-found", diamonds: 0, purchaseId: null };

/**
 * Verify one order against Grow and credit it if it is paid.
 *
 * @param ref.purchaseId our row id, as echoed back in `cField1`
 * @param ref.orderId    Grow's `processId`, stored as `providerRef`
 * @param ref.userId     set **only** on the browser-return path, where the row
 *                       must belong to the session that is asking. The callback
 *                       has no session and omits it.
 */
export async function settleGrowOrder(ref: {
  purchaseId?: string | null;
  orderId?: string | null;
  userId?: string | null;
}): Promise<GrowSettleResult> {
  const where = ref.purchaseId
    ? { id: ref.purchaseId }
    : ref.orderId
      ? { providerRef: ref.orderId }
      : null;
  if (!where) return NOTHING;

  const purchase = await prisma.diamondPurchase.findUnique({
    where,
    select: {
      id: true,
      userId: true,
      status: true,
      diamonds: true,
      providerRef: true,
      providerToken: true,
    },
  });
  if (!purchase) return NOTHING;

  // Ownership is checked *before* the gateway is asked anything, not just at
  // crediting time: `settleDiamondPurchase` would also refuse, but by then a
  // stranger's order id would already have been probed against Grow, turning
  // this into an oracle for whether someone else's payment went through.
  if (ref.userId && purchase.userId !== ref.userId) return NOTHING;

  if (purchase.status !== "PENDING") {
    return { outcome: "already-settled", diamonds: 0, purchaseId: purchase.id };
  }
  if (!purchase.providerRef) {
    return { outcome: "not-found", diamonds: 0, purchaseId: purchase.id };
  }

  const provider = asGrowProvider(growProvider());
  if (!provider) {
    // Credentials were pulled between opening the order and settling it. The
    // money may well have moved, so this is loud rather than silent — the row
    // stays PENDING and visible in /admin/purchases.
    await logError("grow.settle", new Error("Grow אינו מוגדר בזמן סגירת עסקה"), {
      path: "/api/pay/grow",
      userId: purchase.userId,
    });
    return { outcome: "unconfigured", diamonds: 0, purchaseId: purchase.id };
  }

  const capture = await provider.captureOrder({
    orderId: purchase.providerRef,
    token: purchase.providerToken,
  });
  if (!capture.ok) {
    // Expected on the browser path — the buyer can land on the success URL a
    // beat before Grow has finished booking the transaction. Left PENDING for
    // the callback (and its retries) to finish.
    return {
      outcome: "unverified",
      diamonds: 0,
      purchaseId: purchase.id,
      reason: capture.reason,
    };
  }

  const settled = await settleDiamondPurchase({
    purchaseId: purchase.id,
    orderId: purchase.providerRef,
    captureId: capture.captureId,
    amount: capture.amount,
    currency: capture.currency,
    userId: ref.userId ?? null,
  });

  // Tell Grow we took delivery, so it stops retrying the callback. Deliberately
  // after crediting and deliberately unawaited-for-correctness: the transaction
  // is already booked on their side either way.
  void provider
    .approveTransaction(purchase.providerRef, capture.captureId)
    .catch(() => undefined);

  return { outcome: settled.outcome, diamonds: settled.diamonds, purchaseId: settled.purchaseId };
}

/** What the buyer is told when they land back on our success page. */
export type GrowReturnStatus =
  /** Settled by this request — the diamonds are in the balance now. */
  | "credited"
  /** The callback got there first. Same happy ending, already booked. */
  | "already"
  /** Paid-but-unconfirmed: Grow has not (yet) said the money moved. */
  | "pending"
  /** No recent order at all — a stale bookmark or a direct visit. */
  | "none";

/**
 * How long after checkout a return from the payment page still refers to *that*
 * checkout. Long enough for a slow 3-D Secure round trip or a distracted buyer,
 * short enough that yesterday's abandoned order is never what the page reports
 * on.
 */
const RETURN_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * Settle whatever this buyer just paid for, on their return from Grow's page.
 *
 * The order is found by session rather than by anything in the URL: Grow's
 * `successUrl` carries no field we would be willing to trust anyway, and looking
 * up "this user's newest open order" is both simpler and unforgeable. The real
 * settlement guarantee is still the callback — this path only exists so the
 * diamonds are visible by the time the page paints, instead of a beat later.
 */
export async function settleGrowReturn(
  userId: string
): Promise<{ status: GrowReturnStatus; diamonds: number }> {
  const recent = await prisma.diamondPurchase.findFirst({
    where: {
      userId,
      provider: "grow",
      providerRef: { not: null },
      status: { in: ["PENDING", "PAID"] },
      createdAt: { gt: new Date(Date.now() - RETURN_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, diamonds: true },
  });
  if (!recent) return { status: "none", diamonds: 0 };
  if (recent.status === "PAID") return { status: "already", diamonds: recent.diamonds };

  const settled = await settleGrowOrder({ purchaseId: recent.id, userId });
  if (settled.outcome === "credited") return { status: "credited", diamonds: settled.diamonds };
  if (settled.outcome === "already-settled") {
    return { status: "already", diamonds: recent.diamonds };
  }
  // Anything else — unverified, mismatch, a gateway that is down — leaves the
  // row PENDING for the callback and its retries. The buyer is told it is being
  // confirmed rather than that it failed, because from here we genuinely do not
  // know that it did.
  return { status: "pending", diamonds: 0 };
}
