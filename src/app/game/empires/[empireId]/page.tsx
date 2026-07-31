import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { cityName } from "@/lib/game/cities";
import { RankActions } from "@/components/game/RankActions";
import { MessageCompose } from "@/components/game/MessageCompose";
import { ShieldBadges } from "@/components/game/ShieldBadges";
import { ActivePotions } from "@/components/game/ActivePotions";
import { getActiveShields } from "@/lib/game/diamondEffects";
import { sharedGuild } from "@/lib/game/guildAllies";
import { getActivePotionExpiries } from "@/lib/game/potionEffects";
import { SHIELDS } from "@/lib/game/diamondShop";
import { HeroPaperdoll } from "@/components/game/HeroPaperdoll";
import type { HeroItemView } from "@/components/game/heroItemView";
import { formatNumber, formatDate } from "@/lib/game/format";
import {
  HERO_CLASS_META,
  heroClassImage,
  tierForLevel,
} from "@/lib/game/hero";

export const metadata = { title: "פרופיל אימפריה | קראלדור" };

/** The four plunder columns of a battle report, in the order the game shows them. */
const LOOT = [
  { key: "stolenGold", label: "זהב", icon: "gold", tone: "text-gold-bright" },
  { key: "stolenWood", label: "עץ", icon: "wood", tone: "text-amber-600" },
  { key: "stolenIron", label: "ברזל", icon: "iron", tone: "text-slate-300" },
  { key: "stolenStone", label: "אבן", icon: "stone", tone: "text-stone-400" },
] as const;

/**
 * The whole war between two empires, in numbers: every raid either of them ever
 * launched at the other, summed.
 *
 * Both directions are read the same way — plunder only ever moves attacker-ward,
 * so "what he took from me" is simply the aggregate of the rows where *he* is
 * the attacker. Wins are counted separately from raids: a lost raid still costs
 * turns and still belongs in the tally, it just came home empty.
 */
