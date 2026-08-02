import "server-only";

import {
  capturePaypalOrder,
  createPaypalOrder,
  getPaypalConfig,
  PaypalApiError,
} from "@/server/paypal";
import { STORE_CURRENCY } from "@/lib/game/diamondStore";
import { getLegalOperator, missingLegalFields } from "@/lib/legal";

/**
 * Payment-provider seam for the real-money diamond store.
 *
 * Two provider shapes are supported, because real gateways come in both:
 *
 * - **direct** (`DirectPaymentProvider`) — one server-side call charges and
 *   settles. The built-in `mock` provider is this shape: it always succeeds,
 *   moves no money, and exists so the store is exercisable before (and without)
 *   a live gateway.
 * - **order** (`OrderPaymentProvider`) — the buyer approves the payment in the
 *   provider's own UI, so the flow is *create order → buyer approves → capture*.
 *   PayPal is this shape, and it is the provider that runs as soon as
 *   `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` are set.
 *
 * Going live is still a two-step change, and both steps are enforced:
 *   1. Set the PayPal credentials with `PAYPAL_ENV=live`.
 *   2. Set `DIAMOND_PURCHASES_LIVE=true` so purchases open to every player.
 * Until then only admins can complete a purchase (see {@link arePurchasesLive}),
 * so no player earns free diamonds off the mock provider or a sandbox account.
 */

export interface ChargeInput {
  /** Empire being charged — carried through to the provider metadata. */
  empireId: string;
  /** Package id from DIAMOND_PACKAGES. */
  packageId: string;
  /** Amount to charge in ILS (already net of any admin discount). */
  amountIls: number;
  /** Human-readable description shown on the charge / receipt. */
  description: string;
}

export type ChargeResult =
  | { ok: true; providerRef: string }
  | { ok: false; reason: string };

export interface OrderInput extends ChargeInput {
  /** The `DiamondPurchase` row this order settles — echoed back on capture. */
  purchaseId: string;
}

export type OrderResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: string };

export type CaptureResult =
  | {
      ok: true;
      /** Provider-side id of the money movement (PayPal capture id). */
      captureId: string;
      /** Amount actually captured, in `currency`. */
      amount: number;
      currency: string;
      /** Our purchase row id as echoed back by the provider, when present. */
      purchaseId: string | null;
    }
  | { ok: false; reason: string; /** Buyer-facing hint, already in Hebrew. */ message?: string };

interface ProviderBase {
  /** Stable identifier stored on every purchase row ("mock", "paypal"). */
  readonly name: string;
  /**
   * True when charges are play money (mock provider, PayPal sandbox). Test
   * charges are flagged `isTest` on the audit row and can never be "live".
   */
  readonly isTestMode: boolean;
}

export interface DirectPaymentProvider extends ProviderBase {
  readonly kind: "direct";
  /** Attempt to charge. Never throws — failures come back as `ok:false`. */
  charge(input: ChargeInput): Promise<ChargeResult>;
}

export interface OrderPaymentProvider extends ProviderBase {
  readonly kind: "order";
  /** Open an order for the buyer to approve. Never throws. */
  createOrder(input: OrderInput): Promise<OrderResult>;
  /** Capture an order the buyer approved. Never throws. */
  captureOrder(orderId: string): Promise<CaptureResult>;
}

export type PaymentProvider = DirectPaymentProvider | OrderPaymentProvider;

/**
 * Placeholder provider: approves every charge instantly and returns a synthetic
 * reference. No network, no real money. Active only while PayPal is unconfigured.
 */
