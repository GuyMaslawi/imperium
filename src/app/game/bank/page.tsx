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
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";

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

  return (
    <div className="space-y-6">
      <SectionHeading title="בנק" subtitle="BANK" ornament="🏦" />

      {/* -------- central bank card -------- */}
      <div className="panel-gold rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-3xl">🏦</span>
            <div>
              <h2 className="text-xl font-black text-gold-bright">הבנק המרכזי</h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <span aria-hidden>●</span>
                פעיל · דרגה{" "}
                <span className="nums" dir="ltr">
                  {interestLevel}
                </span>
              </p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs uppercase tracking-widest text-gold-dim">
              יתרה בבנק
            </p>
            <p className="nums mt-0.5 text-3xl font-black text-gold-bright" dir="ltr">
              {formatNumber(bankGold)}
            </p>
          </div>
        </div>
      </div>

      {/* -------- deposit / withdraw + daily stats -------- */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BankActions
            availableGold={availableGold}
            bankGold={bankGold}
            storedGold={storedGold}
            remainingDeposits={remainingDeposits}
          />
        </div>

        <Card variant="gold" className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gold-bright">
            <span aria-hidden>📈</span>
            תשואה יומית
          </h3>
          <p className="nums text-2xl font-black text-emerald-400" dir="ltr">
            +{formatNumber(nextInterest)}
            <span className="mr-1 text-sm font-semibold text-emerald-400/70">
              זהב/יום
            </span>
          </p>
          <div className="rule-gold" />
          <p className="text-sm text-zinc-300">
            ריבית נוכחית:{" "}
            <span className="nums font-bold text-gold" dir="ltr">
              {ratePercent}
            </span>
          </p>
          <p className="text-sm text-zinc-300">
            הפקדות זמינות להיום:{" "}
            <span className="nums font-bold text-gold-bright" dir="ltr">
              {remainingDeposits.toLocaleString("he-IL")} /{" "}
              {allowedDeposits.toLocaleString("he-IL")}
            </span>
          </p>
          <p className="text-sm text-zinc-300">
            העדכון היומי הבא:{" "}
            <span className="nums font-bold text-gold-bright" dir="ltr">
              {nextDailyLabel}
            </span>
          </p>
        </Card>
      </div>

      {/* -------- bank upgrades summary + transaction history -------- */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <span aria-hidden>📈</span>
            שדרוגי בנק
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="panel-inset flex flex-col gap-0.5 rounded-lg p-3">
              <span className="font-semibold text-zinc-100">
                {EMPIRE_UPGRADE_META.BANK_DEPOSIT_COUNT.icon}{" "}
                {EMPIRE_UPGRADE_META.BANK_DEPOSIT_COUNT.label} — רמה{" "}
                <span className="nums" dir="ltr">
                  {depositLevel}
                </span>
              </span>
              <span className="text-xs text-gold-dim">
                {EMPIRE_UPGRADE_META.BANK_DEPOSIT_COUNT.effectLabel(depositLevel)}
              </span>
            </li>
            <li className="panel-inset flex flex-col gap-0.5 rounded-lg p-3">
              <span className="font-semibold text-zinc-100">
                {EMPIRE_UPGRADE_META.BANK_DAILY_INTEREST.icon}{" "}
                {EMPIRE_UPGRADE_META.BANK_DAILY_INTEREST.label} — רמה{" "}
                <span className="nums" dir="ltr">
                  {interestLevel}
                </span>
              </span>
              <span className="text-xs text-gold-dim">
                {EMPIRE_UPGRADE_META.BANK_DAILY_INTEREST.effectLabel(interestLevel)}
              </span>
            </li>
          </ul>
          <Link
            href="/game/upgrades"
            className="btn btn-ghost mt-4 px-4 py-2 text-sm"
          >
            עבור לשדרוגים
          </Link>
        </Card>

        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <span aria-hidden>📜</span>
            תנועות אחרונות
          </h3>
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
                      <span className={`nums font-bold ${meta.color}`} dir="ltr">
                        {meta.sign}
                        {formatNumber(transaction.amount)}
                      </span>
                      <span className="nums text-xs text-zinc-500" dir="ltr">
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
  );
}
