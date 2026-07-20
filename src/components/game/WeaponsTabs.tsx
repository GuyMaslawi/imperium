"use client";

import { useState } from "react";
import type {
  WeaponCost,
  WeaponDefinition,
  WeaponGateStatus,
} from "@/lib/game/weapons";
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
  gate,
  cities,
  heroLevel,
  discountPct,
}: {
  tabs: WeaponsTabData[];
  available: AvailableResources;
  initialCategory?: WeaponsTabData["category"];
  /** Shared next-tier requirements (cities + hero level). */
  gate: WeaponGateStatus;
  /** The empire's current city count. */
  cities: number;
  /** The empire's current hero level. */
  heroLevel: number;
  /** Active shop-discount percent (0 when no discount spell is running). */
  discountPct: number;
}) {
  const [activeCategory, setActiveCategory] = useState(
    initialCategory ?? tabs[0]?.category
  );
  const active = tabs.find((tab) => tab.category === activeCategory) ?? tabs[0];

  // Progression path: the next locked weapon (which can be unlocked) sits at
  // the top as the most advanced one, followed by every unlocked weapon from
  // the highest tier down. Deeper locked tiers stay hidden.
  const unlocked = active.weapons
    .filter(({ weapon }) => weapon.tier <= active.unlockedTier)
    .sort((a, b) => b.weapon.tier - a.weapon.tier);
  const next = active.weapons.find(
    ({ weapon }) => weapon.tier === active.unlockedTier + 1
  );

  const hasDiscount = discountPct > 0;

  return (
    <div className="space-y-4">
      {hasDiscount && (
        <div className="relative overflow-hidden rounded-xl border border-emerald-400/40 bg-gradient-to-l from-emerald-500/15 via-emerald-400/5 to-transparent px-4 py-3">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 animate-pulse rounded-full bg-emerald-400/20 blur-2xl"
          />
          <div className="relative flex items-center gap-3">
            <span aria-hidden className="text-3xl">
              ✨
            </span>
            <div className="min-w-0">
              <p className="font-bold text-emerald-300">קסם הנחה פעיל!</p>
              <p className="text-xs text-emerald-200/80">
                כל הנשקים והפתיחות ב־
                <span className="nums font-bold" dir="ltr">
                  {discountPct}%
                </span>{" "}
                הנחה כל עוד הקסם פעיל.
              </p>
            </div>
            <span
              className="nums mr-auto shrink-0 rounded-full border border-emerald-400/50 bg-emerald-400/15 px-3 py-1 text-sm font-black text-emerald-300"
              dir="ltr"
            >
              −{discountPct}%
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.category}
            type="button"
            onClick={() => setActiveCategory(tab.category)}
            className={`btn px-4 py-2 text-sm ${
              tab.category === active.category ? "btn-dark" : "btn-ghost"
            }`}
          >
            <span aria-hidden>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {!next && (
        <div className="panel-gold rounded-xl p-4 text-center text-sm font-bold text-gold-bright">
          🎉 המפעל במקסימום! כל הנשקים פתוחים.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 text-xs text-gold-dim">
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
          <span className="nums font-bold text-gold-bright" dir="ltr">
            {active.unlockedTier}/{active.maxTier}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {next && (
          <NextWeaponCard
            key={next.weapon.key}
            weapon={next.weapon}
            category={active.category}
            unlockCost={active.unlockCost}
            available={available}
            gate={gate}
            cities={cities}
            heroLevel={heroLevel}
            discountPct={discountPct}
          />
        )}
        {unlocked.map(({ weapon, owned }) => (
          <WeaponCard
            key={weapon.key}
            weapon={weapon}
            owned={owned}
            available={available}
            discountPct={discountPct}
          />
        ))}
      </div>
    </div>
  );
}
