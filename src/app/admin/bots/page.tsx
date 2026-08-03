import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import { EditorSection } from "@/components/admin/fields";
import { BotPlanter, type BotCityStat } from "@/components/admin/BotPlanter";
import { botsPerCity, cityPowerBaseline, listBots, playersPerCity } from "@/server/bots";
import { createBotEmpires, deleteBotEmpire, rearmBotEmpire } from "@/server/actions/admin";
import { BOT_RESTORE_MS } from "@/lib/game/bots";
import { cityAt } from "@/lib/game/cities";
import { MAX_CITIES } from "@/lib/game/constants";
import { formatCompact, formatNumber } from "@/lib/game/format";
import { weaponByKey } from "@/lib/game/weapons";
import { botWeaponKeys } from "@/lib/game/bots";

export const dynamic = "force-dynamic";

export const metadata = { title: "בוטים | ניהול" };

export default async function AdminBotsPage() {
  await requireAdmin();

  const [players, bots, rows] = await Promise.all([
    playersPerCity(),
    botsPerCity(),
    listBots(),
  ]);

  // One baseline query per tier — ten small aggregates, and they are what the
  // planter shows beside each city, so they have to be the same figures the
  // server will build with.
  const stats: BotCityStat[] = await Promise.all(
    Array.from({ length: MAX_CITIES }, (_, i) => i + 1).map(async (cities) => ({
      cities,
      players: players.get(cities) ?? 0,
      bots: bots.get(cities) ?? 0,
      baseline: await cityPowerBaseline(cities),
    }))
  );

  // One clock for the whole list, so two bots refilled in the same second do not
  // come back with different countdowns.
  const now = new Date().getTime();
  const stranded = stats.filter((s) => s.players === 1 && s.bots === 0);

  return (
    <div className="space-y-6">
      <SectionHeading title="בוטים" ornament="🤖" />

      <p className="panel-inset rounded-xl p-4 text-sm leading-relaxed text-zinc-400">
        קרב וריגול מוגבלים לעיר שלך בלבד. שחקן שטיפס לעיר גבוהה לפני כולם נשאר
        לבד בסולם — אין לו את מי לתקוף ואין לו את מי לרגל, וכל מערכת הקרב פשוט
        נסגרת בפניו. <span className="font-bold text-gold-bright">בוט</span> הוא
        תושב שנשתל בעיר הזו: הוא עומד בדירוג העיר, אפשר לתקוף ולרגל אותו, יש לו
        מכרות שמייצרים שלל אמיתי, והוא מתאושש בעצמו — חיל המצב שלו נבנה מחדש
        לכל היותר פעם ב-{Math.round(BOT_RESTORE_MS / 60_000)} דקות, ברגע
        שמישהו טוען אותו כמטרה.
        <br />
        בוטים אינם מתחרים: הם מסוננים מהפודיום ומפרסי העונה, מהיכל התהילה, משיאי
        העולם ומכל הלוחות הגלובליים, והם לא מקבלים שידורים ולא מתנות.
      </p>

      {stranded.length > 0 && (
        <p className="rounded-xl border border-crimson/40 bg-crimson/10 p-4 text-sm text-red-100">
          <span className="font-bold">שחקן בודד בעיר:</span>{" "}
          {stranded.map((s) => `${cityAt(s.cities).name} (${s.cities})`).join(" · ")} — אין
          שם למי לתקוף.
        </p>
      )}

      <EditorSection title="שתילת בוטים" icon="🌱">
        <BotPlanter action={createBotEmpires} stats={stats} />
      </EditorSection>

      <EditorSection title={`בוטים קיימים (${rows.length})`} icon="📋">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">אין בוטים במשחק.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((bot) => {
              const empire = bot.empire;
              const city = cityAt(empire.cities);
              const keys = botWeaponKeys(bot.weaponTier);
              const weaponName = weaponByKey(keys.attack)?.name ?? `דרג ${bot.weaponTier}`;
              // Soldiers below the stored garrison mean it has been raided since
              // its last refill — the one number that says whether this bot is
              // still doing its job.
              const soldiers = empire.army?.soldiers ?? 0;
              const raided = soldiers < bot.soldiers;
              const readyIn = Math.max(
                0,
                Math.ceil((bot.restoredAt.getTime() + BOT_RESTORE_MS - now) / 60_000)
              );

              return (
                <div key={bot.id} className="panel rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-bold text-gold-bright">
                        <span aria-hidden>🤖</span>
                        <Link
                          href={`/game/empires/${empire.id}`}
                          className="hover:underline"
                        >
                          {empire.name}
                        </Link>
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                          {city.name} ({empire.cities})
                        </span>
                        {raided && (
                          <span className="rounded bg-crimson/25 px-2 py-0.5 text-[10px] font-bold text-red-200">
                            נשדד · מתאושש בעוד {readyIn} דק׳
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        כוח{" "}
                        <span className="nums font-bold text-zinc-200" dir="ltr">
                          {formatCompact(empire.militaryPower)}
                        </span>{" "}
                        · גיבור רמה{" "}
                        <span className="nums" dir="ltr">
                          {empire.hero?.level ?? 1}
                        </span>{" "}
                        ·{" "}
                        <span className="nums" dir="ltr">
                          {formatNumber(soldiers)}
                        </span>
                        {raided && (
                          <span className="nums text-zinc-500" dir="ltr">
                            {" "}
                            / {formatNumber(bot.soldiers)}
                          </span>
                        )}{" "}
                        חיילים ·{" "}
                        <span className="nums" dir="ltr">
                          {formatNumber(empire.army?.spies ?? 0)}
                        </span>{" "}
                        מרגלים · {weaponName} (דרג{" "}
                        <span className="nums" dir="ltr">
                          {bot.weaponTier}
                        </span>
                        ) · באוצר{" "}
                        <span className="nums text-gold-dim" dir="ltr">
                          {formatCompact(empire.gold)}
                        </span>{" "}
                        <Icon name="gold" size={11} className="inline-block align-middle text-gold" />
                      </p>
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      <ActionForm
                        action={rearmBotEmpire}
                        submitLabel="🔁 חדש חיל מצב"
                        submitVariant="secondary"
                        submitClassName="text-xs"
                      >
                        <input type="hidden" name="empireId" value={empire.id} />
                      </ActionForm>
                      <ActionForm
                        action={deleteBotEmpire}
                        submitLabel="🗑 מחק"
                        submitVariant="danger"
                        submitClassName="text-xs"
                        confirm={`למחוק את ${empire.name}?`}
                      >
                        <input type="hidden" name="empireId" value={empire.id} />
                      </ActionForm>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </EditorSection>
    </div>
  );
}
