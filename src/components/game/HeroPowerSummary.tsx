import { HERO_STAT_META, type HeroBonuses, type HeroStat } from "@/lib/game/hero";
import { RESOURCE_META, type StorableResource } from "@/lib/game/constants";
import { formatNumber } from "@/lib/game/format";
import { Tip } from "@/components/ui/Tip";

/**
 * "סך הכל מהגיבור" — the combined yield the player actually gets from the hero,
 * points and equipped items together. It is laid out as two clearly labelled
 * blocks: the battle percentages (attack/defense/spy — points and item % folded
 * in) and the flat per-tick yield the equipped items grant (turns, diamonds,
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
    <Tip tip={<>{meta.description}<br />{note}</>}>
      <div
        className={`flex cursor-help items-center justify-between gap-3 rounded-lg p-2.5 ${
          active ? "panel" : "panel-inset opacity-60"
        }`}
      >
        <div className="min-w-0 text-right">
          <p className="text-sm font-bold text-zinc-200">
            <span aria-hidden>{meta.icon}</span> {meta.label}
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
  itemFlat,
  itemNote,
}: {
  /** % from allocated resource points — multiplies mine production. */
  pointsPct: number;
  /** Flat resource units the equipped relic conjures each regular tick. */
  itemFlat: number;
  /** Which resources the relic feeds (or a waiting hint when none equipped). */
  itemNote: string;
}) {
  const meta = HERO_STAT_META.resources;
  const active = pointsPct > 0 || itemFlat > 0;
  return (
    <Tip
      tip={
        <>
          {meta.description}
          <br />
          נקודות מכפילות את תפוקת המכרות; החפץ מוסיף כמות קבועה בכל עדכון רגיל.
        </>
      }
    >
      <div
        className={`flex cursor-help items-center justify-between gap-3 rounded-lg p-2.5 ${
          active ? "panel" : "panel-inset opacity-60"
        }`}
      >
        <div className="min-w-0 text-right">
          <p className="text-sm font-bold text-zinc-200">
            <span aria-hidden>{meta.icon}</span> {meta.label}
          </p>
          <div className="mt-0.5 space-y-0.5 text-[11px] leading-tight text-zinc-500">
            {pointsPct > 0 && (
              <p>
                נקודות +{pointsPct}% — מכפיל תפוקת מכרות
              </p>
            )}
            {itemFlat > 0 ? (
              <p>פרי שטן +{formatNumber(itemFlat)} — {itemNote}</p>
            ) : (
              pointsPct === 0 && <p>{itemNote}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-left" dir="ltr">
          {pointsPct > 0 && (
            <p className={`nums whitespace-nowrap text-xl font-black ${meta.tone}`}>
              +{pointsPct}
              <span className="ms-0.5 text-xs font-bold opacity-70">%</span>
            </p>
          )}
          {itemFlat > 0 && (
            <p
              className={`nums whitespace-nowrap font-black ${
                pointsPct > 0 ? "text-sm" : "text-xl"
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
  const { points, itemsPct, itemsFlat, itemsFlatByResource, totalPct } = bonuses;

  // A resource item (relic) feeds only the specific resources its tier covers —
  // gold only for a פשוט relic, up to all four for an אגדי. Name exactly those,
  // so the flat "resources" line never overstates its reach as "every resource".
  const coveredResources = (["gold", "wood", "iron", "stone"] as StorableResource[]).filter(
    (r) => itemsFlatByResource[r] > 0
  );
  const resourcesNote =
    coveredResources.length > 0
      ? `${coveredResources.map((r) => `${RESOURCE_META[r].icon} ${RESOURCE_META[r].label}`).join(" · ")} — בכל עדכון רגיל`
      : "מחפץ פרי שטן — המשאבים לפי דרגת החפץ";

  // התקפה/הגנה = נקודות + חפצים; ריגול מגיע מחפצים בלבד.
  const percentRows: { stat: HeroStat; value: number; note: string }[] = [
    {
      stat: "attack",
      value: totalPct.attack,
      note: `נקודות +${points.attack}% · חפצים +${itemsPct.attack}%`,
    },
    {
      stat: "defense",
      value: totalPct.defense,
      note: `נקודות +${points.defense}% · חפצים +${itemsPct.defense}%`,
    },
    {
      stat: "spy",
      value: totalPct.spy,
      note: "מחפצי ריגול לבושים בלבד",
    },
  ];

  // תורות/יהלומים/אזרחים — כמות קבועה מהחפצים, לא באחוזים. משאבים מטופלים בנפרד
  // כי הם ניזונים משני מקורות שונים: אחוז מהנקודות (מכפיל מכרות) + כמות מהחפץ.
  const flatRows: { stat: HeroStat; value: number; note: string }[] = [
    { stat: "turns", value: itemsFlat.turns, note: "נוסף בכל עדכון רגיל" },
    { stat: "diamonds", value: itemsFlat.diamonds, note: "נוסף בכל עדכון יומי" },
    { stat: "citizens", value: itemsFlat.citizens, note: "נוסף בכל עדכון יומי" },
  ];

  return (
    <div className="panel-inset rounded-xl p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold tracking-wide text-gold-bright">
          סך הכל מהגיבור
        </h3>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Total Hero Yield
        </span>
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-zinc-500">
        מה שאתה מקבל בפועל מהנקודות והחפצים יחד. שורות מודגשות פעילות; שורות
        עמומות ממתינות לחפץ מתאים.
      </p>

      {/* Three labelled groups laid side-by-side on wide screens so the
          full-width footer fills its row instead of trailing off into blank
          space; they stack on narrow screens. */}
      <div className="grid gap-x-6 gap-y-5 lg:grid-cols-3">
        {/* battle percentages: attack / defense / spy */}
        <div>
          <SectionLabel>בונוסי קרב · באחוזים</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {percentRows.map(({ stat, value, note }) => (
              <StatRow key={stat} stat={stat} value={value} suffix="%" note={note} />
            ))}
          </div>
        </div>

        {/* flat per-tick yield from items: turns / diamonds / citizens */}
        <div>
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
        </div>

        {/* resources: hybrid — % from points (mines) + flat from the relic */}
        <div>
          <SectionLabel>תפוקת משאבים · נקודות + חפץ</SectionLabel>
          <ResourcesRow
            pointsPct={points.resources}
            itemFlat={itemsFlat.resources}
            itemNote={resourcesNote}
          />
        </div>
      </div>
    </div>
  );
}
