import "server-only";
import type { Prisma, PotionKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { POTION_KINDS, POTION_STACK_CAP } from "./potions";

/**
 * Reading and writing potion state. Every read filters on `expiresAt > now`, so
 * a window closes by itself — there is no sweeper and an offline player's buff
 * runs out exactly on time (the mirror of how DiamondEffect works).
 */

/** The kinds currently in force for an empire — the shape gameplay code wants. */
export async function getActivePotionKinds(
  empireId: string,
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date()
): Promise<Set<PotionKind>> {
  const rows = await tx.potionEffect.findMany({
    where: { empireId, expiresAt: { gt: now } },
    select: { kind: true },
  });
  return new Set(rows.map((r) => r.kind));
}

/** Whether one specific brew is in force right now. */
export async function isPotionActive(
  empireId: string,
  kind: PotionKind,
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date()
): Promise<boolean> {
  const row = await tx.potionEffect.findFirst({
    where: { empireId, kind, expiresAt: { gt: now } },
    select: { id: true },
  });
  return row !== null;
}

/** Active windows with their end times — what the belt UI counts down against. */
export async function getActivePotionExpiries(
  empireId: string,
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date()
): Promise<Partial<Record<PotionKind, Date>>> {
  const rows = await tx.potionEffect.findMany({
    where: { empireId, expiresAt: { gt: now } },
    select: { kind: true, expiresAt: true },
  });
  const out: Partial<Record<PotionKind, Date>> = {};
  for (const row of rows) out[row.kind] = row.expiresAt;
  return out;
}

/** How many of each brew are on the belt (0 for kinds never looted). */
export async function getPotionCounts(
  empireId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<Record<PotionKind, number>> {
  const rows = await tx.potionStack.findMany({
    where: { empireId },
    select: { kind: true, count: true },
  });
  const out = Object.fromEntries(POTION_KINDS.map((k) => [k, 0])) as Record<
    PotionKind,
    number
  >;
  for (const row of rows) out[row.kind] = row.count;
  return out;
}

/**
 * Add potions to the belt. Returns false when the stack was already at its cap
 * and the drop is therefore lost — the caller uses that to decide whether the
 * battle report may claim a potion was won.
 *
 * The upsert increments rather than writing an absolute count, so a concurrent
 * grant on another path composes instead of clobbering (the same reason the
 * lazy clock credits wheel spins as a delta).
 */
export async function grantPotion(
  tx: Prisma.TransactionClient,
  empireId: string,
  kind: PotionKind,
  count = 1
): Promise<boolean> {
  const row = await tx.potionStack.upsert({
    where: { empireId_kind: { empireId, kind } },
    create: { empireId, kind, count: Math.min(count, POTION_STACK_CAP) },
    update: { count: { increment: count } },
    select: { id: true, count: true },
  });
  if (row.count > POTION_STACK_CAP) {
    await tx.potionStack.update({
      where: { id: row.id },
      data: { count: POTION_STACK_CAP },
    });
    // Some of the grant survived the clamp only if the stack was below the cap
    // to begin with; a belt already brimming gained nothing.
    return row.count - count < POTION_STACK_CAP;
  }
  return true;
}
