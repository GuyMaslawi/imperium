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
import { Card, CardTitle } from "@/components/ui/Card";

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
      <CardTitle icon="🏦" className="mb-0">
        הפקדה ומשיכה
      </CardTitle>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>
          זהב זמין:{" "}
          <span className="font-bold tabular-nums text-zinc-100">
            {formatAmount(availableGold)}
          </span>
        </span>
        <span>
          זהב בבנק:{" "}
          <span className="font-bold tabular-nums text-zinc-100">
            {formatAmount(bankGold)}
          </span>
        </span>
      </div>

      <form className="space-y-2">
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
        <div className="grid grid-cols-2 gap-2">
          <SubmitButton
            formAction={depositAction}
            onClick={handleTransfer("deposit")}
            disabled={depositsExhausted}
            pendingText="מפקיד..."
          >
            הפקד
          </SubmitButton>
          <SubmitButton
            formAction={withdrawAction}
            onClick={handleTransfer("withdraw")}
            pendingText="מושך..."
          >
            משוך
          </SubmitButton>
          <SubmitButton
            variant="secondary"
            formAction={depositAllAction}
            onClick={handleQuickAction("depositAll")}
            disabled={depositsExhausted}
            pendingText="מפקיד..."
          >
            הפקד הכל
          </SubmitButton>
          <SubmitButton
            variant="secondary"
            formAction={withdrawAllAction}
            onClick={handleQuickAction("withdrawAll")}
            pendingText="מושך..."
          >
            משוך הכל
          </SubmitButton>
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

      <ul className="space-y-1 text-xs text-zinc-500">
        <li>הפקדות מוגבלות לפי שדרוג כמות הפקדות בבנק.</li>
        <li>משיכות אינן מוגבלות.</li>
        <li>הריבית מחושבת על הזהב שנמצא בבנק בלבד.</li>
        <li>הריבית נכנסת בכל עדכון יומי.</li>
      </ul>
    </Card>
  );
}
