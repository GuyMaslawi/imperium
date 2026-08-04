import type { NextRequest } from "next/server";

import { clientIp, rateLimit } from "@/lib/rateLimit";
import { logError } from "@/server/errorLog";
import { settleOrder } from "@/server/orderSettle";
import { payplusCallbackIsAuthentic } from "@/server/payplus";

/**
 * PayPlus's transaction callback.
 *
 * Reachable without a session, because that is the point: the buyer can close
 * the tab the instant they pay, and this call is what still credits them.
 *
 * ## What authenticates it
 *
 * **The signature.** PayPlus HMAC-SHA256s the body under our secret key and
 * sends the digest in the `hash` header. Nothing else about the request is
 * trusted, and the URL is a plain stable path — unlike the Grow route next
 * door, which has to hide behind an unguessable secret precisely *because* Grow
 * does not sign.
 *
 * A verified signature still does not decide what to credit. It proves the
 * message came from PayPlus; it does not prove the message is fresh, unique, or
 * about an order we should settle now. So the body is read only for the
 * *identity* of the order, and `settleOrder` re-asks PayPlus what the
 * transaction is actually worth before a single diamond moves.
 *
 * ## Status codes, and why they are what they are
 *
 * A transient failure answers 500 to buy a retry — that retry is the recovery
 * path for a deploy that was mid-rollout when the money moved. Anything a retry
 * cannot fix (bad signature, unparseable body, unknown order) answers without
 * inviting one.
 */

// Prisma and the gateway call both need the Node runtime; nothing here may be
// prerendered or cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pull the first non-empty string at any of these dotted paths. */
function pick(payload: unknown, paths: string[]): string {
  for (const path of paths) {
    let node: unknown = payload;
    for (const key of path.split(".")) {
      if (!node || typeof node !== "object") {
        node = undefined;
        break;
      }
      node = (node as Record<string, unknown>)[key];
    }
    if (typeof node === "string" && node) return node;
    if (typeof node === "number") return String(node);
  }
  return "";
}

async function handle(req: NextRequest) {
  // Throttled first, so a leaked or guessed URL cannot be used to grind
  // signatures (or to hammer PayPlus through us). Far above their retry rate.
  const ip = await clientIp();
  if (!(await rateLimit(`payplusCallback:${ip}`, 60, 60 * 1000))) {
    return new Response("Too Many Requests", { status: 429 });
  }

  // Read as text, not JSON: the signature covers the exact bytes PayPlus sent,
  // and parsing first would throw those bytes away.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (
    !payplusCallbackIsAuthentic(raw, req.headers.get("hash"), req.headers.get("user-agent"))
  ) {
    // 404, not 401: an unauthenticated prober learns nothing about whether a
    // payment callback lives here at all.
    return new Response("Not Found", { status: 404 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // `more_info` is our own purchase id, set at order time. It is read here only
  // to know *which* order to verify — never to decide what it is worth.
  const purchaseId = pick(payload, ["more_info", "transaction.more_info", "data.more_info"]);
  const orderId = pick(payload, ["payment_request_uid", "page_request_uid"]);
  if (!purchaseId && !orderId) {
    // Nothing identifies an order, so no retry will help. Acknowledged and
    // logged rather than retried into the void.
    // i18n-exempt: an operator-side error-log line.
    await logError("payplus.callback", new Error("קריאה ללא more_info/payment_request_uid"), {
      path: "/api/pay/payplus",
    });
    return new Response("OK", { status: 200 });
  }

  try {
    const result = await settleOrder({ purchaseId, orderId });

    // `unverified` means PayPlus's own lookup did not (yet) confirm the payment.
    // Answering 500 keeps the retry alive, which is exactly the recovery path
    // when the callback outruns the transaction's booking.
    if (result.outcome === "unverified" || result.outcome === "unconfigured") {
      await logError("payplus.callback", new Error(result.reason ?? result.outcome), {
        path: "/api/pay/payplus",
      });
      return new Response("Retry", { status: 500 });
    }

    if (result.outcome === "mismatch" || result.outcome === "not-found") {
      await logError(
        "payplus.callback",
        // i18n-exempt: an operator-side error-log line.
        new Error(`עסקה לא נזקפה (${result.outcome}) purchaseId=${result.purchaseId ?? "?"}`),
        { path: "/api/pay/payplus" }
      );
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    // A database blip is precisely what the gateway's retries are for.
    await logError("payplus.callback", err, { path: "/api/pay/payplus" });
    return new Response("Retry", { status: 500 });
  }
}

// PayPlus's reference documents the callback as a GET, but a GET carrying a
// signed JSON body is unusual enough that POST is accepted too rather than
// discovered the hard way on the first real payment. Both run the same handler,
// and both authenticate on the same signature over the same bytes.
export const GET = handle;
export const POST = handle;
