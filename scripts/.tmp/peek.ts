import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const empires = await p.empire.findMany({
    select: { id: true, name: true, cities: true, turns: true, army: { select: { spies: true } } },
    take: 10,
  });
  console.log(empires);
  console.log("spyReports", await p.spyReport.count());
  await p.$disconnect();
}
main();
