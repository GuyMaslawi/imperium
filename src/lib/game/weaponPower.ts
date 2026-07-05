import type { Prisma, WeaponCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { weaponsPower } from "./weapons";

async function weaponsPowerFor(
  empireId: string,
  category: WeaponCategory,
  tx: Prisma.TransactionClient = prisma
): Promise<number> {
  const rows = await tx.empireWeapon.findMany({
    where: { empireId },
    select: { weaponKey: true, quantity: true },
  });
  return weaponsPower(rows, category);
}

export function getAttackWeaponsPower(
  empireId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<number> {
  return weaponsPowerFor(empireId, "ATTACK", tx);
}

export function getDefenseWeaponsPower(
  empireId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<number> {
  return weaponsPowerFor(empireId, "DEFENSE", tx);
}

export function getSpyWeaponsPower(
  empireId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<number> {
  return weaponsPowerFor(empireId, "SPY", tx);
}
