"use client";

import { useActionState, useState, type MouseEvent } from "react";
import {
  depositAllGoldToBank,
  depositGoldToBank,
  withdrawAllGoldFromBank,
  withdrawGoldFromBank,
} from "@/server/actions/bank";
import type { ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export interface BankActionsProps {
  /** Whole gold available outside the warehouse. */
  availableGold: number;
  /** Whole gold currently in the bank. */
  bankGold: number;
  /** Whole gold protected in the gold warehouse. */
  storedGold: number;
  remainingDeposits: number;
}

type BankActionKind = "deposit" | "withdraw" | "depositAll" | "withdrawAll";

const formatAmount = (value: number) => Math.floor(value).toLocaleString("he-IL");

export function BankActions({
  availableGold,
  bankGold,
  storedGold,
  remainingDeposits,
}: BankActionsProps) {
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

  const depositsExhausted = remainingDeposits < 1;

  const validateAmount = (kind: "deposit" | "withdraw"): string | undefined => {
    if (amount.trim() === "") return "יש להזין כמות";
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      return "יש להזין מספר שלם גדול מ־0";
    }
    if (kind === "deposit" && value > availableGold) {
      return storedGold > 0
        ? "יש למשוך זהב מהמחסן לפני שניתן להפקיד אותו בבנק."
        : "אין מספיק זהב זמין להפקדה.";
    }
    if (kind === "withdraw" && value > bankGold) {
      return "אין מספיק זהב בבנק למשיכה.";
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
          זהב זמין:{" "}
          <span className="nums font-bold text-gold-bright" dir="ltr">
            {formatAmount(availableGold)}
          </span>
        </span>
        <span>
          זהב בבנק:{" "}
          <span className="nums font-bold text-gold-bright" dir="ltr">
            {formatAmount(bankGold)}
          </span>
        </span>
      </div>

      <form className="space-y-4">
        <Input
          type="number"
          name="amount"
          label="סכום"
          min={1}
          step={1}
          inputMode="numeric"
          placeholder="כמות זהב"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-invalid={clientError ? true : undefined}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {/* -------- deposit column -------- */}
          <div className="panel-inset flex flex-col gap-2 rounded-lg p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-400">
              <span aria-hidden>⬇️</span>
              הפקדה
            </p>
            <SubmitButton
              variant="secondary"
              className="btn btn-ghost w-full"
              formAction={depositAllAction}
              onClick={handleQuickAction("depositAll")}
              disabled={depositsExhausted}
              pendingText="מפקיד..."
            >
              הפקד הכל
            </SubmitButton>
            <SubmitButton
              className="btn btn-dark w-full"
              formAction={depositAction}
              onClick={handleTransfer("deposit")}
              disabled={depositsExhausted}
              pendingText="מפקיד..."
            >
              הפקד לחיסכון
            </SubmitButton>
          </div>

          {/* -------- withdraw column -------- */}
          <div className="panel-inset flex flex-col gap-2 rounded-lg p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-red-400">
              <span aria-hidden>⬆️</span>
              משיכה
            </p>
            <SubmitButton
              variant="secondary"
              className="btn btn-ghost w-full"
              formAction={withdrawAllAction}
              onClick={handleQuickAction("withdrawAll")}
              pendingText="מושך..."
            >
              משוך הכל
            </SubmitButton>
            <SubmitButton
              className="btn btn-dark w-full"
              formAction={withdrawAction}
              onClick={handleTransfer("withdraw")}
              pendingText="מושך..."
            >
              משוך כספים
            </SubmitButton>
          </div>
        </div>
      </form>

      {depositsExhausted && (
        <p className="rounded-lg border border-amber-900 bg-amber-950/60 px-3 py-2 text-sm text-amber-300">
          ניצלת את כל ההפקדות עד העדכון היומי הבא.
        </p>
      )}

      <FormMessage
        error={clientError ?? actionState.error}
        success={clientError ? undefined : actionState.success}
      />

      <ul className="space-y-1 text-xs text-gold-dim">
        <li>הפקדות מוגבלות לפי שדרוג כמות הפקדות בבנק.</li>
        <li>משיכות אינן מוגבלות.</li>
        <li>הריבית מחושבת על הזהב שנמצא בבנק בלבד.</li>
        <li>הריבית נכנסת בכל עדכון יומי.</li>
      </ul>
    </Card>
  );
}
