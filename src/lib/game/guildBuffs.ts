import type { GuildSpellType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The strongest unexpired guild-spell buff of `type` on the empire, in
 * percent (0 when none). Buffs snapshot the guild's spell % at cast time,
 * so this works even after the caster leaves the guild.
 */
export async function getActiveGuildBuffPct(
  empireId: string,
  type: GuildSpellType,
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date()
): Promise<number> {
  const buff = await tx.guildSpellBuff.findFirst({
    where: { empireId, type, expiresAt: { gt: now } },
    orderBy: { bonusPct: "desc" },
    select: { bonusPct: true },
  });
  return buff?.bonusPct ?? 0;
}
