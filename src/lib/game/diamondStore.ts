/**
 * Diamond store — the real-money purchase catalogue shown on the "רכישת
 * יהלומים" page. Prices are in ILS. The admin can apply a global percentage
 * discount to every package from the balance panel
 * (`diamondStore.purchaseDiscountPct`); {@link discountedPrice} applies it.
 *
 * Client-safe (no server-only imports) so the store card component can share
 * these definitions with the server page.
 */

/**
 * Currency every package is priced and charged in. PayPal is told this code on
 * every order, and the browser SDK is loaded with it — the two must agree or
 * PayPal rejects the order.
 */
export const STORE_CURRENCY = "ILS";

export interface DiamondPackage {
  id: string;
  /** Hebrew display name shown on the store card. */
  name: string;
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
  { id: "spark", name: "ניצוץ", emoji: "✨", diamonds: 400, bonus: 0, priceIls: 13.9 },
  { id: "pouch", name: "פיקדון", emoji: "💠", diamonds: 1200, bonus: 100, priceIls: 34.9 },
  { id: "chest", name: "ארגז אוצר", emoji: "🧰", diamonds: 3000, bonus: 500, priceIls: 69.9, tag: "popular" },
  { id: "vault", name: "כספת הקיסר", emoji: "🏆", diamonds: 7500, bonus: 1500, priceIls: 139.9, tag: "best" },
  { id: "hoard", name: "אוצר הכתר", emoji: "👑", diamonds: 24000, bonus: 6000, priceIls: 279.9 },
];

/** Total diamonds a package grants (base + bonus). */
export function packageTotal(pkg: DiamondPackage): number {
  return pkg.diamonds + pkg.bonus;
}

/** Diamonds granted per shekel — the raw value of a package. */
export function packageRate(pkg: DiamondPackage): number {
  return packageTotal(pkg) / pkg.priceIls;
}

/**
 * How much more value a package gives per shekel than the entry tier, in
 * percent (0 for the entry tier itself). Drives the "+X% ערך" badge.
 */
export function packageValuePct(pkg: DiamondPackage): number {
  const base = packageRate(DIAMOND_PACKAGES[0]);
  if (base <= 0) return 0;
  return Math.max(0, Math.round((packageRate(pkg) / base - 1) * 100));
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

/* ---------------------------- approval checkout ---------------------------- */

/**
 * Results of the two-step approval flow (PayPal). Same reasoning as
 * `StoreActionState` for why they live here: the `"use server"` action module
 * may only export async functions, so its types are declared in this
 * client-safe module and imported by both sides.
 */
export type CreateOrderState =
  | { ok: true; orderId: string }
  | { ok: false; message: string };

export type CaptureOrderState =
  | { ok: true; diamonds: number; message: string }
  | { ok: false; message: string };

