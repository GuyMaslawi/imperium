import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { STORE_CURRENCY } from "@/lib/game/diamondStore";
import { appBaseUrl } from "@/server/mailer";
import type {
  CaptureResult,
  OrderInput,
  OrderPaymentProvider,
  OrderRef,
  OrderResult,
} from "@/server/payments";

/**
 * PayPlus — the gateway the diamond store settles through.
 *
 * Chosen over Grow on 2026-08-03 for one reason: Grow charges ₪500/month for
 * API access and PayPlus charges ₪29.9. PayPlus is a *gateway only*, so the
 * card commission lives in a separate acquirer contract (1.2% domestic) rather
 * than in the gateway's price — none of which this file cares about, but it is
 * why `grow.ts` is still in the tree and no longer selected.
 *
 * ## The flow, and where trust lives
 *
 * 1. `createOrder` POSTs `PaymentPages/generateLink` and gets back a hosted
 *    page URL plus a `page_request_uid`. The buyer is redirected there.
 * 2. The buyer pays on PayPlus's page.
 * 3. PayPlus GETs our callback, and separately returns the browser to
 *    `refURL_success`.
 * 4. **PayPlus signs its callback** — HMAC-SHA256 of the body under our secret
 *    key, in the `hash` header (see {@link payplusCallbackIsAuthentic}). That is
 *    a real improvement over Grow, whose callback is unsigned.
 *
 * Even so, the callback body is still not the source of the *amount*. The
 * signature proves the message came from PayPlus; it does not prove the message
 * is the one we should credit against, and a verified message can still arrive
 * twice, out of order, or for an order that was already settled. So both the
 * callback and the browser return go through {@link PayPlusProvider.captureOrder},
 * which asks PayPlus directly what the transaction is worth, and only that
 * answer reaches `settleDiamondPurchase`. The signature is a gate on the door;
 * it is not a reason to skip counting the money.
 *
 * ## Configuration
 *
 * ```
 * PAYPLUS_API_KEY     from the PayPlus panel
 * PAYPLUS_SECRET_KEY  from the PayPlus panel — also the HMAC key for callbacks
 * PAYPLUS_PAGE_UID    `payment_page_uid` of the payment page to charge on
 * PAYPLUS_ENV         "staging" (default) | "production"
 * ```
 *
 * There is no callback secret to invent here, unlike Grow: the HMAC *is* the
 * authentication, so `/api/pay/payplus` is a plain, stable URL.
 *
 * ## What to confirm before the first real charge
 *
 * Marked `VERIFY:` below: the success status code (`"000"` per the callback
 * docs). It fails **closed** — an unrecognised status is "not paid", so the
 * worst case is a real payment sitting PENDING in /admin/purchases, which is
 * recoverable. The opposite default is not.
 */

/* --------------------------------- config --------------------------------- */

const STAGING_BASE = "https://restapidev.payplus.co.il/api/v1.0";
const PRODUCTION_BASE = "https://restapi.payplus.co.il/api/v1.0";

/**
 * Transaction status codes that mean the money moved.
 *
 * VERIFY: `"000"` is what PayPlus's callback reference documents as success.
 * Anything else — including an empty status — is treated as unpaid.
 */
const PAID_STATUS_CODES = new Set(["000"]);

/** PayPlus stamps its own callbacks with this User-Agent. */
const CALLBACK_USER_AGENT = "PayPlus";

/**
 * `vat_type` on an invoice line: 0 = VAT included, 1 = VAT not included,
 * 2 = **exempt from VAT** — which is what an עוסק פטור sells under.
 */
const VAT_EXEMPT = 2;

/** How long a PayPlus call may hang before the checkout gives up on it. */
const REQUEST_TIMEOUT_MS = 15_000;

export type PayPlusEnv = "staging" | "production";

export interface PayPlusConfig {
  apiKey: string;
  secretKey: string;
  pageUid: string;
  env: PayPlusEnv;
}

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function payplusEnv(): PayPlusEnv {
  return readEnv("PAYPLUS_ENV").toLowerCase() === "production" ? "production" : "staging";
}

