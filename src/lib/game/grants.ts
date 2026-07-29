import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * Credit citizens to an empire.
 *
 * There is **no population ceiling**: citizens accumulate like every other
 * balance, so a player who is away keeps the whole backlog instead of forfeiting
 * it. The city count still shapes the *flow* — it unlocks CITIZEN_GROWTH levels,
 * which is what the daily intake is actually built from — it just no longer caps
 * the pool those citizens land in.
 *
 * This deliberately reverses the clamp that used to live here. The clamp existed
 * because `trainUnits` turns one citizen into one soldier, spy or mine slave, and
 * mine slaves drive production linearly — so an *unbounded* citizen faucet would
 * be an unbounded resource faucet one step downstream. That reasoning still
 * holds, and it is why every caller must keep coming through this helper rather
 * than writing its own `citizens: { increment }`: what makes citizens safe is
 * that every source of them is rate-limited (real time for the daily update,
 * turns for hero levels, spins for the wheel), not that the pool had a lid.
 *
 * Kept as one SQL statement so concurrent grants compose instead of racing on a
 * read-then-write.
 */
export async function grantCitizens(
  tx: Prisma.TransactionClient,
  empireId: string,
  amount: number
): Promise<void> {
  const add = Math.max(0, Math.round(amount));
  if (add === 0) return;
  await tx.$executeRaw`
    UPDATE "Empire"
    SET citizens = citizens + ${add}
    WHERE id = ${empireId}
  `;
}
