"use client";

import { useActionState, useEffect } from "react";
import {
  upgradeMine,
  upgradeMineToMax,
  assignMineSlavesToResource,
  type ActionState,
} from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon, RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import { usePulse } from "@/components/ui/motion";
import { MineRig, type MineRigPulseKind } from "./MineRig";
import { VipLockedAction } from "./VipLockedAction";
import { formatNumber } from "@/lib/game/format";
import type { MineProductionBreakdown } from "@/lib/game/resources";
import { useT } from "@/i18n/client";

const nis = (n: number) => formatNumber(n);

export interface MineCardProps {
  resource: "gold" | "wood" | "iron" | "stone";
  label: string;
  description: string;
  level: number;
  maxLevel: number;
  assignedSlaves: number;
  freeSlaves: number;
  resourceLabel: string;
  /** Production per assigned mine slave per regular update. */
  productionPerSlave: number;
  /** Real production per regular update, broken down by active bonus. */
  breakdown: MineProductionBreakdown;
  upgradeCost: { gold: number; wood: number; iron: number; stone: number };
  /** The pass gates "שדרג למקסימום". "שדרג רמה" beside it stays free. */
  isVip: boolean;
}

export function MineCard({
  resource,
  label,
  description,
  level,
  maxLevel,
  assignedSlaves,
  freeSlaves,
  resourceLabel,
  productionPerSlave,
  breakdown,
  upgradeCost,
  isVip,
}: MineCardProps) {
  const t = useT();
  const [upgradeState, upgradeAction] = useActionState<ActionState, FormData>(
    upgradeMine,
    {}
  );
  const [maxState, maxAction] = useActionState<ActionState, FormData>(
    upgradeMineToMax,
    {}
  );
  const [assignState, assignAction] = useActionState<ActionState, FormData>(
    assignMineSlavesToResource,
    {}
  );

  const isMaxLevel = level >= maxLevel;

  // Every settled upgrade / re-assignment throws a burst out of the shaft. The
  // action states are fresh objects per submit, so an identical repeat still
  // fires; `fire` is stable, so it never re-triggers on its own.
  const [pulse, fire] = usePulse<MineRigPulseKind>();
  useEffect(() => {
    if (upgradeState.success) fire("upgrade");
  }, [upgradeState, fire]);
  useEffect(() => {
    if (maxState.success) fire("upgrade");
  }, [maxState, fire]);
  useEffect(() => {
    if (assignState.success) fire("assign");
  }, [assignState, fire]);

  return (
    <div className="panel rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon
            name={RESOURCE_ICON[resource]}
            size={30}
            className={RESOURCE_ICON_COLOR[resource]}
          />
          <div>
            <h3 className="font-bold text-gold-bright">{t(label)}</h3>
            <p className="text-xs font-semibold text-gold-dim">
              {t("רמה")}{" "}
              <span className="nums" dir="ltr">
                {level} / {maxLevel}
              </span>
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            isMaxLevel
              ? "border border-gold/40 bg-gold/10 text-gold-bright"
              : "border border-border-subtle bg-panel-inset text-gold-dim"
          }`}
        >
          {isMaxLevel ? `${t("שיא")} ` : ""}
          {t("רמה")}{" "}
          <span className="nums" dir="ltr">
            {maxLevel}
          </span>
        </span>
      </div>

      {/* The machine itself: it runs at the speed of the crew standing on it,
          and the plate on its frame carries the real per-update output. */}
      <MineRig
        resource={resource}
        label={t(label)}
        resourceLabel={t(resourceLabel)}
        slaves={assignedSlaves}
        level={level}
        output={breakdown.total}
        pulse={pulse}
      />

      <p className="text-center text-xs text-gold-dim">
        {t("תפוקה לעדכון רגיל")}
        {breakdown.lines.length > 0 ? t(" (כולל בונוסים)") : ""}
      </p>

      {/* min-height keeps the stat boxes and forms aligned across the four
          cards even when descriptions wrap to a different number of lines */}
      <p className="min-h-[3.75rem] text-sm text-zinc-400">{t(description)}</p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 panel-inset rounded-lg p-3 text-xs">
        <dt className="text-zinc-400">{t("עבדי מכרות מוצבים")}</dt>
        <dd className="nums text-left font-bold text-zinc-100" dir="ltr">
          {nis(assignedSlaves)}
        </dd>
        <dt className="text-zinc-400">{t("תפוקה לעבד מכרות")}</dt>
        <dd className="nums text-left font-bold text-zinc-100" dir="ltr">
          {nis(productionPerSlave)} {t(resourceLabel)}
        </dd>
        <dt className="text-zinc-400">{t("תפוקת בסיס לעדכון")}</dt>
        <dd className="nums text-end font-bold text-zinc-100" dir="ltr">
          +{nis(breakdown.base)} {t(resourceLabel)}
        </dd>
      </dl>

      {breakdown.lines.length > 0 && (
        <div className="panel-inset rounded-lg p-3 text-xs space-y-1.5">
          <p className="flex items-center gap-1.5 font-semibold text-gold-dim">
            <Icon name="spark" size={14} className="text-crimson-bright" />
            {t("בונוסים פעילים")}
          </p>
          {breakdown.lines.map((line) => (
            <div key={line.key} className="flex items-center justify-between gap-2">
              <span className="text-zinc-400">
                {t(line.label, line.labelParams)}
                {line.pct !== undefined ? (
                  <span className="nums" dir="ltr">
                    {" "}
                    (+{line.pct}%)
                  </span>
                ) : null}
              </span>
              <span className="nums font-bold text-emerald-300" dir="ltr">
                +{nis(line.amount)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-1.5">
            <span className="font-semibold text-gold-dim">{t("סה״כ בפועל")}</span>
            <span className="nums font-black text-emerald-400" dir="ltr">
              +{nis(breakdown.total)} {t(resourceLabel)}
            </span>
          </div>
        </div>
      )}

      <form action={assignAction} className="flex items-end gap-2">
        <input type="hidden" name="resource" value={resource} />
        <label className="flex-1 space-y-1">
          <span className="text-xs text-gold-dim">
            {t("ניהול עובדים (פנויים:")}{" "}
            <span className="nums" dir="ltr">
              {nis(freeSlaves)}
            </span>
            )
          </span>
          <input
            type="number"
            name="amount"
            min={0}
            max={assignedSlaves + freeSlaves}
            defaultValue={assignedSlaves}
            className="nums w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-gold"
          />
        </label>
        <SubmitButton
          variant="secondary"
          className="btn btn-ghost"
          pendingText={t("מעדכן...")}
        >
          {t("עדכן חלוקה")}
        </SubmitButton>
      </form>

      {/* At the ceiling there is nothing left to buy, so the two upgrade
          buttons and the cost line give way to a single "maxed out" plate. */}
      {isMaxLevel ? (
        <div className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm font-bold text-gold-bright">
          <Icon name="spark" size={16} className="text-gold-bright" />
          {t("המכונה משודרגת למקסימום")}
        </div>
      ) : (
        <form action={upgradeAction} className="mt-auto space-y-2">
          <input type="hidden" name="resource" value={resource} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
            <span className="font-semibold text-gold-dim">{t("עלות שדרוג:")}</span>
            <span className="nums" dir="ltr">
              <Icon
                name={RESOURCE_ICON[resource]}
                size={14}
                className={`inline align-[-2px] ${RESOURCE_ICON_COLOR[resource]}`}
              />{" "}
              {nis(upgradeCost[resource])} {t(resourceLabel)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SubmitButton className="btn btn-dark w-full" pendingText={t("משדרג...")}>
              {t("שדרג רמה")}
            </SubmitButton>
            {isVip ? (
              <SubmitButton
                formAction={maxAction}
                variant="secondary"
                className="btn btn-ghost w-full"
                pendingText={t("משדרג...")}
              >
                {t("שדרג למקסימום")}
              </SubmitButton>
            ) : (
              <VipLockedAction label={t("שדרג למקסימום")} className="w-full" />
            )}
          </div>
        </form>
      )}

      <FormMessage
        error={upgradeState.error ?? maxState.error ?? assignState.error}
        success={assignState.success ?? upgradeState.success ?? maxState.success}
      />
    </div>
  );
}