/**
 * Whether PayPlus is configured, and what is missing if it is not.
 *
 * `partial` is its own state on purpose. A deploy with two of the three
 * credentials set is a deploy that *meant* to take money and silently is not —
 * so it is surfaced by name in the admin's go-live blockers instead of being
 * flattened into "no provider configured".
 */
export function payplusConfigStatus():
  | { state: "unset"; missing: string[]; env: PayPlusEnv }
  | { state: "partial"; missing: string[]; env: PayPlusEnv }
  | { state: "ready"; missing: never[]; env: PayPlusEnv; config: PayPlusConfig } {
  const env = payplusEnv();
  const apiKey = readEnv("PAYPLUS_API_KEY");
  const secretKey = readEnv("PAYPLUS_SECRET_KEY");
  const pageUid = readEnv("PAYPLUS_PAGE_UID");

  const missing: string[] = [];
  if (!apiKey) missing.push("PAYPLUS_API_KEY");
  if (!secretKey) missing.push("PAYPLUS_SECRET_KEY");
  if (!pageUid) missing.push("PAYPLUS_PAGE_UID");

  if (missing.length === 3) return { state: "unset", missing, env };
  if (missing.length > 0) return { state: "partial", missing, env };
  return { state: "ready", missing: [], env, config: { apiKey, secretKey, pageUid, env } };
}

/** The configured PayPlus setup, or null while it is unset or incomplete. */
export function payplusConfig(): PayPlusConfig | null {
  const status = payplusConfigStatus();
  return status.state === "ready" ? status.config : null;
}

/* ---------------------------- callback signature --------------------------- */

/** Constant-time string compare that never throws on length mismatch. */
function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Is this inbound callback genuinely from PayPlus?
 *
 * PayPlus signs the body with HMAC-SHA256 under the account's secret key and
 * sends the base64 digest in the `hash` header, alongside a `PayPlus`
 * User-Agent. This is the entire authentication of the endpoint, so it is
 * compared in constant time and refuses everything it cannot positively verify —
 * including the case where PayPlus is unconfigured, which would otherwise let an
 * un-keyed deploy accept any request at all.
 *
 * The digest is computed over the **raw body text**, because that is the only
 * byte sequence we know PayPlus actually hashed. Their own sample re-stringifies
 * a parsed body, and `JSON.parse` → `JSON.stringify` is not always the identity
 * (whitespace, escaping, number formatting), so that variant is tried second
 * rather than instead — a signature that matches either reading is authentic,
 * and one that matches neither is not.
 */
export function payplusCallbackIsAuthentic(
  rawBody: string,
  hashHeader: string | null,
  userAgent: string | null
): boolean {
  const secret = payplusConfig()?.secretKey;
  if (!secret || !hashHeader || !rawBody) return false;
  if (userAgent !== CALLBACK_USER_AGENT) return false;

  const digest = (message: string) =>
    createHmac("sha256", secret).update(message, "utf8").digest("base64");

  if (sameSecret(digest(rawBody), hashHeader)) return true;

  try {
    return sameSecret(digest(JSON.stringify(JSON.parse(rawBody))), hashHeader);
  } catch {
    return false;
  }
}

/* ------------------------------- transport -------------------------------- */

/** PayPlus wraps every answer in `{ results: {...}, data: {...} }`. */
interface PayPlusEnvelope {
  results?: { status?: string; code?: number | string; description?: string };
  data?: unknown;
}

type PayPlusCall = { ok: true; data: unknown } | { ok: false; reason: string };

function baseUrl(env: PayPlusEnv): string {
  return env === "production" ? PRODUCTION_BASE : STAGING_BASE;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

/**
 * POST one PayPlus call. JSON body, credentials in headers.
 *
 * Never throws: a gateway that is down, slow or shouting HTML is a `reason`
 * string, because every caller is on a path where an exception would either
 * abandon a PENDING row or 500 a webhook PayPlus would then retry.
 */
async function payplusPost(
  config: PayPlusConfig,
  endpoint: string,
  body: unknown
): Promise<PayPlusCall> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl(config.env)}/${endpoint}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": config.apiKey,
        "secret-key": config.secretKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    // i18n-exempt: a `reason` string, logged and shown only in the control
    // centre when a charge is investigated — never rendered to the buyer.
    return { ok: false, reason: `${endpoint}: הבקשה לספק נכשלה (${str(err)})` };
  }

  let payload: PayPlusEnvelope;
  try {
    payload = (await res.json()) as PayPlusEnvelope;
  } catch {
    // i18n-exempt: an operator-side `reason` — see above.
    return { ok: false, reason: `${endpoint}: תשובה לא תקינה מהספק (HTTP ${res.status})` };
  }

  // PayPlus answers HTTP 200 with a failing `results.status` for business
  // errors, so the envelope — not the status line — decides.
  if (payload.results?.status !== "success") {
    // i18n-exempt: an operator-side `reason` — see above.
    const detail = payload.results?.description || "ללא פירוט";
    return { ok: false, reason: `${endpoint}: ${detail} (code ${str(payload.results?.code)})` };
  }

  return { ok: true, data: payload.data };
}

