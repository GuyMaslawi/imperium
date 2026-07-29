import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DuelBar } from "@/components/ui/Meter";
import {
  getEmpireAttackPower,
  getEmpireDefensePower,
  getEmpireSpyPower,
  getEmpireGeneralPower,
} from "@/lib/game/power";
import { formatNumber, formatDate } from "@/lib/game/format";
import { cityName } from "@/lib/game/cities";
import { RankActions } from "@/components/game/RankActions";
import { MessageCompose } from "@/components/game/MessageCompose";
import { ShieldBadges } from "@/components/game/ShieldBadges";
import { getActiveShields } from "@/lib/game/diamondEffects";
import { SHIELDS } from "@/lib/game/diamondShop";
import { LivingPortrait } from "@/components/game/LivingPortrait";
import { HeroPaperdoll } from "@/components/game/HeroPaperdoll";
import type { HeroItemView } from "@/components/game/heroItemView";
import {
  HERO_CLASS_META,
  HERO_STAT_META,
  RARITY_META,
  SLOT_META,
  SLOT_ORDER,
  heroClassImage,
  itemDisplayName,
  itemPrimaryBonus,
  slotPrimaryStat,
  tierForLevel,
} from "@/lib/game/hero";

export const metadata = { title: "פרופיל אימפריה | אימפריום" };

