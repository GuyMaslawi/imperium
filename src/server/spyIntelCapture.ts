import "server-only";
import type { Prisma } from "@prisma/client";
import { buildSpyIntel } from "@/lib/game/spyIntel";
import type { FullEmpire } from "@/lib/game/updates";

/**
 * Freeze the full intelligence dossier on a target the moment a spy gets out.
 *
 * `applyPendingUpdates` already handed us the bulk of the city — army, mines,
 * warehouses, bank, arsenal, upgrades and hero — so this only fetches the
 * handful of rows that hang off other tables: who rules it, its guild, and the
 * timed spells (guild buffs, potions, diamond boosts, raid shields) that a
 * raider needs the *expiry* of, not just the existence.
 *
 * Called only on a successful mission, so a caught spy costs nothing here.
 */
export async function captureSpyIntel(
  tx: Prisma.TransactionClient,
  defender: FullEmpire,
  now: Date,
  intelPower: number
): Promise<Prisma.InputJsonValue> {
  const [meta, spellBuffs, potionEffects, diamondEffects, heroQuest] =
    await Promise.all([
      tx.empire.findUnique({
        where: { id: defender.id },
        select: {
          user: { select: { name: true } },
          season: { select: { name: true } },
          guildMembership: {
            select: {
              role: true,
              guild: { select: { name: true, aidLevel: true } },
            },
          },
        },
      }),
      tx.guildSpellBuff.findMany({
        where: { empireId: defender.id, expiresAt: { gt: now } },
        select: { type: true, bonusPct: true, expiresAt: true },
      }),
      tx.potionEffect.findMany({
        where: { empireId: defender.id, expiresAt: { gt: now } },
        select: { kind: true, expiresAt: true },
      }),
      tx.diamondEffect.findMany({
        where: { empireId: defender.id, activeUntil: { gt: now } },
        select: { kind: true, magnitude: true, activeUntil: true },
      }),
      tx.heroQuest.findUnique({
        where: { empireId: defender.id },
        select: { tier: true, endsAt: true },
      }),
    ]);

  const membership = meta?.guildMembership ?? null;

  return buildSpyIntel(
    defender,
    {
      rulerName: meta?.user.name ?? null,
      seasonName: meta?.season?.name ?? null,
      guild: membership
        ? {
            name: membership.guild.name,
            role: membership.role,
            aidLevel: membership.guild.aidLevel,
          }
        : null,
      spellBuffs,
      potionEffects,
      diamondEffects,
      heroQuest,
      intelPower,
    },
    now
  );
}
