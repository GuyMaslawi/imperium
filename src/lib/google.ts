import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Server-side verification of Google Identity Services ID tokens.
 *
 * The "Sign in with Google" button (GIS) hands the browser a signed JWT ID
 * token. We never trust it client-side — this module verifies the signature
 * against Google's published public keys (JWKS) and checks that the token was
 * minted for *our* client (audience) by Google (issuer), and is unexpired. Only
 * then do we read the identity claims. jose is already the app's JWT library.
 */

// Cached across requests; jose fetches Google's rotating signing keys once and
// refreshes them on cache miss / key rotation.
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

// Google mints ID tokens under both of these issuer strings.
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export interface GoogleIdentity {
  /** Stable Google account id (`sub`). Never reused, never changes. */
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

/**
 * Verify a GIS credential (ID token). Returns the identity on success, or
 * `null` for any invalid/expired/wrong-audience token. Throws only if the
 * server is misconfigured (missing client id) — a bug, not attacker input.
 */
export async function verifyGoogleIdToken(
  idToken: string
): Promise<GoogleIdentity | null> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");

  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: clientId,
    });

    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email =
      typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    if (!sub || !email) return null;

    // Google sends email_verified as a real boolean, but tolerate the string form.
    const emailVerified =
      payload.email_verified === true || payload.email_verified === "true";

    const name =
      typeof payload.name === "string" && payload.name.trim()
        ? payload.name.trim()
        : email.split("@")[0];

    return {
      googleId: sub,
      email,
      emailVerified,
      name,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
    };
  } catch {
    return null;
  }
}
