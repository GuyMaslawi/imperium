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
import { getActiveShields } from "@/lib/game/diamondEffects";
import { SHIELDS } from "@/lib/game/diamondShop";
import { HeroPaperdoll } from "@/components/game/HeroPaperdoll";
import type { HeroItemView } from "@/components/game/heroItemView";
import {
  HERO_CLASS_META,
  heroClassImage,
  tierForLevel,
} from "@/lib/game/hero";

export const metadata = { title: "פרופיל אימפריה | קראלדור" };

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

  // Raid shields are public knowledge — no spy report needed. Knowing there is
  // nothing to take is precisely what should stop you wasting turns here.
  const shields = await getActiveShields(empire.id);
  const activeShields = SHIELDS.filter((s) => shields[s.key] !== null);

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

              {canEngage ? (
                <RankActions targetEmpireId={empire.id} currentTurns={myEmpire.turns} />
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

              {/* decorative auto-attack control (not yet available) */}
              {canEngage && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>תקיפה אוטומטית</span>
                  <span
                    className="nums rounded-md border border-border-subtle bg-panel-inset px-2 py-1 font-bold text-zinc-300"
                    dir="ltr"
                  >
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
          )}
        </div>
      </div>
    </div>
  );
}
