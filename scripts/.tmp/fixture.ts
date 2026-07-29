/**
 * Local-only scratch fixture: stuff a defender full of state and write one
 * successful spy report against it, so the dossier page can be inspected with
 * every section populated. Not part of the app.
 */
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { buildSpyIntel } from "../../src/lib/game/spyIntel";

const p = new PrismaClient();

const ATTACKER = "YellowEmpire";
const DEFENDER = "Bedika56469";

async function main() {
  const attacker = await p.empire.findFirstOrThrow({ where: { name: ATTACKER }, include: { user: true } });
  const defender = await p.empire.findFirstOrThrow({ where: { name: DEFENDER }, include: { hero: true } });
  const now = new Date();
  const hours = (h: number) => new Date(now.getTime() + h * 3_600_000);

  await p.empire.update({
    where: { id: defender.id },
    data: {
      level: 27,
      gold: 8_400_000,
      wood: 2_310_000,
      iron: 1_775_000,
      stone: 990_000,
      diamonds: 1420,
      citizens: 640,
      turns: 1830,
      wheelSpins: 3,
    },
  });

  await p.army.update({
    where: { empireId: defender.id },
    data: { soldiers: 14_500, spies: 320, mineSlaves: 780 },
  });

  for (const [type, level, slaves] of [
    ["GOLD_MINE", 22, 260],
    ["WOOD_CAMP", 18, 190],
    ["IRON_MINE", 16, 180],
    ["STONE_QUARRY", 14, 150],
    ["BARRACKS", 12, 0],
    ["SPY_CENTER", 9, 0],
  ] as const) {
    await p.building.upsert({
      where: { empireId_type: { empireId: defender.id, type } },
      create: { empireId: defender.id, type, level, slavesAssigned: slaves },
      update: { level, slavesAssigned: slaves },
    });
  }

  for (const [type, level, stored] of [
    ["GOLD", 40, 355_000],
    ["WOOD", 25, 190_000],
    ["IRON", 18, 120_000],
    ["STONE", 12, 44_000],
  ] as const) {
    await p.resourceStorage.upsert({
      where: { empireId_resourceType: { empireId: defender.id, resourceType: type } },
      create: { empireId: defender.id, resourceType: type, level, storedAmount: stored },
      update: { level, storedAmount: stored },
    });
  }

  for (const [type, level] of [
    ["CITIZEN_GROWTH", 9],
    ["INTELLIGENCE", 14],
    ["BANK_DEPOSIT_COUNT", 6],
    ["BANK_DAILY_INTEREST", 11],
    ["TURNS_PER_REGULAR_UPDATE", 8],
    ["WHEEL_LUCK", 5],
  ] as const) {
    await p.empireUpgrade.upsert({
      where: { empireId_type: { empireId: defender.id, type } },
      create: { empireId: defender.id, type, level },
      update: { level },
    });
  }

  await p.bankAccount.upsert({
    where: { empireId: defender.id },
    create: { empireId: defender.id, goldBalance: 42_800_000, depositsUsedInCurrentPeriod: 3 },
    update: { goldBalance: 42_800_000, depositsUsedInCurrentPeriod: 3 },
  });

  const weapons: [string, number][] = [
    ["ATTACK_T14", 240], ["ATTACK_T11", 900], ["ATTACK_T8", 3100], ["ATTACK_T5", 5400],
    ["DEFENSE_T13", 310], ["DEFENSE_T10", 1200], ["DEFENSE_T6", 4200],
    ["SPY_T12", 180], ["SPY_T9", 640], ["SPY_T4", 2100],
  ];
  for (const [weaponKey, quantity] of weapons) {
    await p.empireWeapon.upsert({
      where: { empireId_weaponKey: { empireId: defender.id, weaponKey } },
      create: { empireId: defender.id, weaponKey, quantity },
      update: { quantity },
    });
  }
  for (const [category, unlockedTier] of [["ATTACK", 15], ["DEFENSE", 14], ["SPY", 13]] as const) {
    await p.empireWeaponUnlock.upsert({
      where: { empireId_category: { empireId: defender.id, category } },
      create: { empireId: defender.id, category, unlockedTier },
      update: { unlockedTier },
    });
  }

  const hero = await p.hero.upsert({
    where: { empireId: defender.id },
    create: { empireId: defender.id },
    update: {},
  });
  await p.hero.update({
    where: { id: hero.id },
    data: {
      heroClass: "GUARDIAN",
      level: 61,
      xp: 4200,
      health: 0,
      diedAt: new Date(now.getTime() - 18 * 60_000),
      resets: 2,
      unspentPoints: 7,
      attackPoints: 120,
      defensePoints: 260,
      resourcePoints: 40,
    },
  });
  await p.heroItem.deleteMany({ where: { heroId: hero.id } });
  for (const [slot, level, rarity] of [
    ["SWORD", 58, "EPIC"], ["HELMET", 44, "RARE"], ["ARMOR", 61, "LEGENDARY"],
    ["SHIELD", 52, "EPIC"], ["BOOTS", 30, "RARE"], ["RELIC", 60, "LEGENDARY"],
    ["WINGS", 25, "COMMON"],
  ] as const) {
    await p.heroItem.create({ data: { heroId: hero.id, slot, level, rarity, equipped: true } });
  }

  await p.heroQuest.deleteMany({ where: { empireId: defender.id } });
  await p.heroQuest.create({
    data: { empireId: defender.id, tier: 4, endsAt: hours(2.4), turnsSpent: 40, rewardGold: 1 },
  });

  const guild = await p.guild.upsert({
    where: { name: "אבירי הברזל" },
    create: { name: "אבירי הברזל", capacityLevel: 8, aidLevel: 6 },
    update: { aidLevel: 6 },
  });
  await p.guildMember.upsert({
    where: { empireId: defender.id },
    // LEADER, not DEPUTY: a guild always has exactly one leader (see
    // server/guildLeadership.ts), and seeding a lone deputy produced a headless
    // guild in the dev database that no player could govern.
    create: { guildId: guild.id, empireId: defender.id, role: "LEADER" },
    update: { guildId: guild.id, role: "LEADER" },
  });

  await p.guildSpellBuff.deleteMany({ where: { empireId: defender.id } });
  await p.guildSpellBuff.createMany({
    data: [
      { empireId: defender.id, type: "DEFENSE", bonusPct: 18, expiresAt: hours(9.2) },
      { empireId: defender.id, type: "RESOURCES", bonusPct: 12, expiresAt: hours(3.7) },
    ],
  });

  await p.potionEffect.deleteMany({ where: { empireId: defender.id } });
  for (const [kind, h] of [["HERO_INVULNERABLE", 0.6], ["DOUBLE_RESOURCES", 0.25]] as const) {
    await p.potionEffect.create({
      data: { empireId: defender.id, kind, expiresAt: hours(h) },
    });
  }

  await p.diamondEffect.deleteMany({ where: { empireId: defender.id } });
  for (const [kind, magnitude, h] of [
    ["SHIELD_RESOURCES", 0, 21],
    ["RESOURCE_BOOST_GOLD", 75, 14.5],
    ["SHOP_DISCOUNT", 20, 6.1],
  ] as const) {
    await p.diamondEffect.create({
      data: { empireId: defender.id, kind, magnitude, activeUntil: hours(h) },
    });
  }

  /* ---- write the report exactly as spyOnEmpire would ---- */
  const full = await p.empire.findUniqueOrThrow({
    where: { id: defender.id },
    include: {
      buildings: true, army: true, storages: true, upgrades: true,
      bankAccount: true, weapons: true, weaponUnlocks: true,
      hero: { include: { items: true } },
    },
  });
  const [meta, spellBuffs, potionEffects, diamondEffects, heroQuest] = await Promise.all([
    p.empire.findUnique({
      where: { id: defender.id },
      select: {
        user: { select: { name: true } },
        season: { select: { name: true } },
        guildMembership: { select: { role: true, guild: { select: { name: true, aidLevel: true } } } },
      },
    }),
    p.guildSpellBuff.findMany({ where: { empireId: defender.id } }),
    p.potionEffect.findMany({ where: { empireId: defender.id } }),
    p.diamondEffect.findMany({ where: { empireId: defender.id } }),
    p.heroQuest.findUnique({ where: { empireId: defender.id } }),
  ]);

  const revealed = buildSpyIntel(
    full,
    {
      rulerName: meta!.user.name,
      seasonName: meta!.season?.name ?? null,
      guild: meta!.guildMembership
        ? {
            name: meta!.guildMembership.guild.name,
            role: meta!.guildMembership.role,
            aidLevel: meta!.guildMembership.guild.aidLevel,
          }
        : null,
      spellBuffs,
      potionEffects,
      diamondEffects,
      heroQuest,
      intelPower: 51_200,
    },
    now
  );

  await p.spyReport.deleteMany({ where: { attackerEmpireId: attacker.id } });
  const report = await p.spyReport.create({
    data: {
      attackerEmpireId: attacker.id,
      defenderEmpireId: defender.id,
      success: true,
      attackerIntel: 68_400,
      defenderIntel: 51_200,
      guildBonus: 9,
      turnsSpent: 5,
      revealedGold: full.gold,
      revealedWood: full.wood,
      revealedIron: full.iron,
      revealedStone: full.stone,
      revealedSoldiers: full.army!.soldiers,
      revealedSpies: full.army!.spies,
      revealedMineSlaves: full.army!.mineSlaves,
      revealed,
    },
  });

  const token = await new SignJWT({ sub: attacker.userId, ver: attacker.user.tokenVersion ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));

  console.log(JSON.stringify({ reportId: report.id, token }));
  await p.$disconnect();
}

main();
