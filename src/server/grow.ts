import "server-only";

import { STORE_CURRENCY } from "@/lib/game/diamondStore";
import { appBaseUrl } from "@/server/mailer";
import { getT } from "@/i18n/server";
import type {
  CaptureResult,
  OrderInput,
  OrderPaymentProvider,
  OrderRef,
  OrderResult,
} from "@/server/payments";

/**
 * Grow (formerly Meshulam) — the Israeli gateway the diamond store settles
 * through. Written against Grow's "Light API": a hosted payment page plus a
 * server-to-server callback.
 *
 * ## The flow, and where trust lives
 *
 * 1. `createOrder` POSTs `createPaymentProcess` and gets back a hosted page URL
 *    plus a `processId` / `processToken` pair. The buyer is redirected there.
 * 2. The buyer pays on Grow's page (card / Bit / Apple Pay / Google Pay).
 * 3. Grow POSTs our callback and, separately, returns the browser to
 *    `successUrl`.
 * 4. **Neither of those may be believed.** Grow does not sign its callback, so
 *    the callback body is treated as a bare notification — it tells us *which*
 *    order to look at and nothing more. Both the callback and the browser
 *    return call {@link GrowProvider.captureOrder}, which asks Grow directly
 *    what the order is worth, and only that answer reaches
 *    `settleDiamondPurchase`.
 *
 * That is the whole security model, and it is why the amount is never read out
 * of a request body: an unsigned callback is a public endpoint, and a public
 * endpoint that credits diamonds off its own `sum` field is a free diamond
 * printer for anyone who guesses the URL.
 *
 * ## Configuration
 *
 * ```
 * GROW_USER_ID          Grow's id for the business        (from the Grow panel)
 * GROW_PAGE_CODE        Grow's id for the payment page    (from the Grow panel)
 * GROW_CALLBACK_SECRET  ≥24 chars, [A-Za-z0-9] only — the unguessable path
 *                       segment the callback arrives on. Generate with
 *                       `openssl rand -hex 24`. Never reuse another secret.
 * GROW_ENV              "sandbox" (default) | "production"
 * GROW_PAYMENT_METHODS  optional, comma-separated (default "1,6,13,14")
 * ```
 *
 * The secret lives in the *path*, not a query string, because Grow rejects
 * "special characters" in `notifyUrl` — `?` and `=` included.
 *
 * ## What to re-check against the panel before the first real charge
 *
 * Grow's public docs pin down `createPaymentProcess` and the callback payload,
 * but leave the order-lookup parameters and the status-code table underspecified.
 * Both are marked below with `VERIFY:`. Everything unverified fails **closed** —
 * an unrecognised status is "not paid", so the worst case is a real payment
 * sitting PENDING in /admin/purchases, which is recoverable. The opposite
 * default is not.
 */

/* --------------------------------- config --------------------------------- */

const SANDBOX_BASE = "https://sandbox.meshulam.co.il/api/light/server/1.0";
const PRODUCTION_BASE = "https://api.meshulam.co.il/api/light/server/1.0";

/**
 * Payment methods offered on the hosted page: credit card, Bit, Apple Pay,
 * Google Pay. Bit and the wallets are half the reason Grow was chosen over a
 * card-only acquirer, so they are on by default rather than opt-in.
 */
const DEFAULT_PAYMENT_METHODS = [1, 6, 13, 14];

/**
 * Status codes that mean the money moved.
 *
 * VERIFY: taken from Grow's documented callback example (`statusCode: "2"`,
 * `status: "שולם"`). Confirm the full table in the panel before go-live —
 * anything not listed here is treated as unpaid.
 */
const PAID_STATUS_CODES = new Set(["2"]);

/** A callback secret has to survive being a URL path segment, and be unguessable. */
const SECRET_PATTERN = /^[A-Za-z0-9]{24,}$/;

export type GrowEnv = "sandbox" | "production";

export interface GrowConfig {
  userId: string;
  pageCode: string;
  callbackSecret: string;
  env: GrowEnv;
  paymentMethods: number[];
}

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function growEnv(): GrowEnv {
  return readEnv("GROW_ENV").toLowerCase() === "production" ? "production" : "sandbox";
}

