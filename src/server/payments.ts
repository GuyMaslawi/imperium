import "server-only";

/**
 * Payment-provider seam for the real-money diamond store.
 *
 * The store is fully wired end-to-end (checkout UI → server action → charge →
 * diamond credit → `DiamondPurchase` audit row) but ships with a **mock**
 * provider that always succeeds without moving real money. Connecting a real
 * provider (Stripe / Paddle / a local PSP) is a two-step change with no other
 * edits required:
 *
 *   1. Implement {@link PaymentProvider} for the real gateway and return it
 *      from {@link getPaymentProvider}.
 *   2. Set `DIAMOND_PURCHASES_LIVE=true` so purchases open to every player.
 *
 * Until step 2, purchases are gated (see {@link arePurchasesLive}): only admins
 * can complete a mock purchase, so no player earns free diamonds in the interim.
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

export interface PaymentProvider {
  /** Stable identifier stored on every purchase row (e.g. "mock", "stripe"). */
  readonly name: string;
  /** Attempt to charge the card. Never throws — failures come back as `ok:false`. */
  charge(input: ChargeInput): Promise<ChargeResult>;
}

/**
 * Placeholder provider: approves every charge instantly and returns a synthetic
 * reference. No network, no real money. Swap this out for a real gateway.
 */
class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const ref = `mock_${input.packageId}_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    return { ok: true, providerRef: ref };
  }
}

const mockProvider = new MockPaymentProvider();

/**
 * The active payment provider. Returns the mock provider today; when a real
 * gateway is wired, construct and return it here (optionally keyed off env).
 */
export function getPaymentProvider(): PaymentProvider {
  // TODO: return the real provider once configured, e.g.
  //   if (process.env.STRIPE_SECRET_KEY) return new StripeProvider(...);
  return mockProvider;
}

/**
 * Whether real-money purchases are open to all players. Off by default so the
 * mock provider never hands out free diamonds; flip `DIAMOND_PURCHASES_LIVE`
 * to "true" together with wiring a real provider.
 */
export function arePurchasesLive(): boolean {
  if (process.env.DIAMOND_PURCHASES_LIVE !== "true") return false;
  // Interlock: purchases are never "live" while the mock provider is active,
  // even if the flag is on. Otherwise flipping DIAMOND_PURCHASES_LIVE before a
  // real gateway is wired would let every player mint free diamonds through the
  // always-succeeds mock charge. Go-live requires BOTH steps, not just the flag.
  return getPaymentProvider().name !== "mock";
}
