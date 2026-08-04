"use client";

import { useActionState, useEffect, useState, type MouseEvent } from "react";
import {
  depositAllGoldToBank,
  depositGoldToBank,
  withdrawAllGoldFromBank,
  withdrawGoldFromBank,
} from "@/server/actions/bank";
import { useBankFire } from "./BankFx";
import type { ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { VipLockedAction } from "./VipLockedAction";
import { formatNumber } from "@/lib/game/format";
import { useT } from "@/i18n/client";

export interface BankActionsProps {
  /** Whole gold available outside the warehouse. */
  availableGold: number;
  /** Whole gold currently in the bank. */
  bankGold: number;
  /** Whole gold protected in the gold warehouse. */
  storedGold: number;
  remainingDeposits: number;
  /**
   * The pass gates the two "all" buttons. Without it the typed-amount deposit
   * and withdrawal below them still do everything they always did.
   */
  isVip: boolean;
}

type BankActionKind = "deposit" | "withdraw" | "depositAll" | "withdrawAll";

const formatAmount = (value: number) => formatNumber(value);

export function BankActions({
  availableGold,
  bankGold,
  storedGold,
  remainingDeposits,
  isVip,
}: BankActionsProps) {
  const t = useT();
  const [depositState, depositAction] = useActionState<ActionState, FormData>(
    depositGoldToBank,
    {}
  );
  const [depositAllState, depositAllAction] = useActionState<ActionState, FormData>(
    depositAllGoldToBank,
    {}
  );
  const [withdrawState, withdrawAction] = useActionState<ActionState, FormData>(
    withdrawGoldFromBank,
    {}
  );
  const [withdrawAllState, withdrawAllAction] = useActionState<ActionState, FormData>(
    withdrawAllGoldFromBank,
    {}
  );

  const [amount, setAmount] = useState("");
  const [clientError, setClientError] = useState<string>();
  const [lastAction, setLastAction] = useState<BankActionKind>();

  // Every settled transfer hands the vault drawing a coin burst. The action
  // states are fresh objects per submit, so an identical repeat still fires;
  // `fire` is stable, so a pulse elsewhere on the page can't re-trigger these.
  const fire = useBankFire();
  useEffect(() => {
    if (depositState.success) fire("deposit");
  }, [depositState, fire]);
  useEffect(() => {
    if (depositAllState.success) fire("deposit");
  }, [depositAllState, fire]);
  useEffect(() => {
    if (withdrawState.success) fire("withdraw");
  }, [withdrawState, fire]);
  useEffect(() => {
    if (withdrawAllState.success) fire("withdraw");
  }, [withdrawAllState, fire]);

  const depositsExhausted = remainingDeposits < 1;

  const validateAmount = (kind: "deposit" | "withdraw"): string | undefined => {
    if (amount.trim() === "") return t("יש להזין כמות");
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      return t("יש להזין מספר שלם גדול מ־0");
    }
    if (kind === "deposit" && value > availableGold) {
      return storedGold > 0
        ? t("יש למשוך זהב מהמחסן לפני שניתן להפקיד אותו בבנק.")
        : t("אין מספיק זהב זמין להפקדה.");
    }
    if (kind === "withdraw" && value > bankGold) {
      return t("אין מספיק זהב בבנק למשיכה.");
    }
    return undefined;
  };

  const handleTransfer =
    (kind: "deposit" | "withdraw") => (event: MouseEvent<HTMLButtonElement>) => {
      const error = validateAmount(kind);
      setClientError(error);
      setLastAction(kind);
      if (error) event.preventDefault();
    };

  const handleQuickAction = (kind: "depositAll" | "withdrawAll") => () => {
    setClientError(undefined);
    setLastAction(kind);
  };

  const actionStates: Record<BankActionKind, ActionState> = {
    deposit: depositState,
    withdraw: withdrawState,
    depositAll: depositAllState,
    withdrawAll: withdrawAllState,
  };
  const actionState = lastAction ? actionStates[lastAction] : {};

  return (
    <Card className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>
          {t("זהב זמין:")}{" "}
          <span className="nums font-bold text-gold-bright" dir="ltr">
            {formatAmount(availableGold)}
          </span>
        </span>
        <span>
          {t("זהב בבנק:")}{" "}
          <span className="nums font-bold text-gold-bright" dir="ltr">
            {formatAmount(bankGold)}
          </span>
        </span>
      </div>

      <form className="space-y-4">
        <Input
          type="number"
          name="amount"
          label={t("סכום")}
          min={1}
          step={1}
          inputMode="numeric"
          placeholder={t("כמות זהב")}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-invalid={clientError ? true : undefined}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {/* -------- deposit column -------- */}
          <div className="panel-inset flex flex-col gap-2 rounded-lg p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-400">
              <span aria-hidden>⬇️</span>
              {t("הפקדה")}
            </p>
            {isVip ? (
              <SubmitButton
                variant="secondary"
                className="btn btn-ghost w-full"
                formAction={depositAllAction}
                onClick={handleQuickAction("depositAll")}
                disabled={depositsExhausted}
                pendingText={t("מפקיד...")}
              >
                {t("הפקד הכל")}
              </SubmitButton>
            ) : (
              <VipLockedAction label={t("הפקד הכל")} className="w-full" />
            )}
            <SubmitButton
              className="btn btn-dark w-full"
              formAction={depositAction}
              onClick={handleTransfer("deposit")}
              disabled={depositsExhausted}
              pendingText={t("מפקיד...")}
            >
              {t("הפקד לחיסכון")}
            </SubmitButton>
          </div>

          {/* -------- withdraw column -------- */}
          <div className="panel-inset flex flex-col gap-2 rounded-lg p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-red-400">
              <span aria-hidden>⬆️</span>
              {t("משיכה")}
            </p>
            {isVip ? (
              <SubmitButton
                variant="secondary"
                className="btn btn-ghost w-full"
                formAction={withdrawAllAction}
                onClick={handleQuickAction("withdrawAll")}
                pendingText={t("מושך...")}
              >
                {t("משוך הכל")}
              </SubmitButton>
            ) : (
              <VipLockedAction label={t("משוך הכל")} className="w-full" />
            )}
            <SubmitButton
              className="btn btn-dark w-full"
              formAction={withdrawAction}
              onClick={handleTransfer("withdraw")}
              pendingText={t("מושך...")}
            >
              {t("משוך כספים")}
            </SubmitButton>
          </div>
        </div>
      </form>

      {depositsExhausted && (
        <p className="rounded-lg border border-amber-900 bg-amber-950/60 px-3 py-2 text-sm text-amber-300">
          {t("ניצלת את כל ההפקדות עד העדכון היומי הבא.")}
        </p>
      )}

      <FormMessage
        error={clientError ?? actionState.error}
        success={clientError ? undefined : actionState.success}
      />

      <ul className="space-y-1 text-xs text-gold-dim">
        <li>{t("הפקדות מוגבלות לפי שדרוג כמות הפקדות בבנק.")}</li>
        <li>{t("משיכות אינן מוגבלות.")}</li>
        <li>{t("הריבית מחושבת על הזהב שנמצא בבנק בלבד.")}</li>
        <li>{t("הריבית נכנסת בכל עדכון יומי.")}</li>
      </ul>
    </Card>
  );
}
