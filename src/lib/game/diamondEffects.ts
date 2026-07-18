import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { StorableResource } from "./constants";
import { RESOURCE_BOOST_KIND } from "./diamondShop";

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
