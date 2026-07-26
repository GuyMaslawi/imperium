import "server-only";
import type { Prisma } from "@prisma/client";
import { CITIZENS_PER_CITY } from "./constants";

/**
 * Add citizens to an empire without breaching the city population ceiling.
 *
 * The daily update clamps its intake to `citizenCapacity(cities)` — but the
 * reward paths (season pass, wheel, mini-game) all did a raw
 * `citizens: { increment }`, so any of them could push a player arbitrarily far
 * past the design ceiling. That is not cosmetic: `trainUnits` converts one
 * citizen into one mine slave, and mine slaves drive uncapped production, so an
 * uncapped citizen faucet is an uncapped resource faucet one step downstream.
 *
 * The clamp is done in SQL rather than read-then-write so two concurrent grants
 * cannot both read the same "room left" and each fill it. `GREATEST(citizens,
 * …)` makes the statement monotonic: an empire already over the ceiling (from a
 * grant that predates this helper, or a ceiling lowered by losing a city) keeps
 * what it has instead of being silently docked.
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
    SET citizens = GREATEST(
      citizens,
      LEAST(citizens + ${add}, cities * ${CITIZENS_PER_CITY})
    )
    WHERE id = ${empireId}
  `;
}
