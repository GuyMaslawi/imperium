"use client";

import { useActionState, useState, type MouseEvent } from "react";
import {
  depositAllToStorage,
  depositToStorage,
  upgradeStorage,
  withdrawAllFromStorage,
  withdrawFromStorage,
  type ActionState,
} from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export interface StorageCardProps {
  resourceType: "GOLD" | "WOOD" | "IRON" | "STONE";
  label: string;
  icon: string;
  level: number;
  /** Available balance outside the warehouse. */
  available: number;
  /** Protected balance inside the warehouse. */
  stored: number;
  capacity: number;
  upgradeCost: { gold: number; wood: number; iron: number; stone: number };
}

type TransferKind = "deposit" | "withdraw" | "depositAll" | "withdrawAll";

const formatAmount = (value: number) => Math.floor(value).toLocaleString("he-IL");

export function StorageCard({
  resourceType,
  label,
  icon,
  level,
  available,
  stored,
  capacity,
  upgradeCost,
}: StorageCardProps) {
  const [upgradeState, upgradeAction] = useActionState<ActionState, FormData>(
    upgradeStorage,
    {}
  );
  const [depositState, depositAction] = useActionState<ActionState, FormData>(
    depositToStorage,
    {}
  );
  const [depositAllState, depositAllAction] = useActionState<ActionState, FormData>(
    depositAllToStorage,
    {}
  );
  const [withdrawState, withdrawAction] = useActionState<ActionState, FormData>(
    withdrawFromStorage,
    {}
  );
  const [withdrawAllState, withdrawAllAction] = useActionState<ActionState, FormData>(
    withdrawAllFromStorage,
    {}
  );

  const [amount, setAmount] = useState("");
  const [clientError, setClientError] = useState<string>();
  const [lastAction, setLastAction] = useState<TransferKind>();

  const availableWhole = Math.floor(available);
  const storedWhole = Math.floor(stored);
  const freeSpace = Math.max(0, capacity - storedWhole);
  const fillRatio = capacity > 0 ? Math.min(1, stored / capacity) : 0;
  const nearFull = fillRatio >= 0.9;

  const validateAmount = (kind: "deposit" | "withdraw"): string | undefined => {
    if (amount.trim() === "") return "יש להזין כמות";
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      return "יש להזין מספר שלם גדול מ־0";
    }
    if (kind === "deposit" && value > availableWhole) {
      return "הכמות גדולה מהמשאבים הזמינים";
    }
    if (kind === "deposit" && value > freeSpace) {
      return `אין מספיק מקום במחסן (מקום פנוי: ${formatAmount(freeSpace)})`;
    }
    if (kind === "withdraw" && value > storedWhole) {
      return "הכמות גדולה מהכמות המאוחסנת במחסן";
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

  const transferStates: Record<TransferKind, ActionState> = {
    deposit: depositState,
    withdraw: withdrawState,
    depositAll: depositAllState,
    withdrawAll: withdrawAllState,
  };
  const transferState = lastAction ? transferStates[lastAction] : {};

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-bold text-zinc-100">{label}</h3>
            <p className="text-xs font-semibold text-gold">רמה {level}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            nearFull ? "bg-amber-950/60 text-amber-400" : "bg-surface-raised text-zinc-300"
          }`}
        >
          {Math.round(fillRatio * 100)}% מלא
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>
          זמין מחוץ למחסן:{" "}
          <span className="font-bold tabular-nums text-zinc-100">
            {formatAmount(available)}
          </span>
        </span>
        <span>
          מאוחסן:{" "}
          <span className="font-bold tabular-nums text-zinc-100">
            {formatAmount(stored)}
          </span>
        </span>
        <span>
          קיבולת:{" "}
          <span className="font-bold tabular-nums text-zinc-100">
            {formatAmount(capacity)}
          </span>
        </span>
        <span>
          מקום פנוי:{" "}
          <span className="font-bold tabular-nums text-zinc-100">
            {formatAmount(freeSpace)}
          </span>
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full rounded-full transition-all ${
            nearFull ? "bg-amber-400" : "bg-gold"
          }`}
          style={{ width: `${Math.round(fillRatio * 100)}%` }}
        />
      </div>

      {/* -------- deposit / withdraw -------- */}
      <form className="space-y-2">
        <input type="hidden" name="resourceType" value={resourceType} />
        <Input
          type="number"
          name="amount"
          min={1}
          step={1}
          inputMode="numeric"
          placeholder="כמות"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label={`כמות להפקדה או משיכה — ${label}`}
          aria-invalid={clientError ? true : undefined}
        />
        <div className="grid grid-cols-2 gap-2">
          <SubmitButton
            formAction={depositAction}
            onClick={handleTransfer("deposit")}
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
      <FormMessage
        error={clientError ?? transferState.error}
        success={clientError ? undefined : transferState.success}
      />

      <p className="text-xs text-zinc-500">
        משאבים במחסן מוגנים ואינם זמינים לשימוש עד שתמשוך אותם.
      </p>

      {/* -------- upgrade -------- */}
      <form action={upgradeAction} className="mt-auto space-y-2">
        <input type="hidden" name="resourceType" value={resourceType} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">עלות שדרוג:</span>
          <span>🪙 {upgradeCost.gold.toLocaleString("he-IL")}</span>
          <span>🪵 {upgradeCost.wood.toLocaleString("he-IL")}</span>
          <span>⚙️ {upgradeCost.iron.toLocaleString("he-IL")}</span>
          <span>🪨 {upgradeCost.stone.toLocaleString("he-IL")}</span>
        </div>
        <p className="text-xs text-zinc-500">
          שדרוג המחסן מגדיל את כמות המשאבים שניתן לאחסן.
        </p>
        <SubmitButton className="w-full" pendingText="משדרג...">
          שדרג לרמה {level + 1}
        </SubmitButton>
      </form>

      <FormMessage error={upgradeState.error} success={upgradeState.success} />
    </Card>
  );
}
