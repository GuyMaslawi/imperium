/**
 * One-off repair for values sitting above the ceiling the game enforces.
 *
 * The admin editor used to clamp only the *lower* end of every level field, so
 * a typo (or a deliberate hand-out) could write a mine at level 555,555,555 —
 * `mineProductionValue` is `level × 2` per assigned slave per tick, so such a
 * row is an infinite resource faucet that also poisons the rankings, the world
 * records and every ranking-derived reward. `src/server/actions/admin.ts` now
 * clamps to the same caps the game itself does; this script fixes the rows that
 * were written before it did.
 *
 *   npx tsx scripts/repair-out-of-range.ts             # dry run (default)
 *   npx tsx scripts/repair-out-of-range.ts --confirm   # execute
 *
 * Idempotent: a database already inside the caps reports nothing to do. Values
 * are only ever lowered — nothing here promotes an under-levelled row.
 */
// Its own client, like every other script here: src/lib/prisma imports
// `server-only`, which tsx cannot resolve outside the Next build.
import { PrismaClient } from "@prisma/client";
import {
  MAX_CITIES,
  MINE_MAX_LEVEL,
  EMPIRE_UPGRADE_META,
  empireUpgradeMaxLevel,
  isProductionBuilding,
  type ActiveEmpireUpgradeType,
} from "../src/lib/game/constants";
import { TIERS_PER_CATEGORY } from "../src/lib/game/weapons";
import {
  GUILD_AID_MAX_LEVEL,
  GUILD_CAPACITY_MAX_LEVEL,
} from "../src/lib/game/guild";
import {
  HERO_MAX_HEALTH,
  HERO_MAX_LEVEL,
  heroPointPool,
  xpToNextLevel,
} from "../src/lib/game/hero";

const prisma = new PrismaClient();
const confirm = process.argv.includes("--confirm");

const fixes: string[] = [];
/** Queue a repair line and, when executing, the write that performs it. */
async function fix(what: string, write: () => Promise<unknown>) {
  fixes.push(what);
  if (confirm) await write();
}

/** Which database this is about to edit — same datasource as the schema. */
function dbHost(): string {
  const m = (process.env.PRISMA_DATABASE_URL ?? "").match(/@([^/?]+)/);
  return m ? m[1]! : "(PRISMA_DATABASE_URL not set)";
}

