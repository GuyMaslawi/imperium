import Link from "next/link";
import type { Army } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { weaponsPower, type WeaponQuantityRow } from "@/lib/game/weapons";
import {
  armyPower,
  spiesPower,
  getEmpireAttackPower,
  getEmpireDefensePower,
  getEmpireSpyPower,
  getEmpireGeneralPower,
} from "@/lib/game/power";
import { formatNumber } from "@/lib/game/format";

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
  icon: string;
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
        <dl className="mt-2 space-y-1 text-xs">
          {breakdown.map((row) => (
            <div key={row.label} className="flex justify-between">
              <dt className="text-zinc-400">{row.label}</dt>
              <dd className="font-semibold tabular-nums text-zinc-200">
                {formatNumber(row.value)}
              </dd>
            </div>
          ))}
        </dl>
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
}: {
  army: Pick<Army, "soldiers" | "spies"> | null;
  weapons: readonly WeaponQuantityRow[];
}) {
  const soldiersPower = armyPower(army);
  const spyUnitsPower = spiesPower(army);
  const attackWeaponsPower = weaponsPower(weapons, "ATTACK");
  const defenseWeaponsPower = weaponsPower(weapons, "DEFENSE");
  const spyWeaponsPower = weaponsPower(weapons, "SPY");

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gold">
        <span aria-hidden>⚡</span>
        כוח האימפריה
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PowerCard
          icon="⚔️"
          title="כוח התקפה"
          value={getEmpireAttackPower(army, weapons)}
          breakdown={[
            { label: "חיילים", value: soldiersPower },
            { label: "נשקי התקפה", value: attackWeaponsPower },
          ]}
          links={[
            { href: "/game/weapons", label: "ניהול נשקים" },
            { href: "/game/army", label: "אימון צבא" },
          ]}
        />
        <PowerCard
          icon="🛡️"
          title="כוח הגנה"
          value={getEmpireDefensePower(army, weapons)}
          breakdown={[
            { label: "חיילים", value: soldiersPower },
            { label: "נשקי הגנה", value: defenseWeaponsPower },
          ]}
          helper="בקרב הגנה מתקבל בונוס הגנה של 20%."
          links={[
            { href: "/game/weapons", label: "ניהול נשקים" },
            { href: "/game/army", label: "אימון צבא" },
          ]}
        />
        <PowerCard
          icon="🕵️"
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
          icon="👑"
          title="כוח כללי"
          value={getEmpireGeneralPower(army, weapons)}
          breakdown="התקפה + הגנה + מודיעין"
          highlight
        />
      </div>
    </section>
  );
}
