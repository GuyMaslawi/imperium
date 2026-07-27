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
  HERO_DAMAGE_PER_LOST_DEFENSE,
  HERO_MAX_HEALTH,
  HERO_MAX_LEVEL,
  heroClassBonusLines,
  heroClassImage,
  heroReviveAt,
  isHeroDead,
  rawHeroBonuses,
  tierForLevel,
  xpToNextLevel,
} from "@/lib/game/hero";
import { HeroRevive } from "@/components/game/HeroRevive";

export const metadata = { title: "גיבור | IMPERIUM" };

export default async function HeroPage() {
  const empire = await requireEmpire();
  const hero = empire.hero;
  if (!hero) return null; // applyPendingUpdates always creates the hero

  const atCap = hero.level >= HERO_MAX_LEVEL;
  const xpMax = atCap ? 0 : xpToNextLevel(hero.level);
  const xpPct = atCap ? 100 : Math.round((hero.xp / xpMax) * 100);

  // The character sheet shows what the hero is *worth* — the raw numbers — even
  // while he is dead and none of them are in force. The banner says so plainly;
  // silently zeroing his own page would read as "my points are gone".
  const bonuses = rawHeroBonuses(hero);
  const dead = isHeroDead(hero);
  const reviveAt = heroReviveAt(hero);
  // The revival countdown ticks in server time — see HeroRevive.
  const serverNow = new Date();
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
        ornament={<Icon name="attack" size={22} className="text-crimson" />}
      />

      {/* A fallen hero is the first thing on the page — nothing else here
          matters until he is back on his feet. */}
      {dead && reviveAt && (
        <HeroRevive
          serverNow={serverNow.getTime()}
          reviveAt={reviveAt.getTime()}
          diamonds={Math.floor(empire.diamonds)}
        />
      )}

      {/* -------- character showcase: the hero wearing his own gear --------
          Three columns on a wide screen, right to left: the figure with his
          gear, then his bars and points, then the bag. Keeping the bag in the
          same panel fills the blank half the meters used to leave behind, and
          puts loot one glance away from the sockets it goes into. */}
      <div className="panel relative rounded-2xl border border-border-gold-strong">
        <div className="grid md:grid-cols-[minmax(0,290px)_1fr] xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_25rem]">
          {/* paperdoll (right in RTL) — the 9 pieces sit on the figure itself */}
          <div className="relative">
            <HeroPaperdoll
              portrait={heroClassImage(hero.heroClass)}
              portraitAlt={classMeta.label}
              portraitAccent={classMeta.accent}
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
              <Tip
                tip={
                  dead
                    ? "הגיבור מת — כל הבונוסים שלו מושבתים עד שיקום לתחייה"
                    : `בריאות הגיבור — כל תקיפה שפורצת את ההגנה שלך מורידה ${HERO_DAMAGE_PER_LOST_DEFENSE} נקודות. באפס הגיבור מת.`
                }
              >
                <span
                  className={`flex items-center gap-1 rounded-md border bg-black/80 px-2 py-0.5 text-xs font-bold ${
                    dead
                      ? "border-red-500 text-red-300"
                      : "border-red-500/40 text-red-400"
                  }`}
                >
                  {dead ? <span aria-hidden>💀</span> : <Icon name="heart" size={14} />}
                  <span className="nums" dir="ltr">
                    {hero.health}%
                  </span>
                </span>
              </Tip>
            </div>
          </div>

          {/* identity + class bonuses + xp + point allocation (left in RTL) */}
          <div className="flex flex-col gap-3.5 p-4 md:p-5">
            {/* identity — one compact line; the long class blurb is a tooltip */}
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <p className="text-xl font-black text-gold-bright">{classMeta.label}</p>
              <Tip tip={classMeta.description}>
                <span className="cursor-help text-xs text-zinc-500 underline decoration-dotted underline-offset-2">
                  על המחלקה
                </span>
              </Tip>
            </div>
            <p className="-mt-2 text-xs text-zinc-400">{classMeta.tagline}</p>

            {/* permanent class bonuses */}
            <div className="flex flex-wrap gap-1.5">
              {classLines.map((line) => (
                <Tip key={line.label} tip="יתרון המחלקה — בונוס קבוע שנבחר בעת ההרשמה">
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-950/40 px-2 py-0.5 text-xs font-bold text-emerald-300">
                    <span aria-hidden>{line.icon}</span>
                    {line.label}
                    <span className="nums" dir="ltr">+{line.pct}%</span>
                  </span>
                </Tip>
              ))}
            </div>

            {/* -------- bars, then the points right under them --------
                One narrow column: health and xp on top, the three stat rows
                below them, with the bag filling the space to their left. */}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              {/* the two bars that move between battles */}
              <div className="flex flex-col justify-center gap-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="nums" dir="ltr">
                      {hero.health}/{HERO_MAX_HEALTH}
                    </span>
                    <Tip
                      tip={`חיי הגיבור. כל תקיפה שפורצת את ההגנה שלך מורידה ${HERO_DAMAGE_PER_LOST_DEFENSE} נקודות; באפס הגיבור מת וכל הבונוסים שלו מושבתים.`}
                    >
                      <span className="cursor-help text-red-400">חיים</span>
                    </Tip>
                  </div>
                  <Meter tone="health" value={hero.health} max={HERO_MAX_HEALTH} />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="nums" dir="ltr">
                      {atCap ? "שיא" : `${formatNumber(hero.xp)}/${formatNumber(xpMax)}`}
                    </span>
                    <Tip tip="ניסיון מצטבר מקרבות — ניצחון בתקיפה מעניק הכי הרבה, וגם הגנה מוצלחת מזכה. כל עליית רמה מעניקה נקודת גיבור.">
                      <span className="nums cursor-help text-gold" dir="ltr">
                        {xpPct}%
                      </span>
                    </Tip>
                  </div>
                  <Meter tone="xp" value={atCap ? 1 : hero.xp} max={atCap ? 1 : xpMax} />
                </div>
              </div>

              {/* point allocation: the page's one recurring action */}
              <div className="panel-inset rounded-xl p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Tip tip="שלוש התכונות שנקודות הגיבור מחזקות. חפצי הגיבור אינם משנים אחוזים אלה — התרומה שלהם מרוכזת ב'סך הכל מהגיבור' שלמטה.">
                    <h2 className="cursor-help text-sm font-bold tracking-wide text-gold-bright">
                      נקודות גיבור
                    </h2>
                  </Tip>
                  <Tip tip="נקודות גיבור שטרם הוקצו — מתקבלת נקודה בכל עליית רמה. כל נקודה = ‎+1% לצמיתות.">
                    <span
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                        hero.unspentPoints > 0
                          ? "border-gold/50 bg-gold/10 text-gold-bright"
                          : "border-border-subtle bg-panel-inset text-zinc-400"
                      }`}
                    >
                      פנויות
                      <span className="nums" dir="ltr">{hero.unspentPoints}</span>
                    </span>
                  </Tip>
                </div>
                {/* stat rows + point allocation (points only — items excluded) */}
                <HeroStatsCards points={bonuses.points} unspentPoints={hero.unspentPoints} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {atCap && <HeroResetButton />}
              <Tip tip="חנות פריטים וחיזוקים לגיבור — בקרוב" side="bottom">
                <button className="btn btn-ghost px-3 py-1.5 text-xs">
                  <Icon name="shop" size={14} className="inline align-[-2px]" /> חנות גיבור
                </button>
              </Tip>
            </div>
          </div>

          {/* -------- the bag (left in RTL) -------- */}
          <div className="border-t border-border-subtle p-4 md:col-span-2 md:p-5 xl:col-span-1 xl:border-s xl:border-t-0 xl:p-4">
            <HeroBag
              items={bagItems}
              heroLevel={hero.level}
              gold={empire.gold}
              wheelSpinBonus={wheelSpinBonus}
            />
          </div>
        </div>
      </div>

      {/* everything the hero is actually worth, points and gear folded together —
          a full-width footer under the whole hero section */}
      <HeroPowerSummary bonuses={bonuses} />
    </div>
  );
}
