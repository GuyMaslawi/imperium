import "server-only";
import { headers } from "next/headers";

/**
 * Minimal in-process fixed-window rate limiter for the auth endpoints.
 *
 * The game has no Redis/KV dependency, so this keeps counters in module memory.
 * That is enough to blunt online password brute-force and mass-signup from a
 * single origin on a single instance; it is intentionally *not* a distributed
 * limiter. If the app is ever scaled to multiple instances or a serverless
 * fleet, move these counters to a shared store (Redis) — until then, per-process
 * limiting still meaningfully raises the cost of an attack.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

// Bound the map so a flood of distinct keys (e.g. spoofed IPs) can't grow it
// without limit. When the cap is hit we drop already-expired windows first.
const MAX_BUCKETS = 10_000;

function sweep(now: number): void {
  for (const [key, win] of buckets) {
    if (win.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Consume one hit against `key`. Allows up to `limit` hits per `windowMs`;
 * returns `true` while under the limit and `false` once the window is exhausted,
 * until it rolls over.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/**
 * Number of trusted reverse proxies between the public internet and the app
 * (e.g. one load balancer → 1). The client IP is read this many hops from the
 * RIGHT of `X-Forwarded-For`, because only the rightmost entries are appended by
 * infrastructure we control — everything to their left is attacker-controllable.
 * Defaults to 1 (a single trusted LB, the common case). Set TRUSTED_PROXY_HOPS
 * to 0 only when the app is exposed directly with no proxy.
 */
function trustedProxyHops(): number {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS);
  return Number.isInteger(raw) && raw >= 0 ? raw : 1;
}

/**
 * Best-effort client IP for keying the limiter, from the proxy headers Next.js
 * populates behind a load balancer. Falls back to a constant when absent (dev /
 * direct connections) so the limiter still applies globally rather than not at
 * all. Never throws.
 *
 * Security: `X-Forwarded-For` is `client, proxy1, proxy2, …` where each proxy
 * APPENDS the address it saw. A client can forge the leftmost entries, so we
 * never trust position 0 — we index `trustedProxyHops()` from the right, which
 * is the address our own edge proxy observed. Trusting the leftmost token (the
 * old behaviour) let an attacker mint a fresh limiter bucket per request by
 * rotating a spoofed header, defeating the register/login throttles entirely.
 */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const hops = trustedProxyHops();
    // hops === 0 means the app is exposed directly, so X-Forwarded-For is fully
    // client-controlled and must not be trusted — fall through to x-real-ip /
    // the global bucket rather than honour a spoofable value.
    if (hops > 0) {
      const fwd = h.get("x-forwarded-for");
      if (fwd) {
        const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
        if (parts.length > 0) {
          // hops from the right; clamp so a short header can't underflow.
          const idx = Math.max(0, parts.length - hops);
          return parts[idx]!;
        }
      }
    }
    return h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}
