/**
 * One-off repair for guilds that were left without a leader.
 *
 * A guild with members is supposed to have exactly one leader, but nothing used
 * to enforce it: an admin removing or demoting the leader, a deleted Empire row
 * cascading its membership away, or a fixture seeding a lone deputy all left the
 * office empty — and a headless guild cannot fill it from the game screen, since
 * `setGuildRole` and `transferGuildLeadership` both demand a LEADER.
 *
 * `ensureGuildLeader` now runs on every guild action, so any such guild heals
 * itself the moment a member does *anything*. This script does it up front, so a
 * database that is already in that state does not have to wait to be noticed.
 *
 *   npx tsx scripts/repair-guild-leadership.ts
 *
 * Idempotent — a guild that has its leader is skipped, and an empty guild is
 * left alone.
 */
// Its own client, like every other script here: src/lib/prisma imports
// `server-only`, which tsx cannot resolve outside the Next build.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const guilds = await prisma.guild.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { members: true } },
      members: { where: { role: "LEADER" }, select: { id: true } },
    },
  });

  const headless = guilds.filter(
    (g) => g._count.members > 0 && g.members.length === 0
  );

  if (headless.length === 0) {
    console.log(`Checked ${guilds.length} guild(s) — every one has its leader.`);
    return;
  }

  for (const guild of headless) {
    // The succession rule itself lives in src/server/guildLeadership.ts, which
    // is what the running app uses; this mirrors it. GuildRole is declared
    // LEADER, DEPUTY, MEMBER, so ascending enum order is rank order — deputies
    // outrank plain members, and seniority breaks the tie.
    const heir = await prisma.guildMember.findFirst({
      where: { guildId: guild.id },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      include: { empire: { select: { name: true } } },
    });
    if (!heir) continue;

    await prisma.guildMember.update({
      where: { id: heir.id },
      data: { role: "LEADER" },
    });
    await prisma.message.create({
      data: {
        empireId: heir.empireId,
        kind: "SYSTEM",
        title: "👑 מונית למנהיג הברית",
        body: `הברית "${guild.name}" נותרה ללא מנהיג ואתה הוותיק ביותר בה — ההנהגה עברה אליך.`,
        href: "/game/guild",
      },
    });
    console.log(`"${guild.name}" → crowned ${heir.empire.name}`);
  }

  console.log(`Repaired ${headless.length} of ${guilds.length} guild(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Repair failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
