import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { Meter } from "@/components/ui/Meter";
import { Tip } from "@/components/ui/Tip";
import { HeroBag } from "@/components/game/HeroBag";
import { HeroPaperdoll } from "@/components/game/HeroPaperdoll";
import { HeroStatsCards } from "@/components/game/HeroStatsCards";
import { HeroPowerSummary } from "@/components/game/HeroPowerSummary";
import { HeroResetButton } from "@/components/game/HeroResetButton";
import type { HeroItemView } from "@/components/game/heroItemView";
import { formatNumber } from "@/lib/game/format";
import { wheelLuckBonus } from "@/lib/game/constants";
import {
  HERO_CLASS_META,
  HERO_MAX_LEVEL,
  heroBonuses,
  heroClassBonusLines,
  heroClassImage,
  tierForLevel,
  xpToNextLevel,
} from "@/lib/game/hero";

export const metadata = { title: "גיבור | IMPERIUM" };

export default async function HeroPage() {
  const empire = await requireEmpire();
  const hero = empire.hero;
  if (!hero) return null; // applyPendingUpdates always creates the hero

  const atCap = hero.level >= HERO_MAX_LEVEL;
  const xpMax = atCap ? 0 : xpToNextLevel(hero.level);
  const xpPct = atCap ? 100 : Math.round((hero.xp / xpMax) * 100);

  const bonuses = heroBonuses(hero);
  const classMeta = HERO_CLASS_META[hero.heroClass];
  const classLines = heroClassBonusLines(hero.heroClass);
  // The tier ("rarity") is always derived from level, so two items of the same
  // slot+level look and perform identically regardless of what's stored.
  const toView = (items: typeof hero.items): HeroItemView[] =>
    items.map(({ id, slot, level }) => ({ id, slot, level, rarity: tierForLevel(level) }));
  const bagItems = toView(hero.items.filter((i) => !i.equipped));
  const equippedItems = toView(hero.items.filter((i) => i.equipped));
  // Wheel-luck upgrade raises the chance a thrown item pays a wheel spin.
  const wheelSpinBonus = wheelLuckBonus(
    empire.upgrades.find((u) => u.type === "WHEEL_LUCK")?.level ?? 1
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="גיבור"
        subtitle="WAR HERO"
        ornament={<Icon name="attack" size={22} className="text-crimson" />}
      />

      {/* -------- character showcase: the hero wearing his own gear -------- */}
      <div className="panel relative rounded-2xl border border-border-gold-strong">
        <div className="grid md:grid-cols-[minmax(0,400px)_1fr]">
          {/* paperdoll (right in RTL) — the 9 pieces sit on the figure itself */}
          <div className="relative">
            <HeroPaperdoll
              portrait={heroClassImage(hero.heroClass)}
              portraitAlt={classMeta.label}
              equipped={equippedItems}
              bag={bagItems}
              heroLevel={hero.level}
              gold={empire.gold}
              wheelSpinBonus={wheelSpinBonus}
            />

            {/* level + resets badge */}
            <div className="absolute right-3 top-3 flex items-center gap-1.5">
              <Tip tip="רמת הגיבור — עולה מניסיון שנצבר בקרבות">
                <span className="rounded-md border border-gold/60 bg-black/80 px-2 py-0.5 text-xs font-black text-gold-bright nums">
                  רמה {hero.level}
                </span>
              </Tip>
              {hero.resets > 0 && (
                <Tip
                  tip={`תג איפוס: הגיבור הגיע לרמה 100 ואופס ${hero.resets === 1 ? "פעם אחת" : `${hero.resets} פעמים`}. כל איפוס העניק 2,500 אזרחים ו-25 נקודות גיבור.`}
                >
                  <span className="rounded-md border border-purple-400/60 bg-purple-950/80 px-1.5 py-0.5 text-xs font-black text-purple-300">
                    ↻ ×{hero.resets}
                  </span>
                </Tip>
              )}
            </div>

            {/* health */}
            <div className="absolute left-3 top-3">
              <Tip tip="בריאות הגיבור — כרגע תמיד מלאה; אינה נפגעת בקרבות">
                <span className="flex items-center gap-1 rounded-md border border-red-500/40 bg-black/80 px-2 py-0.5 text-xs font-bold text-red-400">
                  <Icon name="heart" size={14} />
                  <span className="nums" dir="ltr">100%</span>
                </span>
              </Tip>
            </div>
          </div>

          {/* identity + class bonuses + xp (left in RTL) */}
          <div className="flex flex-col justify-center gap-4 p-5 md:p-6">
            <div>
              {/* the class name lives here now — the portrait is pure visual */}
              <p className="text-2xl font-black text-gold-bright">{classMeta.label}</p>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.35em] text-bone-dim">
                {classMeta.title}
              </p>
              <p className="text-sm text-zinc-400">{classMeta.tagline}</p>
              <p className="mt-1 text-base text-zinc-300">{classMeta.description}</p>
            </div>

            {/* permanent class bonuses */}
            <div className="flex flex-wrap gap-2">
              {classLines.map((line) => (
                <Tip key={line.label} tip="יתרון המחלקה — בונוס קבוע שנבחר בעת ההרשמה">
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-950/40 px-2.5 py-1 text-sm font-bold text-emerald-300">
                    <span aria-hidden>{line.icon}</span>
                    {line.label}
                    <span className="nums" dir="ltr">+{line.pct}%</span>
                  </span>
                </Tip>
              ))}
              <Tip tip="נקודות גיבור שטרם הוקצו — מתקבלת נקודה בכל עליית רמה. הקצה אותן בכרטיסי ההתקפה/הגנה/משאבים למטה (כל נקודה = +1% לצמיתות).">
                <span className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-panel-inset px-2.5 py-1 text-sm font-bold text-gold">
                  נקודות פנויות
                  <span className="nums" dir="ltr">{hero.unspentPoints}</span>
                </span>
              </Tip>
            </div>

            {/* xp */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
                <span className="nums" dir="ltr">
                  {atCap ? "MAX" : `${formatNumber(hero.xp)}/${formatNumber(xpMax)}`}
                </span>
                <span className="nums text-gold" dir="ltr">
                  {xpPct}%
                </span>
              </div>
              <Meter tone="xp" value={atCap ? 1 : hero.xp} max={atCap ? 1 : xpMax} />
              <p className="mt-1.5 text-[11px] text-zinc-500">
                ניסיון מצטבר מקרבות — ניצחון בתקיפה מעניק הכי הרבה, וגם הגנה
                מוצלחת מזכה. כל עליית רמה מעניקה נקודת גיבור.
              </p>
            </div>

            {atCap && <HeroResetButton />}

            <div className="flex justify-start">
              <Tip tip="חנות פריטים וחיזוקים לגיבור — בקרוב" side="bottom">
                <button className="btn btn-ghost px-4 py-2 text-sm">
                  <Icon name="shop" size={16} className="inline align-[-2px]" /> חנות גיבור
                </button>
              </Tip>
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* -------- inventory (right in RTL) -------- */}
        <HeroBag
          items={bagItems}
          heroLevel={hero.level}
          gold={empire.gold}
          wheelSpinBonus={wheelSpinBonus}
        />

        {/* -------- point allocation (left in RTL) -------- */}
        <div className="panel rounded-xl p-4">
          <Tip tip="שלוש התכונות שנקודות הגיבור מחזקות. חפצי הגיבור אינם משנים אחוזים אלה — התרומה שלהם מרוכזת ב'סך הכל מהגיבור' שלמטה.">
            <h2 className="mb-3 cursor-help text-base font-bold tracking-wide text-gold-bright">
              נקודות גיבור
            </h2>
          </Tip>
          {/* stat cards + point allocation (points only — items excluded) */}
          <HeroStatsCards points={bonuses.points} unspentPoints={hero.unspentPoints} />
        </div>
      </div>

      {/* combined yield from points + items together — full-width footer so the
          two columns above stay balanced and nothing trails off into blank space */}
      <HeroPowerSummary bonuses={bonuses} />
    </div>
  );
}
