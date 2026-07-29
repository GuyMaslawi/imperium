import type { ReactNode } from "react";
import { HERO_STAT_META, type HeroBonuses, type HeroStat } from "@/lib/game/hero";
import { RESOURCE_META, type StorableResource } from "@/lib/game/constants";
import { formatNumber } from "@/lib/game/format";
import { Tip } from "@/components/ui/Tip";
import { Icon, RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";

/**
 * "סך הכל מהגיבור" — the combined yield the player actually gets from the hero,
 * points and equipped items together. It is laid out as two clearly labelled
 * blocks: the battle percentages (attack/defense/spy — points and item % folded
 * in) and the flat yield the equipped items grant (turns,
 * citizens, resources). Each line reads left-to-right value ↔ right-to-left
 * label so the numbers align in a single detailed column.
 */

/** One detailed stat line: icon + label + breakdown note on the right, value on the left. */
function StatRow({
  stat,
  value,
  suffix,
  note,
  format = (v) => `+${v}`,
}: {
  stat: HeroStat;
  value: number;
  /** "%" for percentage stats, unit word for flat stats. */
  suffix?: string;
  note: string;
  format?: (v: number) => string;
}) {
  const meta = HERO_STAT_META[stat];
  const active = value > 0;
  return (
    <Tip className="w-full" tip={<>{meta.description}<br />{note}</>}>
      <div
        className={`flex w-full cursor-help items-center justify-between gap-3 rounded-lg p-2.5 ${
          active ? "panel" : "panel-inset opacity-60"
        }`}
      >
        <div className="min-w-0 text-right">
          <p className="text-sm font-bold text-zinc-200">
            <Icon name={meta.icon} size={14} className="inline align-[-2px]" /> {meta.label}
          </p>
          <p className="text-[11px] leading-tight text-zinc-500">{note}</p>
        </div>
        <p
          className={`nums shrink-0 whitespace-nowrap text-xl font-black ${
            active ? meta.tone : "text-zinc-600"
          }`}
          dir="ltr"
        >
          {format(value)}
          {suffix && <span className="ms-0.5 text-xs font-bold opacity-70">{suffix}</span>}
        </p>
      </div>
    </Tip>
  );
}

/**
 * The resources row is a hybrid: unlike every other stat, its yield comes from
 * two different sources in two different units — a **percentage** from allocated
 * points (which multiplies mine output) and a **flat amount** from the equipped
 * relic (added to specific resources each tick). We show both, each with its own
 * source label, so the player sees exactly where the +59% and the +64 come from
 * (matching the per-resource breakdown on the mines page).
 */
function ResourcesRow({
  pointsPct,
  classPct = 0,
  itemFlat,
  itemNote,
}: {
  /** % from allocated resource points — multiplies mine production. */
  pointsPct: number;
  /** % from the chosen hero class (הסוחר) — multiplies mine production too. */
  classPct?: number;
  /** Flat resource units the equipped relic conjures each regular tick. */
  itemFlat: number;
  /** Which resources the relic feeds (or a waiting hint when none equipped). */
  itemNote: ReactNode;
}) {
  const meta = HERO_STAT_META.resources;
  const totalPctValue = pointsPct + classPct;
  const active = totalPctValue > 0 || itemFlat > 0;
  return (
    <Tip
      className="w-full"
      tip={
        <>
          {meta.description}
          <br />
          נקודות מכפילות את תפוקת המכרות; החפץ מוסיף כמות קבועה בכל עדכון רגיל.
        </>
      }
    >
      <div
        className={`flex w-full cursor-help items-center justify-between gap-3 rounded-lg p-2.5 ${
          active ? "panel" : "panel-inset opacity-60"
        }`}
      >
        <div className="min-w-0 text-right">
          <p className="text-sm font-bold text-zinc-200">
            <Icon name={meta.icon} size={14} className="inline align-[-2px]" /> {meta.label}
          </p>
          <div className="mt-0.5 space-y-0.5 text-[11px] leading-tight text-zinc-500">
            {pointsPct > 0 && (
              <p>
                נקודות +{pointsPct}% — מכפיל תפוקת מכרות
              </p>
            )}
            {classPct > 0 && <p>דמות +{classPct}% — יתרון הסוחר</p>}
            {itemFlat > 0 ? (
              <p>פרי שטן +{formatNumber(itemFlat)} — {itemNote}</p>
            ) : (
              totalPctValue === 0 && <p>{itemNote}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-left" dir="ltr">
          {totalPctValue > 0 && (
            <p className={`nums whitespace-nowrap text-xl font-black ${meta.tone}`}>
              +{totalPctValue}
              <span className="ms-0.5 text-xs font-bold opacity-70">%</span>
            </p>
          )}
          {itemFlat > 0 && (
            <p
              className={`nums whitespace-nowrap font-black ${
                totalPctValue > 0 ? "text-sm" : "text-xl"
              } ${meta.tone}`}
            >
              +{formatNumber(itemFlat)}
            </p>
          )}
          {!active && <p className="nums text-xl font-black text-zinc-600">+0</p>}
        </div>
      </div>
    </Tip>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gold-dim">
      {children}
    </p>
  );
}

export function HeroPowerSummary({ bonuses }: { bonuses: HeroBonuses }) {
  const { points, itemsPct, itemsFlat, itemsFlatByResource, classPct, totalPct } = bonuses;

  /** "· דמות +X%" appended only when the class actually contributes. */
  const classNote = (pct: number) => (pct > 0 ? ` · דמות +${pct}%` : "");

  // A resource item (relic) feeds only the specific resources its tier covers —
  // gold only for a פשוט relic, up to all four for an אגדי. Name exactly those,
  // so the flat "resources" line never overstates its reach as "every resource".
  const coveredResources = (["gold", "wood", "iron", "stone"] as StorableResource[]).filter(
    (r) => itemsFlatByResource[r] > 0
  );
  const resourcesNote =
    coveredResources.length > 0 ? (
      <>
        {coveredResources.map((r, i) => (
          <span key={r} className="inline-flex items-center gap-1">
            {i > 0 && <span className="mx-0.5">·</span>}
            <Icon
              name={RESOURCE_ICON[r]}
              size={11}
              className={RESOURCE_ICON_COLOR[r]}
            />
            {RESOURCE_META[r].label}
          </span>
        ))}{" "}
        — בכל עדכון רגיל
      </>
    ) : (
      "מחפץ פרי שטן — המשאבים לפי דרגת החפץ"
    );

  // התקפה/הגנה = נקודות + חפצים; ריגול מגיע מחפצים בלבד.
  const percentRows: { stat: HeroStat; value: number; note: string }[] = [
    {
      stat: "attack",
      value: totalPct.attack,
      note: `נקודות +${points.attack}% · חפצים +${itemsPct.attack}%${classNote(classPct.attack)}`,
    },
    {
      stat: "defense",
      value: totalPct.defense,
      note: `נקודות +${points.defense}% · חפצים +${itemsPct.defense}%${classNote(classPct.defense)}`,
    },
    {
      stat: "spy",
      value: totalPct.spy,
      note:
        classPct.spy > 0
          ? `חפצים +${itemsPct.spy}%${classNote(classPct.spy)}`
          : "מחפצי ריגול לבושים בלבד",
    },
  ];

  // תורות/אזרחים — כמות קבועה מהחפצים, לא באחוזים. משאבים מטופלים בנפרד כי הם
  // ניזונים משני מקורות שונים: אחוז מהנקודות (מכפיל מכרות) + כמות מהחפץ.
  // יהלומים אינם ברשימה: חפצים אינם מייצרים יהלומים כלל (ראו HeroFlatStat).
  const flatRows: { stat: HeroStat; value: number; note: string }[] = [
    { stat: "turns", value: itemsFlat.turns, note: "נוסף בכל עדכון יומי" },
    { stat: "citizens", value: itemsFlat.citizens, note: "נוסף בכל עדכון יומי" },
  ];

  return (
    <div className="panel-gold rounded-2xl p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-base font-bold tracking-wide text-gold-bright">
          סך הכל מהגיבור
        </h3>
      </div>
      <div className="rule-gold my-3" />
      <p className="mb-4 text-[11px] leading-relaxed text-zinc-500">
        מה שאתה מקבל בפועל מהנקודות והחפצים יחד. שורות מודגשות פעילות; שורות
        עמומות ממתינות לחפץ מתאים.
      </p>

      {/* Three labelled groups laid side-by-side on wide screens so the
          full-width footer fills its row instead of trailing off into blank
          space; they stack on narrow screens. */}
      <div className="grid gap-x-6 gap-y-5 lg:grid-cols-3">
        {/* battle percentages: attack / defense / spy */}
        <section>
          <SectionLabel>בונוסי קרב · באחוזים</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {percentRows.map(({ stat, value, note }) => (
              <StatRow key={stat} stat={stat} value={value} suffix="%" note={note} />
            ))}
          </div>
        </section>

        {/* flat per-update yield from items: turns / citizens */}
        <section className="lg:border-e lg:border-s lg:border-border-subtle lg:px-6">
          <SectionLabel>תשואה קבועה מחפצים · בכמויות</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {flatRows.map(({ stat, value, note }) => (
              <StatRow
                key={stat}
                stat={stat}
                value={value}
                note={note}
                format={(v) => `+${formatNumber(v)}`}
              />
            ))}
          </div>
        </section>

        {/* resources: hybrid — % from points (mines) + flat from the relic */}
        <section>
          <SectionLabel>תפוקת משאבים · נקודות + חפץ</SectionLabel>
          <ResourcesRow
            pointsPct={points.resources}
            classPct={classPct.resources}
            itemFlat={itemsFlat.resources}
            itemNote={resourcesNote}
          />
        </section>
      </div>
    </div>
  );
}
