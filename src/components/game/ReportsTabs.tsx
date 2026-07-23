"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/game/format";
import { Icon } from "@/components/ui/Icon";

export type BattleRow = {
  id: string;
  createdAt: string;
  /** Created after the player's last visit to the reports page. */
  isNew: boolean;
  rival: string;
  isAttacker: boolean;
  won: boolean;
  attackerPower: number;
  defenderPower: number;
  attackerSoldiersPower: number | null;
  attackerWeaponsPower: number | null;
  defenderSoldiersPower: number | null;
  defenderWeaponsPower: number | null;
  myLossSoldiers: number;
  turnsSpent: number;
  stolenGold: number;
  stolenWood: number;
  stolenIron: number;
  stolenStone: number;
  totalStolen: number;
  plunderIsMine: boolean;
};

export type SpyRow = {
  id: string;
  createdAt: string;
  /** Created after the player's last visit to the reports page. */
  isNew: boolean;
  rival: string;
  success: boolean;
  turnsSpent: number;
  finalChance: number | null;
  weaponsBonus: number | null;
  attackerIntel: number | null;
  defenderIntel: number | null;
  revealedGold: number;
  revealedWood: number;
  revealedIron: number;
  revealedStone: number;
  revealedSoldiers: number;
  revealedSpies: number;
  revealedMineSlaves: number;
};

type TabKey = "myAttacks" | "againstMe" | "mySpies";

const TABS: { key: TabKey; label: string }[] = [
  { key: "myAttacks", label: "תקיפות שלי" },
  { key: "againstMe", label: "תקיפות נגדי" },
  { key: "mySpies", label: "ריגול שלי" },
];

function EmptyState({ text }: { text: string }) {
  return (
    <p className="px-4 py-8 text-center text-sm text-zinc-500">{text}</p>
  );
}

function num(value: number) {
  return (
    <span className="nums" dir="ltr">
      {formatNumber(value)}
    </span>
  );
}

function NewPill() {
  return (
    <span className="mr-2 inline-block rounded-full bg-red-500 px-1.5 py-px align-middle text-[9px] font-black text-white">
      חדש
    </span>
  );
}

