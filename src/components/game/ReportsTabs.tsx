"use client";

import { useState } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/game/format";
import { Icon, type IconName } from "@/components/ui/Icon";

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
  /** True for missions I sent, false for enemy spies caught in my territory. */
  isAttacker: boolean;
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

type TabKey = "againstMe" | "myAttacks" | "spiesOnMe" | "mySpies";

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: "againstMe", label: "תקיפות עליי", icon: "shield" },
  { key: "myAttacks", label: "תקיפות שלי", icon: "attack" },
  { key: "spiesOnMe", label: "ריגול עליי", icon: "spy" },
  { key: "mySpies", label: "ריגול שלי", icon: "spy" },
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
  const [tab, setTab] = useState<TabKey>("againstMe");

  const myAttacks = battles.filter((b) => b.isAttacker);
  const againstMe = battles.filter((b) => !b.isAttacker);
  const mySpies = spies.filter((s) => s.isAttacker);
  const spiesOnMe = spies.filter((s) => !s.isAttacker);

  const isSpyTab = tab === "mySpies" || tab === "spiesOnMe";
  const battleRows =
    tab === "myAttacks" ? myAttacks : tab === "againstMe" ? againstMe : [];
  const spyRows = tab === "mySpies" ? mySpies : spiesOnMe;

  const newCount: Record<TabKey, number> = {
    myAttacks: myAttacks.filter((b) => b.isNew).length,
    againstMe: againstMe.filter((b) => b.isNew).length,
    mySpies: mySpies.filter((s) => s.isNew).length,
    spiesOnMe: spiesOnMe.filter((s) => s.isNew).length,
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
            <Icon name={t.icon} size={16} />
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
      {!isSpyTab && (
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
                      {(r.myLossSoldiers > 0 || r.isAttacker) && (
                        <p className="mt-1 text-xs text-zinc-500">
                          {/* Player battles cost no soldiers — only older
                              reports still carry casualties. */}
                          {r.myLossSoldiers > 0 && (
                            <>האבדות שלך: {num(r.myLossSoldiers)} חיילים</>
                          )}
                          {r.myLossSoldiers > 0 && r.isAttacker && " · "}
                          {r.isAttacker && <>עלות: {num(r.turnsSpent)} תורות</>}
                        </p>
                      )}
                      {r.totalStolen > 0 && (
                        <p
                          className={`mt-1 text-xs ${
                            r.plunderIsMine ? "text-gold" : "text-zinc-500"
                          }`}
                        >
                          שלל: <Icon name="gold" size={14} className="inline-block align-middle text-gold-bright" /> {num(r.stolenGold)} · <Icon name="wood" size={14} className="inline-block align-middle text-amber-600" />{" "}
                          {num(r.stolenWood)} · <Icon name="iron" size={14} className="inline-block align-middle text-slate-300" />{" "}
                          {num(r.stolenIron)} · <Icon name="stone" size={14} className="inline-block align-middle text-stone-400" />{" "}
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
      {isSpyTab && (
        <div className="space-y-3">
          {tab === "spiesOnMe" && (
            <p className="rounded-lg border border-purple-500/30 bg-purple-950/25 px-3 py-2 text-xs text-purple-200/90">
              כאן מופיעים רק מרגלים שכוחות הביטחון שלך <b>תפסו</b> — ריגול מוצלח
              נגדך נשאר חשאי ואינו נרשם.
            </p>
          )}
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
              {spyRows.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      text={
                        tab === "mySpies"
                          ? "לא שלחת מרגלים עדיין."
                          : "לא נתפסו מרגלים בשטחך."
                      }
                    />
                  </td>
                </tr>
              ) : (
                spyRows.map((r) => (
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
                          // Success is the attacker's outcome — for a spy caught
                          // in my territory the same failure is *my* win.
                          r.success === r.isAttacker
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {r.isAttacker
                          ? r.success
                            ? "המשימה הצליחה"
                            : "המרגל נתפס"
                          : "תפסת את המרגל!"}
                      </span>
                      <p className="mt-1 text-xs text-zinc-500">
                        {r.isAttacker && <>עלות: {num(r.turnsSpent)} תורות</>}
                        {r.attackerIntel !== null && r.defenderIntel !== null ? (
                          <>
                            {r.isAttacker ? " · " : ""}כח מודיעין:{" "}
                            <span className="nums" dir="ltr">
                              {num(Math.round(r.isAttacker ? r.attackerIntel : r.defenderIntel))} (שלך) מול{" "}
                              {num(Math.round(r.isAttacker ? r.defenderIntel : r.attackerIntel))}
                            </span>
                          </>
                        ) : (
                          r.isAttacker &&
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
                      {!r.isAttacker ? (
                        <span className="text-xs text-zinc-500">
                          המרגל חוסל לפני שאסף מידע — לא דלף דבר.
                        </span>
                      ) : r.success ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-300 sm:grid-cols-3">
                          <span><Icon name="gold" size={14} className="inline-block align-middle text-gold-bright" /> {num(r.revealedGold)}</span>
                          <span><Icon name="wood" size={14} className="inline-block align-middle text-amber-600" /> {num(r.revealedWood)}</span>
                          <span><Icon name="iron" size={14} className="inline-block align-middle text-slate-300" /> {num(r.revealedIron)}</span>
                          <span><Icon name="stone" size={14} className="inline-block align-middle text-stone-400" /> {num(r.revealedStone)}</span>
                          <span><Icon name="army" size={14} className="inline-block align-middle" /> {num(r.revealedSoldiers)}</span>
                          <span><Icon name="spy" size={14} className="inline-block align-middle" /> {num(r.revealedSpies)}</span>
                          <span><Icon name="mine" size={14} className="inline-block align-middle" /> {num(r.revealedMineSlaves)}</span>
                          {/* The row is only the headline — the mission also
                              brought back the vaults, the arsenal, the hero and
                              every running spell. That lives on the report page. */}
                          <Link
                            href={`/game/spy/${r.id}`}
                            className="col-span-2 mt-1 font-semibold text-gold hover:text-gold-bright sm:col-span-3"
                          >
                            התיק המלא ←
                          </Link>
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
        </div>
      )}
    </div>
  );
}
