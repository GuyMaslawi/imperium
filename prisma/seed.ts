import {
  PrismaClient,
  BuildingType,
  ResourceStorageType,
  EmpireUpgradeType,
  WeaponCategory,
  HeroItemSlot,
  HeroRarity,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  INITIAL_WEAPON_UNLOCKED_TIER,
  MAX_WEAPON_TIER,
  WEAPONS,
} from "../src/lib/game/weapons";

const prisma = new PrismaClient();

const BUILDING_TYPES: BuildingType[] = [
  "GOLD_MINE",
  "WOOD_CAMP",
  "IRON_MINE",
  "STONE_QUARRY",
  "BARRACKS",
  "SPY_CENTER",
];

const PRODUCTION_BUILDINGS: BuildingType[] = [
  "GOLD_MINE",
  "WOOD_CAMP",
  "IRON_MINE",
  "STONE_QUARRY",
];

const STORAGE_TYPES: ResourceStorageType[] = ["GOLD", "WOOD", "IRON", "STONE"];

const UPGRADE_TYPES: EmpireUpgradeType[] = [
  "CITIZEN_GROWTH",
  "INTELLIGENCE",
  "BANK_DEPOSIT_COUNT",
  "BANK_DAILY_INTEREST",
  "TURNS_PER_REGULAR_UPDATE",
];

/** Demo empires start with a healthy stock of turns for spying/attacking. */
const DEMO_STARTING_TURNS = 100;

const STORAGE_CAPACITY_PER_LEVEL = 10_000;

interface DemoEmpire {
  email: string;
  userName: string;
  empireName: string;
  level: number;
  gold: number;
  wood: number;
  iron: number;
  stone: number;
  diamonds: number;
  citizens: number;
  buildingLevel: number;
  slavesPerBuilding: number;
  soldiers: number;
  spies: number;
  mineSlaves: number;
  upgradeLevel: number;
}

const DEMO_EMPIRES: DemoEmpire[] = [
  {
    email: "leviathan@demo.imperium",
    userName: "אריאל",
    empireName: "ממלכת הלווייתן",
    level: 8,
    gold: 45000, wood: 30000, iron: 22000, stone: 18000, diamonds: 120,
    citizens: 300, buildingLevel: 6, slavesPerBuilding: 30,
    soldiers: 400, spies: 8, mineSlaves: 150, upgradeLevel: 4,
  },
  {
    email: "desert@demo.imperium",
    userName: "נועה",
    empireName: "נסיכות המדבר",
    level: 6,
    gold: 28000, wood: 19000, iron: 14000, stone: 12000, diamonds: 60,
    citizens: 220, buildingLevel: 5, slavesPerBuilding: 22,
    soldiers: 250, spies: 5, mineSlaves: 100, upgradeLevel: 3,
  },
  {
    email: "north@demo.imperium",
    userName: "עידו",
    empireName: "מבצר הצפון",
    level: 5,
    gold: 18000, wood: 16000, iron: 9000, stone: 11000, diamonds: 35,
    citizens: 170, buildingLevel: 4, slavesPerBuilding: 18,
    soldiers: 180, spies: 3, mineSlaves: 80, upgradeLevel: 2,
  },
  {
    email: "valley@demo.imperium",
    userName: "מאיה",
    empireName: "עמק הזהב",
    level: 4,
    gold: 22000, wood: 9000, iron: 6000, stone: 7000, diamonds: 25,
    citizens: 140, buildingLevel: 3, slavesPerBuilding: 14,
    soldiers: 120, spies: 2, mineSlaves: 60, upgradeLevel: 2,
  },
  {
    email: "storm@demo.imperium",
    userName: "יונתן",
    empireName: "לגיון הסערה",
    level: 3,
    gold: 9000, wood: 7000, iron: 5000, stone: 4000, diamonds: 12,
    citizens: 100, buildingLevel: 2, slavesPerBuilding: 9,
    soldiers: 90, spies: 1, mineSlaves: 40, upgradeLevel: 1,
  },
  {
    email: "dawn@demo.imperium",
    userName: "תמר",
    empireName: "שומרי השחר",
    level: 2,
    gold: 5000, wood: 4000, iron: 2500, stone: 2500, diamonds: 5,
    citizens: 70, buildingLevel: 1, slavesPerBuilding: 6,
    soldiers: 40, spies: 1, mineSlaves: 25, upgradeLevel: 1,
  },
];

