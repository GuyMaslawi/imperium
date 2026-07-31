import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getSharedIpClusters } from "@/server/adminMonitor";

/**
 * The alt-cluster detector (2026-07-31).
 *
 * Groups accounts by the client address they registered from or last signed in
 * from, so the admin can spot one person's farm. Everything that could quietly go
 * wrong here is about *which* rows collapse together, which is a property of the
 * SQL and not of any TypeScript — so it is tested against a real Postgres:
 *
 *  - null addresses must never cluster (dev / un-proxied accounts would otherwise
 *    all pile into one fake ring),
 *  - an account whose two slots hold the same address is one member, not two,
 *  - a match across *different* slots (my signup == your last-login) still counts.
 */

const prisma = new PrismaClient();
const TAG = `ac${Date.now().toString(36)}`;

async function mk(
  key: string,
  ips: { signupIp?: string | null; lastLoginIp?: string | null }
) {
  const u = await prisma.user.create({
    data: {
      email: `${key}@${TAG}.test`,
      name: key,
      passwordHash: "x",
      emailVerified: new Date(),
      signupIp: ips.signupIp ?? null,
      lastLoginIp: ips.lastLoginIp ?? null,
    },
  });
  await prisma.empire.create({
    data: { userId: u.id, name: `${TAG}-${key}`, citizens: 0 },
  });
  return u.id;
}

/** Only the clusters made of accounts this test created. */
async function ourClusters() {
  const all = await getSharedIpClusters(500);
  return all.filter((c) => c.ip.startsWith(`${TAG}-`));
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  await prisma.$disconnect();
});

describe("shared-address clusters", () => {
  it("groups accounts that registered from the same address", async () => {
    const ip = `${TAG}-home`;
    const a = await mk("a", { signupIp: ip });
    const b = await mk("b", { signupIp: ip });
    // A lone account on its own address must not appear at all.
    await mk("lonely", { signupIp: `${TAG}-alone` });

    const clusters = await ourClusters();
    const home = clusters.find((c) => c.ip === ip);

    expect(home).toBeDefined();
    expect(home!.count).toBe(2);
    expect(home!.accounts.map((x) => x.userId).sort()).toEqual([a, b].sort());
    // The solo address is below the 2-account threshold and is not a cluster.
    expect(clusters.some((c) => c.ip === `${TAG}-alone`)).toBe(false);
  });

  it("never clusters accounts whose address is unknown (null)", async () => {
    await mk("ghost1", { signupIp: null, lastLoginIp: null });
    await mk("ghost2", { signupIp: null, lastLoginIp: null });

    const clusters = await ourClusters();
    // No cluster keyed on null/empty, and the two ghosts are not grouped together.
    expect(clusters.some((c) => c.ip === "" || c.ip == null)).toBe(false);
  });

  it("counts an account once even when both its slots hold the shared address", async () => {
    const ip = `${TAG}-both`;
    const solo = await mk("both-a", { signupIp: ip, lastLoginIp: ip });
    await mk("both-b", { signupIp: ip });

    const cluster = (await ourClusters()).find((c) => c.ip === ip);
    expect(cluster).toBeDefined();
    // Two distinct accounts — the first must not be double-counted for holding
    // the address in both of its slots.
    expect(cluster!.count).toBe(2);
    expect(cluster!.accounts.filter((x) => x.userId === solo)).toHaveLength(1);
  });

  it("matches across different slots — my signup is your last-login", async () => {
    const ip = `${TAG}-cross`;
    await mk("cross-signup", { signupIp: ip });
    await mk("cross-login", { lastLoginIp: ip });

    const cluster = (await ourClusters()).find((c) => c.ip === ip);
    expect(cluster).toBeDefined();
    expect(cluster!.count).toBe(2);
  });

  it("orders accounts oldest-first, so the original leads its alts", async () => {
    const ip = `${TAG}-order`;
    const first = await mk("order-first", { signupIp: ip });
    await new Promise((r) => setTimeout(r, 15));
    const second = await mk("order-second", { signupIp: ip });

    const cluster = (await ourClusters()).find((c) => c.ip === ip);
    expect(cluster!.accounts[0]!.userId).toBe(first);
    expect(cluster!.accounts[1]!.userId).toBe(second);
  });
});
