/**
 * Grant (or revoke) the ADMIN role on one account.
 *
 * The app promotes an `ADMIN_EMAILS` address automatically, but only while the
 * system has NO admin at all (see requireAdmin in src/lib/admin.ts) — a
 * deliberate guard, since merely claiming an address must never grant
 * privilege. Once any admin row exists (e.g. the keeper account left behind by
 * scripts/wipe-data.ts), that bootstrap is closed and the role has to be set
 * here.
 *
 * SAFETY
 *  - dry run by default: prints the current state and exits;
 *  - --confirm is required to write anything;
 *  - prints the database host it is about to touch — read it before confirming;
 *  - refuses to promote an account whose email is not verified, matching the
 *    condition the in-app bootstrap enforces.
 *
 * USAGE
 *   npx tsx scripts/grant-admin.ts --email you@example.com             # dry run
 *   npx tsx scripts/grant-admin.ts --email you@example.com --confirm   # execute
 *   npx tsx scripts/grant-admin.ts --email old@example.com --revoke --confirm
 *
 * Reads PRISMA_DATABASE_URL from the environment (the Prisma CLI loads `.env`).
 * To target production, pass that environment's URL explicitly rather than
 * relying on whichever .env happens to load first:
 *
 *   PRISMA_DATABASE_URL="postgresql://…neon.tech/neondb?sslmode=require" \
 *     npx tsx scripts/grant-admin.ts --email you@example.com --confirm
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

function dbHost(): string {
  const url = process.env.PRISMA_DATABASE_URL ?? "";
  const m = url.match(/@([^/?]+)/);
  return m ? m[1]! : "(PRISMA_DATABASE_URL not set)";
}

async function main(): Promise<void> {
  const email = arg("email")?.trim().toLowerCase();
  const revoke = has("revoke");
  const confirm = has("confirm");

  if (!email) {
    console.error("Missing --email <address>");
    process.exit(1);
  }

  const target = revoke ? "USER" : "ADMIN";
  console.log(`Database host : ${dbHost()}`);
  console.log(`Account       : ${email}`);
  console.log(`New role      : ${target}`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, emailVerified: true, bannedAt: true },
  });
  if (!user) {
    console.error(`\nNo user with that address on this database.`);
    process.exit(1);
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true },
    orderBy: { email: "asc" },
  });
  console.log(`Current admins: ${admins.map((a) => a.email).join(", ") || "(none)"}`);
  console.log(`Current role  : ${user.role}${user.bannedAt ? " (BANNED)" : ""}`);
  console.log(`Email verified: ${user.emailVerified ? "yes" : "no"}`);

  if (!revoke && !user.emailVerified) {
    console.error(
      "\nRefusing to promote an unverified address — verify it first, or the" +
        " account could belong to someone who never proved they own it."
    );
    process.exit(1);
  }
  if (user.role === target) {
    console.log(`\nAlready ${target}. Nothing to do.`);
    return;
  }
  if (!confirm) {
    console.log("\nDry run — pass --confirm to apply.");
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: target } });
  console.log(`\n✅ ${email} is now ${target}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
