import "server-only";

/**
 * Operator identity for the public legal pages (/terms, /refund, /privacy).
 *
 * Israeli consumer law requires a distance-selling merchant to publish who it
 * is — legal name, dealer number and a way to reach it — and the payment
 * gateways check for the same details during underwriting. None of it lives in
 * the repo: an עוסק number and a home address are personal data, so every field
 * comes from the environment and the pages degrade to a neutral placeholder
 * until it is set.
 *
 * Set on Vercel (and in `.env` for local work):
 *   LEGAL_OPERATOR_NAME   "ישראל ישראלי"        — the name on the dealer certificate
 *   LEGAL_OPERATOR_TAX_ID "123456789"           — מספר עוסק (for an עוסק פטור: your ת.ז.)
 *   LEGAL_CONTACT_EMAIL   "support@example.com" — where cancellation requests land
 *   LEGAL_OPERATOR_CITY   "תל אביב"             — city is enough; a street address is not required
 */

export interface LegalOperator {
  /** Registered name of the person or company behind the game. */
  name: string;
  /** מספר עוסק, or null while unset. */
  taxId: string | null;
  /** Contact address for support, cancellations and privacy requests. */
  email: string;
  /** City of the business, or null while unset. */
  city: string | null;
  /**
   * True once the operator is fully identified.
   *
   * This is not cosmetic. Selling to the public for real money while the
   * merchant is unnamed is the actual exposure — the policy page merely
   * publishes it — so `arePurchasesLive()` refuses to open the store while this
   * is false, and the pages say the details are pending rather than presenting
   * the placeholder below as if it were a real merchant. See
   * `missingLegalFields`.
   */
  complete: boolean;
}

/**
 * Shown until the real details are configured, so the page is never broken.
 *
 * Deliberately a *label* rather than an invented name: a plausible-looking
 * placeholder read as a real disclosure, which is worse than an obvious gap.
 * The pages pair it with an explicit notice while `complete` is false.
 */
const FALLBACK_NAME = "מפעיל השירות";
const FALLBACK_EMAIL = "support@kraldor.com";

/**
 * The env vars that must be set before the game may take money, and which of
 * them are still missing.
 *
 * The city is not here: Israeli distance-selling rules want a place of business,
 * and a city is enough to satisfy the page, but a policy that named no city has
 * never been the thing that voids a sale. Name, dealer number and a contact
 * address are the three that identify who the buyer is contracting with.
 */
export const REQUIRED_LEGAL_ENV = [
  "LEGAL_OPERATOR_NAME",
  "LEGAL_OPERATOR_TAX_ID",
  "LEGAL_CONTACT_EMAIL",
] as const;

/** Which of REQUIRED_LEGAL_ENV are unset — empty once the operator is published. */
export function missingLegalFields(): string[] {
  return REQUIRED_LEGAL_ENV.filter((key) => !process.env[key]?.trim());
}

export function getLegalOperator(): LegalOperator {
  const name = process.env.LEGAL_OPERATOR_NAME?.trim() || "";
  const taxId = process.env.LEGAL_OPERATOR_TAX_ID?.trim() || "";
  const email = process.env.LEGAL_CONTACT_EMAIL?.trim() || "";
  const city = process.env.LEGAL_OPERATOR_CITY?.trim() || "";

  return {
    name: name || FALLBACK_NAME,
    taxId: taxId || null,
    email: email || FALLBACK_EMAIL,
    city: city || null,
    complete: missingLegalFields().length === 0,
  };
}

/**
 * Publication date of each policy, in ISO. Bump the one you edited whenever the
 * text changes materially — players are entitled to know a policy moved under
 * them, and a stale date is worse than no date.
 */
export const LEGAL_UPDATED = {
  terms: "2026-07-31",
  refund: "2026-07-31",
  privacy: "2026-08-01",
} as const;

/** "31 ביולי 2026" — the date as the policy pages print it. */
export function formatLegalDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