async function main() {
  console.log(`Database host : ${dbHost()}`);
  console.log(`Mode          : ${confirm ? "EXECUTE" : "DRY RUN"}\n`);

  /* ---------------------------- cities ---------------------------- */
  const wideEmpires = await prisma.empire.findMany({
    where: { cities: { gt: MAX_CITIES } },
    select: { id: true, name: true, cities: true },
  });
  for (const e of wideEmpires) {
    await fix(`${e.name}: ערים ${e.cities} → ${MAX_CITIES}`, () =>
      prisma.empire.update({ where: { id: e.id }, data: { cities: MAX_CITIES } })
    );
  }

  /* -------------------- buildings: level + slaves -------------------- */
  const empires = await prisma.empire.findMany({
    select: {
      id: true,
      name: true,
      cities: true,
      army: { select: { mineSlaves: true } },
      buildings: {
        select: { id: true, type: true, level: true, slavesAssigned: true },
      },
      upgrades: { select: { id: true, type: true, level: true } },
    },
  });

  for (const empire of empires) {
    // Mines share the player's ceiling; the barracks and the spy center are
    // built once at level 1 and have no upgrade path at all.
    for (const b of empire.buildings) {
      const cap = isProductionBuilding(b.type) ? MINE_MAX_LEVEL : 1;
      if (b.level > cap) {
        await fix(`${empire.name}: ${b.type} רמה ${b.level} → ${cap}`, () =>
          prisma.building.update({ where: { id: b.id }, data: { level: cap } })
        );
      }
    }

    // Assigned slaves are a shared pool — the assignment screen refuses any
    // split whose total exceeds the army's `mineSlaves`. An over-assigned mine
    // is producing for workers the empire never trained, so the surplus is
    // taken off the fullest mines first.
    const mines = empire.buildings.filter((b) => isProductionBuilding(b.type));
    const pool = empire.army?.mineSlaves ?? 0;
    let assigned = mines.reduce((sum, b) => sum + b.slavesAssigned, 0);
    if (assigned > pool) {
      for (const b of [...mines].sort((a, c) => c.slavesAssigned - a.slavesAssigned)) {
        if (assigned <= pool) break;
        const keep = Math.max(0, b.slavesAssigned - (assigned - pool));
        assigned -= b.slavesAssigned - keep;
        await fix(
          `${empire.name}: ${b.type} עבדים ${b.slavesAssigned} → ${keep} (מאגר ${pool})`,
          () =>
            prisma.building.update({
              where: { id: b.id },
              data: { slavesAssigned: keep },
            })
        );
      }
    }

    /* ------------------------ empire upgrades ------------------------ */
    for (const u of empire.upgrades) {
      // DIAMOND_YIELD is retired and carries no metadata — leave it be.
      if (!(u.type in EMPIRE_UPGRADE_META)) continue;
      const cap = empireUpgradeMaxLevel(
        u.type as ActiveEmpireUpgradeType,
        empire.cities
      );
      if (cap !== undefined && u.level > cap) {
        await fix(`${empire.name}: שדרוג ${u.type} רמה ${u.level} → ${cap}`, () =>
          prisma.empireUpgrade.update({ where: { id: u.id }, data: { level: cap } })
        );
      }
    }
  }

  /* ------------------------- weapon unlocks ------------------------- */
  const overTier = await prisma.empireWeaponUnlock.findMany({
    where: { unlockedTier: { gt: TIERS_PER_CATEGORY } },
    select: { id: true, category: true, unlockedTier: true, empire: { select: { name: true } } },
  });
  for (const u of overTier) {
    await fix(
      `${u.empire.name}: ${u.category} טיר ${u.unlockedTier} → ${TIERS_PER_CATEGORY}`,
      () =>
        prisma.empireWeaponUnlock.update({
          where: { id: u.id },
          data: { unlockedTier: TIERS_PER_CATEGORY },
        })
    );
  }

  /* ----------------------------- heroes ----------------------------- */
  const heroes = await prisma.hero.findMany({
    select: {
      id: true,
      level: true,
      xp: true,
      health: true,
      resets: true,
      attackPoints: true,
      defensePoints: true,
      resourcePoints: true,
      unspentPoints: true,
      empire: { select: { name: true } },
    },
  });
  for (const hero of heroes) {
    const level = Math.min(HERO_MAX_LEVEL, hero.level);
    // XP is consumed as it is earned, so a live hero never holds more than the
    // next level's cost — and a hero at the cap always sits at exactly 0.
    const xp =
      level >= HERO_MAX_LEVEL ? 0 : Math.min(hero.xp, xpToNextLevel(level));
    const health = Math.min(HERO_MAX_HEALTH, hero.health);
    // One point per level the hero stands at, plus 25 for every reset behind
    // him. Refilled in allocation order, exactly as `updateHero` does — and the
    // leftover goes to `unspentPoints`, so a hero who was shorted is topped up
    // here as well as clamped (the same repair `applyPendingUpdates` performs
    // lazily on every load).
    const poolSize = heroPointPool(level, hero.resets);
    let left = poolSize;
    const take = (n: number) => {
      const got = Math.min(left, Math.max(0, n));
      left -= got;
      return got;
    };
    const attackPoints = take(hero.attackPoints);
    const defensePoints = take(hero.defensePoints);
    const resourcePoints = take(hero.resourcePoints);
    // Everything the pool has left lands here, not just what the row claimed.
    const unspentPoints = take(hero.unspentPoints) + left;

    const changed =
      level !== hero.level ||
      xp !== hero.xp ||
      health !== hero.health ||
      attackPoints !== hero.attackPoints ||
      defensePoints !== hero.defensePoints ||
      resourcePoints !== hero.resourcePoints ||
      unspentPoints !== hero.unspentPoints;
    if (!changed) continue;

    await fix(
      `${hero.empire.name}: גיבור רמה ${hero.level}→${level}, נק' ` +
        `${hero.attackPoints}/${hero.defensePoints}/${hero.resourcePoints}/${hero.unspentPoints} → ` +
        `${attackPoints}/${defensePoints}/${resourcePoints}/${unspentPoints} (מאגר ${poolSize})`,
      () =>
        prisma.hero.update({
          where: { id: hero.id },
          data: {
            level,
            xp,
            health,
            attackPoints,
            defensePoints,
            resourcePoints,
            unspentPoints,
          },
        })
    );
  }

  /* --------------------------- hero items --------------------------- */
  const overItems = await prisma.heroItem.findMany({
    where: { level: { gt: HERO_MAX_LEVEL } },
    select: { id: true, slot: true, level: true },
  });
  for (const item of overItems) {
    await fix(`פריט ${item.slot} רמה ${item.level} → ${HERO_MAX_LEVEL}`, () =>
      prisma.heroItem.update({
        where: { id: item.id },
        data: { level: HERO_MAX_LEVEL },
      })
    );
  }

  /* ----------------------------- guilds ----------------------------- */
  const guilds = await prisma.guild.findMany({
    select: { id: true, name: true, capacityLevel: true, aidLevel: true },
  });
  for (const g of guilds) {
    const capacityLevel = Math.min(GUILD_CAPACITY_MAX_LEVEL, g.capacityLevel);
    const aidLevel = Math.min(GUILD_AID_MAX_LEVEL, g.aidLevel);
    if (capacityLevel === g.capacityLevel && aidLevel === g.aidLevel) continue;
    await fix(
      `ברית ${g.name}: קיבולת ${g.capacityLevel}→${capacityLevel}, עזרה ${g.aidLevel}→${aidLevel}`,
      () => prisma.guild.update({ where: { id: g.id }, data: { capacityLevel, aidLevel } })
    );
  }

  /* ----------------------------- report ----------------------------- */
  if (fixes.length === 0) {
    console.log("Nothing out of range — every value is inside its cap.");
    return;
  }
  for (const line of fixes) console.log(`  ${line}`);
  console.log(
    confirm
      ? `\nRepaired ${fixes.length} value(s).`
      : `\n${fixes.length} value(s) out of range. DRY RUN — nothing was changed. Re-run with --confirm to execute.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Repair failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
