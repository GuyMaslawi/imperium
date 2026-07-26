/**
 * Throwaway: make a local dev empire and print a session cookie for it, so the
 * rankings page can be fetched and inspected. Not part of the app.
 */
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { newEmpireData } from "../src/lib/game/createEmpire";

const prisma = new PrismaClient();

async function main() {
  const email = "boss-viewer@example.test";
  await prisma.user.deleteMany({ where: { email } });
  const user = await prisma.user.create({
    data: { email, name: "Boss Viewer", passwordHash: "x", emailVerified: new Date() },
  });
  await prisma.empire.create({ data: newEmpireData(user.id, `viewer-${Date.now()}`) });
  // Give it enough turns and army that the CTA renders live, not disabled.
  await prisma.empire.update({
    where: { userId: user.id },
    data: { turns: 5000, army: { update: { soldiers: 2000 } } },
  });

  const token = await new SignJWT({ sub: user.id, ver: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("3600s")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
  console.log(token);
  await prisma.$disconnect();
}

main();
