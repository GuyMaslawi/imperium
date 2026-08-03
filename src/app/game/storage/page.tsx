import type { CSSProperties } from "react";
import { requireEmpire } from "@/lib/auth";
import {
  STORAGE_META,
  STORAGE_TYPES,
  storageCapacityForLevel,
  storageUpgradeCost,
} from "@/lib/game/constants";
import { formatNumber } from "@/lib/game/format";
import { StorageCard } from "@/components/game/StorageCard";
import { oreVars } from "@/components/game/oreTint";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon, RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import { isVip } from "@/lib/game/vip";

export const metadata = { title: "מחסנים | קראלדור" };

/** Dust drifting through the warehouse district — fixed table, no randomness. */
const DUST = [
  { x: "12%", d: "0s", dur: "8.2s" },
  { x: "37%", d: "2.7s", dur: "9.4s" },
  { x: "58%", d: "5.1s", dur: "7.8s" },
  { x: "81%", d: "1.6s", dur: "10.1s" },
];

export default async function StoragePage() {
  const empire = await requireEmpire();
  const vip = isVip(empire);

  const available = {
    gold: empire.gold,
    wood: empire.wood,
    iron: empire.iron,
    stone: empire.stone,
  } as const;

  // One pass over the four warehouses: the cards below and the mini-silos in
  // the banner read the same numbers, so the drawing can never disagree with
  // the figures beside it.
  const warehouses = STORAGE_TYPES.map((type) => {
    const meta = STORAGE_META[type];
    const storage = empire.storages.find((s) => s.resourceType === type);
    const level = storage?.level ?? 1;
    const capacity = storageCapacityForLevel(level);
    const stored = storage?.storedAmount ?? 0;
    return {
      type,
      meta,
      level,
      capacity,
      stored,
      fillPct: capacity > 0 ? Math.round(Math.min(1, stored / capacity) * 100) : 0,
    };
  });

  const totalStored = warehouses.reduce((sum, w) => sum + w.stored, 0);
  const totalCapacity = warehouses.reduce((sum, w) => sum + w.capacity, 0);
  const totalFillPct =
    totalCapacity > 0
      ? Math.round(Math.min(1, totalStored / totalCapacity) * 100)
      : 0;

  const summaryTotals = [
    { label: "משאבים מאוחסנים", value: formatNumber(Math.floor(totalStored)) },
    { label: "קיבולת כוללת", value: formatNumber(totalCapacity) },
    { label: "ניצול כולל", value: `${totalFillPct}%` },
  ];

  return (
    <div className="space-y-6">
      <SectionHeading title="מחסנים" ornament="🏛️" />

      {/* -------- warehouse network summary --------
          The four bins on the right are the network at a glance: each fills to
          its own utilization on load, and the bar below them is the total. */}
      <div className="panel-gold wh rounded-xl p-4">
        <span className="wh-dust" aria-hidden>
          {DUST.map((speck) => (
            <span
              key={speck.x}
              style={{ "--x": speck.x, "--d": speck.d, "--dur": speck.dur } as CSSProperties}
            />
          ))}
        </span>

        <div className="wh-body">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
              <Icon name="storage" size={20} className="text-crimson-bright wh-crate" />
              מערך המחסנים
            </h2>
            {/* Full width on a phone so it drops below the heading: sharing the
                row leaves each of the three columns ~40px, and a six-figure
                capacity then runs straight into the number beside it. */}
            <div className="grid w-full grid-cols-3 gap-3 sm:w-auto sm:max-w-md sm:flex-1">
              {summaryTotals.map((total, index) => (
                <div
                  key={total.label}
                  className="wh-stat text-center"
                  style={{ "--i": index } as CSSProperties}
                >
                  <p className="nums text-lg font-black text-gold-bright" dir="ltr">
                    {total.value}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-gold-dim">
                    {total.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <div className="flex flex-1 items-end justify-center gap-3 sm:justify-start">
              {warehouses.map((warehouse, index) => (
                <div
                  key={warehouse.type}
                  className="wh-bin"
                  style={
                    {
                      ...oreVars(warehouse.meta.resourceKey),
                      "--h": `${warehouse.fillPct}%`,
                      "--i": index,
                    } as CSSProperties
                  }
                  title={`${warehouse.meta.label} — ${warehouse.fillPct}%`}
                >
                  <span className="wh-bin-glass">
                    <span className="wh-bin-fill" />
                  </span>
                  <Icon
                    name={RESOURCE_ICON[warehouse.meta.resourceKey]}
                    size={14}
                    className={`wh-bin-icon ${RESOURCE_ICON_COLOR[warehouse.meta.resourceKey]}`}
                  />
                  <span className="wh-bin-pct nums" dir="ltr">
                    {warehouse.fillPct}%
                  </span>
                </div>
              ))}
            </div>

            <div className="hidden flex-[2] sm:block">
              <p className="mb-1.5 text-[11px] text-gold-dim">ניצול כולל של המערך</p>
              <span className="wh-bar">
                <span
                  className="wh-bar-fill"
                  style={{ "--h": `${totalFillPct}%` } as CSSProperties}
                />
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="panel-inset rounded-xl p-4 text-sm text-zinc-400">
        <Icon name="shield" size={16} className="inline align-[-2px]" /> המחסן מגן רק על משאבים שהפקדת אליו. משאבים זמינים אינם מוגנים
        ויכולים להיגנב בתקיפה.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {warehouses.map((warehouse) => (
          <StorageCard
            key={warehouse.type}
            resourceType={warehouse.type}
            label={warehouse.meta.label}
            level={warehouse.level}
            available={available[warehouse.meta.resourceKey]}
            stored={warehouse.stored}
            capacity={warehouse.capacity}
            upgradeCost={storageUpgradeCost(warehouse.level)}
            isVip={vip}
          />
        ))}
      </div>
    </div>
  );
}
