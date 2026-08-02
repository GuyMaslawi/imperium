import type { CSSProperties } from "react";
import Link from "next/link";
import { requireEmpire } from "@/lib/auth";
import { getTunables } from "@/lib/game/config";
import {
  BANK_DAILY_INTEREST_MAX_LEVEL,
  BANK_INTEREST_COST_GROWTH,
  BANK_INTEREST_MAX_RATE,
  BANK_INTEREST_PER_LEVEL,
  BANK_DEPOSIT_MAX,
  CITIZEN_GROWTH_LEVELS_PER_CITY,
  DAILY_UPDATE_TIMES,
  EMPIRE_UPGRADE_META,
  EMPIRE_UPGRADE_TYPES,
  INTELLIGENCE_MAX_LEVEL,
  MAX_CITIES,
  MINE_MAX_LEVEL,
  NEWBIE_PROTECTION_MS,
  REGULAR_TICK_MINUTES,
  RESOURCE_META,
  SOLDIER_POWER,
  SPY_POWER,
  STORAGE_CAPACITY_PER_LEVEL,
  TICKS_PER_DAY,
  TURNS_UPGRADE_COST_GROWTH,
  TURNS_UPGRADE_MAX_LEVEL,
  UNIT_META,
  WHEEL_LUCK_COST_GROWTH,
  WHEEL_LUCK_MAX_LEVEL,
  bankInterestUpgradeCost,
  cityCost,
  cityHeroLevelRequired,
  citizensPerDailyUpdate,
  empireUpgradeCostFor,
  empireUpgradeMaxLevel,
  mineUpgradeCost,
  storageUpgradeCost,
  turnsUpgradeCost,
  wheelLuckBonus,
  wheelLuckUpgradeCost,
  type ActiveEmpireUpgradeType,
} from "@/lib/game/constants";
import { cityAt } from "@/lib/game/cities";
import { formatNumber } from "@/lib/game/format";
import {
  INITIAL_WEAPON_UNLOCKED_TIER,
  TIERS_PER_CATEGORY,
  WEAPON_CATEGORY_META,
  WEAPON_GATE_EVERY,
  weaponTierGate,
  weaponTierUnlockCost,
  weaponsOfCategory,
} from "@/lib/game/weapons";
import {
  flatCurveGrowth,
  HERO_BAG_CAPACITY,
  HERO_CLASS_META,
  HERO_CLASS_ORDER,
  HERO_DAMAGE_PER_LOST_DEFENSE,
  HERO_MAX_HEALTH,
  HERO_MAX_LEVEL,
  HERO_RESET_CITIZENS,
  HERO_RESET_POINTS,
  HERO_RESET_TURNS,
  heroPointPool,
  HERO_REVIVE_HOURS,
  ITEM_DROP_CHANCE,
  ITEM_DROP_CHANCE_BY_RARITY,
  RARITY_META,
  RARITY_ORDER,
  SLOT_META,
  SLOT_ORDER,
  CITIZENS_PER_LEVEL,
  UPGRADE_COST_AT_LEVEL_10,
  UPGRADE_COST_AT_LEVEL_100,
  UPGRADE_COST_GROWTH,
  heroClassBonusLines,
  heroClassImage,
  itemPrimaryBonus,
  itemBonusLines,
  itemStatBonus,
  xpToNextLevel,
} from "@/lib/game/hero";
import { HERO_ITEM_SETS, heroItemArtPath } from "@/lib/game/heroSets";
import {
  POTION_DROP_CHANCE,
  POTION_KINDS,
  POTION_META,
  potionDurationLabel,
  type PotionShape,
} from "@/lib/game/potions";
import {
  HERO_QUESTS,
  HERO_QUEST_FORTUNES,
  HERO_QUEST_PEOPLE_CITY_MULTIPLIER,
  HERO_QUEST_REWARD_CITY_MULTIPLIER,
  HERO_QUEST_TURNS_PER_HOUR_BASE,
  HERO_QUEST_TURNS_PER_HOUR_DROP,
  heroQuestDurationLabel,
  heroQuestTurnCost,
  heroQuestXp,
} from "@/lib/game/heroQuests";
import {
  BOSS_BASE_POWER,
  BOSS_HERO_XP_BASE,
  BOSS_ITEM_RARITY_FLOOR,
  BOSS_POWER_TIER_MULTIPLIER,
  BOSS_REVIVE_MS,
  BOSS_TURN_COST_BASE,
  CITY_BOSSES,
} from "@/lib/game/bosses";
import {
  BOSS_ASSAULT_DURATION_MS,
  BOSS_CHIP_SHARE,
  BOSS_GRADE_BONUS,
  BOSS_GRADE_MIN_DECISIONS,
  BOSS_HP_PER_POWER,
  BOSS_KILL_SHARE,
  BOSS_MOVE_META,
  BOSS_MOVE_COUNTER,
  BOSS_READ_CHANCE_BASE,
  BOSS_READ_CHANCE_MAX,
  BOSS_READ_CHANCE_NO_HERO,
  BOSS_LOSS_ENGAGEMENT_FLOOR,
  BOSS_ROUT_LOOT_PENALTY,
  BOSS_ROUT_LOSS_FRACTION,
  BOSS_SORTIE_ROUNDS,
  BOSS_TACTIC_META,
} from "@/lib/game/bossBattle";
import {
  GUILD_AID_MAX_LEVEL,
  GUILD_CREATION_COST_DIAMONDS,
  GUILD_SPELL_BUFF_HOURS,
  GUILD_SPELL_MAX_LEVEL,
  GUILD_SPELL_META,
  GUILD_SPELL_TYPES,
  aidUpgradeCostGold,
  capacityUpgradeCostGold,
  guildCapacity,
  spellCastCostDiamonds,
  spellUpgradeCostDiamonds,
} from "@/lib/game/guild";
import {
  SEASON_PASS_PREMIUM_PRICE,
  SEASON_PASS_TIER_COUNT,
  SEASON_PASS_XP,
  SEASON_PASS_XP_PER_TIER,
  SEASON_PASS_DAILY_GROWTH,
} from "@/lib/game/seasonPass";
import {
  WHEEL_MAX_DOUBLINGS,
  WHEEL_PREMIUM_BASE,
  WHEEL_PREMIUM_STEP,
  WHEEL_PRIZES,
  WHEEL_RESOURCE_BASE,
} from "@/lib/game/wheel";
import {
  CHAT_BODY_MAX,
  CHAT_BURST_LIMIT,
  CHAT_BURST_WINDOW_MS,
  CHAT_DIRECT_LIMIT,
  CHAT_GLOBAL_LIMIT,
  CHAT_PAIR_LIMIT,
  CHAT_REPEAT_WINDOW_MS,
  PRESENCE_ONLINE_MS,
} from "@/lib/game/chat";
import { COMMUNITY_HIGHLIGHTS, DISCORD_JOIN_DIAMONDS } from "@/lib/community";
import {
  BOOST_MAX_PCT,
  BOOST_STEP_COST,
  BOOST_STEP_PCT,
  CITY_DOWNGRADE_COOLDOWN_HOURS,
  CITY_DOWNGRADE_COST,
  CITY_DOWNGRADE_MIN_CITIES,
  HERO_POINTS_RESET_COST,
  HERO_REVIVE_COST,
  SHIELDS,
  SHIELD_RENEW_COOLDOWN_MINUTES,
  TURN_PACKAGES,
} from "@/lib/game/diamondShop";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon, resourceIcon, type IconName } from "@/components/ui/Icon";
import { BackToTop, GuideToc, type TocEntry } from "@/components/game/guide/GuideToc";
import {
  BankCalc,
  BattleCalc,
  BossLadder,
  HeroXpCalc,
  ItemUpgradeCalc,
  ProductionCalc,
  SpyCalc,
} from "@/components/game/guide/GuideCalc";
import {
  Cost,
  Fact,
  Formula,
  GuideSection,
  Lead,
  N,
  Note,
  O,
  R,
  TableWrap,
  V,
  formatShort,
  type GuideSectionMeta,
} from "@/components/game/guide/GuideUi";

export const metadata = { title: "מדריך המשחק | KRALDOR" };

/* ------------------------------------------------------------------ *
 * The manual's spine. The order here drives the numerals, the table
 * of contents and the scroll-spy, so a section is added in exactly one
 * place.
 * ------------------------------------------------------------------ */
const SECTIONS = {
  overview: { id: "overview", title: "מבט על", sub: "the loop", icon: "crown" },
  clock: { id: "clock", title: "שעון המשחק", sub: "the clock", icon: "turns" },
  resources: { id: "resources", title: "משאבים", sub: "resources", icon: "gold" },
  mines: { id: "mines", title: "מכרות ותפוקה", sub: "production", icon: "mine" },
  cities: { id: "cities", title: "ערים", sub: "cities", icon: "base" },
  storage: { id: "storage", title: "מחסנים", sub: "warehouses", icon: "storage" },
  bank: { id: "bank", title: "בנק", sub: "the bank", icon: "bank" },
  army: { id: "army", title: "צבא ואזרחים", sub: "the army", icon: "army" },
  weapons: { id: "weapons", title: "מפעל הנשק", sub: "the foundry", icon: "factory" },
  upgrades: { id: "upgrades", title: "שדרוגי אימפריה", sub: "upgrades", icon: "upgrades" },
  battle: { id: "battle", title: "קרב", sub: "war", icon: "attack" },
  spy: { id: "spy", title: "ריגול", sub: "espionage", icon: "spy" },
  hero: { id: "hero", title: "הגיבור", sub: "the hero", icon: "hero" },
  items: { id: "items", title: "חפצים", sub: "gear", icon: "spark" },
  potions: { id: "potions", title: "שיקויים", sub: "potions", icon: "potion" },
  quests: { id: "quests", title: "מסעות הגיבור", sub: "expeditions", icon: "quest" },
  bosses: { id: "bosses", title: "שליטי הערים", sub: "city bosses", icon: "shield" },
  guild: { id: "guild", title: "ברית", sub: "guilds", icon: "guild" },
  chat: { id: "chat", title: "צ׳אט", sub: "live chat", icon: "chat" },
  community: { id: "community", title: "קהילה", sub: "community", icon: "discord" },
  rewards: { id: "rewards", title: "גלגל, פס עונה ואירועים", sub: "rewards", icon: "wheel" },
  diamonds: { id: "diamonds", title: "יהלומים", sub: "diamonds", icon: "diamond" },
  roadmap: { id: "roadmap", title: "מסלול התקדמות", sub: "roadmap", icon: "rankings" },
} as const satisfies Record<string, GuideSectionMeta>;

const ORDER = Object.keys(SECTIONS) as (keyof typeof SECTIONS)[];
const INDEX = Object.fromEntries(ORDER.map((k, i) => [k, i + 1])) as Record<
  keyof typeof SECTIONS,
  number
>;
const TOC: TocEntry[] = ORDER.map((k) => ({
  id: SECTIONS[k].id,
  title: SECTIONS[k].title,
  icon: SECTIONS[k].icon,
}));

/** The bosses whose art bleeds behind the banner, left to right. */
const BANNER_ART = ["varkos", "morgeth", "tharos", "serpina", "nox", "volgaris"];

/**
 * Bottle silhouettes, so a brew is known by shape alone — the same distinction
 * the potion belt makes (see PotionMeta.shape).
 */
const POTION_SHAPE: Record<PotionShape, { className: string; style?: CSSProperties }> = {
  vial: { className: "h-14 w-7 rounded-b-[999px] rounded-t-sm" },
  orb: { className: "h-12 w-12 rounded-full" },
  flask: {
    className: "h-13 w-12",
    style: { clipPath: "polygon(36% 0, 64% 0, 64% 30%, 100% 100%, 0 100%, 36% 30%)" },
  },
  crystal: { className: "h-10 w-10 rotate-45 rounded-md" },
};

/** The five beats of the core loop, in the order the overview walks them. */
const LOOP_NODES: { icon: IconName; title: string; text: string }[] = [
  { icon: "mine", title: "מייצרים", text: "מכרות + עבדים = משאבים בכל 5 דקות" },
  { icon: "upgrades", title: "משדרגים", text: "מכרות, מחסנים, שדרוגי אימפריה, ערים" },
  { icon: "factory", title: "מתחמשים", text: "חיילים, מרגלים ונשקים במפעל" },
  { icon: "attack", title: "תוקפים", text: "ביזה, שבויים, ניסיון וחפצים" },
  { icon: "hero", title: "מתחזקים", text: "הגיבור עולה רמות ומחזק את הכל" },
];

const nf = (v: number) => Math.round(v).toLocaleString("he-IL");

/**
 * Everything an empire pays to take an upgrade from its starting level 1 up to
 * `maxLevel`. The table used to quote a single rung (5 → 6), which said nothing
 * about a geometric ladder — and named a purchase that does not exist for the
 * five-level turns upgrade. Uncapped upgrades have no total, so they print "—".
 */
function upgradeLadderTotal(
  type: ActiveEmpireUpgradeType,
  maxLevel: number | undefined
) {
  const total = { gold: 0, wood: 0, iron: 0, stone: 0 };
  if (maxLevel === undefined) return undefined;
  for (let level = 1; level < maxLevel; level++) {
    const rung = empireUpgradeCostFor(type, level);
    total.gold += rung.gold;
    total.wood += rung.wood;
    total.iron += rung.iron;
    total.stone += rung.stone;
  }
  return total;
}

