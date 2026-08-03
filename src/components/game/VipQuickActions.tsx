"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useState } from "react";
import type { ActionState } from "@/server/actions/game";
import {
  releaseAllResources,
  storeAllResources,
  trainMaxUnits,
  upgradeAllStorages,
} from "@/server/actions/vip";
import {
  depositAllGoldToBank,
  withdrawAllGoldFromBank,
} from "@/server/actions/bank";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon, type IconName } from "@/components/ui/Icon";
import { VIP_COST, VIP_LABEL } from "@/lib/game/vip";

/**
 * The VIP bulk buttons, in one place.
 *
 * Three surfaces render these — the command-bar dock, the warehouse screen and
 * (as a single button) the training card — and they must stay one list: a bulk
 * action that exists in the dock but not on the screen it belongs to is exactly
 * how a player ends up believing the pass does less than it does.
 *
 * Each button owns its own `useActionState` and reports upward, so the panel
 * shows one message line for whichever action ran last instead of stacking six
 * empty message slots.
 */

export type VipActionKey =
  | "storeAll"
  | "releaseAll"
  | "upgradeStorages"
  | "bankDepositAll"
  | "bankWithdrawAll"
  | "trainSoldiers"
  | "trainSpies"
  | "trainMineSlaves";

interface VipActionMeta {
  key: VipActionKey;
  icon: IconName;
  label: string;
  hint: string;
  pendingText: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Posted with the form — only the training actions need it. */
  unit?: "soldiers" | "spies" | "mineSlaves";
}

/**
 * The zero-argument actions are declared with no parameters at all (they take
 * nothing from the form), which is the same shape `depositAllGoldToBank` has
 * had since the bank was built. The cast keeps them in one table with the
 * training actions, which do read a field.
 */
const asFormAction = (fn: unknown) =>
  fn as (state: ActionState, formData: FormData) => Promise<ActionState>;

const VIP_ACTIONS: Record<VipActionKey, VipActionMeta> = {
  storeAll: {
    key: "storeAll",
    icon: "storage",
    label: "אחסן הכל",
    hint: "כל המשאבים הזמינים נכנסים למחסנים המתאימים — מוגנים מביזה",
    pendingText: "מאחסן...",
    action: asFormAction(storeAllResources),
  },
  releaseAll: {
    key: "releaseAll",
    icon: "storage",
    label: "שחרר הכל",
    hint: "מרוקן את ארבעת המחסנים בחזרה למשאבים זמינים",
    pendingText: "משחרר...",
    action: asFormAction(releaseAllResources),
  },
  upgradeStorages: {
    key: "upgradeStorages",
    icon: "upgrades",
    label: "שדרג מחסנים",
    hint: "מעלה רמה בכל מחסן שאתה יכול לממן — רמה אחת לכל מחסן",
    pendingText: "משדרג...",
    action: asFormAction(upgradeAllStorages),
  },
  bankDepositAll: {
    key: "bankDepositAll",
    icon: "bank",
    label: "הפקד הכל לבנק",
    hint: "כל הזהב הזמין נכנס לחיסכון וצובר ריבית",
    pendingText: "מפקיד...",
    action: asFormAction(depositAllGoldToBank),
  },
  bankWithdrawAll: {
    key: "bankWithdrawAll",
    icon: "bank",
    label: "משוך הכל מהבנק",
    hint: "כל היתרה בבנק חוזרת לזהב זמין",
    pendingText: "מושך...",
    action: asFormAction(withdrawAllGoldFromBank),
  },
  trainSoldiers: {
    key: "trainSoldiers",
    icon: "army",
    label: "אמן הכל · חיילים",
    hint: "כל האזרחים הפנויים הופכים לחיילים",
    pendingText: "מאמן...",
    action: trainMaxUnits,
    unit: "soldiers",
  },
  trainSpies: {
    key: "trainSpies",
    icon: "spy",
    label: "אמן הכל · מרגלים",
    hint: "כל האזרחים הפנויים הופכים למרגלים (דרוש מרכז מודיעין)",
    pendingText: "מאמן...",
    action: trainMaxUnits,
    unit: "spies",
  },
  trainMineSlaves: {
    key: "trainMineSlaves",
    icon: "mine",
    label: "אמן הכל · עבדי מכרות",
    hint: "כל האזרחים הפנויים הופכים לעבדי מכרות",
    pendingText: "מאמן...",
    action: trainMaxUnits,
    unit: "mineSlaves",
  },
};

