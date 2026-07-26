import "server-only";

/**
 * Thin PayPal REST client (Orders v2 + webhook verification).
 *
 * Only the calls the diamond store needs: mint an OAuth token, create an order,
 * capture it, read it back, and verify a webhook signature. No SDK dependency —
 * PayPal's REST API is plain JSON over `fetch`.
 *
 * Configuration comes from the environment; the store falls back to the mock
 * provider whenever these are unset (see `@/server/payments`):
 *
 *   PAYPAL_CLIENT_ID       REST app client id     (developer.paypal.com → Apps)
 *   PAYPAL_CLIENT_SECRET   REST app secret
 *   PAYPAL_ENV             "sandbox" (default) | "live"
 *   PAYPAL_WEBHOOK_ID      webhook id, for signature verification (optional)
 *   PAYPAL_BRAND_NAME      name shown on the PayPal approval screen
 *
 * `PAYPAL_ENV=sandbox` means play money: purchases stay admin-only regardless of
 * `DIAMOND_PURCHASES_LIVE` (see `arePurchasesLive`), and every row is `isTest`.
 */

export type PaypalEnv = "sandbox" | "live";

export interface PaypalConfig {
  clientId: string;
  clientSecret: string;
  env: PaypalEnv;
  /** REST API host for the selected environment. */
  apiBase: string;
  /** Webhook id from the PayPal dashboard; null disables signature checks. */
  webhookId: string | null;
  /** Merchant name shown on the PayPal approval screen. */
  brandName: string;
}

/**
 * Resolved PayPal configuration, or null when the credentials are not set (the
 * store then keeps running on the mock provider).
 */
export function getPaypalConfig(): PaypalConfig | null {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const env: PaypalEnv =
    process.env.PAYPAL_ENV?.trim().toLowerCase() === "live" ? "live" : "sandbox";

  return {
    clientId,
    clientSecret,
    env,
    apiBase:
      env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
    webhookId: process.env.PAYPAL_WEBHOOK_ID?.trim() || null,
    brandName: process.env.PAYPAL_BRAND_NAME?.trim() || "IMPERIUM",
  };
}

/** A PayPal API call that came back non-2xx. Carries PayPal's debug id. */
export class PaypalApiError extends Error {
  constructor(
    readonly status: number,
    readonly issue: string | null,
    readonly debugId: string | null,
    message: string
  ) {
    super(message);
    this.name = "PaypalApiError";
  }
}

/* --------------------------------- auth ---------------------------------- */

interface TokenCache {
  key: string;
  token: string;
  expiresAt: number;
}

// Access tokens live ~9 hours; caching one per process saves a round-trip on
// every checkout. Keyed by client id + host so rotating credentials or flipping
// PAYPAL_ENV can never serve a token minted for the other account.
let tokenCache: TokenCache | null = null;

