/**
 * Diamond store — the real-money purchase catalogue shown on the "רכישת
 * יהלומים" page. Prices are in ILS. The admin can apply a global percentage
 * discount to every package from the balance panel
 * (`diamondStore.purchaseDiscountPct`); {@link discountedPrice} applies it.
 *
 * Client-safe (no server-only imports) so the store card component can share
 * these definitions with the server page.
 */

export interface DiamondPackage {
  id: string;
  /** Base diamonds granted. */
  diamonds: number;
  /** Extra diamonds thrown in on top (0 for the entry tier). */
  bonus: number;
  /** Full price in ILS, before any admin discount. */
  priceIls: number;
  /** Optional highlight tag. */
  tag?: "popular" | "best";
  /** Emoji shown on the package card. */
  emoji: string;
}

export const DIAMOND_PACKAGES: readonly DiamondPackage[] = [
  { id: "spark", emoji: "✨", diamonds: 400, bonus: 0, priceIls: 9.9 },
  { id: "pouch", emoji: "💠", diamonds: 1200, bonus: 100, priceIls: 24.9 },
  { id: "chest", emoji: "🧰", diamonds: 3000, bonus: 500, priceIls: 49.9, tag: "popular" },
  { id: "vault", emoji: "🏆", diamonds: 7500, bonus: 1500, priceIls: 99.9, tag: "best" },
  { id: "hoard", emoji: "👑", diamonds: 24000, bonus: 6000, priceIls: 199.9 },
];

/** Total diamonds a package grants (base + bonus). */
export function packageTotal(pkg: DiamondPackage): number {
  return pkg.diamonds + pkg.bonus;
}

/** Apply the admin discount % to a package price, rounded to agorot. */
export function discountedPrice(priceIls: number, discountPct: number): number {
  if (discountPct <= 0) return priceIls;
  const clamped = Math.min(100, Math.max(0, discountPct));
  return Math.round(priceIls * (1 - clamped / 100) * 100) / 100;
}

/** Price formatted as "₪9.90". */
export function formatIls(priceIls: number): string {
  return `₪${priceIls.toFixed(2)}`;
}

/**
 * Result of a diamond-package checkout.
 * - `unavailable`: purchases are gated (no real provider yet) and the caller
 *   isn't an admin — shown as a friendly "coming soon", not an error.
 *
 * Lives here (a client-safe module) rather than in the `"use server"` action
 * file: a `"use server"` file may only export async functions, so the
 * `STORE_IDLE` constant below cannot be exported from there.
 */
export interface StoreActionState {
  status: "idle" | "success" | "error" | "unavailable";
  message?: string;
  /** Total diamonds credited on a successful purchase. */
  diamonds?: number;
}

export const STORE_IDLE: StoreActionState = { status: "idle" };
