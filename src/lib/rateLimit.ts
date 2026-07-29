import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Fixed-window rate limiter, counted in Postgres so it holds across the whole
 * fleet.
 *
 * It used to count in module memory. On a single long-lived Node process that
 * is a real limiter; on Vercel it is theatre. Every concurrent lambda keeps its
 * own `Map`, so the effective budget is `limit × instances`, and every cold
 * start hands the caller a clean slate — an attacker does not even have to try
 * to evade it, the platform resets it for them. `login-email` (10 tries per 15
 * minutes) was the one that mattered: the ceiling it advertised was not the
 * ceiling anyone actually faced.
 *
 * Postgres is the only shared state this app has, and one indexed upsert on a
 * single row is cheap next to the bcrypt compare it is guarding, so the
 * counters moved there. The in-process map survives as a *pre-filter*: it can
 * only ever be more permissive than the shared counter (each instance sees a
 * fraction of the traffic), so when it says no, the shared counter would have
 * said no too — and the request is refused without a round trip.
 *
 * Fails **open**. A limiter that takes signup and login down with the database
 * is a worse outage than the one it prevents, and the pre-filter still caps
 * what any single instance can pass through while the database is unreachable.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

// Bound the map so a flood of distinct keys (e.g. spoofed IPs) can't grow it
// without limit. When the cap is hit we drop already-expired windows first.
const MAX_BUCKETS = 10_000;

/**
 * Drop expired windows; if that frees nothing, evict the oldest entries anyway.
 *
 * The unconditional eviction is the part that makes MAX_BUCKETS a real bound.
 * Sweeping only expired windows left the map free to grow past the cap whenever
 * every entry was still live (a flood of distinct keys inside one window), while
 * paying an O(n) scan on every insert once at the cap — so the "bound" cost
 * time without ever bounding memory. Map preserves insertion order, so taking
 * from the front evicts the least recently created window.
 */
function sweep(now: number): void {
  for (const [key, win] of buckets) {
    if (win.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size < MAX_BUCKETS) return;
  const excess = buckets.size - MAX_BUCKETS + 1;
  let dropped = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    if (++dropped >= excess) break;
  }
}

/** Consume `cost` hits against this instance's own copy of the window. */
function localAllows(
  key: string,
  limit: number,
  windowMs: number,
  cost: number
): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) sweep(now);
    buckets.set(key, { count: cost, resetAt: now + windowMs });
    // A single action worth more than the whole window is refused outright
    // rather than let through on a fresh bucket.
    return cost <= limit;
  }

  if (existing.count + cost > limit) return false;
  existing.count += cost;
  return true;
}

/**
 * How often (in hits) an instance bothers to clear expired rows. The sweep is
 * a single indexed DELETE and rows are tiny, so this is housekeeping, not a
 * correctness requirement — an expired row is already inert, since the upsert
 * below restarts the window in place rather than reading a stale count.
 */
const SWEEP_EVERY = 500;
let hitsSinceSweep = 0;

async function sweepShared(): Promise<void> {
  if (++hitsSinceSweep < SWEEP_EVERY) return;
  hitsSinceSweep = 0;
  try {
    await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lte: new Date() } } });
  } catch {
    // Housekeeping only — a failed sweep costs nothing but disk.
  }
}

/**
 * Consume `cost` hits against `key` (default 1). Allows up to `limit` hits per
 * `windowMs`; resolves `true` while under the limit and `false` once the window
 * is exhausted, until it rolls over.
 *
 * `cost` is what lets a budget be counted in something other than calls. Player
 * mail is the case that needs it: throttling *sends* leaves the recipient count
 * unbounded, since one send may address many players, so the mail budget is
 * charged per addressee instead.
 *
 * The counter moves in a single statement. `ON CONFLICT DO UPDATE` with the
 * window rollover expressed as a `CASE` is what makes it safe: read-then-write
 * would let N concurrent attempts all read the same count and each write
 * count+1, which on the login path is exactly the burst the limit exists to
 * stop. `RETURNING` hands back the post-increment count, so the decision is
 * made from the value the database actually stored, not from what we hoped it
 * would store.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  cost = 1
): Promise<boolean> {
  // A caller-supplied cost reaches the counter, so it is clamped to a positive
  // integer here: a zero or negative charge would decrement a shared window,
  // handing an attacker a way to refund every other bucket they share.
  const hits = Math.max(1, Math.floor(cost));

  // Cheap per-instance pre-filter — see the header.
  if (!localAllows(key, limit, windowMs, hits)) return false;

  const resetAt = new Date(Date.now() + windowMs);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
      VALUES (${key}, ${hits}::int, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${hits}::int
          ELSE "RateLimitBucket"."count" + ${hits}::int
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${resetAt}
          ELSE "RateLimitBucket"."resetAt"
        END
      RETURNING "count"
    `;
    // Awaited, not fired and forgotten: a serverless instance can be frozen the
    // moment the action returns, so a dangling query is a query that may never
    // run and may reject against a disconnected client. It does real work only
    // once every SWEEP_EVERY hits.
    await sweepShared();
    const count = Number(rows[0]?.count ?? 1);
    return count <= limit;
  } catch (error) {
    // Fail open — see the header. Logged rather than swallowed: a limiter that
    // has quietly stopped limiting is worth knowing about.
    console.error(`[rate-limit] shared counter unavailable for ${key}`, error);
    return true;
  }
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