/** Storage level that can hold the given amount. */
function storageLevelFor(amount: number): number {
  return Math.max(1, Math.ceil(amount / STORAGE_CAPACITY_PER_LEVEL));
}

const WEAPON_CATEGORIES: WeaponCategory[] = ["ATTACK", "DEFENSE", "SPY"];

/** Weapon tier a demo empire has unlocked, scaled by its upgrade level. */
function demoUnlockedTier(upgradeLevel: number): number {
  return Math.min(MAX_WEAPON_TIER, INITIAL_WEAPON_UNLOCKED_TIER + upgradeLevel - 1);
}

/**
 * Weapon stock for a demo empire: every weapon up to its unlocked tier,
 * with quantities scaled by army size and thinning out at higher tiers —
 * so battle/spy calculations and reports show real weapon contributions.
 */
function demoWeapons(soldiers: number, unlockedTier: number) {
  return WEAPONS.filter((weapon) => weapon.tier <= unlockedTier).map((weapon) => ({
    weaponKey: weapon.key,
    quantity: Math.max(1, Math.round(soldiers / (weapon.tier * 4))),
  }));
}

/** Snap a level to the item catalog tiers (1, 5, 10, … 100). */
function itemTier(level: number): number {
  return Math.max(1, Math.min(100, Math.round(level / 5) * 5));
}

/**
 * Demo hero: level scales with the empire, points mostly allocated, a few
 * equipped items plus bag items — so battles show hero bonuses, tooltips
 * have data, and item capture has victims worth looting.
 */
function demoHero(empireLevel: number) {
  const heroLevel = Math.min(100, empireLevel * 8);
  const totalPoints = heroLevel - 1;
  const attackPoints = Math.floor(totalPoints * 0.4);
  const defensePoints = Math.floor(totalPoints * 0.4);
  const resourcePoints = Math.max(0, totalPoints - attackPoints - defensePoints - 2);
  const items: { slot: HeroItemSlot; level: number; rarity: HeroRarity; equipped: boolean }[] = [
    { slot: "SWORD", level: itemTier(heroLevel), rarity: "RARE", equipped: true },
    { slot: "HELMET", level: itemTier(heroLevel - 5), rarity: "COMMON", equipped: true },
    { slot: "ARMOR", level: itemTier(heroLevel - 10), rarity: "EPIC", equipped: true },
    { slot: "RELIC", level: itemTier(heroLevel - 5), rarity: "COMMON", equipped: true },
    { slot: "BOOTS", level: itemTier(heroLevel + 10), rarity: "RARE", equipped: false },
    { slot: "GAUNTLETS", level: itemTier(heroLevel - 15), rarity: "LEGENDARY", equipped: false },
    { slot: "WINGS", level: itemTier(heroLevel + 20), rarity: "EPIC", equipped: false },
  ];
  return {
    level: heroLevel,
    xp: Math.floor(heroLevel * 7),
    unspentPoints: 2,
    attackPoints,
    defensePoints,
    resourcePoints,
    items,
  };
}