/* ------------------------------ field mapping ------------------------------ */

/**
 * Trim free text to something a payment page and a receipt can carry.
 *
 * Much lighter than Grow's scrub: PayPlus takes a JSON body, so there is no
 * character class to dodge — only a length to respect and control characters to
 * strip so a stray newline cannot break a receipt line.
 */
export function payplusText(value: string, max = 80): string {
  return value
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Extract the transaction rows from a `Transactions/View` answer. */
function transactionRows(data: unknown): Record<string, unknown>[] {
  const list = Array.isArray(data) ? data : data ? [data] : [];
  const rows: Record<string, unknown>[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const tx = (entry as Record<string, unknown>).transaction;
    if (tx && typeof tx === "object") rows.push(tx as Record<string, unknown>);
  }
  return rows;
}

/* -------------------------------- provider -------------------------------- */

export class PayPlusProvider implements OrderPaymentProvider {
  readonly kind = "order" as const;
  readonly name = "payplus";
  readonly isTestMode: boolean;

  constructor(private readonly config: PayPlusConfig) {
    // The staging host settles nothing, so its charges are test charges — this
    // is what keeps `arePurchasesLive()` shut while pointed at staging, and what
    // flags the rows `isTest` so staging runs never land in a revenue figure.
    this.isTestMode = config.env !== "production";
  }

  /** Where PayPlus reports the result of a payment. Authenticated by HMAC, not by the URL. */
  callbackUrl(): string {
    return `${appBaseUrl()}/api/pay/payplus`;
  }

  async createOrder(input: OrderInput): Promise<OrderResult> {
    const base = appBaseUrl();
    const amount = Math.round(input.amountIls * 100) / 100;
    const body = {
      payment_page_uid: this.config.pageUid,
      // Whole agorot. A float with a trailing 0.00000001 is a mismatch at
      // settlement time, where the comparison is exact.
      amount,
      currency_code: STORE_CURRENCY,
      language_code: "he",
      // Payment *confirmation* mail. Not the tax receipt — that is a separate
      // PayPlus module ("חשבוניות דיגיטליות") which has to be subscribed and
      // switched on for this payment page before any document is issued at all.
      sendEmailApproval: true,
      sendEmailFailure: false,
      // ---------------------------------------------------------------- VAT
      // The operator is an **עוסק פטור**: exempt from charging VAT. Left to its
      // default, PayPlus would issue every receipt with VAT broken out — a wrong
      // tax document, on every sale, that someone would have to unwind with
      // רשות המסים afterwards.
      //
      // This costs nothing while the invoicing module is off (no document is
      // produced either way), which is exactly why it is set now rather than
      // discovered on the first real sale.
      //
      // VERIFY on the first issued receipt that it shows no VAT line. If the
      // business ever becomes an עוסק מורשה this flips to `true` and
      // `VAT_EXEMPT` below becomes 0 ("VAT included") — the prices in
      // DIAMOND_PACKAGES are consumer-facing and therefore already VAT-inclusive.
      paying_vat: false,
      items: [
        {
          name: payplusText(input.description, 80),
          quantity: 1,
          price: amount,
          vat_type: VAT_EXEMPT,
        },
      ],
      // `charge_method` is deliberately omitted so the page's own configured
      // method applies. The documented enum is ambiguous about which number is a
      // plain charge, and guessing wrong here means either a J2-style
      // authorisation that never captures, or a refund. Set it in the panel.
      //
      // Our purchase row id, echoed back on the callback *and* the only handle
      // `Transactions/View` gives us on this order — see `captureOrder`.
      more_info: input.purchaseId,
      refURL_success: `${base}/game/diamonds/buy/success`,
      refURL_failure: `${base}/game/diamonds/buy/cancel`,
      refURL_cancel: `${base}/game/diamonds/buy/cancel`,
      refURL_callback: this.callbackUrl(),
      customer: {
        customer_name: payplusText(input.buyer.name),
        email: input.buyer.email,
        phone: input.buyer.phone,
      },
    };

    const call = await payplusPost(this.config, "PaymentPages/generateLink", body);
    if (!call.ok) return { ok: false, reason: call.reason };

    const data = (call.data ?? {}) as Record<string, unknown>;
    const redirectUrl = str(data.payment_page_link);
    const orderId = str(data.page_request_uid);
    if (!redirectUrl || !orderId) {
      // i18n-exempt: an operator-side `reason`.
      return { ok: false, reason: "generateLink: חסרים payment_page_link/page_request_uid בתשובה" };
    }

    // No token: PayPlus authenticates every lookup with the account credentials
    // in the headers, so there is no per-order secret to carry.
    return { ok: true, orderId, redirectUrl, token: null };
  }

  async captureOrder(ref: OrderRef): Promise<CaptureResult> {
    // Looked up by `more_info` — our own purchase id — and not by the order id
    // we stored. `page_request_uid` identifies the payment *page request*, and
    // `Transactions/View` does not accept it; the transaction it produced is a
    // different object with its own uid that we never see until it exists. The
    // merchant reference is the only thread that spans both.
    const reference = ref.purchaseId;
    if (!reference) {
      // i18n-exempt: an operator-side `reason`.
      return { ok: false, reason: "אין מזהה רכישה לאימות מול הספק" };
    }

    const call = await payplusPost(this.config, "Transactions/View", { more_info: reference });
    if (!call.ok) return { ok: false, reason: call.reason };

    const rows = transactionRows(call.data);
    // A page can be paid once, but a buyer who failed and retried on the same
    // link leaves several rows under one reference. Only a successful,
    // uncancelled one may settle — and the first such row is the payment.
    const paid = rows.find(
      (tx) => PAID_STATUS_CODES.has(str(tx.status_code)) && !tx.transaction_is_cancelled
    );
    if (!paid) {
      const seen = rows.map((tx) => str(tx.status_code)).join(",") || "אין עסקאות";
      return {
        ok: false,
        // i18n-exempt: an operator-side `reason`.
        reason: `העסקה אינה במצב שולם (status_code=${seen})`,
        message: "התשלום לא הושלם. אם חויבת, פנה לתמיכה ונטפל בזה.",
      };
    }

    const captureId = str(paid.transaction_uid);
    if (!captureId) {
      // i18n-exempt: an operator-side `reason`.
      return { ok: false, reason: "Transactions/View: חסר transaction_uid בתשובה" };
    }

    const amount = Number(paid.amount);
    if (!Number.isFinite(amount)) {
      // i18n-exempt: an operator-side `reason`.
      return { ok: false, reason: `Transactions/View: amount לא מספרי (${str(paid.amount)})` };
    }

    return {
      ok: true,
      captureId,
      amount,
      // Defaulted rather than assumed: the row carries its own currency, and
      // `settleDiamondPurchase` refuses to credit a purchase whose currency does
      // not match what was quoted.
      currency: str(paid.currency) || STORE_CURRENCY,
      purchaseId: str(paid.more_info) || reference,
    };
  }

  // No `acknowledge`: PayPlus treats the callback's HTTP 200 as delivery, so
  // there is nothing to call back. Grow needs one; the seam makes it optional
  // precisely so this provider can leave it out rather than stub it.
}

/**
 * The PayPlus provider, or null when it is not fully configured.
 *
 * A *partial* configuration also returns null: a provider missing its page uid
 * would fail every checkout with a gateway error, which is strictly worse than
 * staying on the mock. The gap is reported instead — see `payplusConfigStatus`
 * and `purchaseBlockers`.
 */
export function payplusProvider(): OrderPaymentProvider | null {
  const config = payplusConfig();
  return config ? new PayPlusProvider(config) : null;
}