async function accessToken(cfg: PaypalConfig): Promise<string> {
  const key = `${cfg.apiBase}:${cfg.clientId}`;
  // 60s of slack so a token can't expire in flight between here and the call
  // that uses it.
  if (tokenCache && tokenCache.key === key && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const res = await fetch(`${cfg.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const body = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error_description?: string }
    | null;

  if (!res.ok || !body?.access_token) {
    throw new PaypalApiError(
      res.status,
      null,
      res.headers.get("paypal-debug-id"),
      body?.error_description ?? "PayPal token request failed"
    );
  }

  tokenCache = {
    key,
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 300) * 1000,
  };
  return body.access_token;
}

/** Authenticated JSON call against the PayPal REST API. Throws on non-2xx. */
async function paypalFetch<T>(
  cfg: PaypalConfig,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; requestId?: string }
): Promise<T> {
  const token = await accessToken(cfg);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  // PayPal's idempotency key: a retry of the same request id returns the
  // original result instead of creating/capturing a second time.
  if (init.requestId) headers["PayPal-Request-Id"] = init.requestId;

  const res = await fetch(`${cfg.apiBase}${path}`, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  const text = await res.text();
  const json = text ? safeParse(text) : null;

  if (!res.ok) {
    const err = json as {
      message?: string;
      name?: string;
      details?: { issue?: string; description?: string }[];
    } | null;
    const issue = err?.details?.[0]?.issue ?? err?.name ?? null;
    throw new PaypalApiError(
      res.status,
      issue,
      res.headers.get("paypal-debug-id"),
      err?.details?.[0]?.description ?? err?.message ?? `PayPal ${path} failed`
    );
  }

  return json as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* -------------------------------- orders --------------------------------- */

export interface CreateOrderInput {
  /** Our DiamondPurchase row id — echoed back on capture and in webhooks. */
  purchaseId: string;
  /** Amount to charge, in `currency` units (e.g. 69.9 → "69.90"). */
  amount: number;
  /** ISO-4217 code. Must be one PayPal supports (ILS is). */
  currency: string;
  /** Line description shown on the PayPal approval screen and the receipt. */
  description: string;
}

/** The money actually moved by a capture. */
export interface PaypalCapture {
  captureId: string;
  /** PayPal capture status — "COMPLETED" is the only one that means paid. */
  status: string;
  amount: number;
  currency: string;
  /** `custom_id` we set at create time — our DiamondPurchase row id. */
  purchaseId: string | null;
}

/**
 * Create a PayPal order for one diamond package. Returns the order id the
 * browser SDK hands to the approval flow.
 *
 * `custom_id` / `invoice_id` both carry our purchase row id: `custom_id` so the
 * capture and every webhook event points straight back at the row, `invoice_id`
 * so PayPal itself refuses a second payment against the same attempt.
 */
export async function createPaypalOrder(
  cfg: PaypalConfig,
  input: CreateOrderInput
): Promise<{ orderId: string; status: string }> {
  const order = await paypalFetch<{ id: string; status: string }>(
    cfg,
    "/v2/checkout/orders",
    {
      method: "POST",
      requestId: `order_${input.purchaseId}`,
      body: {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.purchaseId,
            custom_id: input.purchaseId,
            invoice_id: input.purchaseId,
            // PayPal caps the description at 127 chars and rejects longer ones.
            description: input.description.slice(0, 127),
            amount: {
              currency_code: input.currency,
              value: input.amount.toFixed(2),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: cfg.brandName,
              locale: "he-IL",
              landing_page: "LOGIN",
              // Digital goods — never ask for a shipping address, and label the
              // button "Pay now" so approval and payment are one step.
              shipping_preference: "NO_SHIPPING",
              user_action: "PAY_NOW",
            },
          },
        },
      },
    }
  );
  return { orderId: order.id, status: order.status };
}

interface OrderResponse {
  id: string;
  status: string;
  purchase_units?: {
    custom_id?: string;
    payments?: {
      captures?: {
        id: string;
        status: string;
        custom_id?: string;
        amount?: { currency_code?: string; value?: string };
      }[];
    };
  }[];
}

/** Pull the (single) capture out of an order/capture response. */
function readCapture(order: OrderResponse): PaypalCapture | null {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  if (!capture) return null;
  return {
    captureId: capture.id,
    status: capture.status,
    amount: Number(capture.amount?.value ?? "0"),
    currency: capture.amount?.currency_code ?? "",
    purchaseId: capture.custom_id ?? unit?.custom_id ?? null,
  };
}

/**
 * Capture an approved order — this is the call that moves the money.
 *
 * Idempotent from our side: PayPal answers a repeat with `ORDER_ALREADY_CAPTURED`,
 * which we resolve by reading the order back so a retried settlement still
 * reports the original capture instead of failing the purchase.
 */
export async function capturePaypalOrder(
  cfg: PaypalConfig,
  orderId: string
): Promise<PaypalCapture | null> {
  try {
    const res = await paypalFetch<OrderResponse>(
      cfg,
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      { method: "POST", requestId: `capture_${orderId}`, body: {} }
    );
    return readCapture(res);
  } catch (err) {
    if (err instanceof PaypalApiError && err.issue === "ORDER_ALREADY_CAPTURED") {
      return getPaypalOrder(cfg, orderId);
    }
    throw err;
  }
}

/** Read an order back, returning its capture if it has one. */
export async function getPaypalOrder(
  cfg: PaypalConfig,
  orderId: string
): Promise<PaypalCapture | null> {
  const res = await paypalFetch<OrderResponse>(
    cfg,
    `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    { method: "GET" }
  );
  return readCapture(res);
}

/* -------------------------------- webhooks -------------------------------- */

/**
 * Ask PayPal whether a webhook delivery really came from them.
 *
 * `event` must be the parsed *raw* body — re-serialising a re-parsed object is
 * fine (PayPal compares the canonical JSON), but the values must be untouched.
 * Returns false whenever verification cannot be completed, so an unverifiable
 * delivery is never treated as genuine.
 */
export async function verifyPaypalWebhook(
  cfg: PaypalConfig,
  headers: Headers,
  event: unknown
): Promise<boolean> {
  if (!cfg.webhookId) return false;

  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return false;
  }

  // The cert is fetched by PayPal's own verifier, but pinning the host keeps a
  // forged delivery from pointing the check at attacker-controlled material.
  let certHost: string;
  try {
    certHost = new URL(certUrl).hostname;
  } catch {
    return false;
  }
  if (certHost !== "api.paypal.com" && !certHost.endsWith(".paypal.com")) return false;

  try {
    const res = await paypalFetch<{ verification_status?: string }>(
      cfg,
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: {
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: cfg.webhookId,
          webhook_event: event,
        },
      }
    );
    return res.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
