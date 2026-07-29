import Link from "next/link";
import { requireEmpire } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";
import { GAME_TIMEZONE } from "@/lib/game/constants";
import {
  GUILD_WAR_END_LABEL,
  GUILD_WAR_MIN_GUILDS,
  GUILD_WAR_PRIZES,
  GUILD_WAR_ROUNDS,
  GUILD_WAR_RUNNER_UP_MIN_GUILDS,
  GUILD_WAR_START_LABEL,
  registrationWarStart,
} from "@/lib/game/guildWar";
import {
  advanceLiveWars,
  buildLiveState,
  getFocusWar,
  settleDueWars,
} from "@/server/guildWarState";
import { GuildWarBoard } from "@/components/game/GuildWarBoard";
import { GuildWarRegister } from "@/components/game/GuildWarRegister";

export const metadata = { title: "מלחמת בריתות | IMPERIUM" };

/** "יום רביעי, 29.7" — pinned to Jerusalem, so every player reads one clock. */
const bellDayFormatter = new Intl.DateTimeFormat("he-IL", {
  timeZone: GAME_TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "numeric",
});

/* -------- guildless: the arena is closed -------- */

function LockedView() {
  return (
    <div className="space-y-4">
      <SectionHeading title="מלחמת בריתות" ornament="⚔" />
      <div className="gw-arena rounded-xl p-8 text-center">
        <Icon name="guild" size={48} className="mx-auto text-gold-dim" />
        <h2 className="mt-4 text-lg font-black text-gold-bright">
          הזירה פתוחה לבריתות בלבד
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
          מלחמת הבריתות היא קרב בין בריתות, ולכן רק מי שחבר בברית — או הקים אחת
          בעצמו — יכול להיכנס לזירה. הצטרף לברית קיימת או הקם ברית משלך, ותוכל
          לרשום אותה לקרב הבא.
        </p>
        <Link href="/game/guild" className="btn btn-gold mt-5 inline-flex px-5 py-2 text-sm">
          <Icon name="guild" size={16} /> למסך הבריתות
        </Link>
      </div>
    </div>
  );
}

/* -------- prizes -------- */

