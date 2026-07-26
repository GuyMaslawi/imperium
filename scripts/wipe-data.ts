/**
 * Wipe the game world, keeping one admin account.
 *
 * Intended for a pre-launch reset: every player, empire, guild, season, report
 * and message goes, so the game restarts from an empty world with the operator's
 * own login still working.
 *
 * DELIBERATELY PRESERVED
 *  - the admin User row named by --email (its empire is removed, so the next
 *    sign-in goes through /onboarding and builds a fresh one);
 *  - settled real-money purchases (status PAID, isTest false). These are
 *    financial records — receipts, refunds, chargebacks, tax. Pass
 *    --purge-purchases only if you are certain every row is a mock/test charge.
 *  - GameConfig, the balance tunables singleton. It is configuration, not
 *    player data; reset it from /admin/balance if you want defaults back.
 *
 * SAFETY
 *  - dry run by default: prints what WOULD be deleted and exits;
 *  - --confirm is required to touch anything;
 *  - refuses to run unless the target account exists AND is role ADMIN;
 *  - prints the database host it is about to hit — read it before confirming.
 *
 * USAGE
 *   npx tsx scripts/wipe-data.ts --email you@example.com                # dry run
 *   npx tsx scripts/wipe-data.ts --email you@example.com --confirm      # execute
 *
 * Reads PRISMA_DATABASE_URL from the environment. To target production, run it
 * with that environment's URL explicitly — do not rely on whichever .env happens
 * to load first (the Prisma CLI reads .env, the Next app reads .env.local).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

function dbHost(): string {
  // Must match the datasource in prisma/schema.prisma, otherwise this banner
  // reports a different database than the one the script is about to wipe.
  const url = process.env.PRISMA_DATABASE_URL ?? "";
  const m = url.match(/@([^/?]+)/);
  return m ? m[1]! : "(PRISMA_DATABASE_URL not set)";
}

async function main(): Promise<void> {
  const email = arg("email")?.trim().toLowerCase();
  const confirm = has("confirm");
  const purgePurchases = has("purge-purchases");

  if (!email) {
    console.error("Missing --email <admin address to keep>");
    process.exit(1);
  }

  console.log(`Database host : ${dbHost()}`);
  console.log(`Keeping admin : ${email}`);
  console.log(`Purchases     : ${purgePurchases ? "PURGE ALL" : "keep settled real-money rows"}`);
  console.log(`Mode          : ${confirm ? "EXECUTE" : "DRY RUN"}\n`);

  const keeper = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, email: true },
  });
  if (!keeper) {
    console.error(`No user with email ${email}. Refusing to wipe — you would lock yourself out.`);
    process.exit(1);
  }
  if (keeper.role !== "ADMIN") {
    console.error(`User ${email} has role ${keeper.role}, not ADMIN. Refusing to wipe.`);
    process.exit(1);
  }

  const keptPurchaseFilter = { status: "PAID" as const, isTest: false };

  const [
    users, empires, guilds, seasons, minigames, audit, purchases, keptPurchases,
  ] = await Promise.all([
    prisma.user.count({ where: { id: { not: keeper.id } } }),
    prisma.empire.count(),
    prisma.guild.count(),
    prisma.gameSeason.count(),
    prisma.miniGameEvent.count(),
    prisma.adminAuditLog.count(),
    prisma.diamondPurchase.count(),
    prisma.diamondPurchase.count({ where: keptPurchaseFilter }),
  ]);

  console.log("Will delete:");
  console.log(`  users (other than the keeper) : ${users}`);
  console.log(`  empires (incl. the keeper's)  : ${empires}`);
  console.log(`  guilds                        : ${guilds}`);
  console.log(`  seasons                       : ${seasons}`);
  console.log(`  mini-game events              : ${minigames}`);
  console.log(`  admin audit entries           : ${audit}`);
  console.log(
    `  diamond purchases             : ${purgePurchases ? purchases : purchases - keptPurchases}` +
      (purgePurchases ? "  (ALL)" : `  (keeping ${keptPurchases} settled real-money rows)`)
  );
  console.log(
    "\nEverything owned by a deleted user or empire (army, buildings, hero, items,\n" +
      "bank, reports, messages, season-pass progress) goes with it via cascade."
  );

  if (!confirm) {
    console.log("\nDRY RUN — nothing was changed. Re-run with --confirm to execute.");
    return;
  }

  console.log("\nExecuting...");

  // Users first: the cascade takes their empires and everything underneath.
  const delUsers = await prisma.user.deleteMany({ where: { id: { not: keeper.id } } });
  console.log(`  deleted users            : ${delUsers.count}`);

  // The keeper's own empire (the account itself stays).
  const delKeeperEmpire = await prisma.empire.deleteMany({ where: { userId: keeper.id } });
  console.log(`  deleted keeper's empire  : ${delKeeperEmpire.count}`);

  // Anything left that is not owned through a user.
  const delGuilds = await prisma.guild.deleteMany({});
  const delMinis = await prisma.miniGameEvent.deleteMany({});
  const delSeasons = await prisma.gameSeason.deleteMany({});
  const delAudit = await prisma.adminAuditLog.deleteMany({});
  console.log(`  deleted guilds           : ${delGuilds.count}`);
  console.log(`  deleted mini-games       : ${delMinis.count}`);
  console.log(`  deleted seasons          : ${delSeasons.count}`);
  console.log(`  deleted audit entries    : ${delAudit.count}`);

  const delPurchases = purgePurchases
    ? await prisma.diamondPurchase.deleteMany({})
    : await prisma.diamondPurchase.deleteMany({
        where: { NOT: keptPurchaseFilter },
      });
  console.log(`  deleted purchases        : ${delPurchases.count}`);

  // The keeper must not be locked out by the new email-verification gate: they
  // demonstrably control this address (it is the configured admin), and there
  // may be no mail provider wired up yet to send them a link.
  await prisma.user.update({
    where: { id: keeper.id },
    data: {
      emailVerified: new Date(),
      failedLogins: 0,
      lockedUntil: null,
    },
  });
  console.log(`  keeper marked verified & unlocked`);

  const [usersLeft, empiresLeft, purchasesLeft] = await Promise.all([
    prisma.user.count(),
    prisma.empire.count(),
    prisma.diamondPurchase.count(),
  ]);
  console.log(
    `\nDone. users=${usersLeft} empires=${empiresLeft} purchases=${purchasesLeft}`
  );
  console.log(
    `Sign in as ${keeper.email}; with no empire you will be routed to /onboarding.`
  );
}

main()
  .catch((e) => {
    console.error("Wipe failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
