/**
 * One-off repair that brings every bot planted before 2026-08-03 down to the
 * fixed garrison bots are now built with.
 *
 * Bots used to be *sized* to their city — a power figure spent on soldiers,
 * spies and an arsenal — which made the planted garrison the strongest empire in
 * its tier and, worse, a farm: a raid on twenty thousand soldiers enslaves a
 * share of them, and the garrison grew back every hour. `src/lib/game/bots.ts`
 * now plants BOT_SOLDIERS soldiers and nothing else (see the note there for
 * why); this script rewrites the bots that were planted before it did.
 *
 *   npm run db:bots               # dry run (default)
 *   npm run db:bots -- --confirm  # execute
 *
 * It connects wherever `PRISMA_DATABASE_URL` points, which in `.env` is the
 * local database — the live one has to be named explicitly:
 *
 *   PRISMA_DATABASE_URL="postgres://…neon…" npm run db:bots -- --confirm
 *
 * The banner prints the host first, so check it before passing --confirm.
 *
 * Per bot it settles five things, all of them to exactly what a bot planted
 * today would have:
 *
 *   - the live army (`Army.soldiers` / `spies`),
 *   - the live arsenal — every `EmpireWeapon` row is deleted,
 *   - the denormalised power columns the ladder reads,
 *   - the `EmpireBot` row, which is what a refill an hour from now writes back
 *     — miss this and every repaired bot re-arms itself to the old garrison,
 *   - the mines: level by tier, {@link BOT_MINE_SLAVES} on each, and a slave
 *     pool that covers them.
 *
 * Idempotent, and touches nothing but `isBot` empires: a database whose bots are
 * already fixed reports nothing to do.
 */
// Its own client, like every other script here: src/lib/prisma imports
// `server-only`, which tsx cannot resolve outside the Next build.
import { PrismaClient } from "@prisma/client";
import {
  BOT_MINE_SLAVES,
  BOT_SOLDIERS,
  botGarrison,
  botHeroLevel,
  botMineSetup,
  botRealisedPower,
} from "../src/lib/game/bots";
import { isProductionBuilding } from "../src/lib/game/constants";
import { getEmpireMilitaryPower, getEmpireGeneralPower, getEmpireSpyPower } from "../src/lib/game/power";

const prisma = new PrismaClient();
const confirm = process.argv.includes("--confirm");

/** Which database this is about to edit — same datasource as the schema. */
function dbHost(): string {
  const m = (process.env.PRISMA_DATABASE_URL ?? "").match(/@([^/?]+)/);
  return m ? m[1]! : "(PRISMA_DATABASE_URL not set)";
}

async function main() {
  console.log(`Database host : ${dbHost()}`);
  console.log(`Mode          : ${confirm ? "EXECUTE" : "DRY RUN"}\n`);

  const bots = await prisma.empire.findMany({
    where: { isBot: true },
    select: {
      id: true,
      name: true,
      cities: true,
      militaryPower: true,
      army: { select: { soldiers: true, spies: true, mineSlaves: true } },
      weapons: { select: { quantity: true } },
      buildings: { select: { id: true, type: true, level: true, slavesAssigned: true } },
      bot: { select: { soldiers: true, spies: true } },
    },
  });

  const lines: string[] = [];
  for (const empire of bots) {
    // The garrison this bot would be planted with today. The hero level follows
    // the city, exactly as `planBots` derives it — the stored one is not read,
    // because a hand-edited hero must not change what the garrison is.
    const garrison = botGarrison(empire.cities, botHeroLevel(empire.cities));
    const power = botRealisedPower(garrison);
    const mines = botMineSetup(empire.cities);
    const mineCount = empire.buildings.filter((b) => isProductionBuilding(b.type)).length;
    const pool = mines.slavesPerMine * mineCount;
    const weapons = empire.weapons.reduce((sum, w) => sum + w.quantity, 0);

    const alreadyFixed =
      empire.army?.soldiers === garrison.soldiers &&
      empire.army?.spies === 0 &&
      empire.army?.mineSlaves === pool &&
      weapons === 0 &&
      empire.militaryPower === power &&
      empire.bot?.soldiers === garrison.soldiers &&
      empire.bot?.spies === 0 &&
      empire.buildings.every(
        (b) =>
          !isProductionBuilding(b.type) ||
          (b.level === mines.level && b.slavesAssigned === mines.slavesPerMine)
      );
    if (alreadyFixed) continue;

    lines.push(
      `${empire.name} (עיר ${empire.cities}): ` +
        `חיילים ${empire.army?.soldiers ?? 0} → ${garrison.soldiers}, ` +
        `מרגלים ${empire.army?.spies ?? 0} → 0, ` +
        `נשק ${weapons} → 0, ` +
        `כוח ${Math.round(empire.militaryPower)} → ${power}, ` +
        `עבדים למכרה → ${mines.slavesPerMine}`
    );
    if (!confirm) continue;

    // One transaction per bot: a repair that half-lands would leave a garrison
    // whose EmpireBot row and army disagree, which the next refill would then
    // make permanent.
    await prisma.$transaction(async (tx) => {
      await tx.army.updateMany({
        where: { empireId: empire.id },
        data: { soldiers: garrison.soldiers, spies: garrison.spies, mineSlaves: pool },
      });
      await tx.empireWeapon.deleteMany({ where: { empireId: empire.id } });
      await tx.empireBot.updateMany({
        where: { empireId: empire.id },
        data: {
          targetPower: power,
          soldiers: garrison.soldiers,
          spies: garrison.spies,
          weaponTier: garrison.weaponTier,
          attackWeapons: garrison.attackWeapons,
          defenseWeapons: garrison.defenseWeapons,
          spyWeapons: garrison.spyWeapons,
        },
      });
      for (const building of empire.buildings) {
        if (!isProductionBuilding(building.type)) continue;
        await tx.building.update({
          where: { id: building.id },
          data: { level: mines.level, slavesAssigned: mines.slavesPerMine },
        });
      }
      // The three denormalised columns, recomputed from what was just written —
      // an empty arsenal, so they are the bodies alone.
      const army = { soldiers: garrison.soldiers, spies: garrison.spies };
      await tx.empire.updateMany({
        where: { id: empire.id },
        data: {
          militaryPower: getEmpireMilitaryPower(army, []),
          generalPower: getEmpireGeneralPower(army, []),
          spyPower: getEmpireSpyPower(army, []),
        },
      });
    });
  }

  console.log(`Bots found    : ${bots.length}`);
  if (lines.length === 0) {
    console.log(`\nEvery bot already stands at ${BOT_SOLDIERS} soldiers with no arsenal.`);
    return;
  }
  for (const line of lines) console.log(`  ${line}`);
  console.log(
    confirm
      ? `\nNormalised ${lines.length} bot(s).`
      : `\n${lines.length} bot(s) to normalise. DRY RUN — nothing was changed. Re-run with --confirm to execute.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Normalisation failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
