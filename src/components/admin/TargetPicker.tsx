"use client";

import { useState } from "react";

const INPUT_CLASS =
  "w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold/60";

export type Scope = "all" | "active" | "season" | "guild" | "empire";

/** Windows offered by the "active players" scope, in hours. */
const ACTIVE_WINDOWS = [
  { hours: 1, label: "בשעה האחרונה" },
  { hours: 6, label: "ב-6 השעות האחרונות" },
  { hours: 24, label: "ב-24 השעות האחרונות" },
  { hours: 72, label: "ב-3 הימים האחרונים" },
  { hours: 168, label: "בשבוע האחרון" },
  { hours: 720, label: "בחודש האחרון" },
];

/**
 * Audience selector for broadcasts and gifts. Emits `scope` + `scopeId`
 * hidden/select inputs consumed by the server action. When a single empire is
 * pre-selected (from a player page), `lockedEmpire` fixes the scope.
 *
 * For `scope="active"` the `scopeId` field carries the window in hours rather
 * than a row id — the server reads it as a number.
 */
export function TargetPicker({
  seasons,
  guilds,
  empires,
  lockedEmpire,
}: {
  seasons: { id: string; name: string }[];
  guilds: { id: string; name: string }[];
  empires: { id: string; name: string }[];
  lockedEmpire?: { id: string; name: string };
}) {
  const [scope, setScope] = useState<Scope>(lockedEmpire ? "empire" : "all");

  if (lockedEmpire) {
    return (
      <div className="panel-inset rounded-lg p-3 text-sm text-zinc-300">
        נמען: <span className="font-bold text-gold-bright">{lockedEmpire.name}</span>
        <input type="hidden" name="scope" value="empire" />
        <input type="hidden" name="scopeId" value={lockedEmpire.id} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-gold-dim">קהל יעד</span>
        <select
          name="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
          className={INPUT_CLASS}
        >
          <option value="all">כל השחקנים</option>
          <option value="active">שחקנים פעילים</option>
          <option value="season">עונה מסוימת</option>
          <option value="guild">ברית מסוימת</option>
          <option value="empire">שחקן בודד</option>
        </select>
      </label>

      {scope === "active" && (
        <>
          <select name="scopeId" className={INPUT_CLASS} defaultValue="24">
            {ACTIVE_WINDOWS.map((w) => (
              <option key={w.hours} value={w.hours}>
                שיחקו {w.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500">
            נמדד לפי הפעם האחרונה שהמשחק היה פתוח אצל השחקן.
          </p>
        </>
      )}
      {scope === "season" && (
        <select name="scopeId" className={INPUT_CLASS} defaultValue="">
          <option value="" disabled>
            בחר עונה…
          </option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      {scope === "guild" && (
        <select name="scopeId" className={INPUT_CLASS} defaultValue="">
          <option value="" disabled>
            בחר ברית…
          </option>
          {guilds.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}
      {scope === "empire" && (
        <select name="scopeId" className={INPUT_CLASS} defaultValue="">
          <option value="" disabled>
            בחר שחקן…
          </option>
          {empires.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
