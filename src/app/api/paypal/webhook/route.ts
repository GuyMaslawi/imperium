import { revalidatePath } from "next/cache";
import { getPaypalConfig, verifyPaypalWebhook } from "@/server/paypal";
import {
  markDiamondPurchaseFailed,
  markDiamondPurchaseRefunded,
  settleDiamondPurchase,
} from "@/server/purchases";

/**
 * PayPal webhook endpoint — the safety net under the browser checkout.
 *
 * The happy path already credits diamonds from `captureDiamondOrder` while the
 * buyer waits. This handler exists for everything else: a browser that dies
 * between approval and capture, a capture PayPal completes asynchronously, and
 * refunds/chargebacks that happen days later with nobody watching. Settlement is
 * idempotent (`settleDiamondPurchase`), so a webhook that arrives before, after,
 * or twice alongside the in-page capture credits exactly once.
 *
 * Set it up at developer.paypal.com → your app → Webhooks:
 *   URL     https://<your-domain>/api/paypal/webhook
 *   Events  PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED,
 *           PAYMENT.CAPTURE.REFUNDED, PAYMENT.CAPTURE.REVERSED
 * then copy the generated webhook id into `PAYPAL_WEBHOOK_ID`.
 *
 * Every delivery is signature-verified against that id. Without it — or with a
 * signature that does not verify — the payload is discarded: this endpoint
 * credits real balances, so an unauthenticated caller must never reach the
 * settlement path.
 */

// Money settlement must never be served from a cache, and reads the raw body.
export const dynamic = "force-dynamic";

interface CaptureResource {
  id?: string;
  status?: string;
  custom_id?: string;
  invoice_id?: string;
  amount?: { currency_code?: string; value?: string };
  supplementary_data?: { related_ids?: { order_id?: string } };
}

interface WebhookEvent {
  id?: string;
  event_type?: string;
  resource?: CaptureResource;
}

export async function POST(request: Request): Promise<Response> {
  const cfg = getPaypalConfig();
  if (!cfg) return new Response("paypal not configured", { status: 404 });

  const raw = await request.text();
  let event: WebhookEvent;
  try {
    event = JSON.parse(raw) as WebhookEvent;
  } catch {
    return new Response("bad payload", { status: 400 });
  }

  const verified = await verifyPaypalWebhook(cfg, request.headers, event);
  if (!verified) {
    console.error(
      `[paypal] webhook ${event.id ?? "?"} (${event.event_type ?? "?"}) failed verification`
    );
    // 401 tells PayPal the delivery was rejected; it will retry, which is the
    // behaviour we want if PAYPAL_WEBHOOK_ID is simply misconfigured.
    return new Response("unverified", { status: 401 });
  }

  const resource = event.resource ?? {};
  const captureId = resource.id ?? null;
  const purchaseId = resource.custom_id ?? resource.invoice_id ?? null;
  const orderId = resource.supplementary_data?.related_ids?.order_id ?? null;

  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      if (!captureId) return ack();
      const settled = await settleDiamondPurchase({
        purchaseId,
        orderId,
        captureId,
        amount: Number(resource.amount?.value ?? "0"),
        currency: resource.amount?.currency_code ?? "",
      });
      if (settled.outcome === "credited") {
        // The buyer may be sitting on a stale /game layout (browser closed
        // mid-capture, then reopened) — drop the cached diamond counters.
        revalidatePath("/game", "layout");
      }
      if (settled.outcome === "mismatch" || settled.outcome === "not-found") {
        console.error(
          `[paypal] webhook capture ${captureId}: ${settled.outcome} (purchase ${purchaseId ?? "?"}, order ${orderId ?? "?"})`
        );
      }
      return ack();
    }

    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED": {
      await markDiamondPurchaseFailed(
        { purchaseId, orderId, captureId },
        `PayPal: ${event.event_type}`
      );
      return ack();
    }

    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED": {
      // On a refund the resource is the *refund*; the capture it reverses is in
      // related_ids. Fall back to the resource id for reversals.
      const refundedCapture =
        (resource.supplementary_data?.related_ids as { capture_id?: string } | undefined)
          ?.capture_id ?? captureId;
      if (refundedCapture) {
        const hit = await markDiamondPurchaseRefunded(
          refundedCapture,
          `PayPal: ${event.event_type}`
        );
        if (hit) {
          console.error(
            `[paypal] purchase refunded (capture ${refundedCapture}) — diamonds NOT clawed back, review in /admin/purchases`
          );
        }
      }
      return ack();
    }

    default:
      return ack();
  }
}

/** PayPal retries anything that is not a 2xx, so acknowledge what we handled. */
function ack(): Response {
  return new Response("ok", { status: 200 });
}