function paymentMethods(): number[] {
  const raw = readEnv("GROW_PAYMENT_METHODS");
  if (!raw) return DEFAULT_PAYMENT_METHODS;
  const parsed = raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
  return parsed.length > 0 ? parsed : DEFAULT_PAYMENT_METHODS;
}

/**
 * Whether Grow is configured, and what is missing if it is not.
 *
 * `partial` is its own state on purpose. A deploy with two of the three
 * credentials set is a deploy that *meant* to take money and silently is not —
 * so it is surfaced by name in the admin's go-live blockers instead of being
 * flattened into "no provider configured".
 */
export function growConfigStatus():
  | { state: "unset"; missing: string[]; env: GrowEnv }
  | { state: "partial"; missing: string[]; env: GrowEnv }
  | { state: "ready"; missing: never[]; env: GrowEnv; config: GrowConfig } {
  const env = growEnv();
  const userId = readEnv("GROW_USER_ID");
  const pageCode = readEnv("GROW_PAGE_CODE");
  const secret = readEnv("GROW_CALLBACK_SECRET");

  const missing: string[] = [];
  if (!userId) missing.push("GROW_USER_ID");
  if (!pageCode) missing.push("GROW_PAGE_CODE");
  // A secret that exists but is too short or has URL-hostile characters is
  // *missing*, not merely weak: a guessable callback path is the one thing
  // standing between an unsigned public endpoint and a stranger, and Grow will
  // not deliver to a notifyUrl it considers malformed.
  if (!SECRET_PATTERN.test(secret)) missing.push("GROW_CALLBACK_SECRET");

  if (missing.length === 3) return { state: "unset", missing, env };
  if (missing.length > 0) return { state: "partial", missing, env };
  return {
    state: "ready",
    missing: [],
    env,
    config: { userId, pageCode, callbackSecret: secret, env, paymentMethods: paymentMethods() },
  };
}

/** The configured Grow setup, or null while it is unset or incomplete. */
export function growConfig(): GrowConfig | null {
  const status = growConfigStatus();
  return status.state === "ready" ? status.config : null;
}

/**
 * Constant-time comparison of the secret in an inbound callback URL.
 *
 * Timing-safe because the alternative leaks the secret one character at a time
 * to anyone willing to time a few thousand requests, and this secret is the
 * only thing authenticating the endpoint.
 */
export function growCallbackSecretMatches(candidate: string): boolean {
  const expected = growConfig()?.callbackSecret;
  if (!expected || !candidate) return false;
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
  }
  return diff === 0;
}

/* ------------------------------- transport -------------------------------- */

/** Grow's response envelope: `status` "1" on success, details under `data`. */
interface GrowEnvelope {
  status?: string | number;
  err?: unknown;
  data?: Record<string, unknown>;
}

type GrowCall =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: string };

/** How long a Grow call may hang before the checkout gives up on it. */
const REQUEST_TIMEOUT_MS = 15_000;

