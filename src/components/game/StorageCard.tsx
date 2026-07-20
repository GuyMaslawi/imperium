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
import { Meter } from "@/components/ui/Meter";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";

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

const formatAmount = (value: number) => formatNumber(value);

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
  const fillPercent = (fillRatio * 100).toFixed(1);
  const nearFull = fillRatio >= 0.9;
  const capacityPerLevel = level > 0 ? Math.round(capacity / level) : capacity;

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
            <h3 className="font-bold text-gold-bright">{label}</h3>
            <p className="text-xs font-semibold text-gold">
              רמה{" "}
              <span className="nums" dir="ltr">
                {level}
              </span>
            </p>
          </div>
        </div>
        <span
          className={`nums rounded-full border px-2.5 py-1 text-xs font-bold ${
            nearFull
              ? "border-red-500/40 bg-red-950/40 text-red-400"
              : "border-gold/40 bg-panel-inset text-gold-bright"
          }`}
          dir="ltr"
        >
          {fillPercent}%
        </span>
      </div>

      <div>
        <Meter
          tone={nearFull ? "health" : "xp"}
          value={storedWhole}
          max={capacity}
        />
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-gold-dim">
          <span className="nums" dir="ltr">
            {formatAmount(stored)} / {formatAmount(capacity)}
          </span>
          <span>
            פנוי:{" "}
            <span className="nums" dir="ltr">
              {formatAmount(freeSpace)}
            </span>
          </span>
        </div>
      </div>

      <p className="text-sm text-zinc-300">
        זמין אצלך:{" "}
        <span className="nums font-bold text-gold-bright" dir="ltr">
          {formatAmount(available)}
        </span>
      </p>

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
            className="btn btn-dark w-full"
            formAction={depositAction}
            onClick={handleTransfer("deposit")}
            pendingText="מפקיד..."
          >
            הפקד
          </SubmitButton>
          <SubmitButton
            className="btn btn-dark w-full"
            formAction={withdrawAction}
            onClick={handleTransfer("withdraw")}
            pendingText="מושך..."
          >
            משוך
          </SubmitButton>
          <SubmitButton
            variant="secondary"
            className="btn btn-ghost w-full"
            formAction={depositAllAction}
            onClick={handleQuickAction("depositAll")}
            pendingText="מפקיד..."
          >
            הפקד הכל
          </SubmitButton>
          <SubmitButton
            variant="secondary"
            className="btn btn-ghost w-full"
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

      <p className="text-xs text-gold-dim">
        משאבים במחסן מוגנים ואינם זמינים לשימוש עד שתמשוך אותם.
      </p>

      {/* -------- upgrade -------- */}
      <form action={upgradeAction} className="mt-auto space-y-2">
        <input type="hidden" name="resourceType" value={resourceType} />
        <div className="panel-inset rounded-lg p-3 text-xs text-zinc-400">
          <p className="text-gold-bright">
            לרמה הבאה:{" "}
            <span className="nums font-bold text-emerald-400" dir="ltr">
              +{formatAmount(capacityPerLevel)}
            </span>{" "}
            מקום אחסון
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span className="font-semibold text-gold-dim">עלות שדרוג:</span>
            <span className="nums" dir="ltr"><Icon name="gold" size={14} className="inline align-[-2px]" /> {formatAmount(upgradeCost.gold)}</span>
            <span className="nums" dir="ltr"><Icon name="wood" size={14} className="inline align-[-2px]" /> {formatAmount(upgradeCost.wood)}</span>
            <span className="nums" dir="ltr"><Icon name="iron" size={14} className="inline align-[-2px]" /> {formatAmount(upgradeCost.iron)}</span>
            <span className="nums" dir="ltr"><Icon name="stone" size={14} className="inline align-[-2px]" /> {formatAmount(upgradeCost.stone)}</span>
          </div>
        </div>
        <SubmitButton className="btn btn-dark w-full" pendingText="משדרג...">
          🔧 שדרג לרמה {level + 1}
        </SubmitButton>
      </form>

      <FormMessage error={upgradeState.error} success={upgradeState.success} />
    </Card>
  );
}
