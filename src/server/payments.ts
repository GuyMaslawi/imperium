import "server-only";

import { STORE_CURRENCY } from "@/lib/game/diamondStore";
import { getLegalOperator, missingLegalFields } from "@/lib/legal";

/**
 * Payment-provider seam for the real-money diamond store.
 *
 * No real gateway is wired right now: the only implementation is the built-in
 * `mock` provider, which approves every charge, moves no money, and exists so
 * the checkout is exercisable end to end before a gateway exists. Grow is the
 * provider this seam is waiting for.
 *
 * Two provider shapes are defined, because real gateways come in both:
 *
 * - **direct** (`DirectPaymentProvider`) — one server-side call charges and
 *   settles. The mock provider is this shape.
 * - **order** (`OrderPaymentProvider`) — the buyer approves the payment on the
 *   provider's own page, so the flow is *create order → buyer approves →
 *   capture*. A hosted-checkout gateway lands here, and the settlement half is
 *   already written and hardened: see `@/server/purchases`.
 *
 * Going live is a two-step change, and both steps are enforced:
 *   1. Wire a provider that moves real money (`isTestMode === false`).
 *   2. Set `DIAMOND_PURCHASES_LIVE=true` so purchases open to every player.
 * Until then only admins can complete a purchase (see {@link arePurchasesLive}),
 * so no player earns free diamonds off a play-money provider.
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
      /** Provider-side id of the money movement itself. */
      captureId: string;
      /** Amount actually captured, in `currency`. */
      amount: number;
      currency: string;
      /** Our purchase row id as echoed back by the provider, when present. */
      purchaseId: string | null;
    }
  | { ok: false; reason: string; /** Buyer-facing hint, already in Hebrew. */ message?: string };

interface ProviderBase {
  /** Stable identifier stored on every purchase row ("mock" today). */
  readonly name: string;
  /**
   * True when charges are play money. Test charges are flagged `isTest` on the
   * audit row and can never be "live".
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
 * reference. No network, no real money. Active until a gateway is wired.
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

const mockProvider = new MockPaymentProvider();

/**
 * The active payment provider. Only the mock exists today; a real gateway is
 * selected here once it is wired, and everything downstream — the audit row,
 * the interlocks, the checkout UI — reads the provider through this one call.
 */
export function getPaymentProvider(): PaymentProvider {
  return mockProvider;
}

/**
 * Whether real-money purchases are open to all players. Off by default so no
 * play-money provider ever hands out free diamonds; go-live needs all three of
 * the interlocks below.
 */
export function arePurchasesLive(): boolean {
  if (process.env.DIAMOND_PURCHASES_LIVE !== "true") return false;

  // Interlock 1: purchases are never "live" while the active provider is running
  // on play money (today: always, since only the mock exists). Otherwise
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
    blockers.push("לא מחובר ספק תשלומים אמיתי — הרכישות רצות על ספק דמה");
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
  /** Charges are play money. */
  testMode: boolean;
  currency: string;
  /** Admin-facing: what is keeping the store shut. Empty when `live`. */
  blockers: string[];
}

/** Snapshot of the checkout setup, safe to hand to a client component. */
export function getCheckoutConfig(): CheckoutConfig {
  const provider = getPaymentProvider();
  return {
    provider: provider.name,
    kind: provider.kind,
    live: arePurchasesLive(),
    testMode: provider.isTestMode,
    currency: STORE_CURRENCY,
    blockers: purchaseBlockers(),
  };
}
