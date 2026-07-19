import Link from "next/link";
import type { ReactNode } from "react";
import type { Army } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { weaponsPower, type WeaponQuantityRow } from "@/lib/game/weapons";
import {
  armyPower,
  spiesPower,
  getEmpireAttackPower,
  getEmpireDefensePower,
  getEmpireSpyPower,
  getEmpireGeneralPower,
  type CombatPowerBreakdown,
} from "@/lib/game/power";
import { formatNumber } from "@/lib/game/format";

/** Turn a base decomposition plus a bonus breakdown into PowerCard rows. */
function bonusRows(breakdown: CombatPowerBreakdown | undefined) {
  if (!breakdown) return [];
  return breakdown.lines.map((line) => ({
    label: `${line.label} (+${line.pct}%)`,
    value: Math.round(line.amount),
  }));
}

interface PowerLink {
  href: string;
  label: string;
}

function PowerCard({
  icon,
  title,
  value,
  breakdown,
  helper,
  links,
  highlight = false,
}: {
  icon: ReactNode;
  title: string;
  value: number;
  breakdown: { label: string; value: number }[] | string;
  helper?: string;
  links?: PowerLink[];
  highlight?: boolean;
}) {
  return (
    <Card
      className={`flex flex-col !p-4 ${highlight ? "border-gold/40 bg-gold/5" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-2xl">{icon}</span>
        <h3 className="text-sm font-bold text-zinc-300">{title}</h3>
      </div>
      <p className="mt-2 text-3xl font-black tabular-nums text-gold">
        {formatNumber(value)}
      </p>
      {typeof breakdown === "string" ? (
        <p className="mt-2 text-xs text-zinc-400">{breakdown}</p>
      ) : (
        // The breakdown floats over the card on hover so a longer list of
        // active bonuses never stretches the card — the tile stays compact.
        <span className="group/breakdown relative mt-2 inline-flex w-fit cursor-help items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-gold" tabIndex={0}>
          מהרכב הכוח
          <span aria-hidden className="text-[9px] leading-none">▾</span>
          <span
            role="tooltip"
            className="pointer-events-none invisible absolute right-0 top-full z-50 mt-1.5 w-max min-w-[10rem] max-w-[16rem] rounded-lg border border-gold/40 bg-[#100d08]/97 px-3 py-2 text-right opacity-0 shadow-[0_8px_30px_rgba(0,0,0,0.8)] transition-opacity duration-150 group-hover/breakdown:visible group-hover/breakdown:opacity-100 group-focus-within/breakdown:visible group-focus-within/breakdown:opacity-100"
          >
            <dl className="space-y-1 text-xs">
              {breakdown.map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <dt className="font-normal text-zinc-400">{row.label}</dt>
                  <dd className="font-semibold tabular-nums text-zinc-200">
                    {formatNumber(row.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </span>
        </span>
      )}
      {helper && <p className="mt-2 text-[11px] leading-snug text-zinc-500">{helper}</p>}
      {links && links.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs">
          {links.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className="font-semibold text-gold hover:text-gold-bright"
            >
              {link.label} ←
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export function PowerSummary({
  army,
  weapons,
  attackBreakdown,
  defenseBreakdown,
}: {
  army: Pick<Army, "soldiers" | "spies"> | null;
  weapons: readonly WeaponQuantityRow[];
  /** When given, the attack card shows real battle power with active bonuses. */
  attackBreakdown?: CombatPowerBreakdown;
  /** When given, the defense card shows real battle power (incl. +20%). */
  defenseBreakdown?: CombatPowerBreakdown;
}) {
  const soldiersPower = armyPower(army);
  const spyUnitsPower = spiesPower(army);
  const attackWeaponsPower = weaponsPower(weapons, "ATTACK");
  const defenseWeaponsPower = weaponsPower(weapons, "DEFENSE");
  const spyWeaponsPower = weaponsPower(weapons, "SPY");

  const attackValue = attackBreakdown?.total ?? getEmpireAttackPower(army, weapons);
  const defenseValue = defenseBreakdown?.total ?? getEmpireDefensePower(army, weapons);

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gold">
        <Icon name="spark" size={20} className="text-crimson-bright" />
        כוח האימפריה
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PowerCard
          icon={<Icon name="attack" size={28} className="text-red-400" />}
          title="כוח התקפה"
          value={attackValue}
          breakdown={[
            { label: "חיילים", value: soldiersPower },
            { label: "נשקי התקפה", value: attackWeaponsPower },
            ...bonusRows(attackBreakdown),
          ]}
          helper={
            attackBreakdown && attackBreakdown.lines.length > 0
              ? "כולל בונוסים פעילים (גיבור / קסם ברית)."
              : undefined
          }
          links={[
            { href: "/game/weapons", label: "ניהול נשקים" },
            { href: "/game/army", label: "אימון צבא" },
          ]}
        />
        <PowerCard
          icon={<Icon name="shield" size={28} className="text-sky-300" />}
          title="כוח הגנה"
          value={defenseValue}
          breakdown={[
            { label: "חיילים", value: soldiersPower },
            { label: "נשקי הגנה", value: defenseWeaponsPower },
            ...bonusRows(defenseBreakdown),
          ]}
          helper={
            defenseBreakdown
              ? "כוח ההגנה בפועל בקרב, כולל בונוס מגן ובונוסים פעילים."
              : "בקרב הגנה מתקבל בונוס הגנה של 20%."
          }
          links={[
            { href: "/game/weapons", label: "ניהול נשקים" },
            { href: "/game/army", label: "אימון צבא" },
          ]}
        />
        <PowerCard
          icon={<Icon name="spy" size={28} className="text-gold" />}
          title="כוח מודיעין"
          value={getEmpireSpyPower(army, weapons)}
          breakdown={[
            { label: "מרגלים", value: spyUnitsPower },
            { label: "נשקי ריגול", value: spyWeaponsPower },
          ]}
          helper="משפיע על סיכויי הצלחה בריגול."
          links={[
            { href: "/game/weapons?tab=spy", label: "ניהול נשקי ריגול" },
            { href: "/game/army", label: "אימון מרגלים" },
          ]}
        />
        <PowerCard
          icon={<Icon name="crown" size={28} className="text-gold-bright" />}
          title="כוח כללי"
          value={getEmpireGeneralPower(army, weapons)}
          breakdown="התקפה + הגנה + מודיעין"
          highlight
        />
      </div>
    </section>
  );
}