export default async function EmpireProfilePage({
  params,
}: {
  params: Promise<{ empireId: string }>;
}) {
  const { empireId } = await params;
  const myEmpire = await requireEmpire();

  const empire = await prisma.empire.findUnique({
    where: { id: empireId },
    include: {
      army: true,
      user: true,
      season: true,
      weapons: true,
      hero: { include: { items: { where: { equipped: true } } } },
      guildMembership: { include: { guild: true } },
    },
  });
  if (!empire) notFound();

  const hero = empire.hero;
  const heroLevel = hero?.level ?? 1;
  const heroResets = hero?.resets ?? 0;
  const heroClassKey = hero?.heroClass ?? "WARLORD";
  const equippedBySlot = new Map((hero?.items ?? []).map((item) => [item.slot, item]));
  // The paperdoll is a client component, so the rows have to cross as plain
  // data. Tier is always derived from level — never read off the row.
  const equippedView: HeroItemView[] = (hero?.items ?? []).map(({ id, slot, level }) => ({
    id,
    slot,
    level,
    rarity: tierForLevel(level),
  }));

  const isMe = empire.id === myEmpire.id;
  // Espionage and combat are confined to your own city — an empire is "in your
  // city" when it holds the same number of cities as you.
  const sameCity = empire.cities === myEmpire.cities;
  const canEngage = !isMe && sameCity;

  // Power figures and population are intel, and this page never reveals them:
  // a rival's strength is learned by spying on him or by fighting him, and the
  // resulting report lives on the report itself — not cached on his dossier.
  // Only your own profile shows its numbers.
  const showDetails = isMe;
  const generalPower = getEmpireGeneralPower(empire.army, empire.weapons);
  const attackPower = getEmpireAttackPower(empire.army, empire.weapons);
  const defensePower = getEmpireDefensePower(empire.army, empire.weapons);
  const spyPowerValue = getEmpireSpyPower(empire.army, empire.weapons);

  const powerRows = [
    { icon: <Icon name="attack" size={16} className="inline-block align-middle text-red-400" />, label: "כוח התקפה", value: attackPower, tone: "text-red-400" },
    { icon: <Icon name="shield" size={16} className="inline-block align-middle text-sky-300" />, label: "כוח הגנה", value: defensePower, tone: "text-sky-300" },
    { icon: <Icon name="spy" size={16} className="inline-block align-middle text-gold" />, label: "כוח מודיעין", value: spyPowerValue, tone: "text-gold" },
    { icon: <Icon name="crown" size={16} className="inline-block align-middle text-gold-bright" />, label: "כוח כללי", value: generalPower, tone: "text-gold-bright" },
  ];

  const duelTotal = attackPower + defensePower;
  const attackShare = duelTotal > 0 ? (attackPower / duelTotal) * 100 : 50;

  const guildName = empire.guildMembership?.guild.name ?? null;

  // Raid shields are public knowledge — no spy report needed. Knowing there is
  // nothing to take is precisely what should stop you wasting turns here.
  const shields = await getActiveShields(empire.id);
  const activeShields = SHIELDS.filter((s) => shields[s.key] !== null);

  // Treasury, army, power and population are all intelligence — the exact
  // figures a spy mission is paid to bring back — so the tile row exists only
  // on your own dossier. A rival's level and ruler are already on the banner
  // and in the intel card below it; two lonely tiles only bought dead panel.
  //
  // Five tiles, so the track must be 1 or 5 wide: any other count leaves empty
  // cells at the end of the last row.
  const publicStats = showDetails
    ? [
        // "רמה" here means the hero's level. `empire.level` is a column nothing
        // in the game increments, so it showed 1 on every honest profile.
        { label: "רמת גיבור", value: formatNumber(heroLevel), tone: "text-gold-bright" },
        { label: "זהב", value: <><Icon name="gold" size={14} className="inline-block align-middle text-gold-bright" /> {formatNumber(Math.floor(empire.gold))}</>, tone: "text-gold-bright" },
        { label: "חיילים", value: <><Icon name="army" size={14} className="inline-block align-middle" /> {formatNumber(empire.army?.soldiers ?? 0)}</>, tone: "text-zinc-100" },
        { label: "כוח כללי", value: <><Icon name="spark" size={14} className="inline-block align-middle" /> {formatNumber(generalPower)}</>, tone: "text-gold" },
        { label: "אזרחים", value: formatNumber(empire.citizens), tone: "text-zinc-100" },
      ]
    : [];

  // What a stranger's dossier does and does not carry, stated on the page
  // itself. Without it the profile just looks thin, and a player has no way to
  // tell "this empire is weak" from "this figure is being withheld".
  const openBook: { icon: IconName; text: string }[] = [
    { icon: "base", text: `העיר שבה יושבת האימפריה — ${cityName(empire.cities)}` },
    { icon: "guild", text: guildName ? `הברית: ${guildName}` : "השתייכות לברית (ללא ברית כרגע)" },
    { icon: "attack", text: `מחלקת הגיבור ורמתו — ${HERO_CLASS_META[heroClassKey].label}, רמה ${heroLevel}` },
    {
      icon: "shield",
      text:
        activeShields.length > 0
          ? `מגני פשיטה פעילים: ${activeShields.map((s) => s.label).join(" ו")} — ניצחון עליה לא יניב שלל או שבויים`
          : "מגני פשיטה — כרגע אין לה מגן פעיל, כך ששלל ושבויים זמינים",
    },
  ];
  const dossierFacts: { label: string; value: ReactNode }[] = [
    { label: "שליט", value: empire.user.name },
    {
      label: "האימפריה נוסדה",
      value: (
        <span className="nums" dir="ltr">
          {formatDate(empire.createdAt)}
        </span>
      ),
    },
    ...(empire.season ? [{ label: "עונה", value: empire.season.name }] : []),
    {
      label: "ברית",
      value: guildName ? (
        <span className="inline-flex items-center gap-1 text-gold-bright">
          <Icon name="guild" size={14} /> {guildName}
        </span>
      ) : (
        <span className="text-zinc-500">ללא ברית</span>
      ),
    },
  ];

  const sealed: { icon: IconName; text: string }[] = [
    { icon: "spark", text: "כוח התקפה, הגנה, מודיעין וכוח כללי" },
    { icon: "army", text: "גודל הצבא, המרגלים ועבדי המכרות" },
    { icon: "gold", text: "האוצר, המשאבים והבנק" },
    { icon: "crown", text: "ציוד הגיבור שהוא לובש" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeading title="פרופיל" ornament={<Icon name="crown" size={22} className="text-crimson" />} />

      {/* An empire outside your city is off-limits: no spying, no attacking. */}
      {!isMe && !sameCity && (
        <div className="panel-inset rounded-xl p-4 text-center text-sm text-zinc-400">
          <Icon name="shield" size={16} className="mb-1 inline-block align-[-3px] text-gold-dim" />{" "}
          אימפריה זו יושבת ב
          <span className="font-bold text-bone">{cityName(empire.cities)}</span> (
          <span className="nums" dir="ltr">
            {empire.cities}
          </span>{" "}
          ערים) — לא ניתן לרגל או לתקוף אותה. ניתן לפעול רק נגד אימפריות בעיר שלך.
        </div>
      )}

      {/* -------- command bar: attack actions live on top, ready to fire --------
          Shown on every dossier but your own, not only on attackable ones: mail
          crosses cities and levels even where turns cannot, so the message
          button must survive the `canEngage` gate that guards the war actions. */}
      {!isMe && (
        <div className="panel-gold rounded-xl p-4">
          {/* Spelled out above the buttons, not just as a pill: turns spent on a
              shielded target buy XP and loot rolls, but never spoils. */}
          {canEngage && activeShields.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <ShieldBadges shields={shields} />
              <span>
                לאימפריה הזו {activeShields.map((s) => s.label).join(" ו")} — ניצחון
                עליה לא יניב{" "}
                {activeShields.map((s) => (s.key === "resources" ? "שלל" : "שבויים")).join(" או ")}
                . התקיפה עצמה עדיין אפשרית (ניסיון, חפצים ושיקויים).
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {canEngage ? (
              <RankActions
                targetEmpireId={empire.id}
                currentTurns={myEmpire.turns}
              />
            ) : (
              <p className="max-w-md text-sm text-zinc-400">
                אין כאן פעולות מלחמה — האימפריה הזו יושבת בעיר אחרת. דואר, לעומת
                זאת, עובר בכל מצב: אפשר לכתוב לכל שחקן במשחק, בכל עיר ובכל רמה.
              </p>
            )}
            <div className="flex flex-col items-stretch gap-2">
              <MessageCompose
                lockedRecipient={{ id: empire.id, name: empire.name }}
                triggerLabel="שלח הודעה"
              />
              {/* decorative auto-attack control (not yet available) */}
              {canEngage && (
              <div className="flex items-center justify-end gap-2 text-xs text-zinc-500">
                <span>תקיפה אוטומטית</span>
                <span className="nums rounded-md border border-border-subtle bg-panel-inset px-2 py-1 font-bold text-zinc-300" dir="ltr">
                  10 ✕
                </span>
                <button
                  type="button"
                  disabled
                  title="תקיפה אוטומטית תתווסף בהמשך."
                  className="btn btn-ghost px-3 py-1 text-xs"
                >
                  הפעל · בקרוב
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------- hero banner -------- */}
      <div className="panel-gold rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gold/50 bg-gradient-to-b from-gold-deep/40 to-black text-4xl">
              <LivingPortrait
                src={heroClassImage(heroClassKey)}
                alt={HERO_CLASS_META[heroClassKey].label}
                className="absolute inset-0"
                accent={HERO_CLASS_META[heroClassKey].accent}
                tilt={3}
                drift={22}
              />
              <span
                className="nums absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-gold/50 bg-black px-2 text-[10px] font-bold text-gold-bright"
                dir="ltr"
              >
                רמה {heroLevel}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gold-bright">
                {empire.name}
                {isMe && (
                  <span className="mr-2 align-middle rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold">
                    זו האימפריה שלך
                  </span>
                )}
              </h2>
              {/* Class, then the seat — the same two facts the ladder row now
                  carries under the name, so the dossier reads as its expansion. */}
              <p className="mt-0.5 text-sm text-zinc-400">
                {HERO_CLASS_META[heroClassKey].label} · עיר{" "}
                <span className="font-bold text-bone">{cityName(empire.cities)}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {showDetails && (
                  <span className="nums inline-flex items-center gap-1 rounded-md border border-gold/40 bg-panel-inset px-2 py-0.5 font-bold text-gold" dir="ltr">
                    <Icon name="spark" size={14} /> {formatNumber(generalPower)}
                  </span>
                )}
                {/* The level itself is on the portrait badge — this pill only
                    carries what the badge has no room for: how many times the
                    hero has hit 100 and started over. */}
                {heroResets > 0 && (
                  <span
                    className="nums inline-flex items-center gap-1 rounded-md border border-purple-400/50 bg-purple-950/60 px-2 py-0.5 font-bold text-purple-300"
                    title={`הגיבור הגיע לרמה 100 ואופס ${heroResets} פעמים`}
                  >
                    איפוס ×{heroResets}
                  </span>
                )}
                {/* Real health, and only on your own dossier — it used to be a
                    hardcoded 100 on every profile, which read as a fact about
                    the target while telling you nothing. A rival's remaining
                    health is combat intel like the rest. */}
                {isMe && (
                  <span className="nums inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-bold text-red-400" dir="ltr">
                    {hero?.health ?? 100} <Icon name="heart" size={14} />
                  </span>
                )}
                {guildName && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2 py-0.5 font-bold text-gold-bright"
                    title="הברית של השחקן"
                  >
                    <Icon name="guild" size={14} /> {guildName}
                  </span>
                )}
                <ShieldBadges shields={shields} size="md" />
              </div>
            </div>
          </div>

          {/* The dossier facts, folded into the banner's other half. They used
              to sit in a "תיאור שחקן" card at the foot of the page, which left
              this side of the banner as a wide empty band. */}
          <dl className="grid flex-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:max-w-xl">
            {dossierFacts.map((fact) => (
              <div
                key={fact.label}
                className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2"
              >
                <dt className="whitespace-nowrap text-xs text-zinc-400">{fact.label}</dt>
                <dd className="min-w-0 truncate font-medium text-zinc-100">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* -------- your own stat tiles -------- */}
      {publicStats.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-5">
          {publicStats.map((stat) => (
            <div key={stat.label} className="panel rounded-xl p-4">
              <p className="text-xs text-zinc-400">{stat.label}</p>
              <p className={`nums mt-1 text-lg font-bold ${stat.tone}`} dir="ltr">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* -------- what this dossier does and does not carry --------
          A rival's page is deliberately thin, so it says so out loud: which
          facts are open, which are sealed, and what buys the sealed ones. It
          also takes the slot the power breakdown used to fill, so the removal
          leaves no hole. */}
      {!isMe && (
        <div className="panel-gold rounded-xl p-4 md:p-5">
          <h3 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <Icon name="spy" size={20} className="text-crimson-bright" />
            מה התיק הזה מגלה
          </h3>
          <div className="rule-gold my-3" />
          <div className="grid gap-4 md:grid-cols-2">
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">
                גלוי לכל
              </p>
              <ul className="space-y-1.5 text-sm text-zinc-300">
                {openBook.map((row) => (
                  <li key={row.text} className="flex items-start gap-2">
                    <Icon
                      name={row.icon}
                      size={14}
                      className="mt-0.5 shrink-0 text-emerald-400"
                    />
                    <span>{row.text}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="md:border-s md:border-border-subtle md:ps-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-crimson-bright/80">
                חתום — נחשף רק בשטח
              </p>
              <ul className="space-y-1.5 text-sm text-zinc-400">
                {sealed.map((row) => (
                  <li key={row.text} className="flex items-start gap-2">
                    <Icon
                      name={row.icon}
                      size={14}
                      className="mt-0.5 shrink-0 text-zinc-600"
                    />
                    <span>{row.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <p className="mt-4 border-t border-border-subtle pt-3 text-xs leading-relaxed text-zinc-400">
            {canEngage ? (
              <>
                <Icon name="spy" size={14} className="inline-block align-[-2px] text-gold" />{" "}
                <span className="font-bold text-bone">כדי לדעת כמה הוא חזק — רגל או תקוף.</span>{" "}
                ריגול מוצלח מחזיר תיק מלא עם הצבא, המשאבים והציוד; תקיפה מגלה את
                יחסי הכוחות בשדה. הממצאים נשמרים בדוח עצמו תחת{" "}
                <Link href="/game/reports" className="font-semibold text-gold hover:text-gold-bright">
                  הדוחות
                </Link>{" "}
                — ולא כאן, כך שתיק ישן לא ממשיך לחשוף אותו.
              </>
            ) : (
              <>
                <Icon name="shield" size={14} className="inline-block align-[-2px] text-gold-dim" />{" "}
                אימפריה זו יושבת בעיר אחרת, כך שאי אפשר לרגל או לתקוף אותה — ולכן
                כוחה יישאר חתום עד שתגיעו לאותה עיר.
              </>
            )}
          </p>
        </div>
      )}

      {/* -------- power breakdown --------
          Own empire only — not even an empty placeholder on a rival's dossier.
          His strength is learned in the field, by a spy mission or by trading
          blows with him, and it lives on that report. */}
      {showDetails && (
        <div className="panel rounded-xl p-4">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <Icon name="spark" size={20} className="text-crimson-bright" />
            כוח האימפריה
          </h3>
          <dl className="space-y-2.5 text-sm">
            {powerRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-border-subtle pb-2.5 last:border-0"
              >
                <dt className="text-zinc-400">
                  {row.icon} {row.label}
                </dt>
                <dd className={`nums font-bold ${row.tone}`} dir="ltr">
                  {formatNumber(row.value)}
                </dd>
              </div>
            ))}
          </dl>

          {/* attack vs defence duel bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-red-400"><Icon name="attack" size={14} className="inline-block align-middle" /> התקפה</span>
              <span className="text-sky-300">הגנה <Icon name="shield" size={14} className="inline-block align-middle" /></span>
            </div>
            <DuelBar leftPct={attackShare} />
          </div>

          <Link
            href="/game/weapons"
            className="mt-4 inline-block text-sm font-semibold text-gold hover:text-gold-bright"
          >
            ניהול נשקים ←
          </Link>
        </div>
      )}

      {/* -------- hero equipment -------- */}
      {/*
        Behind the same gate as the power breakdown above. Each ItemTile
        publishes the item's rarity, level and exact bonus value, so the nine
        slots together give the item component of the target's attack/defence
        multiplier — the figure a spy mission is paid to bring back.
      */}
      {showDetails && (
      <div className="panel rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <Icon name="attack" size={20} className="text-crimson-bright" />
            ציוד הגיבור
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-panel-inset px-2.5 py-0.5 text-xs font-bold text-gold">
            <Icon name="attack" size={14} /> גיבור רמה{" "}
            <span className="nums" dir="ltr">
              {heroLevel}
            </span>
            {heroResets > 0 && (
              <span className="nums text-purple-300" dir="ltr">
                ↻×{heroResets}
              </span>
            )}
          </span>
        </div>
        {/* The same figure the hero page draws, only smaller: nine pieces worn
            on the body rather than a detached row of tiles. A dossier is a
            picture of an empire, and the hero is the one part of it that has a
            face — a flat 9-wide strip said what he owns without ever showing
            him. Read-only: dressing him stays on the hero page. */}
        {/* The sockets carry a 54px floor, so a frame much under 240px is all
            medallion and no hero. */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:items-start">
          <div className="mx-auto w-full max-w-[240px]">
            <HeroPaperdoll
              readOnly
              portrait={heroClassImage(heroClassKey)}
              portraitAlt={HERO_CLASS_META[heroClassKey].label}
              portraitAccent={HERO_CLASS_META[heroClassKey].accent}
              equipped={equippedView}
              heroLevel={heroLevel}
            />
          </div>

          {/* The roster beside him — what each socket actually holds, in words.
              The figure answers "how is he kitted out?" at a glance; this
              answers "with what, exactly?" without a hover on every medallion. */}
          <ul className="grid gap-x-4 gap-y-1.5 self-center text-sm sm:grid-cols-2">
            {SLOT_ORDER.map((slot) => {
              const meta = SLOT_META[slot];
              const item = equippedBySlot.get(slot);
              const stat = HERO_STAT_META[slotPrimaryStat(slot)];
              if (!item) {
                return (
                  <li
                    key={slot}
                    className="flex items-center justify-between gap-2 border-b border-border-subtle pb-1.5 text-zinc-600"
                  >
                    <span className="truncate">
                      <span aria-hidden className="opacity-40">{meta.icon}</span> {meta.label}
                    </span>
                    <span className="shrink-0 text-xs">ריק</span>
                  </li>
                );
              }
              const bonus = itemPrimaryBonus(slot, item.level);
              const tier = RARITY_META[tierForLevel(item.level)];
              return (
                <li
                  key={slot}
                  className="flex items-center justify-between gap-2 border-b border-border-subtle pb-1.5"
                >
                  <span className="min-w-0 truncate">
                    <span aria-hidden>{meta.icon}</span>{" "}
                    <span className={`font-semibold ${tier.tone}`}>
                      {itemDisplayName(slot, item.level)}
                    </span>{" "}
                    <span className="nums text-xs text-zinc-500" dir="ltr">
                      Lv {item.level}
                    </span>
                  </span>
                  <span className="nums shrink-0 text-xs font-bold text-emerald-400" dir="ltr">
                    +{Math.round(bonus.value)}
                    {bonus.flat ? "" : "%"}{" "}
                    <Icon name={stat.icon} size={12} className="inline align-[-2px]" />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        {equippedBySlot.size === 0 && (
          <p className="mt-3 text-xs text-zinc-600">
            הגיבור שלך עדיין לא לובש ציוד — לכוד חפצים בתקיפות ולבש אותם בעמוד
            הגיבור.
          </p>
        )}
        {equippedBySlot.size > 0 && (
          <Link
            href="/game/hero"
            className="mt-3 inline-block text-sm font-semibold text-gold hover:text-gold-bright"
          >
            ניהול הגיבור ←
          </Link>
        )}
      </div>
      )}

    </div>
  );
}