class MockPaymentProvider implements DirectPaymentProvider {
  readonly kind = "direct" as const;
  readonly name = "mock";
  readonly isTestMode = true;

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const ref = `mock_${input.packageId}_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    return { ok: true, providerRef: ref };
  }
}

/**
 * PayPal Checkout (Orders v2). Half the flow lives in the browser — the SDK
 * buttons take the buyer through approval — so this provider owns only the two
 * server-side halves: opening the order and capturing it afterwards.
 */
class PaypalPaymentProvider implements OrderPaymentProvider {
  readonly kind = "order" as const;
  readonly name = "paypal";

  constructor(private readonly cfg: NonNullable<ReturnType<typeof getPaypalConfig>>) {}

  /** Sandbox credentials move play money — never real revenue. */
  get isTestMode(): boolean {
    return this.cfg.env !== "live";
  }

  async createOrder(input: OrderInput): Promise<OrderResult> {
    try {
      const order = await createPaypalOrder(this.cfg, {
        purchaseId: input.purchaseId,
        amount: input.amountIls,
        currency: STORE_CURRENCY,
        description: input.description,
      });
      return { ok: true, orderId: order.orderId };
    } catch (err) {
      return { ok: false, reason: describe(err) };
    }
  }

  async captureOrder(orderId: string): Promise<CaptureResult> {
    try {
      const capture = await capturePaypalOrder(this.cfg, orderId);
      if (!capture) return { ok: false, reason: "no capture on order" };
      if (capture.status !== "COMPLETED") {
        return {
          ok: false,
          reason: `capture status ${capture.status}`,
          message:
            capture.status === "PENDING"
              ? "התשלום ממתין לאישור PayPal. היהלומים ייזקפו ברגע שהתשלום יאושר."
              : undefined,
        };
      }
      return {
        ok: true,
        captureId: capture.captureId,
        amount: capture.amount,
        currency: capture.currency,
        purchaseId: capture.purchaseId,
      };
    } catch (err) {
      const declined =
        err instanceof PaypalApiError && err.issue === "INSTRUMENT_DECLINED";
      return {
        ok: false,
        reason: describe(err),
        message: declined
          ? "אמצעי התשלום נדחה על ידי PayPal. נסה אמצעי תשלום אחר."
          : undefined,
      };
    }
  }
}

/** Compact, loggable description of a provider failure (never buyer-facing). */
function describe(err: unknown): string {
  if (err instanceof PaypalApiError) {
    return `paypal ${err.status}${err.issue ? ` ${err.issue}` : ""}${
      err.debugId ? ` debug=${err.debugId}` : ""
    }: ${err.message}`;
  }
  return err instanceof Error ? err.message : "unknown provider error";
}

const mockProvider = new MockPaymentProvider();

/**
 * The active payment provider: PayPal once its credentials are configured,
 * otherwise the mock. Cached per credential set so a token cache and a provider
 * instance are not rebuilt on every checkout.
 */
let paypalProvider: PaypalPaymentProvider | null = null;
let paypalProviderKey = "";

export function getPaymentProvider(): PaymentProvider {
  const cfg = getPaypalConfig();
  if (!cfg) return mockProvider;

  const key = `${cfg.env}:${cfg.clientId}`;
  if (!paypalProvider || paypalProviderKey !== key) {
    paypalProvider = new PaypalPaymentProvider(cfg);
    paypalProviderKey = key;
  }
  return paypalProvider;
}

/**
 * Whether real-money purchases are open to all players. Off by default so no
 * play-money provider ever hands out free diamonds; go-live needs all three of
 * the interlocks below.
 */
export function arePurchasesLive(): boolean {
  if (process.env.DIAMOND_PURCHASES_LIVE !== "true") return false;

  // Interlock 1: purchases are never "live" while the active provider is running
  // on play money (mock provider, or PayPal sandbox credentials). Otherwise
  // flipping the flag ahead of a real gateway would let every player mint free
  // diamonds through a charge that costs nothing.
  if (getPaymentProvider().isTestMode) return false;

  // Interlock 2: and never while nobody has said who is selling.
  //
  // A distance-selling merchant in Israel has to publish its legal name, dealer
  // number and a contact address on the page itself, and the gateways check the
  // same fields during underwriting. Those come from the environment
  // (LEGAL_OPERATOR_*), so a deploy that has payments configured but not the
  // operator would be taking money from the public under a placeholder — the
  // policy pages would name "מפעיל השירות" and nothing else.
  //
  // Failing closed is the whole point: the alternative is a store that quietly
  // works while the disclosure it depends on does not exist, which is precisely
  // the state nobody notices until a chargeback or an underwriter asks. Admins
  // are unaffected — they bypass this gate for test purchases (see `preflight`),
  // so the checkout can still be exercised end to end before go-live.
  if (!getLegalOperator().complete) return false;

  return true;
}

/**
 * Why the store is not open to players, in the order it has to be fixed —
 * empty once `arePurchasesLive()` is true.
 *
 * Shown to admins on the buy screen. Without it the three interlocks are
 * invisible: an admin sees a checkout that works for *them* (they bypass the
 * gate) and no indication that every player is looking at a chained store, or
 * which of the three conditions is the one still missing.
 */
export function purchaseBlockers(): string[] {
  const blockers: string[] = [];
  if (process.env.DIAMOND_PURCHASES_LIVE !== "true") {
    blockers.push('DIAMOND_PURCHASES_LIVE אינו "true"');
  }
  if (getPaymentProvider().isTestMode) {
    blockers.push("ספק התשלום עובד בכסף משחק (mock או PayPal sandbox)");
  }
  const missing = missingLegalFields();
  if (missing.length > 0) {
    blockers.push(`פרטי המפעיל לא פורסמו — חסר: ${missing.join(", ")}`);
  }
  return blockers;
}

/** Everything the checkout UI needs to know about the active provider. */
export interface CheckoutConfig {
  provider: string;
  /** "direct" providers charge in one server call; "order" ones need buyer approval. */
  kind: PaymentProvider["kind"];
  /** Purchases are open to every player. */
  live: boolean;
  /** Charges are play money (mock provider / PayPal sandbox). */
  testMode: boolean;
  /** PayPal browser-SDK client id (public by design), or null. */
  paypalClientId: string | null;
  currency: string;
  /** Admin-facing: what is keeping the store shut. Empty when `live`. */
  blockers: string[];
}

/** Snapshot of the checkout setup, safe to hand to a client component. */
export function getCheckoutConfig(): CheckoutConfig {
  const provider = getPaymentProvider();
  const cfg = provider.name === "paypal" ? getPaypalConfig() : null;
  return {
    provider: provider.name,
    kind: provider.kind,
    live: arePurchasesLive(),
    testMode: provider.isTestMode,
    paypalClientId: cfg?.clientId ?? null,
    currency: STORE_CURRENCY,
    blockers: purchaseBlockers(),
  };
}
