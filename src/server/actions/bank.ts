"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { allowedDepositsPerDailyPeriod } from "@/lib/game/constants";
import { applyPendingUpdates, type FullEmpire } from "@/lib/game/updates";
import type { ActionState } from "./game";

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

interface BankContext {
  bankAccount: NonNullable<FullEmpire["bankAccount"]>;
  /** Whole gold available outside the warehouse. */
  availableGold: number;
  /** Whole gold currently in the bank. */
  bankGold: number;
  /** Whole gold protected in the gold warehouse. */
  storedGold: number;
  remainingDeposits: number;
}

/**
 * Shared shell for the bank actions: applies pending updates, loads (or
 * lazily creates) the empire's bank account and computes its balances —
 * all inside one transaction so validation and the transfer are atomic.
 */
async function runBankAction(
  perform: (
    ctx: BankContext,
    tx: Prisma.TransactionClient,
    empireId: string
  ) => Promise<ActionState>
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);
      // Empires predating the bank system get an account on first use.
      const bankAccount =
        empire.bankAccount ??
        (await tx.bankAccount.create({ data: { empireId } }));

      const depositLevel =
        empire.upgrades.find((u) => u.type === "BANK_DEPOSIT_COUNT")?.level ?? 1;
      const allowed = allowedDepositsPerDailyPeriod(depositLevel);
      const goldStorage = empire.storages.find((s) => s.resourceType === "GOLD");

      const ctx: BankContext = {
        bankAccount,
        availableGold: Math.floor(empire.gold),
        bankGold: Math.floor(bankAccount.goldBalance),
        storedGold: Math.floor(goldStorage?.storedAmount ?? 0),
        remainingDeposits: Math.max(
          0,
          allowed - bankAccount.depositsUsedInCurrentPeriod
        ),
      };
      return perform(ctx, tx, empireId);
    });

    revalidatePath("/game", "layout");
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

async function performDeposit(
  ctx: BankContext,
  tx: Prisma.TransactionClient,
  empireId: string,
  amount: number
): Promise<ActionState> {
  if (ctx.remainingDeposits < 1) {
    return { error: "ניצלת את כל ההפקדות הזמינות עד העדכון היומי הבא." };
  }
  if (amount > ctx.availableGold) {
    // Warehouse gold is protected — it must be withdrawn before banking it.
    return ctx.storedGold > 0
      ? { error: "יש למשוך זהב מהמחסן לפני שניתן להפקיד אותו בבנק." }
      : { error: "אין מספיק זהב זמין להפקדה." };
  }

  // Conditional updates so concurrent actions can never drive the available
  // gold negative or exceed the deposit allowance.
  const debited = await tx.empire.updateMany({
    where: { id: empireId, gold: { gte: amount } },
    data: { gold: { decrement: amount } },
  });
  if (debited.count === 0) {
    return { error: "אין מספיק זהב זמין להפקדה." };
  }
  const credited = await tx.bankAccount.updateMany({
    where: {
      id: ctx.bankAccount.id,
      depositsUsedInCurrentPeriod: ctx.bankAccount.depositsUsedInCurrentPeriod,
    },
    data: {
      goldBalance: { increment: amount },
      depositsUsedInCurrentPeriod: { increment: 1 },
    },
  });
  // Throw (instead of returning an error) so the debit above rolls back.
  if (credited.count === 0) throw new Error("deposit conflict");

  await tx.bankTransaction.create({
    data: {
      bankAccountId: ctx.bankAccount.id,
      empireId,
      type: "DEPOSIT",
      amount,
      balanceAfter: ctx.bankGold + amount,
    },
  });

  return {
    success: `הופקדו ${amount.toLocaleString("he-IL")} זהב בבנק`,
  };
}

async function performWithdraw(
  ctx: BankContext,
  tx: Prisma.TransactionClient,
  empireId: string,
  amount: number
): Promise<ActionState> {
  const withdrawn = await tx.bankAccount.updateMany({
    where: { id: ctx.bankAccount.id, goldBalance: { gte: amount } },
    data: { goldBalance: { decrement: amount } },
  });
  if (withdrawn.count === 0) {
    return { error: "אין מספיק זהב בבנק למשיכה." };
  }
  await tx.empire.update({
    where: { id: empireId },
    data: { gold: { increment: amount } },
  });

  await tx.bankTransaction.create({
    data: {
      bankAccountId: ctx.bankAccount.id,
      empireId,
      type: "WITHDRAW",
      amount,
      balanceAfter: ctx.bankGold - amount,
    },
  });

  return {
    success: `נמשכו ${amount.toLocaleString("he-IL")} זהב מהבנק`,
  };
}

const amountSchema = z.coerce.number().int().min(1).max(1_000_000_000);

export async function depositGoldToBank(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = amountSchema.safeParse(formData.get("amount"));
  if (!parsed.success) return { error: "כמות לא תקינה" };
  const amount = parsed.data;

  return runBankAction((ctx, tx, empireId) =>
    performDeposit(ctx, tx, empireId, amount)
  );
}

export async function depositAllGoldToBank(): Promise<ActionState> {
  return runBankAction(async (ctx, tx, empireId) => {
    if (ctx.availableGold < 1) {
      return ctx.storedGold > 0
        ? { error: "יש למשוך זהב מהמחסן לפני שניתן להפקיד אותו בבנק." }
        : { error: "אין מספיק זהב זמין להפקדה." };
    }
    return performDeposit(ctx, tx, empireId, ctx.availableGold);
  });
}

export async function withdrawGoldFromBank(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = amountSchema.safeParse(formData.get("amount"));
  if (!parsed.success) return { error: "כמות לא תקינה" };
  const amount = parsed.data;

  return runBankAction(async (ctx, tx, empireId) => {
    if (amount > ctx.bankGold) {
      return { error: "אין מספיק זהב בבנק למשיכה." };
    }
    return performWithdraw(ctx, tx, empireId, amount);
  });
}

export async function withdrawAllGoldFromBank(): Promise<ActionState> {
  return runBankAction(async (ctx, tx, empireId) => {
    if (ctx.bankGold < 1) {
      return { error: "אין זהב למשיכה מהבנק." };
    }
    return performWithdraw(ctx, tx, empireId, ctx.bankGold);
  });
}
