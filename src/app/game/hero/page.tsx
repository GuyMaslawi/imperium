import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Meter } from "@/components/ui/Meter";
import { Tip } from "@/components/ui/Tip";
import { HeroBag } from "@/components/game/HeroBag";
import { HeroEquipment } from "@/components/game/HeroEquipment";
import { HeroStatsCards } from "@/components/game/HeroStatsCards";
import { HeroResetButton } from "@/components/game/HeroResetButton";
import type { HeroItemView } from "@/components/game/heroItemView";
import type { StatBreakdown } from "@/components/game/HeroStatsCards";
import { formatNumber } from "@/lib/game/format";
import {
  HERO_MAX_LEVEL,
  HERO_STATS,
  heroBonuses,
  xpToNextLevel,
  type HeroStat,
} from "@/lib/game/hero";

export const metadata = { title: "גיבור | WARZONE" };

export default async function HeroPage() {
  const empire = await requireEmpire();
  const hero = empire.hero;
  if (!hero) return null; // applyPendingUpdates always creates the hero

  const atCap = hero.level >= HERO_MAX_LEVEL;
  const xpMax = atCap ? 0 : xpToNextLevel(hero.level);
  const xpPct = atCap ? 100 : Math.round((hero.xp / xpMax) * 100);

  const bonuses = heroBonuses(hero);
  const toView = (items: typeof hero.items): HeroItemView[] =>
    items.map(({ id, slot, level, rarity }) => ({ id, slot, level, rarity }));
  const bagItems = toView(hero.items.filter((i) => !i.equipped));
  const equippedItems = toView(hero.items.filter((i) => i.equipped));

  return (
    <div className="space-y-6">
      <SectionHeading title="גיבור" subtitle="WAR HERO" ornament="⚔" />

      <div className="flex justify-center">
        <Tip tip="חנות פריטים וחיזוקים לגיבור — בקרוב" side="bottom">
          <button className="btn btn-ghost px-4 py-2 text-sm">🛒 חנות גיבור</button>
        </Tip>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* -------- inventory (right in RTL) -------- */}
        <HeroBag items={bagItems} heroLevel={hero.level} />

        {/* -------- hero (left in RTL) -------- */}
        <div className="panel rounded-xl p-4">
          {/* identity row */}
          <div className="flex items-center justify-between gap-4">
            <Tip tip="בריאות הגיבור — כרגע תמיד מלאה; אינה נפגעת בקרבות">
              <div className="flex flex-col items-center">
                <span className="text-4xl text-red-500" aria-hidden>
                  ❤️
                </span>
                <span className="nums mt-1 text-sm font-bold text-red-400" dir="ltr">
                  100%
                </span>
              </div>
            </Tip>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="flex items-center justify-end gap-2 text-lg font-black text-gold-bright">
                  {hero.resets > 0 && (
                    <Tip
                      tip={`תג איפוס: הגיבור הגיע לרמה 100 ואופס ${hero.resets === 1 ? "פעם אחת" : `${hero.resets} פעמים`}. כל איפוס העניק 2,500 אזרחים ו-25 נקודות גיבור.`}
                    >
                      <span className="rounded-md border border-purple-400/60 bg-purple-950/60 px-1.5 py-0.5 text-[10px] font-black text-purple-300">
                        ↻ ×{hero.resets}
                      </span>
                    </Tip>
                  )}
                  גיבור ({hero.level})
                </p>
                <Tip tip="מקצוע הגיבור">
                  <p className="text-sm text-zinc-400">קשת</p>
                </Tip>
                <Tip tip="נקודות גיבור שטרם הוקצו — מתקבלת נקודה בכל עליית רמה. הקצה אותן בכרטיסי ההתקפה/הגנה/משאבים משמאל (כל נקודה = +1% לצמיתות).">
                  <span className="mt-1 inline-block rounded-md border border-gold/40 bg-panel-inset px-2 py-0.5 text-xs font-bold text-gold">
                    נקודות פנויות{" "}
                    <span className="nums" dir="ltr">
                      {hero.unspentPoints}
                    </span>
                  </span>
                </Tip>
              </div>
              <div className="relative flex h-16 w-16 items-center justify-center rounded-lg border border-gold/50 bg-gradient-to-b from-gold-deep/40 to-black text-3xl">
                <span aria-hidden>🏹</span>
                <span
                  className="nums absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/50 bg-black px-2 text-[10px] font-bold text-gold-bright"
                  dir="rtl"
                >
                  רמה {hero.level}
                  {hero.resets > 0 && <span className="text-purple-300"> ↻{hero.resets}</span>}
                </span>
              </div>
            </div>
          </div>

          {/* xp */}
          <div className="mt-5">
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

          {atCap && (
            <div className="mt-4">
              <HeroResetButton />
            </div>
          )}

          <div className="rule-gold my-4" />

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            {/* active equipment */}
            <HeroEquipment equipped={equippedItems} heroLevel={hero.level} />

            {/* stat cards + point allocation */}
            <HeroStatsCards
              bonuses={Object.fromEntries(
                HERO_STATS.map((stat) => [
                  stat,
                  {
                    points: bonuses.points[stat],
                    items: bonuses.items[stat],
                    total: bonuses.total[stat],
                  },
                ])
              ) as Record<HeroStat, StatBreakdown>}
              unspentPoints={hero.unspentPoints}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