function Prizes({ enrolled }: { enrolled: number }) {
  return (
    <div className="panel rounded-xl p-4">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
        <Icon name="gift" size={18} className="text-crimson" />
        פרסי המלחמה
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-zinc-400">
        הפרס מחולק <span className="font-bold text-zinc-200">שווה בשווה לכל חברי הברית</span>{" "}
        הזוכה — גם למי שלא הספיק להתחבר ב־{GUILD_WAR_START_LABEL}, ובלי בונוס אישי
        לאף אחד. את הברית מנצחים יחד: מי ששדרג את עזרת הברית, מי שהטיל את הקסמים
        ומי שמילא את השורות.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {GUILD_WAR_PRIZES.map((prize) => {
          const locked = enrolled < prize.minGuilds;
          return (
            <div
              key={prize.rank}
              className={`gw-prize rounded-lg p-4 ${prize.rank === 1 ? "is-first" : ""} ${
                locked ? "is-locked" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="flex items-center gap-2 text-sm font-black"
                  style={{ color: prize.tone }}
                >
                  <Icon name={prize.icon} size={18} />
                  {prize.label}
                </p>
                <span className="nums text-xs text-zinc-500" dir="ltr">
                  #{prize.rank}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <PrizeLine icon="citizens" label="אזרחים" value={formatNumber(prize.citizens)} />
                <PrizeLine icon="turns" label="תורות" value={formatNumber(prize.turns)} />
                <PrizeLine icon="wheel" label="סיבובי גלגל" value={String(prize.wheelSpins)} />
              </dl>

              {locked && (
                <p className="mt-3 rounded border border-amber-900/60 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-300/90">
                  נפתח רק כשיש לפחות {prize.minGuilds} בריתות בזירה
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel-inset mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3">
        <p className="flex items-center gap-2 text-sm font-bold text-gold-bright">
          <Icon name="spark" size={16} className="text-crimson" />
          כוח, לא כסף
        </p>
        <p className="text-xs text-zinc-400">
          הפרס משולם באזרחים, תורות וסיבובי גלגל — לא בזהב ולא ביהלומים. אזרחים
          הופכים לחיילים ותורות הופכות לתקיפות, כך שהברית הזוכה מתוגמלת ביכולת
          להילחם שוב מחר.
        </p>
      </div>
    </div>
  );
}

function PrizeLine({
  icon,
  label,
  value,
}: {
  icon: "citizens" | "turns" | "wheel";
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon name={icon} size={14} className="shrink-0 text-gold-dim" />
      <dt className="text-zinc-500">{label}</dt>
      <dd className="nums mr-auto font-bold text-zinc-100" dir="ltr">
        {value}
      </dd>
    </div>
  );
}

/* -------- rules -------- */

function Rules() {
  const rules: { icon: "turns" | "attack" | "shield" | "rankings" | "guild"; title: string; body: string }[] = [
    {
      icon: "attack",
      title: "הקרב מתנהל לבד",
      body: `אין תקיפות ידניות ואין מה ללחוץ. בין ${GUILD_WAR_START_LABEL} ל־${GUILD_WAR_END_LABEL} המערכת מריצה ${GUILD_WAR_ROUNDS} סבבים — סבב בכל דקה — ובכל סבב כל ברית מסתערת על ברית יריבה אחת. אתם רק צופים בשידור החי.`,
    },
    {
      icon: "guild",
      title: "מי משתתף",
      body: `כל ברית יכולה להירשם, וההרשמה פתוחה כל הזמן. צריך לפחות ${GUILD_WAR_MIN_GUILDS} בריתות רשומות — אם רק ברית אחת נרשמה, המלחמה מתבטלת והיא לא מקבלת שום פרס. מקום שני מזכה בפרס רק כשיש ${GUILD_WAR_RUNNER_UP_MIN_GUILDS} בריתות ומעלה.`,
    },
    {
      icon: "rankings",
      title: "גודל הברית לא מכריע",
      body: "כל ברית מקבלת בדיוק התנגשות אחת בכל סבב — ברית של שחקן אחד וברית של 10 יוצאות לאותו מספר קרבות. מה שרוסטר גדול נותן זה עומק: המערכת מסובבת חבר אחר לכל סבב, כך שברית נמדדת לפי החבר הממוצע שלה ולא לפי כמה שחקנים גייסה.",
    },
    {
      icon: "turns",
      title: "כוח בקרב",
      body: "אותו חישוב של תקיפה רגילה: חיילים + נשק, בונוס מגן, בונוסי הגיבור והציוד, קסם הברית הפעיל ועזרת הברית. עזרת הברית בזירה מחושבת מהכוח הממוצע של הברית (ולא מהסכום), כדי שגם כאן הגודל לא יכריע.",
    },
    {
      icon: "rankings",
      title: "איך צוברים נקודות",
      body: "פריצת הגנה מזכה את הברית התוקפת בנקודות לפי כוחו של המגן — ככל שהיעד חזק יותר, כך שווה יותר. התנגשות שנהדפת מזכה דווקא את ברית המגן, בפחות נקודות.",
    },
    {
      icon: "shield",
      title: "מה מונח על הכף",
      body: "כלום. מלחמת בריתות לא בוזזת משאבים, לא משעבדת חיילים, לא פוצעת גיבורים ואפילו לא עולה תורות — השחקנים לא פועלים. זה טורניר שמודד את מה שבניתם, לא פשיטה.",
    },
  ];

  return (
    <div className="panel rounded-xl p-4">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
        <Icon name="reports" size={18} className="text-crimson" />
        חוקי הזירה
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {rules.map((rule) => (
          <div key={rule.title} className="panel-inset rounded-lg p-3">
            <p className="flex items-center gap-2 text-sm font-bold text-gold-bright">
              <Icon name={rule.icon} size={15} className="text-crimson" />
              {rule.title}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{rule.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------- page -------- */

export default async function GuildWarPage() {
  const empire = await requireEmpire();

  // The arena is a guild feature end to end: no membership, no screen. The
  // sidebar hides the link for the same reason, but the gate lives here —
  // navigation is a convenience, not a permission.
  const membership = await prisma.guildMember.findUnique({
    where: { empireId: empire.id },
    include: { guild: { select: { id: true, name: true } } },
  });
  if (!membership) return <LockedView />;

  const now = new Date();
  // No cron in this game, so opening the screen is what drives the campaign:
  // any round that has come due is fought here, and a window that has closed is
  // ranked and paid out here.
  await advanceLiveWars(now);
  await settleDueWars(now);

  const war = await getFocusWar(now);
  const live = await buildLiveState({
    empireId: empire.id,
    myGuildId: membership.guildId,
    war,
    now,
  });

  /* ---- enrolment for the next bell (which may or may not be the war above) ---- */
  const bellAt = registrationWarStart(now);
  const upcoming = await prisma.guildWar.findUnique({
    where: { startsAt: bellAt },
    select: { id: true, _count: { select: { entries: true } } },
  });
  const registered = upcoming
    ? (await prisma.guildWarEntry.count({
        where: { warId: upcoming.id, guildId: membership.guildId },
      })) > 0
    : false;

  return (
    <div className="space-y-4">
      <SectionHeading
        title="מלחמת בריתות"
        subtitle={`${GUILD_WAR_START_LABEL}–${GUILD_WAR_END_LABEL} · שעון ישראל · קרב אוטומטי`}
        ornament="⚔"
      />

      <GuildWarBoard initial={live} />

      <GuildWarRegister
        guildName={membership.guild.name}
        registered={registered}
        mayManage={membership.role !== "MEMBER"}
        enrolled={upcoming?._count.entries ?? 0}
        nextBellLabel={bellDayFormatter.format(bellAt)}
      />

      {/* Which prizes are unlocked is a property of the field, so the panel
          follows whichever war the board is showing: the one being fought (or
          just decided), and otherwise the one still taking enrolments. */}
      <Prizes
        enrolled={
          live.warId && live.phase !== "REGISTRATION"
            ? live.guildCount
            : upcoming?._count.entries ?? 0
        }
      />
      <Rules />
    </div>
  );
}
