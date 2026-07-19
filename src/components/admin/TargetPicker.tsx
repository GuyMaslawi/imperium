"use client";

import { useState } from "react";

const INPUT_CLASS =
  "w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold/60";

export type Scope = "all" | "season" | "guild" | "empire";

/**
 * Audience selector for broadcasts and gifts. Emits `scope` + `scopeId`
 * hidden/select inputs consumed by the server action. When a single empire is
 * pre-selected (from a player page), `lockedEmpire` fixes the scope.
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
          <option value="season">עונה מסוימת</option>
          <option value="guild">ברית מסוימת</option>
          <option value="empire">שחקן בודד</option>
        </select>
      </label>

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