async function main() {
  /* ---- active season ---- */
  let season = await prisma.gameSeason.findFirst({ where: { isActive: true } });
  if (!season) {
    const now = new Date();
    const endsAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    season = await prisma.gameSeason.create({
      data: {
        name: "עונה 1",
        startsAt: now,
        endsAt,
        isActive: true,
      },
    });
    console.log(`Created active season: ${season.name}`);
  } else {
    console.log(`Active season exists: ${season.name}`);
  }

  // Attach any season-less empires (e.g. pre-migration ones) to the active season.
  await prisma.empire.updateMany({
    where: { seasonId: null },
    data: { seasonId: season.id },
  });

  // Repair timestamps that the migration backfilled in local wall time:
  // update markers must never be in the future.
  const nowTs = new Date();
  await prisma.empire.updateMany({
    where: { lastDailyUpdateAt: { gt: nowTs } },
    data: { lastDailyUpdateAt: nowTs },
  });
  await prisma.empire.updateMany({
    where: { lastRegularUpdateAt: { gt: nowTs } },
    data: { lastRegularUpdateAt: nowTs },
  });

  // Reconcile pre-migration data: total assigned mine slaves must not exceed
  // the empire's mine slaves (old generic-worker assignments could exceed it).
  const empires = await prisma.empire.findMany({
    include: { buildings: true, army: true },
  });
  for (const empire of empires) {
    const totalSlaves = empire.army?.mineSlaves ?? 0;
    const assigned = empire.buildings.reduce((sum, b) => sum + b.slavesAssigned, 0);
    if (assigned <= totalSlaves) continue;

    const scale = assigned > 0 ? totalSlaves / assigned : 0;
    for (const building of empire.buildings) {
      if (building.slavesAssigned === 0) continue;
      await prisma.building.update({
        where: { id: building.id },
        data: { slavesAssigned: Math.floor(building.slavesAssigned * scale) },
      });
    }
    console.log(`Rebalanced mine slaves for: ${empire.name}`);
  }

  // Backfill: empires created before the turns system get the turns-gain
  // upgrade at level 1 (idempotent thanks to the unique [empireId, type]).
  for (const empire of empires) {
    await prisma.empireUpgrade.upsert({
      where: {
        empireId_type: { empireId: empire.id, type: "TURNS_PER_REGULAR_UPDATE" },
      },
      create: { empireId: empire.id, type: "TURNS_PER_REGULAR_UPDATE", level: 1 },
      update: {},
    });
  }

  /* ---- demo empires ---- */
  const passwordHash = await bcrypt.hash("demo1234", 10);

  for (const demo of DEMO_EMPIRES) {
    const existing = await prisma.user.findUnique({
      where: { email: demo.email },
      include: { empire: true },
    });
    if (existing) {
      // Backfill weapons/unlocks/bank for demo empires created by an older
      // seed, so they stay useful for battle and spy testing (idempotent).
      const empireId = existing.empire?.id;
      if (empireId) {
        const unlockedTier = demoUnlockedTier(demo.upgradeLevel);
        for (const category of WEAPON_CATEGORIES) {
          await prisma.empireWeaponUnlock.upsert({
            where: { empireId_category: { empireId, category } },
            create: { empireId, category, unlockedTier },
            update: {},
          });
        }
        for (const weapon of demoWeapons(demo.soldiers, unlockedTier)) {
          await prisma.empireWeapon.upsert({
            where: {
              empireId_weaponKey: { empireId, weaponKey: weapon.weaponKey },
            },
            create: { empireId, ...weapon },
            update: {},
          });
        }
        await prisma.bankAccount.upsert({
          where: { empireId },
          create: { empireId, goldBalance: Math.floor(demo.gold / 5) },
          update: {},
        });

        // Hero backfill: level/points for pre-hero-system demo empires, and
        // starter items when the hero has none (idempotent).
        const heroData = demoHero(demo.level);
        const hero = await prisma.hero.upsert({
          where: { empireId },
          create: {
            empireId,
            level: heroData.level,
            xp: heroData.xp,
            unspentPoints: heroData.unspentPoints,
            attackPoints: heroData.attackPoints,
            defensePoints: heroData.defensePoints,
            resourcePoints: heroData.resourcePoints,
          },
          update: {},
          include: { items: true },
        });
        if (hero.items.length === 0) {
          // A migration-backfilled hero is level 1 with no points — give it
          // the demo progression so battles show hero bonuses.
          await prisma.hero.update({
            where: { id: hero.id },
            data: {
              level: Math.max(hero.level, heroData.level),
              xp: hero.level > 1 ? hero.xp : heroData.xp,
              unspentPoints: Math.max(hero.unspentPoints, heroData.unspentPoints),
              attackPoints: Math.max(hero.attackPoints, heroData.attackPoints),
              defensePoints: Math.max(hero.defensePoints, heroData.defensePoints),
              resourcePoints: Math.max(hero.resourcePoints, heroData.resourcePoints),
            },
          });
          await prisma.heroItem.createMany({
            data: heroData.items.map((item) => ({ heroId: hero.id, ...item })),
          });
          console.log(`Equipped demo hero for: ${demo.empireName}`);
        }
      }
      console.log(`Refreshed existing: ${demo.empireName}`);
      continue;
    }

    const resourceByStorage: Record<ResourceStorageType, number> = {
      GOLD: demo.gold,
      WOOD: demo.wood,
      IRON: demo.iron,
      STONE: demo.stone,
    };
    // A quarter of each resource sits protected in the warehouse, so attack
    // tests can verify stored resources are never stolen.
    const storedByStorage: Record<ResourceStorageType, number> = {
      GOLD: Math.floor(demo.gold / 4),
      WOOD: Math.floor(demo.wood / 4),
      IRON: Math.floor(demo.iron / 4),
      STONE: Math.floor(demo.stone / 4),
    };
    const storageLevels: Record<ResourceStorageType, number> = {
      GOLD: storageLevelFor(resourceByStorage.GOLD),
      WOOD: storageLevelFor(resourceByStorage.WOOD),
      IRON: storageLevelFor(resourceByStorage.IRON),
      STONE: storageLevelFor(resourceByStorage.STONE),
    };

    const unlockedTier = demoUnlockedTier(demo.upgradeLevel);

    await prisma.user.create({
      data: {
        email: demo.email,
        passwordHash,
        name: demo.userName,
        empire: {
          create: {
            name: demo.empireName,
            level: demo.level,
            seasonId: season.id,
            gold: demo.gold,
            wood: demo.wood,
            iron: demo.iron,
            stone: demo.stone,
            diamonds: demo.diamonds,
            citizens: demo.citizens,
            turns: DEMO_STARTING_TURNS,
            buildings: {
              create: BUILDING_TYPES.map((type) => ({
                type,
                level: demo.buildingLevel,
                slavesAssigned: PRODUCTION_BUILDINGS.includes(type)
                  ? Math.min(
                      demo.slavesPerBuilding,
                      Math.floor(demo.mineSlaves / PRODUCTION_BUILDINGS.length)
                    )
                  : 0,
              })),
            },
            army: {
              create: {
                soldiers: demo.soldiers,
                spies: demo.spies,
                mineSlaves: demo.mineSlaves,
              },
            },
            storages: {
              create: STORAGE_TYPES.map((resourceType) => ({
                resourceType,
                level: storageLevels[resourceType],
                storedAmount: storedByStorage[resourceType],
              })),
            },
            upgrades: {
              create: UPGRADE_TYPES.map((type) => ({
                type,
                level: demo.upgradeLevel,
              })),
            },
            // Some banked gold so interest is visible in demo accounts and
            // attack tests can verify bank gold is never stolen.
            bankAccount: { create: { goldBalance: Math.floor(demo.gold / 5) } },
            weaponUnlocks: {
              create: WEAPON_CATEGORIES.map((category) => ({
                category,
                unlockedTier,
              })),
            },
            weapons: { create: demoWeapons(demo.soldiers, unlockedTier) },
            hero: (() => {
              const heroData = demoHero(demo.level);
              return {
                create: {
                  level: heroData.level,
                  xp: heroData.xp,
                  unspentPoints: heroData.unspentPoints,
                  attackPoints: heroData.attackPoints,
                  defensePoints: heroData.defensePoints,
                  resourcePoints: heroData.resourcePoints,
                  items: { create: heroData.items },
                },
              };
            })(),
          },
        },
      },
    });
    console.log(`Created: ${demo.empireName}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
