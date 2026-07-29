import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getEmpireGeneralPower,
  getEmpireMilitaryPower,
  getEmpireSpyPower,
} from "@/lib/game/power";
import type { WeaponQuantityRow } from "@/lib/game/weapons";

/**
 * Keeping `Empire.militaryPower` / `generalPower` / `spyPower` true.
 *
 * The three figures are pure functions of the army and the arsenal, so nothing
 * here decides anything — the only question this module answers is *when* they
 * are recomputed. Getting that wrong is the whole risk of denormalising: a
 * forgotten call site does not throw, it just leaves a ladder that quietly
 * ranks someone in the wrong place forever.
 *
 * Three layers guard against it, deliberately overlapping:
 *
 *  1. **One choke point.** Every write that can change soldiers, spies or a
 *     weapon quantity calls `syncEmpirePower` in the same transaction, so the
 *     column commits or rolls back with the change that caused it.
 *  2. **Self-healing.** `applyPendingUpdates` re-derives all three on every
 *     settle from the army and weapons it has *already loaded* — no extra query.
 *     Any drift therefore repairs itself the next time the owner loads a page,
 *     which for an active player is within seconds.
 *  3. **A test.** tests/db asserts the stored figures match the computed ones
 *     after each kind of mutation.
 *
 * Layer 2 is what makes this safe to ship. Even if a future feature forgets
 * layer 1 entirely, the damage is bounded to "stale until that player next
 * plays" rather than "wrong until someone notices".
 */

export interface PowerFigures {
  militaryPower: number;
  generalPower: number;
  spyPower: number;
}

/** The three figures for an army/arsenal pair. Pure; no I/O. */
export function computePower(
  army: { soldiers: number; spies: number } | null,
  weapons: readonly WeaponQuantityRow[]
): PowerFigures {
  return {
    militaryPower: getEmpireMilitaryPower(army, weapons),
    generalPower: getEmpireGeneralPower(army, weapons),
    spyPower: getEmpireSpyPower(army, weapons),
  };
}

/**
 * Recompute and store one empire's power figures.
 *
 * Two narrow reads (both on indexed foreign keys) plus one update. Call it
 * *after* the army or weapon write, inside the same transaction — reading
 * before would store the figures the change was about to invalidate.
 *
 * `updateMany` rather than `update`: an empire deleted in the same breath (an
 * admin wipe, a cascading user delete) must not turn a bookkeeping step into a
 * failed transaction that rolls back the real work.
 */
export async function syncEmpirePower(
  tx: Prisma.TransactionClient,
  empireId: string
): Promise<PowerFigures> {
  const [army, weapons] = await Promise.all([
    tx.army.findUnique({
      where: { empireId },
      select: { soldiers: true, spies: true },
    }),
    tx.empireWeapon.findMany({
      where: { empireId },
      select: { weaponKey: true, quantity: true },
    }),
  ]);

  const figures = computePower(army, weapons);
  await tx.empire.updateMany({ where: { id: empireId }, data: figures });
  return figures;
}

/**
 * Backfill every empire, for the one-off migration and for the repair script.
 *
 * Chunked rather than one big transaction: this runs over the whole table, and
 * holding a transaction open across it would block the game while it ran. Each
 * empire is independently correct, so a partial run leaves no inconsistency —
 * only empires not yet reached, which self-heal anyway.
 */
export async function backfillAllEmpirePower(
  chunkSize = 200
): Promise<{ updated: number }> {
  let cursor: string | undefined;
  let updated = 0;

  for (;;) {
    const empires = await prisma.empire.findMany({
      take: chunkSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        army: { select: { soldiers: true, spies: true } },
        weapons: { select: { weaponKey: true, quantity: true } },
      },
    });
    if (empires.length === 0) break;

    for (const empire of empires) {
      await prisma.empire.updateMany({
        where: { id: empire.id },
        data: computePower(empire.army, empire.weapons),
      });
      updated += 1;
    }
    cursor = empires[empires.length - 1]!.id;
  }

  return { updated };
}
