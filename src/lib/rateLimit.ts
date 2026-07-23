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

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (only meaningful when `ok` is false). */
  retryAfterSec: number;
}

/**
 * Consume one hit against `key`. Allows up to `limit` hits per `windowMs`;
 * further hits in the same window are rejected until it rolls over.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/**
 * Best-effort client IP for keying the limiter, from the proxy headers Next.js
 * populates behind a load balancer. Falls back to a constant when absent (dev /
 * direct connections) so the limiter still applies globally rather than not at
 * all. Never throws.
 */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    return h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}
