"use client";

import { useState } from "react";
import type { WeaponCost, WeaponDefinition } from "@/lib/game/weapons";
import {
  WeaponCard,
  type AvailableResources,
} from "@/components/game/WeaponCard";
import { NextWeaponCard } from "@/components/game/NextWeaponCard";

export interface WeaponsTabData {
  category: "ATTACK" | "DEFENSE" | "SPY";
  label: string;
  icon: string;
  /** "כוח התקפה כולל מנשקים" etc. */
  totalPowerLabel: string;
  totalPower: number;
  unlockedTier: number;
  maxTier: number;
  unlockCost: WeaponCost;
  weapons: { weapon: WeaponDefinition; owned: number }[];
}

export function WeaponsTabs({
  tabs,
  available,
  initialCategory,
}: {
  tabs: WeaponsTabData[];
  available: AvailableResources;
  initialCategory?: WeaponsTabData["category"];
}) {
  const [activeCategory, setActiveCategory] = useState(
    initialCategory ?? tabs[0]?.category
  );
  const active = tabs.find((tab) => tab.category === activeCategory) ?? tabs[0];

  // Progression path: every unlocked weapon, then only the next locked one
  // (which can be unlocked). Deeper locked tiers stay hidden.
  const unlocked = active.weapons.filter(
    ({ weapon }) => weapon.tier <= active.unlockedTier
  );
  const next = active.weapons.find(
    ({ weapon }) => weapon.tier === active.unlockedTier + 1
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-border-subtle bg-surface p-1">
        {tabs.map((tab) => (
          <button
            key={tab.category}
            type="button"
            onClick={() => setActiveCategory(tab.category)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
              tab.category === active.category
                ? "bg-gold/15 text-gold"
                : "text-zinc-400 hover:bg-surface-raised hover:text-zinc-100"
            }`}
          >
            <span aria-hidden>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm font-semibold text-zinc-300">
          {active.totalPowerLabel}:{" "}
          <span className="font-bold text-gold">
            ⚡ {active.totalPower.toLocaleString("he-IL")}
          </span>
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>מסלול התקדמות:</span>
          <div className="flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: active.maxTier }, (_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i < active.unlockedTier
                    ? "bg-gold"
                    : i === active.unlockedTier
                      ? "border border-gold/60 bg-gold/20"
                      : "bg-border-subtle"
                }`}
              />
            ))}
          </div>
          <span className="font-bold text-gold">
            {active.unlockedTier}/{active.maxTier}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {unlocked.map(({ weapon, owned }) => (
          <WeaponCard
            key={weapon.key}
            weapon={weapon}
            owned={owned}
            available={available}
          />
        ))}
        {next && (
          <NextWeaponCard
            key={next.weapon.key}
            weapon={next.weapon}
            category={active.category}
            unlockCost={active.unlockCost}
          />
        )}
      </div>

      {!next && (
        <p className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-center text-sm font-bold text-gold">
          🏆 כל הנשקים בקטגוריה פתוחים.
        </p>
      )}
    </div>
  );
}