function baseUrl(env: GrowEnv): string {
  return env === "production" ? PRODUCTION_BASE : SANDBOX_BASE;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

/**
 * POST one Light API call. Grow takes `multipart/form-data`, not JSON — passing
 * JSON gets a generic failure that looks like bad credentials, which is an
 * afternoon nobody needs to spend twice.
 *
 * Never throws: a gateway that is down, slow or shouting HTML is a `reason`
 * string, because every caller is on a path where an exception would either
 * abandon a PENDING row or 500 a webhook Grow would then retry six times.
 */
async function growPost(
  env: GrowEnv,
  endpoint: string,
  fields: Record<string, string | number>
): Promise<GrowCall> {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    body.append(key, String(value));
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl(env)}/${endpoint}`, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    // i18n-exempt: a `reason` string, logged and shown only in the control
    // centre when a charge is investigated — never rendered to the buyer, who
    // gets the translated `message` instead.
    return { ok: false, reason: `${endpoint}: הבקשה לספק נכשלה (${str(err)})` };
  }

  let payload: GrowEnvelope;
  try {
    payload = (await res.json()) as GrowEnvelope;
  } catch {
    // i18n-exempt: an operator-side `reason` — see above.
    return { ok: false, reason: `${endpoint}: תשובה לא תקינה מהספק (HTTP ${res.status})` };
  }

  // Grow answers HTTP 200 with `status: 0` for business errors, so the envelope
  // — not the status line — decides.
  if (str(payload.status) !== "1") {
    const err = payload.err;
    const detail =
      // i18n-exempt: an operator-side `reason` — see above.
      typeof err === "string" ? err : err ? JSON.stringify(err).slice(0, 300) : "ללא פירוט";
    return { ok: false, reason: `${endpoint}: ${detail}` };
  }

  return { ok: true, data: payload.data ?? {} };
}

/* ------------------------------ field mapping ------------------------------ */

/**
 * Grow rejects "special characters" in the free-text fields it puts on the
 * payment page and the receipt. Rather than discover which ones at underwriting
 * time, everything outside letters/digits/spaces and a couple of safe marks is
 * dropped — the description is decoration on a page whose numbers all come from
 * structured fields.
 */
export function growSafeText(value: string, max = 60): string {
  return value
    .replace(/[^\p{L}\p{N} .,'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Israeli mobile in the `0500000000` shape Grow validates against, or null if
 * the input cannot be one. Accepts what people actually type — spaces, dashes,
 * and the +972 international form.
 */
export function growPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) digits = `0${digits.slice(3)}`;
  return /^05\d{8}$/.test(digits) ? digits : null;
}

/**
 * A full name with at least two parts — Grow's payment page rejects a single
 * name, and the receipt an עוסק פטור issues needs a real one anyway.
 */
export function growFullName(raw: string): string | null {
  const clean = growSafeText(raw, 80);
  return clean.split(" ").filter(Boolean).length >= 2 ? clean : null;
}

/* -------------------------------- provider -------------------------------- */

export class GrowProvider implements OrderPaymentProvider {
  readonly kind = "order" as const;
  readonly name = "grow";
  readonly isTestMode: boolean;

  constructor(private readonly config: GrowConfig) {
    // The sandbox host settles nothing, so its charges are test charges — this
    // is what keeps `arePurchasesLive()` shut while pointed at sandbox, and what
    // flags the rows `isTest` so sandbox runs never land in a revenue figure.
    this.isTestMode = config.env !== "production";
  }

  /** Where Grow posts the result of a payment. Path-embedded secret — see above. */
  callbackUrl(): string {
    return `${appBaseUrl()}/api/pay/grow/${this.config.callbackSecret}`;
  }

  async createOrder(input: OrderInput): Promise<OrderResult> {
    const name = growFullName(input.buyer.name);
    const phone = growPhone(input.buyer.phone);
    // Validated here rather than only at the form, because this is the boundary
    // Grow actually enforces: a bad name reaches it as an opaque "process
    // failed" long after a PENDING row was opened.
    // i18n-exempt-start: operator-side `reason` strings — the checkout form
    // validates the same two fields and shows the buyer a translated refusal.
    if (!name) return { ok: false, reason: "שם מלא לא תקין (נדרשים שם פרטי ושם משפחה)" };
    if (!phone) return { ok: false, reason: "מספר טלפון נייד לא תקין" }; // i18n-exempt-end

    const base = appBaseUrl();
    const fields: Record<string, string | number> = {
      userId: this.config.userId,
      pageCode: this.config.pageCode,
      // Whole agorot. A float with a trailing 0.00000001 is a mismatch at
      // settlement time, where the comparison is exact.
      sum: (Math.round(input.amountIls * 100) / 100).toFixed(2),
      description: growSafeText(input.description),
      successUrl: `${base}/game/diamonds/buy/success`,
      cancelUrl: `${base}/game/diamonds/buy/cancel`,
      notifyUrl: this.callbackUrl(),
      "pageField[fullName]": name,
      "pageField[phone]": phone,
      "pageField[email]": input.buyer.email,
      chargeType: 1,
      paymentNum: 1,
      // Our purchase row id, echoed back on the callback. It is the only thing
      // tying Grow's notification to a row of ours, and it is *not* a secret —
      // the callback is verified by re-asking Grow, never by recognising this.
      cField1: input.purchaseId,
    };
    this.config.paymentMethods.forEach((method, i) => {
      fields[`transactionTypes[${i}]`] = method;
    });

    const call = await growPost(this.config.env, "createPaymentProcess", fields);
    if (!call.ok) return { ok: false, reason: call.reason };

    const redirectUrl = str(call.data.url);
    const orderId = str(call.data.processId);
    const token = str(call.data.processToken);
    if (!redirectUrl || !orderId || !token) {
      // i18n-exempt: an operator-side `reason` — see above.
      return { ok: false, reason: "createPaymentProcess: חסרים url/processId/processToken בתשובה" };
    }

    return { ok: true, orderId, redirectUrl, token };
  }

  async captureOrder(ref: OrderRef): Promise<CaptureResult> {
    const t = await getT();
    if (!ref.token) {
      // i18n-exempt: an operator-side `reason` — see above.
      return { ok: false, reason: "אין processToken לאימות מול הספק" };
    }

    // VERIFY: parameter names for the order lookup are not pinned down in
    // Grow's public docs. `pageCode` + `processId` + `processToken` is the
    // documented shape everywhere it appears; confirm in the panel before the
    // first real charge. A wrong name surfaces as a business error here, which
    // fails closed (the purchase stays PENDING and shows in /admin/purchases).
    const call = await growPost(this.config.env, "getPaymentProcessInfo", {
      pageCode: this.config.pageCode,
      processId: ref.orderId,
      processToken: ref.token,
    });
    if (!call.ok) return { ok: false, reason: call.reason };

    const statusCode = str(call.data.statusCode);
    if (!PAID_STATUS_CODES.has(statusCode)) {
      return {
        ok: false,
        // i18n-exempt: an operator-side `reason`; the buyer reads `message`.
        reason: `העסקה אינה במצב שולם (statusCode=${statusCode || "?"})`,
        message: t("התשלום לא הושלם. אם חויבת, פנה לתמיכה ונטפל בזה."),
      };
    }

    const captureId = str(call.data.transactionId);
    if (!captureId) {
      // i18n-exempt: an operator-side `reason` — see above.
      return { ok: false, reason: "getPaymentProcessInfo: חסר transactionId בתשובה" };
    }

    const amount = Number(call.data.sum);
    if (!Number.isFinite(amount)) {
      // i18n-exempt: an operator-side `reason` — see above.
      return { ok: false, reason: `getPaymentProcessInfo: sum לא מספרי (${str(call.data.sum)})` };
    }

    // Grow settles in shekels only, so the currency is a constant rather than a
    // field — but it is still stated, because `settleDiamondPurchase` refuses to
    // credit a purchase whose currency does not match the row.
    return {
      ok: true,
      captureId,
      amount,
      currency: STORE_CURRENCY,
      purchaseId: readCustomField(call.data, "cField1") || null,
    };
  }

  /**
   * Grow's "yes, I got it" call (`approveTransaction`), as the seam's optional
   * {@link OrderPaymentProvider.acknowledge}.
   *
   * Fire-and-forget by design: the money has already moved and the diamonds are
   * already credited by the time this runs, so a failure here costs at most a
   * duplicate notification — which the settlement guard swallows. Skipping it,
   * on the other hand, makes Grow retry the callback six times over an hour.
   */
  async acknowledge(ref: OrderRef, captureId: string): Promise<void> {
    await growPost(this.config.env, "approveTransaction", {
      pageCode: this.config.pageCode,
      processId: ref.orderId,
      transactionId: captureId,
    });
  }
}

/** Grow's custom fields arrive nested under `customFields` on the callback. */
function readCustomField(data: Record<string, unknown>, key: string): string {
  const direct = data[key];
  if (typeof direct === "string" && direct) return direct;
  const custom = data.customFields;
  if (custom && typeof custom === "object") {
    const value = (custom as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return "";
}

/**
 * The Grow provider, or null when it is not fully configured.
 *
 * A *partial* configuration also returns null: a provider missing its page code
 * would fail every checkout with a gateway error, which is strictly worse than
 * staying on the mock. The gap is reported instead — see `growConfigStatus` and
 * `purchaseBlockers`.
 */
export function growProvider(): OrderPaymentProvider | null {
  const config = growConfig();
  return config ? new GrowProvider(config) : null;
}
