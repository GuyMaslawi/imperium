import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import { formatGameDateTime } from "@/lib/game/time";
import {
  GUILD_WAR_END_LABEL,
  GUILD_WAR_MIN_GUILDS,
  GUILD_WAR_ROUNDS,
  GUILD_WAR_RESULTS_LINGER_MS,
  GUILD_WAR_START_LABEL,
} from "@/lib/game/guildWar";
import {
  cancelGuildWar,
  deleteGuildWar,
  purgeFinishedWars,
} from "@/server/actions/admin";

export const dynamic = "force-dynamic";

const LINGER_HOURS = Math.round(GUILD_WAR_RESULTS_LINGER_MS / 3_600_000);

/** Where a war stands right now — the same reading the player board takes. */
function phaseLabel(
  war: { startsAt: Date; endsAt: Date; status: string },
  now: Date
): { text: string; tone: string } {
  if (war.status === "SETTLED") return { text: "הוכרעה", tone: "bg-zinc-700/40 text-zinc-300" };
  if (war.status === "CANCELLED") {
    return { text: "בוטלה (מעט בריתות)", tone: "bg-zinc-700/40 text-zinc-400" };
  }
  if (now < war.startsAt) return { text: "נרשמות", tone: "bg-gold/20 text-gold-bright" };
  if (now < war.endsAt) return { text: "רצה עכשיו", tone: "bg-emerald-500/20 text-emerald-300" };
  return { text: "ממתינה לסיכום", tone: "bg-amber-500/20 text-amber-300" };
}

export default async function AdminGuildWarPage() {
  await requireAdmin();
  const now = new Date();

  // Deliberately does not call advanceLiveWars/settleDueWars: this screen is
  // where a war gets called off, and a page load that first fights the rounds it
  // is about to delete only makes the numbers on it lie.
  const wars = await prisma.guildWar.findMany({
    orderBy: { startsAt: "desc" },
    take: 30,
    include: {
      entries: { orderBy: [{ score: "desc" }, { wins: "desc" }] },
      _count: { select: { clashes: true } },
    },
  });

  const finished = wars.filter((war) => war.status !== "SCHEDULED").length;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="מלחמת בריתות"
        ornament={<Icon name="attack" size={22} className="text-crimson" />}
      />

      <p className="panel-inset rounded-xl p-4 text-center text-sm text-zinc-400">
        המלחמה נפתחת מדי ערב ב-{GUILD_WAR_START_LABEL} ונסגרת ב-{GUILD_WAR_END_LABEL}, ונלחמת לבד —
        אין כאן מה להפעיל. מה שכן אפשר: <span className="font-bold text-gold-bright">לבטל</span>{" "}
        מלחמה שרצה או שנפתחה להרשמה — היא נמחקת מיד, כל הבריתות הרשומות מקבלות הודעה, ואף פרס לא
        מחולק. מלחמה שהוכרעה נמחקת מעצמה {LINGER_HOURS} שעות אחרי הסיום.
      </p>

      {finished > 0 && (
        <ActionForm
          action={purgeFinishedWars}
          submitLabel="🗑 מחק את כל המלחמות שהסתיימו"
          submitVariant="secondary"
          submitClassName="text-xs"
          confirm="למחוק את ההיסטוריה של כל המלחמות שהסתיימו? הפרסים שכבר חולקו נשארים אצל השחקנים."
        />
      )}

      {wars.length === 0 && (
        <p className="panel-inset rounded-xl p-6 text-center text-zinc-500">
          אין מלחמות במערכת. הראשונה תיווצר כשברית כלשהי תירשם.
        </p>
      )}

      <div className="space-y-3">
        {wars.map((war) => {
          const live = war.status === "SCHEDULED" && now >= war.startsAt && now < war.endsAt;
          const phase = phaseLabel(war, now);
          const valid = war.entries.length >= GUILD_WAR_MIN_GUILDS;

          return (
            <div
              key={war.id}
              className={`panel rounded-xl p-4 ${live ? "ring-1 ring-emerald-400/60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-gold-bright">
                    <span aria-hidden>⚔️</span>
                    <span dir="ltr" className="nums">
                      {formatGameDateTime(war.startsAt)}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${phase.tone}`}>
                      {phase.text}
                    </span>
                    {war.status === "SCHEDULED" && !valid && (
                      <span className="rounded bg-zinc-700/40 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                        פחות מ-{GUILD_WAR_MIN_GUILDS} בריתות — לא תיספר
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    {war.entries.length} בריתות · סבב {war.resolvedRounds}/{GUILD_WAR_ROUNDS} ·{" "}
                    {war._count.clashes} התנגשויות
                    {war.settledAt && (
                      <>
                        {" "}
                        · סוכמה <span dir="ltr">{formatGameDateTime(war.settledAt)}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  {war.status === "SCHEDULED" ? (
                    <ActionForm
                      action={cancelGuildWar}
                      submitLabel={live ? "⏹ בטל את המלחמה שרצה" : "✖ בטל את המלחמה"}
                      submitVariant="danger"
                      submitClassName="text-xs"
                      confirm={
                        live
                          ? "לבטל את המלחמה שמתנהלת עכשיו? כל התוצאות יימחקו, לא יחולקו פרסים והבריתות הרשומות יקבלו הודעה."
                          : "לבטל את המלחמה הקרובה? כל ההרשמות יימחקו והבריתות הרשומות יקבלו הודעה."
                      }
                    >
                      <input type="hidden" name="id" value={war.id} />
                    </ActionForm>
                  ) : (
                    <ActionForm
                      action={deleteGuildWar}
                      submitLabel="🗑 מחק"
                      submitVariant="secondary"
                      submitClassName="text-xs"
                      confirm="למחוק את המלחמה מההיסטוריה? הפרסים שכבר חולקו נשארים אצל השחקנים."
                    >
                      <input type="hidden" name="id" value={war.id} />
                    </ActionForm>
                  )}
                </div>
              </div>

              {war.entries.length > 0 && (
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {war.entries.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="panel-inset flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs"
                    >
                      <span className="min-w-0 truncate text-zinc-200">
                        <span className="text-zinc-500">{entry.rank ?? index + 1}.</span>{" "}
                        {entry.guildName}
                      </span>
                      <span className="nums shrink-0 text-[11px] text-zinc-400" dir="ltr">
                        {entry.score.toLocaleString("he-IL")} נק׳ · {entry.wins}/{entry.losses}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