export default async function GuidePage() {
  // The guide quotes live balance, not the historical defaults: an admin who
  // softens the boss or doubles mine output changes this page with it.
  await requireEmpire();
  const tunables = await getTunables();

  const dailyTimes = DAILY_UPDATE_TIMES.map(
    (t) => `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="מדריך המשחק"
        ornament={<Icon name="reports" size={22} className="text-crimson" />}
      />

      {/* ------------------------------- banner ------------------------------- */}
      <header className="guide-hero rounded-xl px-5 py-8 text-center sm:px-10 sm:py-12">
        <div className="guide-hero-art" aria-hidden>
          {BANNER_ART.map((key) => (
            <figure key={key}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/boss/${key}.jpg`} alt="" />
            </figure>
          ))}
        </div>
        <div className="guide-hero-veil" aria-hidden />

        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-gold-dim">
          everything, explained
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-wide text-gold-bright sm:text-4xl">
          כל מה שצריך לדעת כדי לשלוט
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-bone/85">
          כל חוק, כל נוסחה וכל מספר במשחק — כפי שהשרת באמת מחשב אותם. המדריך חי:
          הערכים שמוצגים כאן נקראים מהאיזון הפעיל של השרת, ובכל מקום שיש בו חישוב
          מחכה לך מחשבון שאפשר לשחק איתו.
        </p>

        <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
          <Fact
            icon="turns"
            label="עדכון רגיל"
            value={`${REGULAR_TICK_MINUTES} דק׳`}
            hint="תפוקה + תורות"
          />
          <Fact
            icon="base"
            label="עדכון יומי"
            value={<span className="text-base">{dailyTimes.join(" · ")}</span>}
            hint="אזרחים, ריבית, גלגל"
          />
          <Fact
            icon="crown"
            label="ערים"
            value={`×${MAX_CITIES}`}
            hint="כל עיר מכפילה תפוקה"
            tone="text-bone-bright"
          />
          <Fact
            icon="hero"
            label="רמת גיבור"
            value={HERO_MAX_LEVEL}
            hint="ואז איפוס ליוקרה"
            tone="text-purple-300"
          />
        </div>
      </header>

      {/* ------------------------------- body ------------------------------- */}
      <GuideToc entries={TOC} />
      <BackToTop />

      <div>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-10 pt-2">
            {/* ============================ 01 overview ============================ */}
            <GuideSection meta={SECTIONS.overview} index={INDEX.overview}>
              <Lead>
                קראלדור הוא משחק אסטרטגיה של אימפריות שרצות על שעון אמיתי. אתה לא
                &quot;משחק תור&quot; — האימפריה שלך מייצרת, גדלה ונשדדת גם כשאתה לא מחובר.
                כל מה שתעשה מסתובב בלולאה אחת קבועה:
              </Lead>

              <div className="grid gap-4 md:grid-cols-5 md:gap-6">
                {LOOP_NODES.map((node, i, arr) => (
                  <div
                    key={node.title}
                    className={`guide-loop-node p-3 text-center ${i === arr.length - 1 ? "is-last" : ""}`}
                  >
                    <Icon name={node.icon} size={26} className="mx-auto mb-1 text-crimson-bright" />
                    <p className="text-sm font-black text-gold-bright">{node.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">{node.text}</p>
                  </div>
                ))}
              </div>

              <Note tone="green" icon="shield" title="הגנת שחקן חדש">
                אימפריה טרייה מוגנת מתקיפה ומריגול למשך{" "}
                <b className="nums">{NEWBIE_PROTECTION_MS / 3_600_000}</b> שעות מהרישום. המגן
                נשבר ברגע שאתה עצמך תוקף או מרגל — אי אפשר להסתתר מאחוריו ולפעול
                בתוקפנות באותו הזמן.
              </Note>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Fact icon="gold" label="זהב פתיחה" value={formatShort(tunables.starting.gold)} />
                <Fact icon="citizens" label="אזרחים פתיחה" value={nf(tunables.starting.citizens)} />
                <Fact icon="turns" label="תורות פתיחה" value={nf(tunables.starting.turns)} />
                <Fact
                  icon="army"
                  label="עבדי מכרות פתיחה"
                  value={nf(tunables.starting.mineSlaves)}
                  hint={`${tunables.starting.slavesPerMine} בכל מכרה`}
                />
              </div>
            </GuideSection>

            {/* ============================ 02 clock ============================ */}
            <GuideSection meta={SECTIONS.clock} index={INDEX.clock}>
              <Lead>
                לשרת שני קצבים, ולכל אחד תפקיד אחר. הכול מתעדכן על שעון גלובלי — כל
                האימפריות בעולם מתקדמות באותו רגע, גם אם אף אחד לא מחובר. נכנסת אחרי
                לילה שלם? כל העדכונים שהוחמצו מסודרים בבת אחת ברגע הכניסה.
              </Lead>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="panel-gold rounded-xl p-4">
                  <p className="mb-2 flex items-center gap-2 font-black text-gold-bright">
                    <Icon name="turns" size={18} /> עדכון רגיל — כל {REGULAR_TICK_MINUTES} דקות
                  </p>
                  <ul className="space-y-1.5 text-[0.8rem] text-zinc-300">
                    <li>• תפוקת כל המכרות (לפי עבדים, רמה, ערים ובונוסים)</li>
                    <li>• תורות משדרוג &quot;קבלת תורות&quot; (+1 לכל רמה)</li>
                    <li>• משאבים קבועים מחפצי הגיבור (פרי־שטן, מכנסיים ועוד)</li>
                  </ul>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    העדכון נופל על שעות עגולות — <span className="nums" dir="ltr">XX:00, XX:05, XX:10…</span>
                  </p>
                </div>

                <div className="panel-gold rounded-xl p-4">
                  <p className="mb-2 flex items-center gap-2 font-black text-gold-bright">
                    <Icon name="base" size={18} /> עדכון יומי — {dailyTimes.join(" ו־")}
                  </p>
                  <ul className="space-y-1.5 text-[0.8rem] text-zinc-300">
                    <li>• אזרחים חדשים — בלי תקרה, כולל כל הצבירה שהחמצת</li>
                    <li>• ריבית על הזהב שבבנק, ופתיחת מכסת הפקדות חדשה</li>
                    <li>
                      • <b className="nums">{tunables.daily.wheelSpins}</b> סיבובי גלגל מזל
                    </li>
                    <li>• איפוס דרך התהילה ומכסת הניצחונות על שליט העיר</li>
                    <li>• אזרחים ותורות מחפצי הגיבור</li>
                  </ul>
                  <p className="mt-2 text-[11px] text-zinc-500">שעון ישראל, פעמיים ביום.</p>
                </div>
              </div>

              <Formula
                label="אזרחים בכל עדכון יומי"
                expr={
                  <>
                    <N>{tunables.daily.citizensBase}</N>
                    <O>+</O>
                    <V>רמת שדרוג קבלת אזרחים</V>
                    <O>×</O>
                    <N>{tunables.daily.citizensPerLevel}</N>
                    <O>=</O>
                    <R>אזרחים</R>
                    <O>× עדכונים שהוחמצו</O>
                  </>
                }
                example={
                  <>
                    ברמת שדרוג <N>10</N> תקבל{" "}
                    <N>{citizensPerDailyUpdate(10, tunables.daily)}</N> אזרחים בכל עדכון —{" "}
                    <N>{citizensPerDailyUpdate(10, tunables.daily) * 2}</N> ביממה. אם לא נכנסת שבוע,
                    כל העדכונים שהוחמצו נצברים ומשולמים בכניסה הבאה.
                  </>
                }
              />

              <Note tone="green" icon="citizens" title="אין תקרת אוכלוסייה">
                אזרחים נצברים בלי גבול, בדיוק כמו משאבים — שום עדכון לא הולך לאיבוד
                אם לא רוקנת את המאגר. עדיין כדאי להמיר אותם: אזרח שיושב במאגר לא
                כורה, לא נלחם ולא מרגל. הערים כבר לא מגבילות כמה יש לך, רק כמה
                מהר הם מגיעים — דרך רמות שדרוג &quot;קבלת אזרחים&quot; שהן פותחות.
              </Note>
            </GuideSection>

            {/* ============================ 03 resources ============================ */}
            <GuideSection meta={SECTIONS.resources} index={INDEX.resources}>
              <Lead>
                שבעה מאזנים מנהלים את האימפריה. ארבעה מהם נאגרים ונבזזים, אחד נקנה
                בכסף אמיתי, ושניים הם &quot;דלק&quot; — כוח אדם וזמן פעולה.
              </Lead>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["gold", "המטבע המרכזי — נשקים, שדרוגים, שדרוג חפצים ובנק."],
                    ["wood", "חומר בנייה לשדרוגים ולנשקים."],
                    ["iron", "הבסיס לכל כלי הנשק."],
                    ["stone", "חומות, מבנים וביצורים."],
                    ["diamonds", "מטבע פרימיום: בריתות, קסמים, החייאת גיבור וחבילות."],
                    ["citizens", "כוח אדם גולמי — הופך לחיילים, מרגלים או עבדי מכרות."],
                    ["turns", "דלק הפעולה: כל תקיפה, ריגול וקרב בוס עולה תורות."],
                  ] as const
                ).map(([key, text]) => {
                  const ic = resourceIcon(key);
                  return (
                    <div key={key} className="panel-inset flex gap-3 rounded-xl p-3">
                      <Icon name={ic.name} size={26} className={`shrink-0 ${ic.className}`} />
                      <div className="min-w-0">
                        <p className="font-black text-bone-bright">
                          {RESOURCE_META[key].label}
                        </p>
                        <p className="text-[11px] leading-snug text-zinc-400">{text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Note tone="gold" icon="storage" title="זמין מול מאוחסן">
                לכל משאב יש שתי יתרות: <b>זמין</b> (מה שאפשר להוציא — וגם מה שנבזז
                בתקיפה) ו<b>מאוחסן</b> במחסן (מוגן לחלוטין מביזה, אבל לא ניתן להוציא
                אותו עד שתמשוך). ראה{" "}
                <a href={`#${SECTIONS.storage.id}`} className="text-gold underline">
                  מחסנים
                </a>
                .
              </Note>
            </GuideSection>

            {/* ============================ 04 mines ============================ */}
            <GuideSection meta={SECTIONS.mines} index={INDEX.mines}>
              <Lead>
                ארבעת המכרות הם מנוע הכלכלה. מכרה לא מייצר כלום מעצמו — הוא מייצר לפי
                כמות <b>עבדי המכרות</b> שהצבת בו, כפול התפוקה לעבד שנקבעת מרמת המכרה.
              </Lead>

              <Formula
                label="תפוקת מכרה בכל עדכון רגיל"
                expr={
                  <>
                    <V>עבדים</V>
                    <O>×</O>
                    <O>(</O>
                    <V>רמת המכרה</V>
                    <O>×</O>
                    <N>2</N>
                    <O>)</O>
                    <O>×</O>
                    <V>ערים</V>
                    <O>×</O>
                    <V>בונוס גיבור</V>
                    <O>×</O>
                    <V>קסם ברית</V>
                    <O>×</O>
                    <V>שיקוי</V>
                    <O>+</O>
                    <V>חפץ</V>
                  </>
                }
                legend={[
                  { term: "רמה × 2", desc: `כמה מפיק כל עבד. רמה ${MINE_MAX_LEVEL} = ${MINE_MAX_LEVEL * 2} ליחידה — התקרה.` },
                  { term: "ערים", desc: `מכפיל ליניארי: ×1 בעיר אחת, ×${MAX_CITIES} בעשר.` },
                  {
                    term: "בונוס גיבור",
                    desc: "נקודות משאבים + בונוס מקצוע הסוחר + חרב ומגן, שמוסיפים אחוזים לתפוקה.",
                  },
                  {
                    term: "חפץ",
                    desc: "פרי שטן, מכנסיים ונעליים מוסיפים כמות קבועה מעל המכפיל — לא אחוז.",
                  },
                ]}
                example={
                  <>
                    <N>60</N> עבדים במכרה ברמה <N>40</N> ={" "}
                    <N>{nf(60 * 80)}</N> בבסיס; עם <N>3</N> ערים ובונוס גיבור{" "}
                    <N>20%</N> — <R>{nf(60 * 80 * 3 * 1.2)}</R> בכל 5 דקות, כלומר{" "}
                    <R>{formatShort(60 * 80 * 3 * 1.2 * 288)}</R> ביממה.
                  </>
                }
              />

              <ProductionCalc globalMultiplier={tunables.economy.mineProductionMultiplier} />

              <div>
                <p className="mb-2 text-sm font-black text-gold-bright">מחיר שדרוג מכרה</p>
                <p className="mb-2 text-xs text-zinc-400">
                  כל מכרה משודרג <b>במשאב שלו בלבד</b> — מכרה זהב בזהב, מחצבת אבן באבן.
                  המחיר לינארי בדרגה הבאה, כך שהשדרוג הראשון אף פעם לא חינם.
                </p>
                <TableWrap maxHeight={320}>
                  <table className="guide-table">
                    <thead>
                      <tr>
                        <th className="text-right">רמה</th>
                        <th className="text-right">תפוקה לעבד</th>
                        <th className="text-right">מכרה זהב</th>
                        <th className="text-right">מכרה עץ</th>
                        <th className="text-right">מכרה ברזל</th>
                        <th className="text-right">מחצבת אבן</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 5, 10, 25, 50, 75, 100, 150, 200, 249].map((lvl) => (
                        <tr key={lvl}>
                          <td className="nums font-bold text-bone-bright" dir="ltr">
                            {lvl} → {lvl + 1}
                          </td>
                          <td className="nums text-emerald-300" dir="ltr">
                            {(lvl + 1) * 2}
                          </td>
                          {(["gold", "wood", "iron", "stone"] as const).map((res) => (
                            <td key={res}>
                              <Cost amounts={[{ key: res, value: mineUpgradeCost(lvl, res)[res] }]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </div>

              <Note tone="gold" icon="mine" title="עבדים או רמה?">
                שני הגורמים מוכפלים זה בזה, אז המכפלה גדלה הכי מהר כשהם מתקדמים יחד.
                עבדי מכרות עולים אזרח אחד בלבד ומגיעים גם כשבויים מתקיפות מנצחות — אבל
                רמת המכרה היא זו שמכפילה את כל העבדים בבת אחת.
              </Note>
            </GuideSection>

            {/* ============================ 05 cities ============================ */}
            <GuideSection meta={SECTIONS.cities} index={INDEX.cities}>
              <Lead>
                עיר היא קפיצת המדרגה הגדולה במשחק. כל עיר מכפילה את תפוקת המכרות,
                פותחת עוד {CITIZEN_GROWTH_LEVELS_PER_CITY} רמות לשדרוג קבלת האזרחים —
                ופותחת דרגות נשק חדשות במפעל. לכל אחת מעשר הערים שם משלה, מ
                {cityAt(1).name} שעל הגבול ועד {cityAt(MAX_CITIES).name}, והדירוג
                שאתה רואה הוא תמיד זה של העיר שבה אתה יושב.
              </Lead>

              <TableWrap maxHeight={400}>
                <table className="guide-table">
                  <thead>
                    <tr>
                      <th className="text-right">עיר</th>
                      <th className="text-right">מכפיל תפוקה</th>
                      <th className="text-right">אזרחים לעדכון</th>
                      <th className="text-right">רמת גיבור נדרשת</th>
                      <th className="text-right">עלות המעבר</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: MAX_CITIES }, (_, i) => i + 1).map((city) => {
                      const cost = city < MAX_CITIES ? cityCost(city) : null;
                      return (
                        <tr key={city}>
                          {/* The tier is the mechanic, the name is the place —
                              the table is the one screen that owes the player
                              both, since it is where they plan the climb. */}
                          <td className="font-black text-gold-bright">
                            <span className="nums" dir="ltr">
                              {city}
                            </span>{" "}
                            <span className="font-bold text-bone">{cityAt(city).name}</span>
                            <span className="block text-[11px] font-normal text-zinc-500">
                              {cityAt(city).epithet}
                            </span>
                          </td>
                          <td className="nums text-sky-300" dir="ltr">
                            ×{city}
                          </td>
                          <td className="nums text-bone" dir="ltr">
                            {nf(
                              citizensPerDailyUpdate(
                                city * CITIZEN_GROWTH_LEVELS_PER_CITY,
                                tunables.daily
                              )
                            )}
                          </td>
                          <td className="nums text-purple-300" dir="ltr">
                            {city === 1 ? "—" : cityHeroLevelRequired(city - 1)}
                          </td>
                          <td>
                            {cost ? (
                              <Cost
                                amounts={[
                                  { key: "gold", value: cost.gold },
                                  { key: "wood", value: cost.wood },
                                  { key: "iron", value: cost.iron },
                                  { key: "stone", value: cost.stone },
                                  { key: "soldiers", value: cost.soldiers },
                                ]}
                              />
                            ) : (
                              <span className="text-[11px] text-zinc-500">העיר האחרונה</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>

              <Formula
                label="מחיר עיר"
                expr={
                  <>
                    <V>מחיר העיר השנייה</V>
                    <O>×</O>
                    <N>2.5</N>
                    <sup className="text-gold-dim">(דרגה)</sup>
                    <O>—</O>
                    <V>גם המשאבים וגם דרישת החיילים</V>
                  </>
                }
                legend={[
                  { term: "חיילים", desc: "דרישת חיל מצב — הם נבדקים, לא נלקחים." },
                  { term: "רמת גיבור", desc: `עיר מספר N דורשת רמת גיבור (N−1) × 10.` },
                ]}
                example={
                  <>
                    העיר השנייה: <N>{formatShort(cityCost(1).gold)}</N> זהב +{" "}
                    <N>{formatShort(cityCost(1).wood)}</N> מכל שאר המשאבים +{" "}
                    <N>{cityCost(1).soldiers}</N> חיילים. העיר העשירית כבר עולה{" "}
                    <N>{formatShort(cityCost(9).gold)}</N> זהב.
                  </>
                }
              />
            </GuideSection>

            {/* ============================ 06 storage ============================ */}
            <GuideSection meta={SECTIONS.storage} index={INDEX.storage}>
              <Lead>
                מחסן הוא הכספת מפני תוקפים. משאב שהופקד במחסן <b>לא נבזז לעולם</b> — אבל
                גם לא ניתן להוציא אותו עד שתמשוך אותו בחזרה ליתרה הזמינה.
              </Lead>

              <div className="grid gap-4 md:grid-cols-2">
                <Formula
                  label="קיבולת מחסן"
                  expr={
                    <>
                      <V>רמת המחסן</V>
                      <O>×</O>
                      <N>{nf(STORAGE_CAPACITY_PER_LEVEL)}</N>
                      <O>=</O>
                      <R>קיבולת מוגנת</R>
                    </>
                  }
                  example={
                    <>
                      מחסן ברמה <N>25</N> מגן על{" "}
                      <N>{formatShort(25 * STORAGE_CAPACITY_PER_LEVEL)}</N> יחידות מהמשאב שלו.
                    </>
                  }
                />
                <div className="panel-inset rounded-xl p-4">
                  <p className="mb-2 text-sm font-black text-gold-bright">עלות שדרוג</p>
                  <table className="guide-table">
                    <thead>
                      <tr>
                        <th className="text-right">רמה</th>
                        <th className="text-right">קיבולת</th>
                        <th className="text-right">עלות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 5, 10, 25, 50].map((lvl) => {
                        const c = storageUpgradeCost(lvl);
                        return (
                          <tr key={lvl}>
                            <td className="nums" dir="ltr">
                              {lvl} → {lvl + 1}
                            </td>
                            <td className="nums text-emerald-300" dir="ltr">
                              {formatShort((lvl + 1) * STORAGE_CAPACITY_PER_LEVEL)}
                            </td>
                            <td>
                              <Cost
                                amounts={[
                                  { key: "gold", value: c.gold },
                                  { key: "wood", value: c.wood },
                                  { key: "iron", value: c.iron },
                                  { key: "stone", value: c.stone },
                                ]}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <Note tone="red" icon="attack" title="הכלל החשוב ביותר לפני שינה">
                תוקף לוקח{" "}
                <b className="nums">{Math.round(tunables.battle.plunderRate * 100)}%</b> מכל
                משאב <b>זמין</b> שלך. לפני שאתה מתנתק — הפקד במחסנים ובבנק. מה שנשאר
                בחוץ הוא הזמנה פתוחה.
              </Note>
            </GuideSection>

            {/* ============================ 07 bank ============================ */}
            <GuideSection meta={SECTIONS.bank} index={INDEX.bank}>
              <Lead>
                הבנק מקבל <b>זהב בלבד</b>, מגן עליו מביזה, ומשלם עליו ריבית דריבית בכל
                עדכון יומי — פעמיים ביום. זה הנכס היחיד במשחק שגדל מעצמו.
              </Lead>

              <div className="grid gap-3 sm:grid-cols-3">
                <Fact
                  icon="gold"
                  label="ריבית מקסימלית"
                  value={`${Math.round(BANK_INTEREST_MAX_RATE * 100)}%`}
                  hint={`${Math.round(BANK_INTEREST_PER_LEVEL * 100)}% לכל רמת שדרוג · עד רמה ${BANK_DAILY_INTEREST_MAX_LEVEL}`}
                />
                <Fact
                  icon="bank"
                  label="הפקדות בין עדכונים"
                  value={`עד ${BANK_DEPOSIT_MAX}`}
                  hint="1 + רמת שדרוג"
                  tone="text-bone-bright"
                />
                <Fact
                  icon="turns"
                  label="תדירות זיכוי"
                  value="×2 ביום"
                  hint="בכל עדכון יומי"
                  tone="text-emerald-300"
                />
              </div>

              <Formula
                label="ריבית בעדכון יומי"
                expr={
                  <>
                    <V>יתרה</V>
                    <O>×</O>
                    <O>min(</O>
                    <N>{`${Math.round(BANK_INTEREST_MAX_RATE * 100)}%`}</N>
                    <O>,</O>
                    <V>רמת שדרוג</V>
                    <O>×</O>
                    <N>{`${Math.round(BANK_INTEREST_PER_LEVEL * 100)}%`}</N>
                    <O>)</O>
                    <O>=</O>
                    <R>ריבית</R>
                    <O>(מעוגל כלפי מטה)</O>
                  </>
                }
                legend={[
                  { term: "ריבית דריבית", desc: "כל עדכון מחושב על היתרה החדשה, לא על הקרן." },
                  { term: "משיכה", desc: "חופשית תמיד — רק ההפקדות מוגבלות במכסה." },
                ]}
              />

              <BankCalc />
            </GuideSection>

            {/* ============================ 08 army ============================ */}
            <GuideSection meta={SECTIONS.army} index={INDEX.army}>
              <Lead>
                אימון יחידות לא עולה משאבים — הוא עולה <b>אזרחים</b>. כל אזרח הופך
                ליחידה אחת, וההחלטה מה לאמן היא הבחירה האסטרטגית האמיתית: כוח, מודיעין
                או כלכלה.
              </Lead>

              <div className="grid gap-3 md:grid-cols-3">
                {(Object.keys(UNIT_META) as (keyof typeof UNIT_META)[]).map((key) => {
                  const unit = UNIT_META[key];
                  const power = key === "soldiers" ? SOLDIER_POWER : key === "spies" ? SPY_POWER : 0;
                  return (
                    <div key={key} className="panel-gold rounded-xl p-4">
                      <p className="flex items-center gap-2 font-black text-gold-bright">
                        <Icon name={unit.icon} size={20} className="text-crimson-bright" />
                        {unit.labelPlural}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                        {unit.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded bg-black/50 px-2 py-0.5 text-bone">
                          עלות: <b className="nums">{unit.citizenCost}</b> אזרח
                        </span>
                        {power > 0 && (
                          <span className="rounded bg-black/50 px-2 py-0.5 text-red-300">
                            כוח: <b className="nums">{power}</b>
                          </span>
                        )}
                        {key === "mineSlaves" && (
                          <span className="rounded bg-black/50 px-2 py-0.5 text-emerald-300">
                            תפוקה במכרה
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Note tone="purple" icon="army" title="חיילים לא מתים בקרב שחקנים">
                בקרב מול שחקן אחר אף צד לא מאבד חיילים — הסיכון היחיד הוא התורות, ולמגן
                גם הביזה והשבויים. חיילים <b>כן</b> מתים בקרב מול שליט עיר.
              </Note>
            </GuideSection>

            {/* ============================ 09 weapons ============================ */}
            <GuideSection meta={SECTIONS.weapons} index={INDEX.weapons}>
              <Lead>
                נשק הוא הדרך להפוך משאבים לכוח. יש{" "}
                <b className="nums">{TIERS_PER_CATEGORY}</b> דרגות בכל אחת משלוש
                הקטגוריות — התקפה, הגנה וריגול — והמחיר והכוח <b>שניהם מוכפלים בכל דרגה</b>.
              </Lead>

              <Formula
                label="דרגה t"
                expr={
                  <>
                    <V>כוח</V>
                    <O>=</O>
                    <N>5</N>
                    <O>×</O>
                    <N>2</N>
                    <sup className="text-gold-dim">(t−1)</sup>
                    <O>|</O>
                    <V>מחיר</V>
                    <O>=</O>
                    <N>50</N>
                    <O>×</O>
                    <N>2</N>
                    <sup className="text-gold-dim">(t−1)</sup>
                    <V> זהב</V>
                    <O>+</O>
                    <N>25</N>
                    <O>×</O>
                    <N>2</N>
                    <sup className="text-gold-dim">(t−1)</sup>
                    <V> מכל שאר</V>
                  </>
                }
                legend={[
                  { term: "יחס קבוע", desc: "התקפה והגנה: 1 כוח לכל 10 זהב — בכל דרגה." },
                  { term: "ריגול", desc: "בסיס 4 במקום 5 — 1 כוח לכל 12.5 זהב." },
                  { term: "למה לשדרג", desc: "פחות פריטים לאותו כוח = פחות לחיצות, אותו מחיר." },
                ]}
                example={
                  <>
                    דרגה <N>1</N>: <N>5</N> כוח ב־<N>50</N> זהב. דרגה <N>20</N>:{" "}
                    <N>{formatShort(5 * 2 ** 19)}</N> כוח ב־
                    <N>{formatShort(50 * 2 ** 19)}</N> זהב. אותו יחס בדיוק.
                  </>
                }
              />

              <div>
                <p className="mb-2 text-sm font-black text-gold-bright">
                  סולם הדרגות — כוח, מחיר ותנאי פתיחה
                </p>
                <p className="mb-2 text-xs text-zinc-400">
                  פתיחת דרגה היא <b>משותפת לשלוש הקטגוריות</b> — פתחת דרגה 7? היא נפתחה
                  להתקפה, להגנה ולריגול יחד. מתחילים עם דרגות{" "}
                  <span className="nums">1–{INITIAL_WEAPON_UNLOCKED_TIER}</span> פתוחות, וכל{" "}
                  <span className="nums">{WEAPON_GATE_EVERY}</span> דרגות נדרשת רמת עיר
                  גבוהה יותר ורמת גיבור גבוהה יותר.
                </p>
                <TableWrap maxHeight={420}>
                  <table className="guide-table">
                    <thead>
                      <tr>
                        <th className="text-right">דרגה</th>
                        <th className="text-right">נשק התקפה</th>
                        <th className="text-right">כוח (התקפה/הגנה)</th>
                        <th className="text-right">כוח ריגול</th>
                        <th className="text-right">מחיר ליחידה</th>
                        <th className="text-right">פתיחת הדרגה</th>
                        <th className="text-right">דרישות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weaponsOfCategory("ATTACK").map((w) => {
                        const gate = weaponTierGate(w.tier);
                        const unlock = weaponTierUnlockCost(w.tier - 1);
                        return (
                          <tr key={w.tier}>
                            <td className="nums font-black text-gold-bright" dir="ltr">
                              {w.tier}
                            </td>
                            <td className="whitespace-nowrap text-bone">{w.name}</td>
                            <td className="nums text-red-300" dir="ltr">
                              {formatShort(w.power)}
                            </td>
                            <td className="nums text-purple-300" dir="ltr">
                              {formatShort((w.power / 5) * 4)}
                            </td>
                            <td>
                              <Cost
                                amounts={[
                                  { key: "gold", value: w.cost.gold },
                                  { key: "wood", value: w.cost.wood },
                                  { key: "iron", value: w.cost.iron },
                                  { key: "stone", value: w.cost.stone },
                                ]}
                              />
                            </td>
                            <td>
                              {w.tier <= INITIAL_WEAPON_UNLOCKED_TIER ? (
                                <span className="text-[11px] text-emerald-400">פתוח מההתחלה</span>
                              ) : (
                                <Cost
                                  amounts={[
                                    { key: "gold", value: unlock.gold },
                                    { key: "wood", value: unlock.wood },
                                    { key: "iron", value: unlock.iron },
                                    { key: "stone", value: unlock.stone },
                                  ]}
                                />
                              )}
                            </td>
                            <td className="whitespace-nowrap text-[11px]">
                              <span className="text-sky-300 nums">עיר {gate.cities}</span>
                              {gate.heroLevel > 0 && (
                                <span className="text-purple-300 nums"> · גיבור {gate.heroLevel}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableWrap>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.keys(WEAPON_CATEGORY_META) as (keyof typeof WEAPON_CATEGORY_META)[]).map(
                  (cat) => (
                    <div key={cat} className="panel-inset rounded-xl p-3 text-center">
                      <p className="text-lg">{WEAPON_CATEGORY_META[cat].icon}</p>
                      <p className="font-black text-gold-bright">
                        {WEAPON_CATEGORY_META[cat].label}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {WEAPON_CATEGORY_META[cat].powerLabel}
                      </p>
                    </div>
                  )
                )}
              </div>
            </GuideSection>

            {/* ============================ 10 upgrades ============================ */}
            <GuideSection meta={SECTIONS.upgrades} index={INDEX.upgrades}>
              <Lead>
                שישה שדרוגים גלובליים שמשנים כללים, לא מספרים בודדים. רובם חסומים בתקרה
                — כדי שלא תשקיע לנצח במשהו שכבר מיצה את עצמו.
              </Lead>

              <TableWrap>
                <table className="guide-table">
                  <thead>
                    <tr>
                      <th className="text-right">שדרוג</th>
                      <th className="text-right">מה הוא עושה</th>
                      <th className="text-right">תקרה</th>
                      <th className="text-right">עלות כל הסולם עד התקרה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EMPIRE_UPGRADE_TYPES.map((type) => {
                      const meta = EMPIRE_UPGRADE_META[type];
                      const max = empireUpgradeMaxLevel(type, MAX_CITIES);
                      const cost = upgradeLadderTotal(type, max);
                      return (
                        <tr key={type}>
                          <td className="whitespace-nowrap">
                            <span className="flex items-center gap-1.5 font-black text-gold-bright">
                              <Icon name={meta.icon} size={15} className="text-crimson" />
                              {meta.label}
                            </span>
                          </td>
                          <td className="text-[11px] leading-snug text-zinc-400">
                            {meta.description}
                          </td>
                          <td className="nums whitespace-nowrap text-sky-300" dir="ltr">
                            {max ?? "∞"}
                          </td>
                          <td>
                            {cost ? (
                              <Cost
                                amounts={[
                                  { key: "gold", value: cost.gold },
                                  { key: "wood", value: cost.wood },
                                  { key: "iron", value: cost.iron },
                                  { key: "stone", value: cost.stone },
                                ]}
                              />
                            ) : (
                              <span className="text-zinc-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>

              <div className="grid gap-3 sm:grid-cols-3">
                <Fact
                  icon="spy"
                  label="מודיעין"
                  value={`+${INTELLIGENCE_MAX_LEVEL * 10}%`}
                  hint={`10% לרמה, עד רמה ${INTELLIGENCE_MAX_LEVEL}`}
                  tone="text-purple-300"
                />
                <Fact
                  icon="citizens"
                  label="קבלת אזרחים"
                  value={`עד רמה ${MAX_CITIES * CITIZEN_GROWTH_LEVELS_PER_CITY}`}
                  hint={`${CITIZEN_GROWTH_LEVELS_PER_CITY} רמות לכל עיר`}
                  tone="text-bone-bright"
                />
                <Fact
                  icon="wheel"
                  label="מזל הגלגל"
                  value={`+${Math.round(wheelLuckBonus(WHEEL_LUCK_MAX_LEVEL) * 100)}%`}
                  hint="סיכוי לסיבוב חינם מתקיפה מנצחת"
                  tone="text-emerald-300"
                />
              </div>

              <Formula
                label="עלות שדרוג רגיל (רמה → רמה+1)"
                expr={
                  <>
                    <N>1,700</N>
                    <O>×</O>
                    <V>רמה</V>
                    <V> זהב</V>
                    <O>+</O>
                    <N>900</N>
                    <O>×</O>
                    <V>רמה</V>
                    <V> עץ/ברזל</V>
                    <O>+</O>
                    <N>600</N>
                    <O>×</O>
                    <V>רמה</V>
                    <V> אבן</V>
                  </>
                }
                legend={[
                  {
                    term: "שלושה יוצאים מהכלל",
                    desc: "הנוסחה הזו היא של השדרוגים הרגילים. שלושה שדרוגים מתומחרים גיאומטרית — כל רמה עולה פי כמה מקודמתה — כי מה שהם נותנים לא נגמר לעולם.",
                  },
                  {
                    term: "קבלת תורות",
                    desc: `תור אחד לעדכון רגיל הוא ${nf(TICKS_PER_DAY)} תורות ביום, לתמיד. לכן: ${nf(turnsUpgradeCost(1).gold)} זהב לרמה הראשונה, וכל רמה אחריה פי ${TURNS_UPGRADE_COST_GROWTH} — עד רמה ${TURNS_UPGRADE_MAX_LEVEL}.`,
                  },
                  {
                    term: "ריבית בנק",
                    desc: `${nf(bankInterestUpgradeCost(1).gold)} זהב לרמה הראשונה וכל רמה אחריה פי ${BANK_INTEREST_COST_GROWTH}, כי ריבית עובדת על זהב שאי אפשר לבזוז ומצטברת פעמיים ביום. ${Math.round(BANK_INTEREST_MAX_RATE * 100)}% הוא פרס של סוף עונה.`,
                  },
                  {
                    term: "מזל הגלגל",
                    desc: `היקר במשחק: ${nf(wheelLuckUpgradeCost(1).gold)} זהב לרמה הראשונה, וכל רמה אחריה פי ${WHEEL_LUCK_COST_GROWTH} — ${nf(wheelLuckUpgradeCost(WHEEL_LUCK_MAX_LEVEL - 1).gold)} לרמה ${WHEEL_LUCK_MAX_LEVEL}. סיבובי גלגל הם המטבע הנדיר במשחק, ולכן כל אחוז כואב.`,
                  },
                ]}
              />
            </GuideSection>

            {/* ============================ 11 battle ============================ */}
            <GuideSection meta={SECTIONS.battle} index={INDEX.battle}>
              <Lead>
                קרב בקראלדור הוא <b>דטרמיניסטי</b> — אין קובייה ואין מזל. שני מספרים
                מושווים, והגדול מנצח. זה אומר שכל תקיפה ניתנת לחישוב מראש, וזה בדיוק מה
                שהמחשבון למטה עושה.
              </Lead>

              <div className="grid gap-4 md:grid-cols-2">
                <Formula
                  label="כוח התוקף"
                  expr={
                    <>
                      <O>(</O>
                      <V>חיילים</V>
                      <O>×</O>
                      <N>{SOLDIER_POWER}</N>
                      <O>+</O>
                      <V>נשקי התקפה</V>
                      <O>)</O>
                      <O>×</O>
                      <V>גיבור</V>
                      <O>×</O>
                      <V>קסם ברית</V>
                      <O>+</O>
                      <V>עזרת ברית</V>
                    </>
                  }
                />
                <Formula
                  label="כוח המגן"
                  expr={
                    <>
                      <O>(</O>
                      <V>חיילים</V>
                      <O>×</O>
                      <N>{SOLDIER_POWER}</N>
                      <O>+</O>
                      <V>נשקי הגנה</V>
                      <O>)</O>
                      <O>×</O>
                      <N>{tunables.battle.defenseBonus}</N>
                      <O>×</O>
                      <V>גיבור</V>
                      <O>×</O>
                      <V>קסם ברית</V>
                      <O>+</O>
                      <V>עזרת ברית</V>
                    </>
                  }
                  legend={[
                    {
                      term: `×${tunables.battle.defenseBonus}`,
                      desc: `בונוס המגן — ${Math.round((tunables.battle.defenseBonus - 1) * 100)}% מתנה קבועה לצד המתגונן.`,
                    },
                  ]}
                />
              </div>

              <div className="panel-inset rounded-xl px-4 py-3 text-center text-sm">
                <span className="font-black text-red-300">כוח התקפה</span>
                <span className="mx-2 text-2xl font-black text-gold-bright">&gt;</span>
                <span className="font-black text-sky-300">כוח הגנה</span>
                <span className="mx-3 text-zinc-500">⟵</span>
                <span className="text-zinc-300">שוויון = המגן מנצח</span>
              </div>

              <BattleCalc
                defenseBonus={tunables.battle.defenseBonus}
                plunderRate={tunables.battle.plunderRate}
                enslaveRate={tunables.battle.enslaveRate}
                enslaveMin={tunables.battle.enslaveMinSoldiers}
              />

              <div>
                <p className="mb-2 text-sm font-black text-gold-bright">מה מקבלים בניצחון</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Fact
                    icon="gold"
                    label="ביזה"
                    value={`${Math.round(tunables.battle.plunderRate * 100)}%`}
                    hint="מכל משאב זמין של המגן"
                  />
                  <Fact
                    icon="army"
                    label="שבויים"
                    value={`${Math.round(tunables.battle.enslaveRate * 100)}%`}
                    hint={`אם למגן ${tunables.battle.enslaveMinSoldiers}+ חיילים`}
                    tone="text-bone-bright"
                  />
                  <Fact
                    icon="spark"
                    label="סיכוי לחפץ"
                    value={`${(ITEM_DROP_CHANCE * 100).toFixed(1)}%`}
                    hint="מתוכם 0.5% אגדי"
                    tone="text-purple-300"
                  />
                  <Fact
                    icon="potion"
                    label="סיכוי לשיקוי"
                    value={`${Math.round(POTION_DROP_CHANCE * 100)}%`}
                    hint="שעה של חוק שבור"
                    tone="text-emerald-300"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Note tone="gold" icon="turns" title="עלות">
                  תקיפה עולה <b className="nums">{tunables.battle.attackTurnCost}</b> תורות,
                  בין אם ניצחת ובין אם נהדפת. ריגול עולה{" "}
                  <b className="nums">{tunables.battle.spyTurnCost}</b>.
                </Note>
                <Note tone="red" icon="heart" title="הגנה שנפרצת פוגעת בגיבור">
                  כל תקיפה שפורצת את ההגנה שלך מורידה{" "}
                  <b className="nums">{HERO_DAMAGE_PER_LOST_DEFENSE}</b> נקודות בריאות
                  מהגיבור. באפס — הוא מת, וכל הבונוסים שלו כבים.
                </Note>
              </div>
            </GuideSection>

            {/* ============================ 12 spy ============================ */}
            <GuideSection meta={SECTIONS.spy} index={INDEX.spy}>
              <Lead>
                ריגול נפתר בדיוק כמו קרב — השוואת מספרים, בלי הגרלה. ההבדל: המגן מתגונן
                רק עם המרגלים, נשקי הריגול ושדרוג המודיעין שלו — בלי בונוס גיבור ובלי
                קסמים.
              </Lead>

              <Formula
                label="כוח מודיעין"
                expr={
                  <>
                    <O>(</O>
                    <V>מרגלים</V>
                    <O>×</O>
                    <N>{SPY_POWER}</N>
                    <O>+</O>
                    <V>נשקי ריגול</V>
                    <O>)</O>
                    <O>×</O>
                    <O>(</O>
                    <N>1</N>
                    <O>+</O>
                    <V>רמת מודיעין</V>
                    <O>×</O>
                    <N>0.1</N>
                    <O>+</O>
                    <V>גיבור% + ברית%</V>
                    <O>)</O>
                  </>
                }
                legend={[
                  { term: "התוקף בלבד", desc: "בונוס הגיבור וקסם הברית נספרים רק לתוקף." },
                  { term: "תיקו נכשל", desc: "צריך להיות גדול ממש מכוח המודיעין של היעד." },
                ]}
                example={
                  <>
                    <N>300</N> מרגלים + <N>8,000</N> כוח נשק ={" "}
                    <N>11,000</N>; עם מודיעין רמה <N>8</N> ובונוס גיבור{" "}
                    <N>15%</N> — <R>{nf(11000 * (1.8 + 0.15))}</R> כוח מודיעין.
                  </>
                }
              />

              <SpyCalc />

              <div className="grid gap-3 sm:grid-cols-2">
                <Note tone="purple" icon="spy" title="הצלחה = התיק המלא">
                  ריגול מוצלח מביא <b>הכל</b>: משאבים גלויים ומחסנים, יתרת הבנק, כל
                  פריט נשק, המבנים, השדרוגים, הצבא, הגיבור וציודו — וכל קסם, שיקוי ומגן
                  שפועלים עליו, עם <b>הזמן שנותר לכל אחד</b>. <b>והיעד לא יודע שרוגל</b>.
                </Note>
                <Note tone="red" icon="messages" title="כישלון = התראה">
                  מרגל שנתפס מפעיל התראה אצל היעד, שרואה מי ניסה. זה גם מה שפותח לו את
                  האפשרות לשלוח לך הודעה.
                </Note>
              </div>
            </GuideSection>

            {/* ============================ 13 hero ============================ */}
            <GuideSection meta={SECTIONS.hero} index={INDEX.hero}>
              <Lead>
                הגיבור הוא המכפיל האישי שלך: הוא לא נלחם בעצמו, הוא מחזק את כל מה שיש
                לך. הוא עולה רמות מקרבות, מקצה נקודות, לובש חפצים — וגם מת.
              </Lead>

              <div>
                <p className="mb-2 text-sm font-black text-gold-bright">
                  ארבעת המקצועות — נבחרים בהרשמה, ולתמיד
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {HERO_CLASS_ORDER.map((cls) => {
                    const meta = HERO_CLASS_META[cls];
                    return (
                      <article
                        key={cls}
                        className="overflow-hidden rounded-xl border"
                        style={{
                          borderColor: `rgb(${meta.accent} / 0.4)`,
                          background: `linear-gradient(180deg, rgb(${meta.accent} / 0.12), rgba(10,9,12,0.92))`,
                        }}
                      >
                        <div className="relative h-40 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={heroClassImage(cls)}
                            alt={meta.label}
                            loading="lazy"
                            className="h-full w-full object-cover object-[50%_18%]"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0a090c] to-transparent" />
                          <p
                            className="absolute bottom-2 right-3 text-lg font-black"
                            style={{ color: `rgb(${meta.accent})` }}
                          >
                            {meta.label}
                          </p>
                        </div>
                        <div className="p-3">
                          <p className="text-[11px] italic text-zinc-400">״{meta.tagline}״</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                            {meta.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {heroClassBonusLines(cls).map((b) => (
                              <span
                                key={b.label}
                                className="flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300"
                              >
                                <Icon name={b.icon} size={11} />+{b.pct}% {b.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <Formula
                label="ניסיון לרמה הבאה"
                expr={
                  <>
                    <N>120</N>
                    <O>+</O>
                    <O>(</O>
                    <V>רמה</V>
                    <O>−</O>
                    <N>1</N>
                    <O>)</O>
                    <O>×</O>
                    <N>35</N>
                  </>
                }
                legend={[
                  {
                    term: "נקודה לרמה",
                    desc: "כל רמה = נקודה אחת = +1% התקפה/הגנה/תפוקה. גיבור רמה 16 מחזיק 16 נקודות, ורמה 100 — 100.",
                  },
                  { term: `+${CITIZENS_PER_LEVEL} אזרחים`, desc: "כל עליית רמה מביאה גם אזרחים." },
                ]}
                example={
                  <>
                    רמה <N>1</N> דורשת <N>{xpToNextLevel(1)}</N> נק׳, רמה{" "}
                    <N>50</N> דורשת <N>{nf(xpToNextLevel(50))}</N>, ורמה{" "}
                    <N>99</N> דורשת <N>{nf(xpToNextLevel(99))}</N>.
                  </>
                }
              />

              <Formula
                label="ניסיון מתקיפה מנצחת"
                expr={
                  <>
                    <O>(</O>
                    <N>40</N>
                    <O>+</O>
                    <V>רמת גיבור היריב</V>
                    <O>×</O>
                    <N>10</N>
                    <O>)</O>
                    <O>×</O>
                    <V>יחס קרב</V>
                    <O>×</O>
                    <V>יוקרת היריב</V>
                  </>
                }
                legend={[
                  { term: "יחס קרב", desc: "0.3 + (כוח היריב ÷ כוחך) × 1.4, חסום ב־0.3–2.0." },
                  { term: "יוקרה", desc: "+25% לכל איפוס (↻) שהיריב עבר." },
                  { term: "הגנה מוצלחת", desc: "משלמת גם היא: 20 + רמת התוקף × 5." },
                ]}
              />

              <HeroXpCalc />

              <div className="grid gap-3 md:grid-cols-3">
                <div className="panel-gold rounded-xl p-4">
                  <p className="mb-1 flex items-center gap-2 font-black text-red-300">
                    <Icon name="heart" size={18} /> בריאות ומוות
                  </p>
                  <ul className="space-y-1 text-[11px] leading-relaxed text-zinc-300">
                    <li>• מתחיל ב־<b className="nums">{HERO_MAX_HEALTH}</b></li>
                    <li>
                      • <b className="nums">−{HERO_DAMAGE_PER_LOST_DEFENSE}</b> בכל הגנה שנפרצת
                    </li>
                    <li>• באפס: כל הבונוסים כבים — נקודות, חפצים ומקצוע</li>
                    <li>
                      • קם לתחייה אחרי <b className="nums">{HERO_REVIVE_HOURS}</b> שעה, או
                      מיידית ב־<b className="nums">{HERO_REVIVE_COST}</b> יהלומים — בכפתור
                      שבראש עמוד הגיבור
                    </li>
                  </ul>
                </div>
                <div className="panel-gold rounded-xl p-4">
                  <p className="mb-1 flex items-center gap-2 font-black text-purple-300">
                    <Icon name="crown" size={18} /> איפוס (יוקרה ↻)
                  </p>
                  <ul className="space-y-1 text-[11px] leading-relaxed text-zinc-300">
                    <li>• זמין ברמה <b className="nums">{HERO_MAX_LEVEL}</b></li>
                    <li>
                      • חוזר לרמה 1 עם <b className="nums">+{nf(HERO_RESET_CITIZENS)}</b> אזרחים
                      ו־<b className="nums">+{nf(HERO_RESET_TURNS)}</b> תורות
                    </li>
                    <li>
                      • כל איפוס מוסיף <b className="nums">+{HERO_RESET_POINTS}</b> נקודות
                      פתיחה לצמיתות: אחרי איפוס אחד מגיעים לרמה {HERO_MAX_LEVEL} עם{" "}
                      <b className="nums">{heroPointPool(HERO_MAX_LEVEL, 1)}</b> נקודות,
                      אחרי שניים עם <b className="nums">{heroPointPool(HERO_MAX_LEVEL, 2)}</b>
                    </li>
                    <li>
                      • הציוד הלבוש נשאר עליך וממשיך לפעול — אך חפץ שתסיר יינעל
                      בתיק עד שתחזור לרמתו
                    </li>
                    <li>• תג ↻ קבוע — ותוקפים שמנצחים אותך מקבלים יותר ניסיון</li>
                  </ul>
                </div>
                <div className="panel-gold rounded-xl p-4">
                  <p className="mb-1 flex items-center gap-2 font-black text-gold-bright">
                    <Icon name="shop" size={18} /> נקודות ותיק
                  </p>
                  <ul className="space-y-1 text-[11px] leading-relaxed text-zinc-300">
                    <li>• 1 נקודה = +1% התקפה / הגנה / תפוקת מכרות</li>
                    <li>
                      • התיק מחזיק <b className="nums">{HERO_BAG_CAPACITY}</b> חפצים לא לבושים —
                      תיק מלא חוסם שלל חדש
                    </li>
                    <li>
                      • איפוס הקצאת נקודות: <b className="nums">{HERO_POINTS_RESET_COST}</b>{" "}
                      יהלומים
                    </li>
                  </ul>
                </div>
              </div>
            </GuideSection>

            {/* ============================ 14 items ============================ */}
            <GuideSection meta={SECTIONS.items} index={INDEX.items}>
              <Lead>
                תשעה מקומות על הגיבור, כל אחד עם סטטיסטיקה משלו. חפץ נקבע לחלוטין
                מהמקום והרמה שלו — שני חפצים באותה משבצת ובאותה רמה זהים תמיד.
              </Lead>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
                {SLOT_ORDER.map((slot) => {
                  const meta = SLOT_META[slot];
                  const cap = itemPrimaryBonus(slot, HERO_MAX_LEVEL);
                  return (
                    <div key={slot} className="panel-inset rounded-xl p-2 text-center">
                      <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                        <span className="absolute text-2xl opacity-60" aria-hidden>
                          {meta.icon}
                        </span>
                        {/* the top set, matching the level-100 caps quoted below */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={heroItemArtPath(meta.slug, HERO_MAX_LEVEL)}
                          alt={meta.label}
                          loading="lazy"
                          className="relative h-full w-full object-contain"
                        />
                      </div>
                      <p className="mt-1 text-[11px] font-black text-bone-bright">{meta.label}</p>
                      <p className="text-[10px] text-zinc-500">
                        עד <span className="nums text-emerald-300">
                          {cap.flat ? `+${cap.value}` : `+${cap.value}%`}
                        </span>
                        {itemBonusLines(slot, HERO_MAX_LEVEL).filter((l) => !l.primary).length > 0 && (
                          <span className="mt-0.5 block text-[9px] text-zinc-600">
                            {"+ "}
                            {[
                              ...new Set(
                                itemBonusLines(slot, HERO_MAX_LEVEL)
                                  .filter((l) => !l.primary)
                                  .map((l) => l.label)
                              ),
                            ].join(" · ")}
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* the ten sets — one look per decade of item level */}
              <div className="panel-inset rounded-xl p-4">
                <p className="mb-2 text-sm font-black text-gold-bright">עשרת הסטים</p>
                <p className="mb-3 text-[11px] leading-relaxed text-zinc-400">
                  כל עשר רמות מתחלף הסט: תשעת החפצים מצוירים מחדש בחומר יקר יותר,
                  מעור ונחושת ועד לזהב לבן זוהר. הרמה קובעת את הבונוס — הסט קובע
                  איך זה נראה על הגיבור.
                </p>
                <div className="grid grid-cols-5 gap-2 lg:grid-cols-10">
                  {HERO_ITEM_SETS.map((set) => (
                    <div key={set.dir} className="text-center">
                      <div className="relative mx-auto flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={heroItemArtPath(SLOT_META.SWORD.slug, set.to)}
                          alt={set.label}
                          loading="lazy"
                          className="h-full w-full object-contain p-0.5"
                        />
                      </div>
                      <p className="mt-1 text-[10px] font-black text-bone-bright">{set.label}</p>
                      <p className="nums text-[10px] text-zinc-500" dir="ltr">
                        {set.from}–{set.to}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="panel-inset rounded-xl p-4">
                  <p className="mb-2 text-sm font-black text-gold-bright">דרגות איכות</p>
                  <p className="mb-3 text-[11px] leading-relaxed text-zinc-400">
                    הדרגה נגזרת מהרמה, והסדרה חוזרת על עצמה בכל עשור רמות: רמות 1–2
                    פשוט, 3–7 מתקדם, 8–9 אליט, 10 אגדי — ואז שוב, עשור אחד גבוה יותר.
                  </p>
                  <table className="guide-table">
                    <thead>
                      <tr>
                        <th className="text-right">דרגה</th>
                        <th className="text-right">מיקום בעשור</th>
                        <th className="text-right">סיכוי בתקיפה מנצחת</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RARITY_ORDER.map((r) => {
                        const chance = ITEM_DROP_CHANCE_BY_RARITY[r] * 100;
                        return (
                          <tr key={r}>
                            <td>
                              <span className={`flex items-center gap-2 font-black ${RARITY_META[r].tone}`}>
                                <span className="guide-rarity-dot" />
                                {RARITY_META[r].label}
                              </span>
                            </td>
                            <td className="nums text-zinc-400" dir="ltr">
                              {r === "COMMON" ? "1–2" : r === "RARE" ? "3–7" : r === "EPIC" ? "8–9" : "10"}
                            </td>
                            <td className="nums font-bold text-gold-bright" dir="ltr">
                              {Number.isInteger(chance) ? chance : chance.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td className="font-black text-bone-bright">סה״כ</td>
                        <td />
                        <td className="nums font-black text-emerald-300" dir="ltr">
                          {(ITEM_DROP_CHANCE * 100).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <Formula
                  label="הבונוס של חפץ — משאבים בסולם גיאומטרי, אחוזים בקו ישר"
                  expr={
                    <>
                      <V>ערך בדרגה 1</V>
                      <O>×</O>
                      <V>{flatCurveGrowth("resources")!.toFixed(3)}</V>
                      <sup className="text-gold-dim">דרגה − 1</sup>
                      <O>×</O>
                      <V>משקל (ראשי / משני)</V>
                    </>
                  }
                  legend={[
                    { term: "ראשי", desc: "הסטט שהמשבצת קיימת בשבילו — משקל מלא." },
                    {
                      term: "משני",
                      desc: "חצי מהמשקל במשבצת מתמחה (כפפות, שריון), או 0.35 ו־0.25 במשבצת שמפצלת בין שניים.",
                    },
                    {
                      term: "משאבים",
                      desc: `כל שדרוג מכפיל את הכמות פי ${flatCurveGrowth("resources")!.toFixed(3)} — אותם +${Math.round((flatCurveGrowth("resources")! - 1) * 100)}% בכל דרגה, מהראשונה ועד הארבעים. חפץ ראשי ברמה 1 נותן ${formatNumber(itemPrimaryBonus("RELIC", 1).value)} לעדכון רגיל, ברמה 50 כבר ${formatNumber(itemPrimaryBonus("RELIC", 50).value)}, וברמה 100 ${formatNumber(itemPrimaryBonus("RELIC", HERO_MAX_LEVEL).value)}. הסולם הזה עולה כמעט בדיוק בקצב שבו מחיר השדרוג עולה, ולכן הזהב קונה אותו ערך בכל נקודה בסולם.`,
                    },
                    {
                      term: "אחוזים",
                      desc: `לא בחזקה — 1% לכל דרגה, ישר: +${itemPrimaryBonus("SWORD", HERO_MAX_LEVEL).value}% ברמה 100 כראשי, +${itemStatBonus("GAUNTLETS", HERO_MAX_LEVEL, "defense")}% כמשני. אחוז שווה חלק יחסי מהצבא שלך, ולכן הוא הגיוני באותה מידה בכל רמה.`,
                    },
                    {
                      term: "אזרחים ותורות",
                      desc: `אלה לא רצים עם הכלכלה — בניין הגידול משלם כמות קבועה בכל עדכון יומי — ולכן הם עולים בחזקת הדרגה ובתקרה נמוכה בכוונה: נעליים רמה 1 נותנות ${itemStatBonus("BOOTS", 1, "citizens")} אזרחים, רמה 10 נותנות ${itemStatBonus("BOOTS", 10, "citizens")}, ורמה 100 נותנות ${itemPrimaryBonus("BOOTS", HERO_MAX_LEVEL).value}. חפץ לא אמור להחליף את הבניין שקיים בשביל זה.`,
                    },
                    {
                      term: "משאבים — שני כלים",
                      desc: `פרי שטן, מכנסיים ונעליים נותנים כמות קבועה בכל עדכון רגיל (עד +${formatNumber(itemPrimaryBonus("RELIC", HERO_MAX_LEVEL).value)}), וככל שהדרגה גבוהה יותר סוגי משאבים. לכל משבצת סדר משלה: פרי שטן פותח בזהב, מכנסיים בברזל, נעליים באבן. חרב ומגן פועלים הפוך — הם מכפילים את תפוקת כל המכרות באחוזים (עד +${itemStatBonus("SWORD", HERO_MAX_LEVEL, "resources")}%), קטן בהתחלה ומשמעותי בסוף.`,
                    },
                  ]}
                  example={
                    <>
                      פרי שטן ברמה <N>1</N> = דרגה <N>1</N> מתוך <N>40</N>, ובכל זאת{" "}
                      <R>+{formatNumber(itemPrimaryBonus("RELIC", 1).value)}</R> זהב בכל
                      עדכון רגיל — יותר ממה שמכרה של אימפריה בת עיר אחת מפיק. חרב ברמה{" "}
                      <N>50</N> = דרגה <N>20</N>, כלומר <N>חצי</N> מהתקרה באחוזים:{" "}
                      <R>+{itemPrimaryBonus("SWORD", 50).value}%</R> התקפה, ועוד{" "}
                      <R>+{itemStatBonus("SWORD", 50, "resources")}%</R> תפוקת מכרות ו־
                      <R>+{itemStatBonus("SWORD", 50, "citizens")}</R> אזרחים כמשניים;
                      אותה רמה בכנפיים = <R>+{itemPrimaryBonus("WINGS", 50).value}</R> תורות
                      בכל עדכון יומי.
                    </>
                  }
                />
              </div>

              <Formula
                label="מחיר שדרוג חפץ — סולם גיאומטרי"
                expr={
                  <>
                    <N>{formatShort(UPGRADE_COST_AT_LEVEL_10)}</N>
                    <O>×</O>
                    <N>{UPGRADE_COST_GROWTH.toFixed(4)}</N>
                    <sup className="text-gold-dim">(רמת יעד − 10)</sup>
                    <O>=</O>
                    <R>זהב</R>
                  </>
                }
                legend={[
                  { term: "העוגן התחתון", desc: `שדרוג לרמה 10 עולה ${formatShort(UPGRADE_COST_AT_LEVEL_10)} זהב.` },
                  { term: "העוגן העליון", desc: `שדרוג לרמה 100 עולה ${formatShort(UPGRADE_COST_AT_LEVEL_100)} זהב.` },
                  { term: "≈ ×3.95", desc: "לכל עשור רמות — לזהב של סוף המשחק יש מה לקנות." },
                ]}
              />

              <ItemUpgradeCalc />

              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/game/hero/items" className="btn btn-ghost px-4 py-2 text-sm">
                  <Icon name="spark" size={16} className="inline align-[-2px]" /> קטלוג החפצים המלא
                </Link>
                <Link href="/game/hero" className="btn btn-gold px-4 py-2 text-sm">
                  <Icon name="hero" size={16} className="inline align-[-2px]" /> לגיבור שלי
                </Link>
              </div>
            </GuideSection>

            {/* ============================ 15 potions ============================ */}
            <GuideSection meta={SECTIONS.potions} index={INDEX.potions}>
              <Lead>
                שיקוי הוא לא ציוד — הוא <b>חלון זמן שבו חוק אחד במשחק מתעקם</b>. נופל
                מתקיפות מנצחות בסיכוי{" "}
                <b className="nums">{Math.round(POTION_DROP_CHANCE * 100)}%</b>, ושתייה בזמן
                שהחלון כבר פתוח מאריכה אותו במקום לבזבז בקבוק.
              </Lead>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {POTION_KINDS.map((kind) => {
                  const meta = POTION_META[kind];
                  return (
                    <article
                      key={kind}
                      className="rounded-xl border p-4"
                      style={{
                        borderColor: `${meta.liquid.glow}55`,
                        background: `linear-gradient(180deg, ${meta.liquid.glow}18, rgba(10,9,12,0.9))`,
                      }}
                    >
                      <div className="mb-2 flex h-16 items-center justify-center" aria-hidden>
                        <div
                          className={`border ${POTION_SHAPE[meta.shape].className}`}
                          style={{
                            background: `linear-gradient(180deg, ${meta.liquid.from}, ${meta.liquid.to})`,
                            borderColor: `${meta.liquid.glow}88`,
                            boxShadow: `0 0 22px -4px ${meta.liquid.glow}`,
                            ...POTION_SHAPE[meta.shape].style,
                          }}
                        />
                      </div>
                      <p className={`text-center font-black ${meta.tone}`}>{meta.label}</p>
                      <p className="mt-0.5 text-center text-[11px] text-zinc-400">{meta.tagline}</p>
                      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                        {meta.description}
                      </p>
                      <p className="mt-2 text-center text-[11px] font-bold text-gold-bright">
                        משך: {potionDurationLabel(kind)}
                      </p>
                    </article>
                  );
                })}
              </div>
            </GuideSection>

            {/* ============================ 16 hero quests ============================ */}
            <GuideSection meta={SECTIONS.quests} index={INDEX.quests}>
              <Lead>
                בין קרב לקרב הגיבור לא חייב לשבת בבית. מסע שולח אותו לזמן אמת ומשלם
                כשהוא חוזר — <b>מסע אחד בכל פעם</b>, כי יש גיבור אחד. כל עיר שאתה מקים
                פותחת דרגה ארוכה יותר, מ<b>שעה</b> ועד <b>יממה</b>, והדרגות הישנות
                נשארות פתוחות.
              </Lead>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Fact
                  icon="quest"
                  label="מסעות בלוח"
                  value={HERO_QUESTS.length}
                  hint="דרגה אחת לכל עיר"
                  tone="text-gold-bright"
                />
                <Fact
                  icon="turns"
                  label="תורות לשעת מסע"
                  value={`${HERO_QUEST_TURNS_PER_HOUR_BASE}→${(
                    HERO_QUEST_TURNS_PER_HOUR_BASE -
                    HERO_QUEST_TURNS_PER_HOUR_DROP * (HERO_QUESTS.length - 1)
                  ).toFixed(1)}`}
                  hint="יורד עם הדרגה"
                  tone="text-emerald-300"
                />
                <Fact
                  icon="spark"
                  label="סיכוי לחפץ"
                  value={`${Math.round(HERO_QUESTS[0].itemChance * 100)}–${Math.round(
                    HERO_QUESTS[HERO_QUESTS.length - 1].itemChance * 100
                  )}%`}
                  hint="הגרלה נפרדת לשיקוי"
                  tone="text-violet-300"
                />
                <Fact
                  icon="heart"
                  label="הבונוסים של הגיבור"
                  value="פועלים"
                  hint="גם כשהוא בדרכים"
                  tone="text-red-300"
                />
              </div>

              <Formula
                label="השלל של מסע"
                expr={
                  <>
                    <V>תשלום לשעה</V>
                    <O>×</O>
                    <V>שעות המסע</V>
                    <O>×</O>
                    <N>{HERO_QUEST_REWARD_CITY_MULTIPLIER}</N>
                    <sup className="text-gold-dim">(ערים−1)</sup>
                    <O>×</O>
                    <V>צמיחת העונה</V>
                    <O>×</O>
                    <V>מזל המסע</V>
                    <O>=</O>
                    <R>שלל</R>
                  </>
                }
                legend={[
                  {
                    term: "אין מספר שאפשר לראות מראש",
                    desc: "הלוח לא מציג שלל, וזה לא הסתרה: השלל מוגרל ברגע היציאה. אותה דרגה, אותה אימפריה, אותו יום — ובכל זאת שני מסעות לא יחזרו עם אותו שק.",
                  },
                  {
                    term: "לפי ערים, לא לפי דרגה",
                    desc: "הממוצע נגזר ממספר הערים שלך — לכן כל הדרגות משלמות אותו ממוצע לשעה, ומסע של שעה לא מתיישן לעולם.",
                  },
                  {
                    term: "מזל המסע",
                    desc: "מגלגל פעם אחת לכל יציאה, מ-×0.55 ועד ×3.6, ואותה טבלה בדיוק לכל הדרגות — מסע ארוך לא קונה מזל טוב יותר, רק יותר שעות.",
                  },
                  {
                    term: "וגם בתוך השק",
                    desc: "כל משאב מתנדנד בנפרד, ובכל מסע יש משאב אחד שחזר בשפע ואחד שכמעט לא חזר — לכן היחס בין זהב לעץ אף פעם לא נראה אותו דבר.",
                  },
                  {
                    term: "מה קונות הדרגות הארוכות",
                    desc: "פחות תורות לכל שעת מסע, וסיכויי שלל גבוהים בהרבה בסיום.",
                  },
                  {
                    term: "אזרחים ועבדים",
                    desc: `גדלים לפי ערים (×${HERO_QUEST_PEOPLE_CITY_MULTIPLIER}) אבל לא לפי יום העונה, ומהמזל הם מקבלים רק את השורש — הם משאבים במרחק צעד אחד, ומסע לא אמור להיות הדרך לאכלס עיר.`,
                  },
                ]}
                example={
                  <>
                    מסע של <b>{heroQuestDurationLabel(3)}</b> מביא בממוצע פי שלושה ממסע
                    של שעה באותן ערים — אבל שעה עם <b>מזל אגדי</b> תכה בקלות שלוש שעות
                    של דרך קשה.
                  </>
                }
              />

              <TableWrap>
                <table className="guide-table w-full text-right text-[0.78rem]">
                  <thead>
                    <tr>
                      <th>מזל המסע</th>
                      <th>סיכוי</th>
                      <th>מכפיל השלל</th>
                      <th>מה זה אומר</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HERO_QUEST_FORTUNES.map((band) => (
                      <tr key={band.key}>
                        <td className="whitespace-nowrap font-bold text-bone">
                          {band.label}
                        </td>
                        <td className="nums" dir="ltr">
                          {Math.round(
                            (band.weight /
                              HERO_QUEST_FORTUNES.reduce((sum, f) => sum + f.weight, 0)) *
                              100
                          )}
                          %
                        </td>
                        <td className="nums text-gold-bright" dir="ltr">
                          ×{band.min}–×{band.max}
                        </td>
                        <td className="text-zinc-400">{band.lore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>

              <TableWrap maxHeight={420}>
                <table className="guide-table w-full text-right text-[0.78rem]">
                  <thead>
                    <tr>
                      <th>מסע</th>
                      <th>משך</th>
                      <th>תורות</th>
                      <th>תורות לשעה</th>
                      <th>ניסיון</th>
                      <th>חפץ / שיקוי</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HERO_QUESTS.map((quest) => (
                      <tr key={quest.key}>
                        <td className="whitespace-nowrap">
                          <span aria-hidden className="ms-1">
                            {quest.sigil}
                          </span>
                          {quest.name}
                        </td>
                        <td className="nums" dir="ltr">
                          {heroQuestDurationLabel(quest.tier)}
                        </td>
                        <td className="nums" dir="ltr">
                          {nf(heroQuestTurnCost(quest.tier))}
                        </td>
                        <td className="nums text-zinc-400" dir="ltr">
                          {(heroQuestTurnCost(quest.tier) / quest.hours).toFixed(1)}
                        </td>
                        <td className="nums text-gold-bright" dir="ltr">
                          {nf(heroQuestXp(quest.tier))}
                        </td>
                        <td className="nums text-violet-300" dir="ltr">
                          {Math.round(quest.itemChance * 100)}% /{" "}
                          {Math.round(quest.potionChance * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>

              <Note tone="green" icon="quest">
                שליחה עולה תורות בלבד — הגיבור <b>ממשיך להעניק את כל הבונוסים שלו</b> גם
                בזמן שהוא בדרכים, ומסע שכבר יצא לדרך מסתיים גם אם הגיבור נופל בינתיים.
                מה שהוא לא יכול לעשות זה לצאת למסע כשהוא מת.
              </Note>

              <Note tone="gold" icon="hero">
                השלל מוגרל ונחתם ברגע היציאה — האימפריה שממנה שלחת אותו היא זו שמשלמת,
                גם אם הקמת (או איבדת) עיר בזמן שהוא היה בדרך. מה שהוגרל שמור אצל הגיבור
                בלבד: אין דרך להציץ בשק לפני שהוא נכנס בשער, ואין דרך לגלגל אותו מחדש.
              </Note>
            </GuideSection>

            {/* ============================ 17 bosses ============================ */}
            <GuideSection meta={SECTIONS.bosses} index={INDEX.bosses}>
              <Lead>
                לכל אחת מעשר דרגות הערים יש שליט אחד — קיר PvE שכוחו{" "}
                <b>פומבי וקבוע</b>. לוחצים <b>תקיפה</b> פעם אחת, והצבא יוצא לקרב של{" "}
                <b className="nums">{BOSS_SORTIE_ROUNDS}</b> סבבים שרץ כ־
                <b className="nums">{Math.round(BOSS_ASSAULT_DURATION_MS / 1000)}</b> שניות
                בזמן אמת. אפשר לצפות, ואפשר לעבור לדף אחר ולהמשיך לשחק — כשהקרב נגמר מגיעה
                הודעה עם כל השלל. לבוס יש <b>מאגר חיים שנשמר בין תקיפות</b>, וכשהוא נופל הוא
                קם לתחייה אחרי{" "}
                <b className="nums">{Math.round(BOSS_REVIVE_MS / 60000)}</b> דקות.
              </Lead>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Fact
                  icon="attack"
                  label="כוח שליט העיר הראשונה"
                  value={formatShort(BOSS_BASE_POWER * tunables.boss.powerMultiplier)}
                  hint={`×${BOSS_POWER_TIER_MULTIPLIER} בכל דרגת עיר`}
                  tone="text-red-300"
                />
                <Fact
                  icon="heart"
                  label="מאגר חיים"
                  value={`×${BOSS_HP_PER_POWER}`}
                  hint="מהכוח שלו — נשמר בין תקיפות"
                  tone="text-bone-bright"
                />
                <Fact
                  icon="turns"
                  label="תורות לתקיפה"
                  value={`${BOSS_TURN_COST_BASE}+`}
                  hint="+200 לכל דרגת עיר · אין מכסת תקיפות"
                  tone="text-emerald-300"
                />
                <Fact
                  icon="hero"
                  label="סיכוי קריאה נכונה"
                  value={`${Math.round(BOSS_READ_CHANCE_BASE * 100)}–${Math.round(BOSS_READ_CHANCE_MAX * 100)}%`}
                  hint="לפי רמת הגיבור — זה מה שהוא תורם לקרב"
                  tone="text-purple-300"
                />
              </div>

              {/* The whole skill of the fight is these three lines. */}
              <div className="grid gap-2 sm:grid-cols-3">
                {(["SMASH", "SWEEP", "EXPOSED"] as const).map((move) => {
                  const meta = BOSS_MOVE_META[move];
                  const counter = BOSS_TACTIC_META[BOSS_MOVE_COUNTER[move]];
                  return (
                    <div key={move} className="panel-gold rounded-xl p-4">
                      <p className={`flex items-center gap-2 font-black ${meta.tone}`}>
                        <span aria-hidden className="text-lg">
                          {meta.icon}
                        </span>
                        {meta.label}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                        {meta.telegraph}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                        <span aria-hidden>{counter.icon}</span> התשובה הנכונה: {counter.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <Formula
                label="חלוקת השלל של המחזור"
                expr={
                  <>
                    <N>{Math.round(BOSS_CHIP_SHARE * 100)}%</N>
                    <O>×</O>
                    <O>(</O>
                    <V>הנזק שגרמת</V>
                    <O>÷</O>
                    <V>מאגר החיים</V>
                    <O>)</O>
                    <O>+</O>
                    <N>{Math.round(BOSS_KILL_SHARE * 100)}%</N>
                    <O>×</O>
                    <V>דירוג ההפלה</V>
                  </>
                }
                legend={[
                  {
                    term: "שלל בדרך",
                    desc: `${Math.round(BOSS_CHIP_SHARE * 100)}% מהשלל משולם לפי הנזק שהספקת לגרום — גם בתקיפה שלא הפילה אותו. תקיפה שלא סיימה את העבודה עדיין משתלמת.`,
                  },
                  {
                    term: "אוצר ההפלה",
                    desc: `${Math.round(BOSS_KILL_SHARE * 100)}% נשמרים למכה שמפילה אותו, וגדלים עד ×${BOSS_GRADE_BONUS.S} בדירוג S — שנקבע לפי הקריאות הנכונות והצבא ששרד, ודורש לפחות ${BOSS_GRADE_MIN_DECISIONS} סבבים: הפלה במכה אחת לא מגיעה ל־S.`,
                  },
                  {
                    term: "אבדות לפי הכוח",
                    desc: `האבדות נגבות ביחס לכוח שלך מול כוח הבוס: צבא בחצי מהכוח משלם חצי מהמחיר בדם, בדיוק כמו שהוא מקבל בערך חצי מהשלל. מתחת ל־${Math.round(BOSS_LOSS_ENGAGEMENT_FLOOR * 100)}% מכוח הבוס המחיר נעצר ולא יורד יותר — אבל אף פעם לא תשלם מחיר מלא על נגיסה קטנה.`,
                  },
                  {
                    term: "שבירת הצבא",
                    desc: `אם הצבא מאבד ${Math.round(BOSS_ROUT_LOSS_FRACTION * 100)}% מכוחו הוא נסוג באמצע הקרב, ו-${Math.round((1 - BOSS_ROUT_LOOT_PENALTY) * 100)}% מהשלל שנצבר אובד. בפועל זה מאיים רק על צבא שנלחם מול בוס בסדר הגודל שלו.`,
                  },
                  {
                    term: "אין מכסה",
                    desc: `אפשר לתקוף שוב ושוב — התורות הן הגבול היחיד. השלל חסום ע\"י מאגר החיים, כך שתקיפות נוספות קונות התקדמות, לא כפל שלל. בוס שנופל חוזר אחרי ${Math.round(BOSS_REVIVE_MS / 60000)} דקות עם מאגר חדש.`,
                  },
                  {
                    term: "ציוד מובטח",
                    desc: `שליט שנופל מפיל תמיד חפץ — ברצפת דרגה ${RARITY_META[BOSS_ITEM_RARITY_FLOOR].label} ומעלה, ובדירוג S דרגה אחת מעל זה.`,
                  },
                  {
                    term: "ניסיון",
                    desc: `${BOSS_HERO_XP_BASE} + 250 לכל דרגת עיר, על אותה חלוקה כמו השלל.`,
                  },
                ]}
              />

              <BossLadder
                powerMultiplier={tunables.boss.powerMultiplier}
                rewardMultiplier={tunables.boss.rewardMultiplier}
                hpMultiplier={tunables.boss.hpMultiplier}
              />

              <Note tone="gold" icon="rankings">
                כל {CITY_BOSSES.length} השליטים מוצגים בדף{" "}
                <Link href="/game/rankings" className="text-gold underline">
                  הדירוג
                </Link>{" "}
                עם הכוח המדויק שלהם — אפשר לתכנן מולם מראש. מד הזעם של הגיבור נטען בכל סבב,
                וברגע שהוא מתמלא הגיבור משתחרר מעצמו במכה אחת גדולה.
              </Note>

              <Note tone="red" icon="heart" title="אל תשלח צבא בלי גיבור">
                גיבור מת לא קורא את השליט ולא משחרר זעם: הקריאה יורדת מ־
                {Math.round(BOSS_READ_CHANCE_BASE * 100)}–{Math.round(BOSS_READ_CHANCE_MAX * 100)}%
                לניחוש עיוור של{" "}
                <b className="nums">{Math.round(BOSS_READ_CHANCE_NO_HERO * 100)}%</b> — אחד
                משלושה — וכל סבב שנקרא לא נכון גם מכפיל את האבדות. תחייה לפני התקיפה, לא
                אחריה.
              </Note>
            </GuideSection>

            {/* ============================ 18 guild ============================ */}
            <GuideSection meta={SECTIONS.guild} index={INDEX.guild}>
              <Lead>
                ברית היא כוח משותף. הקמה עולה{" "}
                <b className="nums">{GUILD_CREATION_COST_DIAMONDS}</b> יהלומים, והיא נותנת
                שני דברים שונים לגמרי: <b>קסמים</b> אישיים ל־{GUILD_SPELL_BUFF_HOURS} שעות,
                ו<b>עזרה פסיבית</b> שמחזקת כל חבר בכל קרב.
              </Lead>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {GUILD_SPELL_TYPES.map((type) => {
                  const meta = GUILD_SPELL_META[type];
                  return (
                    <div key={type} className="panel-gold rounded-xl p-4">
                      <p className="flex items-center gap-2 font-black text-gold-bright">
                        <Icon name={meta.icon} size={18} className="text-crimson-bright" />
                        {meta.label}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                        {meta.description}
                      </p>
                      <p className="mt-2 text-[11px] text-emerald-300">
                        {meta.effectLabel(GUILD_SPELL_MAX_LEVEL)} (בשיא)
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Formula
                  label="קסם ברית"
                  expr={
                    <>
                      <V>רמת הקסם</V>
                      <O>=</O>
                      <V>אחוז הבונוס</V>
                      <O>·</O>
                      <V>הטלה</V>
                      <O>=</O>
                      <N>10</N>
                      <O>+</O>
                      <V>אחוז</V>
                      <O>×</O>
                      <N>2</N>
                      <V> יהלומים</V>
                    </>
                  }
                  legend={[
                    { term: "תקרה", desc: `${GUILD_SPELL_MAX_LEVEL}% — רמת הקסם היא הבונוס עצמו.` },
                    { term: "שדרוג", desc: `${nf(spellUpgradeCostDiamonds(1))} יהלומים לרמה 2, וכן הלאה (40 × הרמה הבאה).` },
                    { term: "הטלה בשיא", desc: `${spellCastCostDiamonds(GUILD_SPELL_MAX_LEVEL)} יהלומים ל־${GUILD_SPELL_BUFF_HOURS} שעות.` },
                  ]}
                />
                <Formula
                  label="עזרת ברית (פסיבית)"
                  expr={
                    <>
                      <V>רמת עזרה %</V>
                      <O>×</O>
                      <V>הכוח הצבאי הכולל של הברית</V>
                      <O>=</O>
                      <R>כוח קבוע לכל חבר</R>
                    </>
                  }
                  legend={[
                    { term: "תקרה", desc: `${GUILD_AID_MAX_LEVEL}% מכוח הברית כולה.` },
                    { term: "מתי", desc: "גם בתקיפה וגם בהגנה, מתווסף אחרי כל המכפילים." },
                    { term: "מחיר", desc: `${formatShort(aidUpgradeCostGold(0))} זהב לרמה הראשונה — כל חבר יכול לשלם.` },
                  ]}
                />
              </div>

              <TableWrap>
                <table className="guide-table">
                  <thead>
                    <tr>
                      <th className="text-right">רמת הרחבה</th>
                      <th className="text-right">מקומות בברית</th>
                      <th className="text-right">עלות ההרחבה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 3, 5, 7, 9].map((lvl) => (
                      <tr key={lvl}>
                        <td className="nums" dir="ltr">
                          {lvl}
                        </td>
                        <td className="nums font-bold text-bone-bright" dir="ltr">
                          {guildCapacity(lvl)}
                        </td>
                        <td>
                          <Cost amounts={[{ key: "gold", value: capacityUpgradeCostGold(lvl) }]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>

              <Note tone="gold" icon="guild" title="בנק הברית">
                לברית יש קופת זהב משותפת: כל חבר מפקיד ומושך בחופשיות, וכל תנועה נרשמת
                בפנקס עם שם האימפריה. מנהיג בודד שעוזב — הברית מתפרקת והזהב מוחזר.
              </Note>

              <Note tone="gold" icon="guild" title="אין תקיפות בין חברי ברית">
                חבר לברית אינו יעד: כפתור התקיפה בפרופיל שלו כבוי, וגם שליחה ישירה
                נחסמת. הסיבה פשוטה — עזרת הברית והקסמים מחזקים את שני הצדדים, כך שקרב
                פנימי הוא שוד של הכוח שלכם עצמכם. <b>ריגול ודואר</b> נשארים פתוחים,
                ומי שעוזב את הברית חוזר להיות יעד לגיטימי.
              </Note>
            </GuideSection>

            {/* ============================ 19 chat ============================ */}
            <GuideSection meta={SECTIONS.chat} index={INDEX.chat}>
              <Lead>
                בפינה השמאלית התחתונה של כל מסך יושב <b>הצ׳אט</b>. הוא לא דף אלא חלונית
                צפה: אפשר לדבר תוך כדי בנייה, תקיפה או קריאת דוח, והיא נשארת פתוחה גם
                כשעוברים מסך. שתי לשוניות — <b>החדר הפומבי</b> שכל השרת רואה, ו
                <b>שיחות פרטיות</b> אחד על אחד.
              </Lead>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Fact
                  icon="chat"
                  label="אורך הודעה"
                  value={CHAT_BODY_MAX}
                  hint="תווים — צעקה, לא מכתב"
                />
                <Fact
                  icon="messages"
                  label="נמען פרטי"
                  value="כל שחקן"
                  hint="חיפוש לפי שם, בלי צורך לתפוס אותו מרגל"
                  tone="text-purple-300"
                />
                <Fact
                  icon="turns"
                  label="נקודה ירוקה"
                  value={`${Math.round(PRESENCE_ONLINE_MS / 60000)} דק׳`}
                  hint="מאז שהמשחק היה פתוח אצלו — גם ליד כל שם בדירוג"
                  tone="text-emerald-300"
                />
                <Fact
                  icon="spark"
                  label="קצב"
                  value={`${CHAT_BURST_LIMIT}/${Math.round(CHAT_BURST_WINDOW_MS / 1000)}ש׳`}
                  hint="בלם הצפה — ראה למטה"
                  tone="text-bone-bright"
                />
              </div>

              <Formula
                label="מה מותר לשלוח"
                expr={
                  <>
                    <N>{CHAT_BURST_LIMIT}</N>
                    <O> הודעות ב־</O>
                    <N>{Math.round(CHAT_BURST_WINDOW_MS / 1000)}</N>
                    <O> שניות</O>
                    <O>·</O>
                    <N>{CHAT_GLOBAL_LIMIT}</N>
                    <V> בחדר לדקה</V>
                    <O>·</O>
                    <N>{CHAT_DIRECT_LIMIT}</N>
                    <V> בפרטי לדקה</V>
                    <O>·</O>
                    <N>{CHAT_PAIR_LIMIT}</N>
                    <V> לאותו שחקן</V>
                  </>
                }
                legend={[
                  {
                    term: "שתי מכסות",
                    desc: `הבלם המהיר עוצר הדבקה בלולאה, ומכסת הדקה עוצרת הצפה מתמשכת. לחדר ולשיחות פרטיות מכסות נפרדות — שיחה ארוכה לא גוזלת את הזכות שלך לדבר בחדר.`,
                  },
                  {
                    term: "מכסה לכל שיחה",
                    desc: `${CHAT_PAIR_LIMIT} הודעות בדקה לכל בן שיח, כדי שלא יהיה אפשר להפנות דקה שלמה לשחקן אחד. המכסה נספרת על הצמד, אז החלפת תפקידים לא מאפסת אותה.`,
                  },
                  {
                    term: "כפילות",
                    desc: `אותה הודעה בדיוק לאותו יעד חסומה ל־${Math.round(CHAT_REPEAT_WINDOW_MS / 1000)} שניות. אותן מילים בחדר ובשיחה פרטית נחשבות לשתי אמירות שונות.`,
                  },
                  {
                    term: "מי מקליד",
                    desc: "מתחת לחלונית רואים בזמן אמת מי כותב עכשיו — בחדר ובשיחה — והנקודה ליד השם מראה מי מחובר.",
                  },
                ]}
              />

              <Note tone="purple" icon="messages" title="צ׳אט מול תיבת הדואר">
                שני ערוצים שונים בכוונה. הצ׳אט הוא שיחה חיה וקצרה שנקראת עכשיו; תיבת
                ההודעות בסרגל העליון היא הארכיון — דוחות קרב, ריגול, שלל של שליטי ערים
                והודעות ארוכות, שממתינות שם עד שתקרא אותן. הודעה פרטית בצ׳אט מדליקה מונה
                על הלשונית, לא בתיבה.
              </Note>

              <Note tone="red" icon="shield" title="מנהל יכול להסתיר שורה">
                הסתרה, לא מחיקה: השורה נעלמת מהחדר של כולם ונרשמת ביומן הניהול עם השם של
                מי שהסתיר אותה. שחקן חסום לא מופיע ברשימה ואי אפשר לכתוב אליו.
              </Note>
            </GuideSection>

            {/* ============================ 20 community ============================ */}
            <GuideSection meta={SECTIONS.community} index={INDEX.community}>
              <Lead>
                מחוץ למשחק יש ערוץ דיסקורד — שם יושבות ההכרזות, גיוס לבריתות, שאלות
                טקטיקה ודיווחי באגים. אפשר לשחק בלעדיו לגמרי; פשוט תדעו על Happy Hour
                אחרי כולם.
              </Lead>

              <div className="grid gap-3 sm:grid-cols-2">
                {COMMUNITY_HIGHLIGHTS.map((item) => (
                  <div key={item.title} className="panel-inset rounded-xl p-4">
                    <p className="flex items-center gap-2 font-black text-gold-bright">
                      <Icon
                        name={item.icon}
                        size={17}
                        className="shrink-0 text-crimson-bright"
                      />
                      {item.title}
                    </p>
                    <p className="mt-1 text-[0.8rem] leading-relaxed text-zinc-400">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>

              <Note tone="green" icon="gift" title="מתנת הצטרפות חד־פעמית">
                אימפריה שמצטרפת לערוץ אוספת <b className="nums">{DISCORD_JOIN_DIAMONDS}</b>{" "}
                יהלומים, פעם אחת בחיי החשבון. אין בוט שבודק — הכפתור עובד על אמון.
                מתנת פתיחה, כל עוד הערוץ צעיר. הכפתור נמצא בעמוד הקהילה.
              </Note>

              <Note tone="red" icon="shield" title="אף אחד מהצוות לא יבקש סיסמה">
                לא בדיסקורד, לא בצ׳אט של המשחק ולא בהודעה פרטית. כל בקשה כזו — גם אם היא
                מגיעה משם שנראה מוכר — היא ניסיון גניבת חשבון. אותו כלל חל על קודי אימות
                ופרטי תשלום.
              </Note>

              <div className="flex justify-center">
                <Link href="/game/community" className="btn btn-gold px-5 py-2 text-sm">
                  <Icon name="discord" size={16} className="inline align-[-2px]" /> לעמוד הקהילה
                </Link>
              </div>
            </GuideSection>

            {/* ============================ 21 rewards ============================ */}
            <GuideSection meta={SECTIONS.rewards} index={INDEX.rewards}>
              <Lead>
                שלושה מקורות פרסים שמתחדשים מעצמם — כולם על אותו שעון של העדכון היומי,
                וכולם גדלים ככל שהעונה מתקדמת.
              </Lead>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="panel-gold rounded-xl p-4">
                  <p className="mb-2 flex items-center gap-2 font-black text-gold-bright">
                    <Icon name="wheel" size={18} /> גלגל המזל
                  </p>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    <b className="nums">{tunables.daily.wheelSpins}</b> סיבובים בכל עדכון
                    יומי, נצברים בלי הגבלה — שבוע היעדרות לא מבזבז כלום.{" "}
                    {WHEEL_PRIZES.length} פרסים בשני מסלולי גדילה: ארבעת המשאבים פותחים ב־
                    <b className="nums">{nf(WHEEL_RESOURCE_BASE)}</b> כל אחד{" "}
                    <b>ומכפילים את עצמם כל יום</b> (עד <b className="nums">{WHEEL_MAX_DOUBLINGS}</b>{" "}
                    הכפלות), והיהלומים והאזרחים פותחים ב־
                    <b className="nums">{WHEEL_PREMIUM_BASE}</b> ועולים ב־
                    <b className="nums">{WHEEL_PREMIUM_STEP}</b> בכל עדכון יומי — שני הווג׳ים
                    האלה משלמים תמיד את אותו מספר בדיוק.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {WHEEL_PRIZES.map((p) => (
                      <span
                        key={p.key}
                        className="flex items-center gap-1 rounded border border-border-subtle bg-black/40 px-2 py-0.5 text-[10px] font-bold text-zinc-300"
                      >
                        <Icon name={p.icon} size={11} className="text-gold" />
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="panel-gold rounded-xl p-4">
                  <p className="mb-2 flex items-center gap-2 font-black text-gold-bright">
                    <Icon name="gift" size={18} /> דרך התהילה
                  </p>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    <b className="nums">{SEASON_PASS_TIER_COUNT}</b> דרגות, כל אחת ב־
                    <b className="nums">{SEASON_PASS_XP_PER_TIER}</b> נקודות ניסיון —{" "}
                    <b className="nums">{SEASON_PASS_TIER_COUNT * SEASON_PASS_XP_PER_TIER}</b> לסבב
                    מלא. הסולם <b>מתאפס בכל עדכון יומי</b>, כלומר שני סבבים מלאים ביום.
                    הפרסים גדלים ב־
                    <b className="nums">{Math.round(SEASON_PASS_DAILY_GROWTH * 100)}%</b> מהבסיס
                    בכל יום עונה. המסלול הפרימיום נקנה פעם אחת לעונה ב־
                    <b className="nums">{nf(SEASON_PASS_PREMIUM_PRICE)}</b> יהלומים.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] sm:grid-cols-3">
                    {(
                      [
                        ["תקיפה", SEASON_PASS_XP.attack],
                        ["קרב בוס", SEASON_PASS_XP.bossFight],
                        ["ייסוד עיר", SEASON_PASS_XP.foundCity],
                        ["שדרוג אימפריה", SEASON_PASS_XP.empireUpgrade],
                        ["ריגול", SEASON_PASS_XP.spy],
                        ["מיני־משחק", SEASON_PASS_XP.miniGame],
                      ] as const
                    ).map(([label, xp]) => (
                      <span
                        key={label}
                        className="flex items-center justify-between rounded bg-black/40 px-2 py-1"
                      >
                        <span className="text-zinc-400">{label}</span>
                        <b className="nums text-gold-bright">+{xp}</b>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Note tone="purple" icon="dice" title="מיני־משחקים">
                  אירועים שהמנהלים פותחים בזמן אמת — &quot;מצא את הכדור&quot; (הרם את הכוס
                  הנכונה) ו&quot;פריצת הכספת&quot; (פצח קוד סודי; כל ניסיון מסמן איזו ספרה
                  נכונה במקומה, איזו נכונה במקום אחר ואיזו לא בקוד כלל). חלון האירוע קופץ
                  מעל כל מסך, עם לוח מתחרים חי וחבילת פרסים.
                </Note>
                <Note tone="gold" icon="achievements" title="הישגים">
                  ציוני דרך שנפתחים מעצמם תוך כדי משחק ומחכים לאיסוף. תג זהוב בסרגל
                  העליון אומר שיש פרס שממתין —{" "}
                  <Link href="/game/achievements" className="text-gold underline">
                    לדף ההישגים
                  </Link>
                  .
                </Note>
              </div>
            </GuideSection>

            {/* ============================ 22 diamonds ============================ */}
            <GuideSection meta={SECTIONS.diamonds} index={INDEX.diamonds}>
              <Lead>
                יהלומים הם המטבע הנדיר. הם לא נופלים ממכרות, לא מהעונה ולא מחפצי
                הגיבור — רק מווג׳ אחד בגלגל המזל ומרכישה אמיתית. לכן כל הוצאה
                שלהם היא החלטה.
              </Lead>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Fact
                  icon="turns"
                  label="חבילת תורות"
                  value={`${TURN_PACKAGES[0].cost}💎`}
                  hint={`${TURN_PACKAGES[0].turns} תורות · עד ${nf(TURN_PACKAGES[TURN_PACKAGES.length - 1].turns)} בחבילה הגדולה`}
                />
                <Fact
                  icon="mine"
                  label="בוסט תפוקה"
                  value={`${BOOST_STEP_COST}💎`}
                  hint={`+${BOOST_STEP_PCT}% למשאב, עד +${BOOST_MAX_PCT}% ל־24 שעות`}
                  tone="text-emerald-300"
                />
                <Fact
                  icon="heart"
                  label="החייאת גיבור"
                  value={`${HERO_REVIVE_COST}💎`}
                  hint="בעמוד הגיבור בלבד, כשהוא מת — החלופה חינם, רק צריך סבלנות"
                  tone="text-red-300"
                />
                <Fact
                  icon="guild"
                  label="הקמת ברית"
                  value={`${GUILD_CREATION_COST_DIAMONDS}💎`}
                  hint="ואז קסמים והרחבות"
                  tone="text-purple-300"
                />
                <Fact
                  icon="base"
                  label="קסם ירידת עיר"
                  value={`${CITY_DOWNGRADE_COST}💎`}
                  hint={`עיר אחת בלבד למטה · מעיר ${CITY_DOWNGRADE_MIN_CITIES} ומעלה · אחת ל־${CITY_DOWNGRADE_COOLDOWN_HOURS} שעה · בלי החזר`}
                  tone="text-crimson-bright"
                />
                {SHIELDS.map((shield) => (
                  <Fact
                    key={shield.key}
                    icon="shield"
                    label={shield.label}
                    value={`${shield.durations[0].cost}💎`}
                    hint={`${shield.durations[0].hours} שעות · ${shield.durations[1].cost}💎 ל־${shield.durations[1].hours} שעות`}
                    tone="text-emerald-300"
                  />
                ))}
              </div>

              <Note tone="green" icon="shield" title="מה מגן באמת קונה לך">
                מגן משאבים ומגן חיילים לא הופכים אותך לבלתי ניתן לתקיפה — הם מוציאים
                את הרכוש מהישג ידו של התוקף: מי שינצח אותך לא ייקח משאבים (מגן
                משאבים) ולא ישעבד חיילים (מגן חיילים). הקרב עצמו עדיין מתרחש, הגיבור
                שלך עדיין סופג, והתוקף עדיין מרוויח ניסיון. כל שחקן בעיר רואה
                בדירוג שיש לך מגן — וזה בדיוק מה שמרתיע תוקפים מלבזבז עליך תורות.
              </Note>

              <Note tone="red" icon="turns" title="אי אפשר לחיות מאחורי מגן">
                מגן לא ניתן לחידוש ולא להארכה כל עוד הוא פעיל — צריך לתת לו להיגמר,
                ואז עוברות עוד <b className="nums">{SHIELD_RENEW_COOLDOWN_MINUTES}</b>{" "}
                דקות שבהן אתה חשוף לגמרי לפני שאפשר לקנות מחדש. זה מכוון: מגנים רצופים
                היו הופכים שחקן משלם לבלתי ניתן לתקיפה לצמיתות, וחלון החשיפה הזה הוא
                ההזדמנות של שאר העיר. אם אתה מתכנן להיות מוגן — שים לב מתי המגן נגמר,
                כי בדיוק אז תוקפים ממתינים.
              </Note>

              <Note tone="green" icon="diamond" title="למה יש רק ווג׳ אחד של יהלומים">
                דרך התהילה ושליטי הערים לא מחלקים יהלומים בכוונה, והגלגל מחלק אותם
                מווג׳ יחיד שעולה לאט: <b className="nums">{WHEEL_PREMIUM_BASE}</b> ביום
                הראשון, ועוד <b className="nums">{WHEEL_PREMIUM_STEP}</b> בכל עדכון יומי —
                אותה כמות בדיוק כמו ווג׳ האזרחים. בכוונה זה המסלול הזוחל ולא הכפלה כמו
                המשאבים: מקור חוזר ומתפוצץ של מטבע פרימיום היה מרוקן מתוכן כל מה שנקנה
                בו.
              </Note>

              <div className="flex justify-center">
                <Link href="/game/diamonds" className="btn btn-gold px-5 py-2 text-sm">
                  <Icon name="diamond" size={16} className="inline align-[-2px]" /> לחנות היהלומים
                </Link>
              </div>
            </GuideSection>

            {/* ============================ 23 roadmap ============================ */}
            <GuideSection meta={SECTIONS.roadmap} index={INDEX.roadmap}>
              <Lead>
                אם אתה לא יודע מה לעשות עכשיו — זה הסדר שעובד. כל שלב פותח את הבא אחריו.
              </Lead>

              <ol className="space-y-3">
                {[
                  {
                    title: "48 השעות הראשונות — בונים, לא נלחמים",
                    body: "אתה מוגן. נצל את זה: הצב את כל עבדי המכרות, שדרג מכרות (כל אחד במשאב שלו), והשאר את התורות לצבירה. תקיפה ראשונה שוברת את המגן.",
                  },
                  {
                    title: "רוקן את מאגר האזרחים בכל עדכון",
                    body: "אזרח שיושב סתם הוא תפוקה שלא קרתה. חלק אותם: עבדי מכרות לכלכלה, חיילים להגנה, מרגלים למודיעין.",
                  },
                  {
                    title: "שדרג את המחסנים לפני שיש מה לגנוב",
                    body: "מחסן מלא הוא ביטוח. תוקף לוקח רק מהיתרה הזמינה — מה שמאוחסן לא נוגעים בו.",
                  },
                  {
                    title: "הבנק לפני הנשק",
                    body: "ריבית עובדת פעמיים ביום, בריבית דריבית, גם כשאתה ישן. זהב שיושב זמין לא עושה כלום ורק מסכן אותך.",
                  },
                  {
                    title: "פתח דרגות נשק — הן משותפות",
                    body: "פתיחה אחת מקדמת התקפה, הגנה וריגול יחד. כל 4 דרגות תצטרך לעלות עיר ורמת גיבור גבוהה יותר, אז העיר והגיבור הם התנאי האמיתי.",
                  },
                  {
                    title: "בחר יעדים חכם — לא חלשים",
                    body: "הניסיון של הגיבור נגזר מיחס הכוחות: לרמוס חלש משלם מינימום. יריב שקול או חזק ממך משלם עד פי שניים.",
                  },
                  {
                    title: "עיר, ואז שליט העיר",
                    body: "כל עיר מכפילה את כל הכלכלה שלך. אחריה מגיע השליט: אין מכסת תקיפות ואין צורך להפיל אותו במכה אחת — כל יציאה מורידה מהחיים שלו ומשלמת שלל לפי הנזק, וההפלה עצמה מוסיפה את הפרס הגדול וחפץ מובטח.",
                  },
                  {
                    title: "הצטרף לברית",
                    body: "עזרת ברית פסיבית מחזקת אותך בכל קרב בלי לעשות כלום, והקסמים נותנים עד 30% נוספים ל־24 שעות.",
                  },
                ].map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="guide-num shrink-0" aria-hidden>
                      <span className="nums">{i + 1}</span>
                    </span>
                    <div className="panel-inset flex-1 rounded-xl px-4 py-3">
                      <p className="font-black text-gold-bright">{step.title}</p>
                      <p className="mt-0.5 text-[0.8rem] leading-relaxed text-zinc-400">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Link href="/game/base" className="btn btn-gold px-5 py-2 text-sm">
                  <Icon name="base" size={16} className="inline align-[-2px]" /> חזרה לבסיס
                </Link>
                <Link href="/game/rankings" className="btn btn-ghost px-5 py-2 text-sm">
                  <Icon name="rankings" size={16} className="inline align-[-2px]" /> למצוא יעד
                </Link>
              </div>
            </GuideSection>
          </div>
        </div>
      </div>
    </div>
  );
}