async function loadFeud(meId: string, foeId: string) {
  const sums = {
    stolenGold: true,
    stolenWood: true,
    stolenIron: true,
    stolenStone: true,
    enslavedSoldiers: true,
  } as const;

  const [mine, theirs, myWins, theirWins] = await Promise.all([
    prisma.battleReport.aggregate({
      where: { attackerEmpireId: meId, defenderEmpireId: foeId },
      _sum: sums,
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.battleReport.aggregate({
      where: { attackerEmpireId: foeId, defenderEmpireId: meId },
      _sum: sums,
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.battleReport.count({
      where: { attackerEmpireId: meId, defenderEmpireId: foeId, winnerEmpireId: meId },
    }),
    prisma.battleReport.count({
      where: { attackerEmpireId: foeId, defenderEmpireId: meId, winnerEmpireId: foeId },
    }),
  ]);

  const side = (
    agg: typeof mine,
    wins: number
  ) => ({
    raids: agg._count._all,
    wins,
    last: agg._max.createdAt,
    captives: Math.floor(agg._sum.enslavedSoldiers ?? 0),
    loot: {
      stolenGold: Math.floor(agg._sum.stolenGold ?? 0),
      stolenWood: Math.floor(agg._sum.stolenWood ?? 0),
      stolenIron: Math.floor(agg._sum.stolenIron ?? 0),
      stolenStone: Math.floor(agg._sum.stolenStone ?? 0),
    },
  });

  return { mine: side(mine, myWins), theirs: side(theirs, theirWins) };
}

/**
 * A dossier is one panel: the hero, what he wears, and the buttons you came to
 * press. The banner, the stat tiles, the power breakdown and the "what this
 * dossier reveals" card all used to stack above it, and between them they said
 * less than the figure itself does — a rival's numbers are intel, learned by
 * spying or fighting, and they live on that report rather than here.
 */
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
      user: true,
      hero: { include: { items: { where: { equipped: true } } } },
    },
  });
  if (!empire) notFound();

  const hero = empire.hero;
  const heroLevel = hero?.level ?? 1;
  const heroResets = hero?.resets ?? 0;
  const heroClassKey = hero?.heroClass ?? "WARLORD";
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
  // Guildmates never raid each other (see lib/game/guildAllies.ts). Only the
  // attack half is off — a spy mission against an ally still runs.
  const allied = isMe ? null : await sharedGuild(myEmpire.id, empire.id);

  // Raid shields are public knowledge — no spy report needed. Knowing there is
  // nothing to take is precisely what should stop you wasting turns here.
  const shields = await getActiveShields(empire.id);
  const activeShields = SHIELDS.filter((s) => shields[s.key] !== null);

  // Running brews are the other half of that intel: a defender under שיקוי
  // החסינות will not lose a scratch of hero health to your raid, and one under
  // שיקוי השפע is farming twice as fast as the ladder makes him look. Public,
  // like shields — knowing what is in force is exactly what should decide
  // whether this hour is the hour to hit him.
  const now = new Date();
  const potionExpiries = isMe
    ? {}
    : await getActivePotionExpiries(empire.id, undefined, now);
  const potionActiveUntil = Object.fromEntries(
    Object.entries(potionExpiries).map(([kind, at]) => [kind, at.getTime()])
  );
  const potionsRunning = Object.keys(potionActiveUntil).length > 0;

  // The dossier's own history: everything the two of you ever took off each other.
  const feud = isMe ? null : await loadFeud(myEmpire.id, empire.id);
  const foughtBefore = feud !== null && feud.mine.raids + feud.theirs.raids > 0;
  // The newer of the two sides' last raid — whichever of you swung most recently.
  const lastClash = [feud?.mine.last, feud?.theirs.last]
    .filter((d): d is Date => d instanceof Date)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <div className="space-y-6">
      {/* With the banner gone, the heading is what names the empire. */}
      <SectionHeading
        title={empire.name}
        subtitle={`${empire.user.name} · ${cityName(empire.cities)}`}
        ornament={<Icon name="crown" size={22} className="text-crimson" />}
      />

      <div className="panel rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <Icon name="attack" size={20} className="text-crimson-bright" />
            הגיבור וציודו
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

        {/* Figure at the start edge, war actions filling the band beside it —
            the space the paperdoll's 320px cap leaves open on desktop. Below
            `lg` they stack, buttons under the hero. */}
        <div className="flex flex-wrap items-start gap-6">
          {/* The sockets carry a 54px floor, so a frame much under 240px is all
              medallion and no hero. Read-only: dressing him stays on the hero
              page. */}
          <div className="w-full max-w-[320px]">
            <HeroPaperdoll
              readOnly
              portrait={heroClassImage(heroClassKey)}
              portraitAlt={HERO_CLASS_META[heroClassKey].label}
              portraitAccent={HERO_CLASS_META[heroClassKey].accent}
              equipped={equippedView}
              heroLevel={heroLevel}
            />
            {equippedView.length === 0 && (
              <p className="mt-3 text-xs text-zinc-600">
                {isMe
                  ? "הגיבור שלך עדיין לא לובש ציוד — לכוד חפצים בתקיפות ולבש אותם בעמוד הגיבור."
                  : "הגיבור הזה יוצא לקרב בלי ציוד — תשעת הסלוטים שלו ריקים."}
              </p>
            )}
            {isMe && equippedView.length > 0 && (
              <Link
                href="/game/hero"
                className="mt-3 inline-block text-sm font-semibold text-gold hover:text-gold-bright"
              >
                ניהול הגיבור ←
              </Link>
            )}
          </div>

          {/* -------- war actions, on every dossier but your own --------
              Mail crosses cities and levels even where turns cannot, so the
              message button survives the `canEngage` gate that guards the rest. */}
          {!isMe && (
            <div className="min-w-[240px] flex-1 space-y-3">
              {/* Spelled out above the buttons, not just as a pill: turns spent
                  on a shielded target buy XP and loot rolls, but never spoils. */}
              {/* An ally is announced before anything else on the dossier —
                  it is the reason the attack button is dead. */}
              {allied && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold-bright">
                  <Icon name="guild" size={14} />
                  <span>
                    בן ברית — שניכם חברים בברית {allied.name}. אין תקיפות בין חברי
                    ברית
                    {canEngage ? "; ריגול ודואר עדיין פתוחים." : "."}
                  </span>
                </div>
              )}

              {canEngage && activeShields.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  <ShieldBadges shields={shields} />
                  <span>
                    לאימפריה הזו {activeShields.map((s) => s.label).join(" ו")} — ניצחון
                    עליה לא יניב{" "}
                    {activeShields
                      .map((s) => (s.key === "resources" ? "שלל" : "שבויים"))
                      .join(" או ")}
                    . התקיפה עצמה עדיין אפשרית (ניסיון, חפצים ושיקויים).
                  </span>
                </div>
              )}

              {/* What is bent in his favour right now, and for how much longer.
                  The strip counts itself down and refreshes the page when a
                  window closes, so the dossier never claims a dead buff. */}
              <div className="rounded-lg border border-border-subtle bg-panel-inset px-3 py-2">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  <Icon name="potion" size={14} className="text-violet-300" />
                  שיקויים פעילים
                </p>
                {potionsRunning ? (
                  <ActivePotions
                    activeUntil={potionActiveUntil}
                    serverNow={now.getTime()}
                    href={null}
                  />
                ) : (
                  <p className="text-xs text-zinc-500">
                    אין שיקוי פעיל — הוא נלחם בלי חיזוקים כרגע.
                  </p>
                )}
              </div>

              {canEngage ? (
                <RankActions
                  targetEmpireId={empire.id}
                  currentTurns={myEmpire.turns}
                  attackBlockedReason={allied ? "בן ברית — אין תקיפה" : null}
                />
              ) : (
                <p className="text-sm text-zinc-400">
                  אין כאן פעולות מלחמה — האימפריה הזו יושבת בעיר אחרת. דואר, לעומת
                  זאת, עובר בכל מצב: אפשר לכתוב לכל שחקן במשחק, בכל עיר ובכל רמה.
                </p>
              )}

              <MessageCompose
                lockedRecipient={{ id: empire.id, name: empire.name }}
                triggerLabel="שלח הודעה"
              />
            </div>
          )}
        </div>
      </div>

      {/* -------- the ledger of the feud --------
          A rival's dossier used to end at his hero, which said nothing about
          the one thing that actually makes him *your* rival: what the two of
          you have taken off each other. Every raid ever launched in either
          direction, summed per resource, from your side of the field. */}
      {feud && (
        <div className="panel rounded-xl p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
              <Icon name="gold" size={20} className="text-gold-bright" />
              מאזן הביזה ביניכם
            </h3>
            {lastClash && (
              <span className="text-xs text-zinc-500">
                עימות אחרון: {formatDate(lastClash)}
              </span>
            )}
          </div>

          {!foughtBefore ? (
            <p className="text-sm text-zinc-400">
              עוד לא נפגשתם בשדה הקרב — אף אחד מכם לא לקח מהשני דבר.
              {canEngage && " התקיפה הראשונה פתוחה מכאן."}
            </p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="panel-inset rounded-lg p-3">
                  <p className="text-[11px] text-zinc-400">תקפתי אותו</p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-400">
                    <span className="nums" dir="ltr">
                      {feud.mine.raids}
                    </span>{" "}
                    תקיפות ·{" "}
                    <span className="nums" dir="ltr">
                      {feud.mine.wins}
                    </span>{" "}
                    ניצחונות
                  </p>
                </div>
                <div className="panel-inset rounded-lg p-3">
                  <p className="text-[11px] text-zinc-400">הוא תקף אותי</p>
                  <p className="mt-0.5 text-sm font-bold text-red-400">
                    <span className="nums" dir="ltr">
                      {feud.theirs.raids}
                    </span>{" "}
                    תקיפות ·{" "}
                    <span className="nums" dir="ltr">
                      {feud.theirs.wins}
                    </span>{" "}
                    ניצחונות
                  </p>
                </div>
              </div>

              {/* Four narrow number columns will not fold onto a phone, so the
                  table scrolls inside its own box rather than pushing the page
                  sideways. */}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[360px] text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
                      <th className="px-2 py-1.5 text-start font-bold">משאב</th>
                      <th className="px-2 py-1.5 text-end font-bold">לקחתי ממנו</th>
                      <th className="px-2 py-1.5 text-end font-bold">לקח ממני</th>
                      <th className="px-2 py-1.5 text-end font-bold">מאזן</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LOOT.map((res) => {
                      const took = feud.mine.loot[res.key];
                      const lost = feud.theirs.loot[res.key];
                      const net = took - lost;
                      return (
                        <tr key={res.key} className="border-t border-border-subtle">
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            <Icon
                              name={res.icon}
                              size={14}
                              className={`inline-block align-middle ${res.tone}`}
                            />{" "}
                            {res.label}
                          </td>
                          <td className="nums px-2 py-1.5 text-end font-bold text-emerald-400" dir="ltr">
                            {took > 0 ? `+${formatNumber(took)}` : "—"}
                          </td>
                          <td className="nums px-2 py-1.5 text-end font-bold text-red-400" dir="ltr">
                            {lost > 0 ? `−${formatNumber(lost)}` : "—"}
                          </td>
                          <td
                            className={`nums px-2 py-1.5 text-end font-black ${
                              net > 0
                                ? "text-emerald-400"
                                : net < 0
                                  ? "text-red-400"
                                  : "text-zinc-500"
                            }`}
                            dir="ltr"
                          >
                            {net === 0
                              ? "0"
                              : `${net > 0 ? "+" : "−"}${formatNumber(Math.abs(net))}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Captives are not a resource column, but they were taken in the
                  same raids and a player counts them the same way. */}
              {feud.mine.captives + feud.theirs.captives > 0 && (
                <p className="mt-3 text-xs text-zinc-400">
                  <Icon name="citizens" size={14} className="inline-block align-middle text-zinc-300" />{" "}
                  שבויים: שביתי ממנו{" "}
                  <span className="nums font-bold text-emerald-400" dir="ltr">
                    {formatNumber(feud.mine.captives)}
                  </span>{" "}
                  · הוא שבה ממני{" "}
                  <span className="nums font-bold text-red-400" dir="ltr">
                    {formatNumber(feud.theirs.captives)}
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
