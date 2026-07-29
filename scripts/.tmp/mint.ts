import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
const p = new PrismaClient();
async function main() {
  const e = await p.empire.findFirstOrThrow({ where: { name: "YellowEmpire" }, include: { user: true } });
  console.log("emailVerified:", e.user.emailVerified, "banned:", e.user.bannedAt);
  const secret = process.env.AUTH_SECRET!;
  console.log("secret starts:", secret.slice(0, 6));
  const token = await new SignJWT({ sub: e.userId, ver: e.user.tokenVersion })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("2h")
    .sign(new TextEncoder().encode(secret));
  console.log("TOKEN=" + token);
  await p.$disconnect();
}
main();
