"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ExpiryCountdown } from "@/components/game/ExpiryCountdown";
import { useServerNow } from "@/components/game/HeroPotions";

export interface SpyEffectRow {
  id: string;
  icon: IconName;
  glyph?: ReactNode;
  label: string;
  effect: string;
  /** Epoch ms it runs out. */
  expiresAt: number;
  tone: string;
}

/**
 * The narrow "active magic" panel of a spy dossier.
 *
 * A report is read long after it was captured, so half of what the spies saw
 * has usually burned out by now. Only what is still running belongs here —
 * and it drops off the board the second its clock hits zero, without a reload.
 */
export function SpyEffectsBoard({
  rows,
  serverNow,
}: {
  rows: SpyEffectRow[];
  serverNow: number;
}) {
  const now = useServerNow(serverNow);
  const active = rows.filter((row) => row.expiresAt > now);

  return (
    <div className="panel-gold w-full max-w-[19rem] rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold tracking-wide text-gold-bright">
          <Icon name="spark" size={16} className="text-crimson-bright" />
          קסמים פעילים
        </h3>
        {active.length > 0 && (
          <span
            className="nums rounded-full border border-gold/40 bg-panel-inset px-2 py-0.5 text-[11px] font-bold text-gold"
            dir="ltr"
          >
            {active.length}
          </span>
        )}
      </div>
      {active.length === 0 ? (
        <p className="panel-inset rounded-lg px-3 py-2 text-center text-[11px] text-zinc-400">
          שום אפקט לא פועל עליו כרגע.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {active.map((row) => (
            <li
              key={row.id}
              className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${row.tone}`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {row.glyph ?? <Icon name={row.icon} size={14} />}
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-bold">{row.label}</span>
                  <span className="block truncate text-[10px] text-zinc-400">{row.effect}</span>
                </span>
              </span>
              <ExpiryCountdown
                expiresAt={row.expiresAt}
                serverNow={serverNow}
                className="shrink-0 text-[12px]"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
