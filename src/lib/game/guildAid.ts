import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEmpireMilitaryPower } from "./power";
import { guildAidPct } from "./guild";

export interface GuildAidBonus {
  /** Aid percent in effect (0 when the empire has no guild or aid is level 0). */
  pct: number;
  /** Flat combat power the aid contributes = pct% of the guild's total power. */
  power: number;
  /** The guild's combined military power the aid is drawn from. */
  guildPower: number;
}

const NONE: GuildAidBonus = { pct: 0, power: 0, guildPower: 0 };

/**
 * Passive guild aid for `empireId`: a flat combat bonus equal to the guild's
 * aid percent applied to the whole guild's combined military power. It is
 * added on top of the fighter's own multiplied power in battle, so the guild's
 * collective strength reinforces every member. Returns zeros when the empire
 * is guildless or aid has not been bought.
 */
export async function getGuildAidBonus(
  empireId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<GuildAidBonus> {
  const membership = await tx.guildMember.findUnique({
    where: { empireId },
    include: {
      guild: {
        include: {
          members: {
            include: {
              empire: { include: { army: true, weapons: true } },
            },
          },
        },
      },
    },
  });
  if (!membership) return NONE;

  const pct = guildAidPct(membership.guild.aidLevel);
  if (pct === 0) return NONE;

  const guildPower = membership.guild.members.reduce(
    (sum, member) =>
      sum + getEmpireMilitaryPower(member.empire.army, member.empire.weapons),
    0
  );

  return { pct, power: Math.round((guildPower * pct) / 100), guildPower };
}
