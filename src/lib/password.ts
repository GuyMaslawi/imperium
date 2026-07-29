import "server-only";
import bcrypt from "bcryptjs";

/**
 * Every password this app writes goes through here.
 *
 * It lives in its own module rather than in `server/actions/auth.ts` because
 * that file is `"use server"` — a module which may only export async functions,
 * so it cannot publish the cost constant. The admin password-reset action then
 * hard-coded its own `10`, and the two drifted the moment either moved. One
 * exported `hashPassword` is the only way the work factor stays a single fact.
 */

/**
 * bcrypt work factor.
 *
 * 12 rather than 10: each step doubles the work, so this is 4× the cost per
 * guess for an attacker holding the table, at ~220ms per hash — paid once per
 * login, which is the right side of that trade. Existing cost-10 digests stay
 * valid (bcrypt encodes the factor in the digest) and are upgraded in place the
 * next time their owner signs in successfully; see `login`.
 *
 * Raising this again means regenerating LOGIN_TIMING_DUMMY_HASH to match, or the
 * timing equalisation below stops equalising.
 */
export const BCRYPT_COST = 12;

/**
 * A valid digest at BCRYPT_COST whose plaintext does not exist.
 *
 * `login` compares against this when no account matches the address, so the
 * miss costs the same as a real check and latency cannot be used to enumerate
 * registered emails. It MUST be minted at the same cost as real hashes — the
 * factor drives the compare time, so a cost-10 dummy against cost-12 rows would
 * re-open the very oracle it exists to close (~110ms vs ~220ms, trivially
 * separable over a handful of samples).
 *
 * Minted from 32 bytes of CSPRNG output discarded in the same process, so there
 * is no plaintext for it anywhere. That matters: `login` must never authenticate
 * a password-less (Google-only) row against this digest, and it explicitly
 * refuses to — but the constant is public in the repo, so it should not be one
 * recovered string away from being a master key even if that guard regressed.
 */
export const LOGIN_TIMING_DUMMY_HASH =
  "$2b$12$XJFkk8R812f7W456Y1RH3.FTruXG.4IvyMf76jP.AXoTXj9q221um";

/** Hash a plaintext password at the current work factor. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/**
 * Whether a stored digest was written at a weaker cost than we now use, and so
 * should be re-hashed the next time the plaintext passes through.
 */
export function isStaleHash(hash: string): boolean {
  const cost = Number(hash.split("$")[2]);
  return Number.isFinite(cost) && cost < BCRYPT_COST;
}
