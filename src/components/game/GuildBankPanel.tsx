"use client";

import { useActionState, useState, type MouseEvent } from "react";
import { depositGuildGold, withdrawGuildGold } from "@/server/actions/guild";
import type { ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Input } from "@/components/ui/Input";
import { formatNumber } from "@/lib/game/format";

export interface GuildBankPanelProps {
  /** Whole gold available outside the warehouse. */
  availableGold: number;
  /** Whole gold in the guild treasury. */
  guildGold: number;
}

const formatAmount = (value: number) => formatNumber(value);

export function GuildBankPanel({ availableGold, guildGold }: GuildBankPanelProps) {
  const [depositState, depositAction] = useActionState<ActionState, FormData>(
    depositGuildGold,
    {}
  );
  const [withdrawState, withdrawAction] = useActionState<ActionState, FormData>(
    withdrawGuildGold,
    {}
  );

  const [amount, setAmount] = useState("");
  const [clientError, setClientError] = useState<string>();
  const [lastAction, setLastAction] = useState<"deposit" | "withdraw">();

  const validateAmount = (kind: "deposit" | "withdraw"): string | undefined => {
    if (amount.trim() === "") return "יש להזין כמות";
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      return "יש להזין מספר שלם גדול מ־0";
    }
    if (kind === "deposit" && value > availableGold) {
      return "אין מספיק זהב זמין להפקדה.";
    }
    if (kind === "withdraw" && value > guildGold) {
      return "אין מספיק זהב בבנק הברית למשיכה.";
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

  const actionState =
    lastAction === "deposit" ? depositState : lastAction === "withdraw" ? withdrawState : {};

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>
          זהב זמין:{" "}
          <span className="nums font-bold text-gold-bright" dir="ltr">
            {formatAmount(availableGold)}
          </span>
        </span>
        <span>
          בקופת הברית:{" "}
          <span className="nums font-bold text-gold-bright" dir="ltr">
            {formatAmount(guildGold)}
          </span>
        </span>
      </div>

      <form className="space-y-3">
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
          <SubmitButton
            className="btn btn-dark w-full"
            formAction={depositAction}
            onClick={handleTransfer("deposit")}
            pendingText="מפקיד..."
          >
            ⬇️ הפקד לקופה
          </SubmitButton>
          <SubmitButton
            className="btn btn-dark w-full"
            formAction={withdrawAction}
            onClick={handleTransfer("withdraw")}
            pendingText="מושך..."
          >
            ⬆️ משוך מהקופה
          </SubmitButton>
        </div>
      </form>

      {/* Deposit-all: its own form so it always sends the full available gold,
          independent of the amount typed above. */}
      <form
        action={depositAction}
        onClick={() => {
          setClientError(undefined);
          setLastAction("deposit");
        }}
      >
        <input type="hidden" name="amount" value={availableGold} />
        <SubmitButton
          className="btn btn-gold w-full"
          disabled={availableGold <= 0}
          pendingText="מפקיד..."
        >
          💰 הפקד הכל ({formatAmount(availableGold)})
        </SubmitButton>
      </form>

      <FormMessage
        error={clientError ?? actionState.error}
        success={clientError ? undefined : actionState.success}
      />

      <ul className="space-y-1 text-xs text-gold-dim">
        <li>כל חברי הברית יכולים להפקיד ולמשוך מהקופה המשותפת.</li>
        <li>כל תנועה נרשמת ביומן הקופה לעיני כל החברים.</li>
      </ul>
    </div>
  );
}