export function ReportsTabs({
  battles,
  spies,
}: {
  battles: BattleRow[];
  spies: SpyRow[];
}) {
  const [tab, setTab] = useState<TabKey>("myAttacks");

  const myAttacks = battles.filter((b) => b.isAttacker);
  const againstMe = battles.filter((b) => !b.isAttacker);

  const battleRows =
    tab === "myAttacks" ? myAttacks : tab === "againstMe" ? againstMe : [];

  const newCount: Record<TabKey, number> = {
    myAttacks: myAttacks.filter((b) => b.isNew).length,
    againstMe: againstMe.filter((b) => b.isNew).length,
    mySpies: spies.filter((s) => s.isNew).length,
  };

  return (
    <div className="space-y-4">
      {/* tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`btn px-4 py-2 text-sm ${
              tab === t.key ? "btn-dark" : "btn-ghost"
            }`}
          >
            {t.label}
            {newCount[t.key] > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white nums">
                {newCount[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* battle table */}
      {tab !== "mySpies" && (
        <div className="panel-gold overflow-x-auto rounded-xl p-0">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-right text-xs text-gold-dim">
                <th className="px-4 py-2.5 font-semibold">זמן</th>
                <th className="px-4 py-2.5 font-semibold">יריב</th>
                <th className="px-4 py-2.5 font-semibold">כוח התקפה</th>
                <th className="px-4 py-2.5 font-semibold">כוח הגנה</th>
                <th className="px-4 py-2.5 font-semibold">פרטים</th>
              </tr>
            </thead>
            <tbody>
              {battleRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState text="אין דוחות קרב בקטגוריה זו." />
                  </td>
                </tr>
              ) : (
                battleRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border-subtle align-top last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                      {r.isNew && <NewPill />}
                      <span className="nums" dir="ltr">
                        {r.createdAt}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-100">
                      {r.rival}
                    </td>
                    <td className="px-4 py-3 text-red-400">
                      {num(r.attackerPower)}
                    </td>
                    <td className="px-4 py-3 text-sky-300">
                      {num(r.defenderPower)}
                    </td>
                    <td className="px-4 py-3">
                      <p
                        className={`font-bold ${
                          r.won ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {r.isAttacker
                          ? r.won
                            ? "כבשת את היריב בהצלחה!"
                            : "התקפתך נהדפה."
                          : r.won
                            ? "הדפת את ההתקפה בהצלחה!"
                            : "היריב פרץ את הגנתך."}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        האבדות שלך: {num(r.myLossSoldiers)} חיילים
                        {r.isAttacker && (
                          <> · עלות: {num(r.turnsSpent)} תורות</>
                        )}
                      </p>
                      {r.totalStolen > 0 && (
                        <p
                          className={`mt-1 text-xs ${
                            r.plunderIsMine ? "text-gold" : "text-zinc-500"
                          }`}
                        >
                          שלל: <Icon name="gold" size={14} className="inline-block align-middle" /> {num(r.stolenGold)} · <Icon name="wood" size={14} className="inline-block align-middle" />{" "}
                          {num(r.stolenWood)} · <Icon name="iron" size={14} className="inline-block align-middle" />{" "}
                          {num(r.stolenIron)} · <Icon name="stone" size={14} className="inline-block align-middle" />{" "}
                          {num(r.stolenStone)}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* spy table */}
      {tab === "mySpies" && (
        <div className="panel-gold overflow-x-auto rounded-xl p-0">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-right text-xs text-gold-dim">
                <th className="px-4 py-2.5 font-semibold">זמן</th>
                <th className="px-4 py-2.5 font-semibold">יריב</th>
                <th className="px-4 py-2.5 font-semibold">תוצאה</th>
                <th className="px-4 py-2.5 font-semibold">מידע שנחשף</th>
              </tr>
            </thead>
            <tbody>
              {spies.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState text="אין דוחות ריגול עדיין." />
                  </td>
                </tr>
              ) : (
                spies.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border-subtle align-top last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                      {r.isNew && <NewPill />}
                      <span className="nums" dir="ltr">
                        {r.createdAt}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-100">
                      {r.rival}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold ${
                          r.success ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {r.success ? "המשימה הצליחה" : "המרגל נתפס"}
                      </span>
                      <p className="mt-1 text-xs text-zinc-500">
                        עלות: {num(r.turnsSpent)} תורות
                        {r.attackerIntel !== null && r.defenderIntel !== null ? (
                          <>
                            {" "}
                            · כח מודיעין:{" "}
                            <span className="nums" dir="ltr">
                              {num(Math.round(r.attackerIntel))} מול{" "}
                              {num(Math.round(r.defenderIntel))}
                            </span>
                          </>
                        ) : (
                          r.finalChance !== null && (
                            <>
                              {" "}
                              · סיכוי:{" "}
                              <span className="nums" dir="ltr">
                                {Math.round((r.finalChance ?? 0) * 100)}%
                              </span>
                            </>
                          )
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {r.success ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-300 sm:grid-cols-3">
                          <span><Icon name="gold" size={14} className="inline-block align-middle" /> {num(r.revealedGold)}</span>
                          <span><Icon name="wood" size={14} className="inline-block align-middle" /> {num(r.revealedWood)}</span>
                          <span><Icon name="iron" size={14} className="inline-block align-middle" /> {num(r.revealedIron)}</span>
                          <span><Icon name="stone" size={14} className="inline-block align-middle" /> {num(r.revealedStone)}</span>
                          <span><Icon name="army" size={14} className="inline-block align-middle" /> {num(r.revealedSoldiers)}</span>
                          <span><Icon name="spy" size={14} className="inline-block align-middle" /> {num(r.revealedSpies)}</span>
                          <span><Icon name="mine" size={14} className="inline-block align-middle" /> {num(r.revealedMineSlaves)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">
                          המרגל אבד במשימה ולא הושג מידע.
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
