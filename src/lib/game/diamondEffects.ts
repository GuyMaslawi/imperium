import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { StorableResource } from "./constants";
import { RESOURCE_BOOST_KIND, SHIELD_KINDS, SHIELDS } from "./diamondShop";
import type { ShieldKey } from "./diamondShop";

/**
 * Active diamond resource-production boosts, as a percent per storable
 * resource (0 where none is active). Each is applied on top of the hero and
 * guild multipliers when settling production ticks.
 */
export async function getActiveResourceBoosts(
  empireId: string,
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date()
): Promise<Record<StorableResource, number>> {
  const rows = await tx.diamondEffect.findMany({
    where: {
      empireId,
      activeUntil: { gt: now },
      kind: { in: Object.values(RESOURCE_BOOST_KIND) },
    },
    select: { kind: true, magnitude: true },
  });
  const out: Record<StorableResource, number> = { gold: 0, wood: 0, iron: 0, stone: 0 };
  for (const resource of Object.keys(RESOURCE_BOOST_KIND) as StorableResource[]) {
    const kind = RESOURCE_BOOST_KIND[resource];
    out[resource] = rows.find((r) => r.kind === kind)?.magnitude ?? 0;
  }
  return out;
}

/** Active shop-discount percent (0 when none active). */
export async function getShopDiscountPct(
  empireId: string,
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date()
): Promise<number> {
  const row = await tx.diamondEffect.findFirst({
    where: { empireId, kind: "SHOP_DISCOUNT", activeUntil: { gt: now } },
    select: { magnitude: true },
  });
  return row?.magnitude ?? 0;
}

/* ------------------------------ raid shields ------------------------------ */

/** When each raid shield expires, or null where none is running. */
export type ShieldExpiry = Record<ShieldKey, Date | null>;

const NO_SHIELDS: ShieldExpiry = { resources: null, soldiers: null };

/** A fresh, all-null shield map — never share the frozen constant by reference. */
function emptyShields(): ShieldExpiry {
  return { ...NO_SHIELDS };
}

/** The raid shields one empire currently holds. */
export async function getActiveShields(
  empireId: string,
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date()
): Promise<ShieldExpiry> {
  const rows = await tx.diamondEffect.findMany({
    where: { empireId, kind: { in: SHIELD_KINDS }, activeUntil: { gt: now } },
    select: { kind: true, activeUntil: true },
  });
  const out = emptyShields();
  for (const shield of SHIELDS) {
    out[shield.key] = rows.find((r) => r.kind === shield.kind)?.activeUntil ?? null;
  }
  return out;
}

/**
 * The same, for a page showing many empires at once (the rankings ladder) —
 * one query for the whole list instead of one per row. Empires without a shield
 * are simply absent from the map.
 */
export async function getShieldsForEmpires(
  empireIds: string[],
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date()
): Promise<Map<string, ShieldExpiry>> {
  const out = new Map<string, ShieldExpiry>();
  if (empireIds.length === 0) return out;

  const rows = await tx.diamondEffect.findMany({
    where: {
      empireId: { in: empireIds },
      kind: { in: SHIELD_KINDS },
      activeUntil: { gt: now },
    },
    select: { empireId: true, kind: true, activeUntil: true },
  });
  for (const row of rows) {
    const shield = SHIELDS.find((s) => s.kind === row.kind);
    if (!shield) continue;
    const entry = out.get(row.empireId) ?? emptyShields();
    entry[shield.key] = row.activeUntil;
    out.set(row.empireId, entry);
  }
  return out;
}