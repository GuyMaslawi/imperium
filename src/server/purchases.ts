import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Settlement of a real-money diamond purchase — the one place diamonds are
 * credited for money.
 *
 * Two call sites reach it and they can race: the capture the buyer's browser
 * triggers on approval (`captureDiamondOrder`) and PayPal's
 * `PAYMENT.CAPTURE.COMPLETED` webhook, which can arrive first, twice, or long
 * after. Both funnel through {@link settleDiamondPurchase}, whose PENDING→PAID
 * flip is a guarded `updateMany` inside the crediting transaction: whichever
 * call wins credits the diamonds, every other one finds `count === 0` and
 * credits nothing.
 */

export type SettleOutcome =
  /** This call flipped the row to PAID and credited the diamonds. */
  | "credited"
  /** Someone else already settled it (retry, second webhook, browser + webhook). */
  | "already-settled"
  /** No purchase row matches the reference — nothing to settle. */
  | "not-found"
  /** The captured money does not match what the row says was owed. */
  | "mismatch";

export interface SettleInput {
  /** Our purchase row id, as echoed back by the provider (`custom_id`). */
  purchaseId?: string | null;
  /** Provider order id stored on the row at creation time. */
  orderId?: string | null;
  /** Provider-side id of the money movement (PayPal capture id). */
  captureId: string;
  /** Amount actually captured. */
  amount: number;
  /** Currency actually captured. */
  currency: string;
  /**
   * When set, the row must belong to this user. The browser-side capture passes
   * it so one player can never settle (and be credited for) another's order;
   * the webhook has no session and omits it.
   */
  userId?: string | null;
}

export interface SettleResult {
  outcome: SettleOutcome;
  /** Diamonds credited by *this* call (0 unless the outcome is "credited"). */
  diamonds: number;
  purchaseId: string | null;
}

/** Money is compared in whole agorot — floats must not decide a payment. */
function agorot(value: number): number {
  return Math.round(value * 100);
}

/**
 * Credit a purchase against a completed capture. Never throws for an expected
 * condition — the outcome says what happened.
 */
export async function settleDiamondPurchase(input: SettleInput): Promise<SettleResult> {
  const where = input.purchaseId
    ? { id: input.purchaseId }
    : input.orderId
      ? { providerRef: input.orderId }
      : null;
  if (!where) return { outcome: "not-found", diamonds: 0, purchaseId: null };

  const purchase = await prisma.diamondPurchase.findUnique({ where });
  if (!purchase) return { outcome: "not-found", diamonds: 0, purchaseId: null };

  // A purchase found by provider reference must still be the one we opened for
  // this order — and, for a browser-side capture, must belong to the caller.
  if (input.orderId && purchase.providerRef && purchase.providerRef !== input.orderId) {
    return { outcome: "not-found", diamonds: 0, purchaseId: null };
  }
  if (input.userId && purchase.userId !== input.userId) {
    return { outcome: "not-found", diamonds: 0, purchaseId: null };
  }

  if (purchase.status !== "PENDING") {
    return { outcome: "already-settled", diamonds: 0, purchaseId: purchase.id };
  }

  // The amount is recomputed and stored server-side at order time, so a capture
  // that does not cover it means the order was tampered with or PayPal charged
  // something else entirely. Never credit on a mismatch.
  const underpaid = agorot(input.amount) < agorot(purchase.priceIls);
  const wrongCurrency = input.currency !== purchase.currency;
  if (underpaid || wrongCurrency) {
    await prisma.diamondPurchase.updateMany({
      where: { id: purchase.id, status: "PENDING" },
      data: {
        status: "FAILED",
        failureReason: `סכום/מטבע לא תואם: התקבל ${input.amount} ${input.currency}, נדרש ${purchase.priceIls} ${purchase.currency}`,
      },
    });
    return { outcome: "mismatch", diamonds: 0, purchaseId: purchase.id };
  }

  const empireId = purchase.empireId;

  try {
    const credited = await prisma.$transaction(async (tx) => {
      const settled = await tx.diamondPurchase.updateMany({
        where: { id: purchase.id, status: "PENDING" },
        data: {
          status: "PAID",
          captureRef: input.captureId,
          paidAt: new Date(),
          // The empire can have been deleted between checkout and settlement;
          // the money still moved, so the row settles as PAID and says why no
          // balance moved rather than silently swallowing a paid purchase.
          ...(empireId ? {} : { failureReason: "לא נזקפו יהלומים: האימפריה נמחקה" }),
        },
      });
      if (settled.count === 0) return false;
      if (empireId) {
        await tx.empire.update({
          where: { id: empireId },
          data: { diamonds: { increment: purchase.diamonds } },
        });
      }
      return true;
    });

    if (!credited) {
      return { outcome: "already-settled", diamonds: 0, purchaseId: purchase.id };
    }
    return {
      outcome: "credited",
      diamonds: empireId ? purchase.diamonds : 0,
      purchaseId: purchase.id,
    };
  } catch (err) {
    // `captureRef` is unique: a second settlement of the same capture against a
    // different row loses the race here rather than double-crediting.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { outcome: "already-settled", diamonds: 0, purchaseId: purchase.id };
    }
    throw err;
  }
}

/**
 * Mark a settled purchase as refunded/reversed (PayPal refund or chargeback).
 * Deliberately does not touch the empire's balance — the diamonds may already
 * be spent, and driving a balance negative would corrupt every guarded spend.
 * The row surfaces in /admin/purchases for a manual decision.
 */
export async function markDiamondPurchaseRefunded(
  captureId: string,
  reason: string
): Promise<boolean> {
  const updated = await prisma.diamondPurchase.updateMany({
    where: { captureRef: captureId, status: "PAID" },
    data: { status: "REFUNDED", refundedAt: new Date(), failureReason: reason },
  });
  return updated.count > 0;
}

/**
 * Mark a still-pending purchase as failed (capture denied). Guarded on PENDING
 * so it can never undo a settled purchase.
 */
export async function markDiamondPurchaseFailed(
  ref: { purchaseId?: string | null; orderId?: string | null; captureId?: string | null },
  reason: string
): Promise<boolean> {
  const where: Prisma.DiamondPurchaseWhereInput = ref.purchaseId
    ? { id: ref.purchaseId }
    : ref.orderId
      ? { providerRef: ref.orderId }
      : ref.captureId
        ? { captureRef: ref.captureId }
        : { id: "" };
  const updated = await prisma.diamondPurchase.updateMany({
    where: { ...where, status: "PENDING" },
    data: { status: "FAILED", failureReason: reason },
  });
  return updated.count > 0;
}