function QuickActionButton({
  meta,
  onResult,
}: {
  meta: VipActionMeta;
  onResult: (state: ActionState) => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(meta.action, {});

  // The action state is a fresh object per submit, so an identical repeat still
  // reports; the empty initial state never does.
  useEffect(() => {
    if (state.error || state.success) onResult(state);
  }, [state, onResult]);

  return (
    <form action={formAction} className="min-w-0">
      {meta.unit && <input type="hidden" name="unit" value={meta.unit} />}
      {/* Deliberately `btn-ghost` **without** `btn`: the shared `.btn` rule is
          unlayered and sets `white-space: nowrap`, which beats any utility and
          would clip every hint line at the button's edge. */}
      <SubmitButton
        variant="secondary"
        className="btn-ghost flex h-full w-full flex-col items-start gap-0.5 px-3 py-2 text-right font-bold"
        pendingText={meta.pendingText}
      >
        <span className="flex items-center gap-1.5 text-sm font-bold text-gold-bright">
          <Icon name={meta.icon} size={15} className="shrink-0 text-crimson-bright" />
          {meta.label}
        </span>
        <span className="w-full text-[11px] font-normal leading-snug text-zinc-400">
          {meta.hint}
        </span>
      </SubmitButton>
    </form>
  );
}

/**
 * A panel of bulk buttons. Renders nothing but the buttons and one message
 * line — the surrounding frame belongs to whoever mounts it.
 */
export function VipQuickActions({
  keys,
  columns = 2,
}: {
  keys: VipActionKey[];
  /** Buttons per row from `sm` up; a phone always gets one column. */
  columns?: 1 | 2 | 3;
}) {
  const [result, setResult] = useState<ActionState>({});
  const onResult = useCallback((state: ActionState) => setResult(state), []);

  const grid =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className="space-y-3">
      <div className={`grid gap-2 ${grid}`}>
        {keys.map((key) => (
          <QuickActionButton
            key={key}
            meta={VIP_ACTIONS[key]}
            onResult={onResult}
          />
        ))}
      </div>
      <FormMessage error={result.error} success={result.success} />
    </div>
  );
}

/**
 * What a player without the pass sees in place of the buttons: the same panel,
 * the actions named rather than hidden, and the price.
 */
export function VipLockedTeaser({
  keys,
  columns = 2,
}: {
  keys: VipActionKey[];
  columns?: 1 | 2 | 3;
}) {
  const grid =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className="space-y-3">
      <div className={`grid gap-2 ${grid}`}>
        {keys.map((key) => {
          const meta = VIP_ACTIONS[key];
          return (
            <div
              key={key}
              className="panel-inset flex min-w-0 flex-col gap-0.5 rounded-lg border-dashed px-3 py-2 opacity-70"
            >
              <span className="flex items-center gap-1.5 text-sm font-bold text-zinc-400">
                <Icon name={meta.icon} size={15} className="shrink-0 text-zinc-500" />
                {meta.label}
                <Icon name="shield" size={12} className="text-gold-dim" aria-hidden />
              </span>
              <span className="text-[11px] leading-snug text-zinc-500">{meta.hint}</span>
            </div>
          );
        })}
      </div>
      <Link href="/game/diamonds" className="btn btn-gold w-full px-4 py-2 text-sm">
        <span className="flex items-center justify-center gap-1.5">
          <Icon name="crown" size={15} />
          פתח עם {VIP_LABEL}
          <span className="nums inline-flex items-center gap-1" dir="ltr">
            {VIP_COST}
            <Icon name="diamond" size={13} className="text-cyan-300" />
          </span>
        </span>
      </Link>
    </div>
  );
}
