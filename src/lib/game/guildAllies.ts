import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The guild two empires share, or null when they don't share one.
 *
 * Allies don't raid each other: a guild pools its power into every member's
 * battles (aid + spells), so a raid between guildmates is an empire farming
 * loot off its own reinforcements. `attackEmpire` refuses it, and the war
 * buttons that lead there hide themselves for the same reason. Spying is
 * deliberately *not* covered — intel inside a guild is fair game.
 *
 * One query for both sides: two membership rows with the same guild id is the
 * whole test. A guildless empire simply has no row.
 */
export async function sharedGuild(
  aEmpireId: string,
  bEmpireId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<{ id: string; name: string } | null> {
  if (aEmpireId === bEmpireId) return null;

  const rows = await tx.guildMember.findMany({
    where: { empireId: { in: [aEmpireId, bEmpireId] } },
    select: { guildId: true, guild: { select: { name: true } } },
  });
  if (rows.length < 2 || rows[0].guildId !== rows[1].guildId) return null;

  return { id: rows[0].guildId, name: rows[0].guild.name };
}
