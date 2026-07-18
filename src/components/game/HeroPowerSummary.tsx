import { HERO_STAT_META, type HeroBonuses } from "@/lib/game/hero";
import { formatNumber } from "@/lib/game/format";
import { Tip } from "@/components/ui/Tip";

/**
 * "סך הכל מהגיבור" — the combined yield the player actually gets from the hero,
 * points and equipped items together. Attack/defense/spy are percentages (the
 * point cards show points only; here the item % is folded in); turns, diamonds,
 * citizens and resources are the flat unit counts the equipped items grant.
 */
export function HeroPowerSummary({ bonuses }: { bonuses: HeroBonuses }) {
  const { points, itemsPct, itemsFlat, totalPct } = bonuses;

  // התקפה/הגנה = נקודות + חפצים; ריגול מגיע מחפצים בלבד.
  const percentRows = [
    {
      stat: "attack" as const,
      value: totalPct.attack,
      note: `נקודות +${points.attack}% · חפצים +${itemsPct.attack}%`,
    },
    {
      stat: "defense" as const,
      value: totalPct.defense,
      note: `נקודות +${points.defense}% · חפצים +${itemsPct.defense}%`,
    },
    {
      stat: "spy" as const,
      value: totalPct.spy,
      note: "מחפצי ריגול לבושים",
    },
  ];

  // תורות/יהלומים/אזרחים/משאבים — כמות קבועה מהחפצים, לא באחוזים.
  const flatRows = (["turns", "diamonds", "citizens", "resources"] as const).map(
    (stat) => ({ stat, value: itemsFlat[stat] })
  );

  return (
    <div className="panel-inset rounded-xl p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-sm font-bold tracking-wide text-gold-bright">
          סך הכל מהגיבור
        </h3>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Total Hero Yield
        </span>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
        מה שאתה מקבל בפועל מהנקודות והחפצים יחד. התקפה, הגנה וריגול מוצגים
        באחוזים; תורות, יהלומים, אזרחים ומשאבים מתקבלים כמספרים קבועים.
      </p>

      {/* percentage stats: attack / defense / spy */}
      <div className="grid grid-cols-3 gap-2">
        {percentRows.map(({ stat, value, note }) => {
          const meta = HERO_STAT_META[stat];
          return (
            <Tip key={stat} tip={<>{meta.description}<br />{note}</>}>
              <div className="panel rounded-lg p-2.5 text-center">
                <p className="cursor-help text-[11px] text-zinc-400">
                  {meta.icon} {meta.label}
                </p>
                <p className={`nums mt-0.5 text-lg font-black ${meta.tone}`} dir="ltr">
                  +{value}%
                </p>
              </div>
            </Tip>
          );
        })}
      </div>

      {/* flat stats: turns / diamonds / citizens / resources */}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {flatRows.map(({ stat, value }) => {
          const meta = HERO_STAT_META[stat];
          return (
            <Tip key={stat} tip={meta.description}>
              <div className="panel rounded-lg p-2.5 text-center">
                <p className="cursor-help text-[11px] text-zinc-400">
                  {meta.icon} {meta.label}
                </p>
                <p className={`nums mt-0.5 text-lg font-black ${meta.tone}`} dir="ltr">
                  +{formatNumber(value)}
                </p>
              </div>
            </Tip>
          );
        })}
      </div>
    </div>
  );
}
