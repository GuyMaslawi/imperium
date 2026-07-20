import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { DuelBar } from "@/components/ui/Meter";
import {
  getEmpireAttackPower,
  getEmpireDefensePower,
  getEmpireSpyPower,
  getEmpireGeneralPower,
} from "@/lib/game/power";
import { weaponsPower } from "@/lib/game/weapons";
import { formatNumber, formatDate } from "@/lib/game/format";
import { RankActions } from "@/components/game/RankActions";
import { ItemTile } from "@/components/game/ItemTile";
import { itemDetails, uiRarityForLevel } from "@/components/game/heroItemView";
import { SLOT_META, SLOT_ORDER } from "@/lib/game/hero";

export const metadata = { title: "פרופיל אימפריה | אימפריום" };

/** A spy report counts as "recent" for this long. */
const SPY_REPORT_TTL_MS = 24 * 60 * 60 * 1000;

function recentSpyCutoff(): Date {
  return new Date(Date.now() - SPY_REPORT_TTL_MS);
}

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
  const equippedBySlot = new Map((hero?.items ?? []).map((item) => [item.slot, item]));

  const isMe = empire.id === myEmpire.id;
  // Espionage and combat are confined to your own city — an empire is "in your
  // city" when it holds the same number of cities as you.
  const sameCity = empire.cities === myEmpire.cities;
  const canEngage = !isMe && sameCity;

  const spyReport = isMe
    ? null
    : await prisma.spyReport.findFirst({
        where: {
          attackerEmpireId: myEmpire.id,
          defenderEmpireId: empire.id,
          success: true,
          createdAt: { gte: recentSpyCutoff() },
        },
        orderBy: { createdAt: "desc" },
      });

  // Power figures and population (general power, citizens, soldiers, gold…)
  // are intel — hidden from strangers. Revealed only for your own empire, or
  // once a recent successful spy report exists.
  const showDetails = isMe || spyReport !== null;
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

  const publicStats = [
    { label: "רמה", value: formatNumber(empire.level), tone: "text-gold-bright" },
    { label: "שליט", value: empire.user.name, tone: "text-zinc-100" },
    // Gold and soldier count are shown openly on every profile.
    { label: "זהב", value: <><Icon name="gold" size={14} className="inline-block align-middle" /> {formatNumber(Math.floor(empire.gold))}</>, tone: "text-gold-bright" },
    { label: "חיילים", value: <><Icon name="army" size={14} className="inline-block align-middle" /> {formatNumber(empire.army?.soldiers ?? 0)}</>, tone: "text-zinc-100" },
    // Power and citizen count are intelligence — visible only for your own
    // empire or after a successful spy mission.
    ...(showDetails
      ? [
          { label: "כוח כללי", value: <><Icon name="spark" size={14} className="inline-block align-middle" /> {formatNumber(generalPower)}</>, tone: "text-gold" },
          { label: "אזרחים", value: formatNumber(empire.citizens), tone: "text-zinc-100" },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <SectionHeading title="פרופיל" subtitle="EMPIRE PROFILE" ornament={<Icon name="crown" size={22} className="text-crimson" />} />

      {/* An empire outside your city is off-limits: no spying, no attacking. */}
      {!isMe && !sameCity && (
        <div className="panel-inset rounded-xl p-4 text-center text-sm text-zinc-400">
          <Icon name="shield" size={16} className="mb-1 inline-block align-[-3px] text-gold-dim" />{" "}
          אימפריה זו נמצאת בעיר אחרת (
          <span className="nums" dir="ltr">
            {empire.cities}
          </span>{" "}
          ערים) — לא ניתן לרגל או לתקוף אותה. ניתן לפעול רק נגד אימפריות בעיר שלך.
        </div>
      )}

      {/* -------- command bar: attack actions live on top, ready to fire -------- */}
      {canEngage && (
        <div className="panel-gold rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <RankActions
              targetEmpireId={empire.id}
              currentTurns={myEmpire.turns}
            />
            <div className="flex flex-col items-stretch gap-2">
              <button
                type="button"
                disabled
                title="מערכת הודעות בין שחקנים תתווסף בהמשך."
                className="btn btn-ghost px-4 py-2 text-sm"
              >
                <Icon name="messages" size={16} className="inline-block align-middle" /> הודעה · בקרוב
              </button>
              {/* decorative auto-attack control (not yet available) */}
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
            </div>
          </div>
        </div>
      )}

      {/* -------- hero banner -------- */}
      <div className="panel-gold rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-gold/50 bg-gradient-to-b from-gold-deep/40 to-black text-4xl">
              <Icon name="crown" size={36} className="text-bone" />
              <span
                className="nums absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-gold/50 bg-black px-2 text-[10px] font-bold text-gold-bright"
                dir="ltr"
              >
                רמה {empire.level}
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
              <p className="mt-0.5 text-sm text-zinc-400">קשת</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {showDetails && (
                  <span className="nums inline-flex items-center gap-1 rounded-md border border-gold/40 bg-panel-inset px-2 py-0.5 font-bold text-gold" dir="ltr">
                    <Icon name="spark" size={14} /> {formatNumber(generalPower)}
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2 py-0.5 font-bold text-gold-bright"
                  title="רמת הגיבור"
                >
                  <Icon name="attack" size={14} /> גיבור{" "}
                  <span className="nums" dir="ltr">
                    {heroLevel}
                  </span>
                  {heroResets > 0 && (
                    <span className="nums text-purple-300" dir="ltr" title={`הגיבור אופס ${heroResets} פעמים ברמה 100`}>
                      ↻×{heroResets}
                    </span>
                  )}
                </span>
                <span className="nums inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-bold text-red-400" dir="ltr">
                  100 <Icon name="heart" size={14} />
                </span>
                {guildName && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2 py-0.5 font-bold text-gold-bright"
                    title="הברית של השחקן"
                  >
                    <Icon name="guild" size={14} /> {guildName}
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* -------- public stat tiles -------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {publicStats.map((stat) => (
          <div key={stat.label} className="panel rounded-xl p-4">
            <p className="text-xs text-zinc-400">{stat.label}</p>
            <p className={`nums mt-1 text-lg font-bold ${stat.tone}`} dir="ltr">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* -------- power breakdown -------- */}
        <div className="panel rounded-xl p-4">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <Icon name="spark" size={20} className="text-crimson-bright" />
            כוח האימפריה
          </h3>
          {showDetails ? (
            <>
              {spyReport && (
                <p className="mb-3 text-xs text-zinc-500">
                  מבוסס על דוח ריגול מ־
                  <span className="nums" dir="ltr">
                    {formatDate(spyReport.createdAt)}
                  </span>
                </p>
              )}
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

              {isMe && (
                <Link
                  href="/game/weapons"
                  className="mt-4 inline-block text-sm font-semibold text-gold hover:text-gold-bright"
                >
                  ניהול נשקים ←
                </Link>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              בצע ריגול כדי לחשוף מידע נוסף על האימפריה.
            </p>
          )}
        </div>

        {/* -------- intelligence / spy report -------- */}
        {canEngage && (
          <div className="panel-gold rounded-xl p-4">
            <h3 className="mb-1 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
              <Icon name="spy" size={20} className="text-crimson-bright" />
              תוצאת ריגול
            </h3>
            <p className="mb-4 text-[10px] uppercase tracking-[0.35em] text-gold-dim">
              SPY REPORT
            </p>
            {spyReport ? (
              <>
                <p className="mb-3 text-xs text-zinc-500">
                  מבוסס על דוח ריגול מ־
                  <span className="nums" dir="ltr">
                    {formatDate(spyReport.createdAt)}
                  </span>
                </p>

                <h4 className="mb-2 text-xs font-bold tracking-wide text-gold">
                  אוכלוסייה
                </h4>
                <div className="mb-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="panel-inset rounded-lg p-2.5">
                    <p className="text-[11px] text-zinc-500"><Icon name="army" size={14} className="inline-block align-middle" /> חיילים</p>
                    <p className="nums font-bold text-zinc-100" dir="ltr">
                      {formatNumber(spyReport.revealedSoldiers ?? 0)}
                    </p>
                  </div>
                  <div className="panel-inset rounded-lg p-2.5">
                    <p className="text-[11px] text-zinc-500"><Icon name="spy" size={14} className="inline-block align-middle" /> מרגלים</p>
                    <p className="nums font-bold text-zinc-100" dir="ltr">
                      {formatNumber(spyReport.revealedSpies ?? 0)}
                    </p>
                  </div>
                  <div className="panel-inset rounded-lg p-2.5">
                    <p className="text-[11px] text-zinc-500"><Icon name="mine" size={14} className="inline-block align-middle" /> עבדי מכרות</p>
                    <p className="nums font-bold text-zinc-100" dir="ltr">
                      {formatNumber(spyReport.revealedMineSlaves ?? 0)}
                    </p>
                  </div>
                </div>

                <h4 className="mb-2 text-xs font-bold tracking-wide text-gold">
                  משאבים
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <span className="nums text-zinc-300" dir="ltr">
                    <Icon name="gold" size={14} className="inline-block align-middle" /> {formatNumber(spyReport.revealedGold ?? 0)}
                  </span>
                  <span className="nums text-zinc-300" dir="ltr">
                    <Icon name="wood" size={14} className="inline-block align-middle" /> {formatNumber(spyReport.revealedWood ?? 0)}
                  </span>
                  <span className="nums text-zinc-300" dir="ltr">
                    <Icon name="iron" size={14} className="inline-block align-middle" /> {formatNumber(spyReport.revealedIron ?? 0)}
                  </span>
                  <span className="nums text-zinc-300" dir="ltr">
                    <Icon name="stone" size={14} className="inline-block align-middle" /> {formatNumber(spyReport.revealedStone ?? 0)}
                  </span>
                  <span className="nums text-zinc-300" dir="ltr">
                    <Icon name="attack" size={14} className="inline-block align-middle" /> {formatNumber(weaponsPower(empire.weapons, "ATTACK"))}
                  </span>
                  <span className="nums text-zinc-300" dir="ltr">
                    <Icon name="shield" size={14} className="inline-block align-middle" /> {formatNumber(weaponsPower(empire.weapons, "DEFENSE"))}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                בצע ריגול כדי לחשוף מידע נוסף על האימפריה.
              </p>
            )}
          </div>
        )}
      </div>

      {/* -------- hero equipment (live) -------- */}
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
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-9">
          {SLOT_ORDER.map((slot) => {
            const meta = SLOT_META[slot];
            const item = equippedBySlot.get(slot);
            if (!item) {
              return (
                <div key={slot} className="flex flex-col items-center gap-1">
                  <div className="panel-inset flex aspect-square w-full items-center justify-center rounded-xl">
                    <span aria-hidden className="text-3xl opacity-25 grayscale">
                      {meta.icon}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-600">{meta.label}</span>
                </div>
              );
            }
            return (
              <ItemTile
                key={slot}
                slug={meta.slug}
                icon={meta.icon}
                level={item.level}
                name={meta.label}
                rarity={uiRarityForLevel(item.level)}
                details={itemDetails(item, heroLevel, { equipped: true })}
              />
            );
          })}
        </div>
        {equippedBySlot.size === 0 && (
          <p className="mt-3 text-xs text-zinc-600">
            {isMe
              ? "הגיבור שלך עדיין לא לובש ציוד — לכוד חפצים בתקיפות ולבש אותם בעמוד הגיבור."
              : "הגיבור של היריב אינו לובש ציוד כרגע."}
          </p>
        )}
        {isMe && equippedBySlot.size > 0 && (
          <Link
            href="/game/hero"
            className="mt-3 inline-block text-sm font-semibold text-gold hover:text-gold-bright"
          >
            ניהול הגיבור ←
          </Link>
        )}
      </div>

      {/* -------- player description -------- */}
      <div className="panel rounded-xl p-4">
        <h3 className="mb-3 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
          <Icon name="reports" size={20} className="text-crimson-bright" />
          תיאור שחקן
        </h3>
        <dl className="grid gap-2.5 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 border-b border-border-subtle pb-2.5">
            <dt className="text-zinc-400">שליט</dt>
            <dd className="font-medium text-zinc-100">{empire.user.name}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-border-subtle pb-2.5">
            <dt className="text-zinc-400">האימפריה נוסדה</dt>
            <dd className="nums font-medium text-zinc-100" dir="ltr">
              {formatDate(empire.createdAt)}
            </dd>
          </div>
          {empire.season && (
            <div className="flex justify-between gap-2 border-b border-border-subtle pb-2.5">
              <dt className="text-zinc-400">עונה</dt>
              <dd className="font-medium text-zinc-100">{empire.season.name}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2 border-b border-border-subtle pb-2.5">
            <dt className="text-zinc-400">ברית</dt>
            {guildName ? (
              <dd className="inline-flex items-center gap-1 font-medium text-gold-bright">
                <Icon name="guild" size={14} /> {guildName}
              </dd>
            ) : (
              <dd className="text-zinc-500">ללא ברית</dd>
            )}
          </div>
        </dl>
      </div>
    </div>
  );
}
