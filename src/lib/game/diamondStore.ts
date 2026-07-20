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
  { id: "spark", emoji: "✨", diamonds: 50, bonus: 0, priceIls: 9.9 },
  { id: "pouch", emoji: "💠", diamonds: 150, bonus: 15, priceIls: 24.9 },
  { id: "chest", emoji: "🧰", diamonds: 350, bonus: 60, priceIls: 49.9, tag: "popular" },
  { id: "vault", emoji: "🏆", diamonds: 800, bonus: 180, priceIls: 99.9, tag: "best" },
  { id: "hoard", emoji: "👑", diamonds: 2000, bonus: 600, priceIls: 199.9 },
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
