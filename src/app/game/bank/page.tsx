import Link from "next/link";
import type { BankTransactionType } from "@prisma/client";
import { requireEmpire } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  EMPIRE_UPGRADE_META,
  allowedDepositsPerDailyPeriod,
  bankInterestRate,
} from "@/lib/game/constants";
import { formatGameTime, nextDailyUpdate } from "@/lib/game/time";
import { formatDate, formatNumber } from "@/lib/game/format";
import { BankActions } from "@/components/game/BankActions";
import { Card, CardTitle } from "@/components/ui/Card";

export const metadata = { title: "בנק | אימפריום" };

const TRANSACTION_META: Record<
  BankTransactionType,
  { label: string; icon: string; sign: string; color: string }
> = {
  DEPOSIT: { label: "הפקדה", icon: "⬇️", sign: "+", color: "text-emerald-400" },
  WITHDRAW: { label: "משיכה", icon: "⬆️", sign: "-", color: "text-red-400" },
  INTEREST: { label: "ריבית", icon: "💰", sign: "+", color: "text-gold" },
};

export default async function BankPage() {
  const empire = await requireEmpire();

  const availableGold = Math.floor(empire.gold);
  const bankGold = Math.floor(empire.bankAccount?.goldBalance ?? 0);
  const storedGold = Math.floor(
    empire.storages.find((s) => s.resourceType === "GOLD")?.storedAmount ?? 0
  );

  const interestLevel =
    empire.upgrades.find((u) => u.type === "BANK_DAILY_INTEREST")?.level ?? 1;
  const depositLevel =
    empire.upgrades.find((u) => u.type === "BANK_DEPOSIT_COUNT")?.level ?? 1;

  const rate = bankInterestRate(interestLevel);
  const ratePercent = `${(rate * 100).toFixed(2)}%`;
  const nextInterest = Math.floor(bankGold * rate);

  const allowedDeposits = allowedDepositsPerDailyPeriod(depositLevel);
  const usedDeposits = empire.bankAccount?.depositsUsedInCurrentPeriod ?? 0;
  const remainingDeposits = Math.max(0, allowedDeposits - usedDeposits);

  const nextDailyLabel = formatGameTime(nextDailyUpdate(new Date()));

  const transactions = await prisma.bankTransaction.findMany({
    where: { empireId: empire.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const summaryCards = [
    { label: "זהב זמין", icon: "🪙", value: formatNumber(availableGold) },
    { label: "זהב בבנק", icon: "🏦", value: formatNumber(bankGold) },
    { label: "ריבית נוכחית", icon: "📈", value: ratePercent },
    { label: "ריבית בעדכון הקרוב", icon: "💰", value: formatNumber(nextInterest) },
    {
      label: "הפקדות זמינות",
      icon: "📥",
      value: `${remainingDeposits.toLocaleString("he-IL")} מתוך ${allowedDeposits.toLocaleString("he-IL")}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">בנק 🏦</h1>
        <p className="mt-1 text-sm text-zinc-400">
          הפקד זהב, צבור ריבית ומשוך את הזהב שלך בזמן הנכון.
        </p>
      </div>

      {/* -------- summary cards -------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span aria-hidden>{card.icon}</span>
              {card.label}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-zinc-100">
              {card.value}
            </p>
          </Card>
        ))}
      </div>

      {/* -------- interest forecast -------- */}
      <Card className="space-y-1 text-sm">
        {bankGold > 0 ? (
          <>
            <p className="text-zinc-300">
              ריבית נוכחית:{" "}
              <span className="font-bold text-gold">{ratePercent}</span>
            </p>
            <p className="text-zinc-300">
              תקבל בעדכון היומי הקרוב:{" "}
              <span className="font-bold tabular-nums text-gold">
                {formatNumber(nextInterest)} זהב
              </span>
            </p>
          </>
        ) : (
          <p className="text-zinc-400">
            אין זהב בבנק — לא תתקבל ריבית בעדכון הקרוב.
          </p>
        )}
        <p className="text-zinc-300">
          הפקדות זמינות:{" "}
          <span className="font-bold tabular-nums text-zinc-100">
            {remainingDeposits.toLocaleString("he-IL")} מתוך{" "}
            {allowedDeposits.toLocaleString("he-IL")}
          </span>
        </p>
        <p className="text-zinc-300">
          העדכון היומי הבא:{" "}
          <span className="font-bold tabular-nums text-gold" dir="ltr">
            {nextDailyLabel}
          </span>
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* -------- deposit / withdraw -------- */}
        <BankActions
          availableGold={availableGold}
          bankGold={bankGold}
          storedGold={storedGold}
          remainingDeposits={remainingDeposits}
        />

        <div className="flex flex-col gap-4">
          {/* -------- bank upgrades summary -------- */}
          <Card>
            <CardTitle icon="📈">שדרוגי בנק</CardTitle>
            <ul className="space-y-3 text-sm">
              <li className="flex flex-col gap-0.5">
                <span className="font-semibold text-zinc-100">
                  {EMPIRE_UPGRADE_META.BANK_DEPOSIT_COUNT.icon}{" "}
                  {EMPIRE_UPGRADE_META.BANK_DEPOSIT_COUNT.label} — רמה {depositLevel}
                </span>
                <span className="text-xs text-zinc-400">
                  {EMPIRE_UPGRADE_META.BANK_DEPOSIT_COUNT.effectLabel(depositLevel)}
                </span>
              </li>
              <li className="flex flex-col gap-0.5">
                <span className="font-semibold text-zinc-100">
                  {EMPIRE_UPGRADE_META.BANK_DAILY_INTEREST.icon}{" "}
                  {EMPIRE_UPGRADE_META.BANK_DAILY_INTEREST.label} — רמה {interestLevel}
                </span>
                <span className="text-xs text-zinc-400">
                  {EMPIRE_UPGRADE_META.BANK_DAILY_INTEREST.effectLabel(interestLevel)}
                </span>
              </li>
            </ul>
            <Link
              href="/game/upgrades"
              className="mt-4 inline-block rounded-lg border border-gold-dim px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
            >
              עבור לשדרוגים
            </Link>
          </Card>

          {/* -------- transaction history -------- */}
          <Card>
            <CardTitle icon="📜">תנועות אחרונות</CardTitle>
            {transactions.length === 0 ? (
              <p className="text-sm text-zinc-500">אין עדיין תנועות בבנק.</p>
            ) : (
              <ul className="divide-y divide-border-subtle text-sm">
                {transactions.map((transaction) => {
                  const meta = TRANSACTION_META[transaction.type];
                  return (
                    <li
                      key={transaction.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-zinc-300">
                        <span aria-hidden>{meta.icon}</span>
                        {meta.label}
                      </span>
                      <span className="flex flex-col items-end">
                        <span className={`font-bold tabular-nums ${meta.color}`} dir="ltr">
                          {meta.sign}
                          {formatNumber(transaction.amount)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatDate(transaction.createdAt)} · יתרה:{" "}
                          {formatNumber(transaction.balanceAfter)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
