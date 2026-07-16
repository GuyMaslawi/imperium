import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  BUILDING_META,
  STORAGE_TYPES,
  storageCapacityForLevel,
  type StorableResource,
} from "@/lib/game/constants";
import { productionPerTick } from "@/lib/game/resources";
import { PowerSummary } from "@/components/game/PowerSummary";
import { WheelCard } from "@/components/game/WheelCard";
import { seasonDay } from "@/lib/game/wheel";
import { formatNumber, formatCompact, formatDate } from "@/lib/game/format";

export const metadata = { title: "בסיס | WARZONE" };

export default async function BasePage() {
  const empire = await requireEmpire();

  const [recentBattles, recentSpies, recentBankTransactions, season] =
    await Promise.all([
      prisma.battleReport.findMany({
        where: {
          OR: [{ attackerEmpireId: empire.id }, { defenderEmpireId: empire.id }],
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { attackerEmpire: true, defenderEmpire: true },
      }),
      prisma.spyReport.findMany({
        where: { attackerEmpireId: empire.id },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { defenderEmpire: true },
      }),
      prisma.bankTransaction.findMany({
        where: { empireId: empire.id },
        orderBy: { createdAt: "desc" },
        take: 2,
      }),
      empire.seasonId
        ? prisma.gameSeason.findUnique({ where: { id: empire.seasonId } })
        : null,
    ]);

  /* ---- production per regular update, grouped by resource ---- */
  const productionByResource = new Map<StorableResource, number>();
  for (const building of empire.buildings) {
    const produced = BUILDING_META[building.type].producedResource;
    if (!produced) continue;
    productionByResource.set(
      produced,
      (productionByResource.get(produced) ?? 0) + productionPerTick(building)
    );
  }

  const bankGold = Math.floor(empire.bankAccount?.goldBalance ?? 0);

  const totalStored = empire.storages.reduce((sum, s) => sum + s.storedAmount, 0);
  const totalCapacity = STORAGE_TYPES.reduce((sum, type) => {
    const level = empire.storages.find((s) => s.resourceType === type)?.level ?? 1;
    return sum + storageCapacityForLevel(level);
  }, 0);

  const hasActivity =
    recentBattles.length > 0 ||
    recentSpies.length > 0 ||
    recentBankTransactions.length > 0;

  /* ---- season milestones (presentational, gated on empire progress) ---- */
  const milestones = [
    { icon: "🏭", title: "מכונות רמה 100", need: 5 },
    { icon: "🗡️", title: "כל הנשק", need: 6 },
    { icon: "👥", title: "אוכלוסייה 500", need: 7 },
    { icon: "🛡️", title: "גיבור רמה 100", need: 8 },
    { icon: "🏰", title: "עיר 10", need: 10 },
  ].map((m) => ({ ...m, done: empire.level >= m.need }));

  const resourceTiles = [
    { icon: "🎖️", label: "תורות", value: empire.turns, tone: "text-emerald-400" },
    { icon: "⚙️", label: "ברזל", value: empire.iron, tone: "text-zinc-200" },
    { icon: "🪵", label: "עץ", value: empire.wood, tone: "text-amber-200/90" },
    { icon: "🪙", label: "זהב", value: empire.gold, tone: "text-gold-bright" },
    { icon: "🏦", label: "בבנק", value: bankGold, tone: "text-gold" },
    { icon: "💎", label: "יהלומים", value: empire.diamonds, tone: "text-sky-300" },
    { icon: "🪨", label: "אבן", value: empire.stone, tone: "text-zinc-200" },
    { icon: "👥", label: "אזרחים", value: empire.citizens, tone: "text-zinc-200" },
  ];

  // Server component renders once per request, so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const daysOnServer = Math.max(
    1,
    Math.ceil((nowMs - new Date(empire.createdAt).getTime()) / 86_400_000)
  );
  // Wheel prizes grow with the season — day 1 pays base amounts, each day adds more.
  const wheelSeasonDay = seasonDay(season, nowMs);

  return (
    <div className="space-y-6">
      <SectionHeading title="מרכז הפיקוד" subtitle="COMMAND CENTER" ornament="🏰" />

      {/* announcement */}
      <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-gradient-to-l from-transparent to-gold/5 pr-4">
        <span className="absolute inset-y-0 right-0 w-1 bg-gold" />
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p className="flex items-center gap-2 text-sm">
            <span aria-hidden>📣</span>
            <span className="font-bold text-gold-bright">
              {season ? `${season.name} התחילה!` : "העונה פעילה"}
            </span>
            <span className="text-zinc-400">— בהצלחה לכולם בעונה החדשה! ⚔️</span>
          </p>
          {season && (
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span aria-hidden>⏳</span>
              סיום עונה:
              <span className="font-bold text-gold nums" dir="ltr">
                {formatDate(season.endsAt)}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* wheel + season events */}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <WheelCard spinsAvailable={4} seasonDay={wheelSeasonDay} />

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardTitle className="mb-0" icon="🌍">התקדמות עולם המשחק</CardTitle>
              <p className="text-xs text-zinc-500">אירועי העונה</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-gold nums" dir="ltr">{daysOnServer}</p>
              <p className="text-[10px] text-zinc-500">ימי שרת</p>
            </div>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {milestones.map((m, i) => (
              <div key={m.title} className="flex items-center gap-1">
                <div className="flex w-24 shrink-0 flex-col items-center gap-1.5 text-center">
                  <span
                    className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 text-xl ${
                      m.done
                        ? "border-gold bg-gold/15"
                        : "border-border-subtle bg-panel-inset opacity-60"
                    }`}
                  >
                    {m.icon}
                    {m.done && (
                      <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-300">{m.title}</span>
                </div>
                {i < milestones.length - 1 && (
                  <span className={`h-0.5 w-6 ${m.done ? "bg-gold/60" : "bg-border-subtle"}`} />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* empire power */}
      <PowerSummary army={empire.army} weapons={empire.weapons} />

      {/* base details + resources */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon="🏰">פרטי בסיס</CardTitle>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <dt className="text-zinc-400">דירוג עולמי</dt>
              <dd className="text-lg font-black text-zinc-100 nums" dir="ltr">{empire.level}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <dt className="text-zinc-400">עונה</dt>
              <dd className="font-bold text-gold">{season?.name ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-400">ברית</dt>
              <dd className="font-bold text-red-400">ללא</dd>
            </div>
          </dl>
          <Link href="/game/guild" className="btn btn-ghost mt-4 w-full py-2 text-sm">
            🤝 הצטרף לברית
          </Link>
        </Card>

        <Card variant="gold">
          <div className="mb-4 flex items-center justify-between">
            <CardTitle className="mb-0" icon="💰">משאבים</CardTitle>
            <span className="text-xs text-zinc-400">
              מאוחסן:{" "}
              <span className="font-bold text-zinc-200 nums" dir="ltr">
                {formatCompact(totalStored)}/{formatCompact(totalCapacity)}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {resourceTiles.map((t) => (
              <div key={t.label} className="panel-inset rounded-lg px-3 py-2.5 text-center">
                <p className="flex items-center justify-center gap-1 text-[11px] text-zinc-400">
                  <span aria-hidden>{t.icon}</span>
                  {t.label}
                </p>
                <p className={`mt-0.5 text-sm font-black nums ${t.tone}`} dir="ltr">
                  {formatCompact(t.value)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* recent activity */}
      <Card>
        <CardTitle icon="📜">פעילות אחרונה</CardTitle>
        {!hasActivity ? (
          <p className="text-sm text-zinc-400">
            אין דיווחים עדיין. היכנס לפרופיל אימפריה מעמוד הדירוג כדי לרגל או לתקוף.
          </p>
        ) : (
          <ul className="space-y-2.5 text-sm">
            {recentBattles.map((r) => {
              const isAttacker = r.attackerEmpireId === empire.id;
              const won = r.winnerEmpireId === empire.id;
              const rival = isAttacker ? r.defenderEmpire.name : r.attackerEmpire.name;
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2 last:border-0">
                  <span className="text-zinc-300">
                    {isAttacker ? "⚔️ תקפת את" : "🛡️ הותקפת על ידי"}{" "}
                    <span className="font-semibold">{rival}</span> —{" "}
                    <span className={won ? "text-emerald-400" : "text-red-400"}>
                      {won ? "ניצחון" : "הפסד"}
                    </span>
                  </span>
                  <span className="text-xs text-zinc-500">{formatDate(r.createdAt)}</span>
                </li>
              );
            })}
            {recentSpies.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2 last:border-0">
                <span className="text-zinc-300">
                  🕵️ ריגלת אחרי <span className="font-semibold">{r.defenderEmpire.name}</span> —{" "}
                  <span className={r.success ? "text-emerald-400" : "text-red-400"}>
                    {r.success ? "הצלחה" : "כישלון"}
                  </span>
                </span>
                <span className="text-xs text-zinc-500">{formatDate(r.createdAt)}</span>
              </li>
            ))}
            {recentBankTransactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2 last:border-0">
                <span className="text-zinc-300">
                  🏦{" "}
                  {t.type === "DEPOSIT" ? "הפקדה לבנק" : t.type === "WITHDRAW" ? "משיכה מהבנק" : "ריבית מהבנק"}{" "}
                  —{" "}
                  <span className="font-semibold nums" dir="ltr">
                    {t.type === "WITHDRAW" ? "-" : "+"}
                    {formatNumber(t.amount)}
                  </span>
                </span>
                <span className="text-xs text-zinc-500">{formatDate(t.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/game/reports" className="btn btn-ghost mt-4 w-full py-2 text-sm">
          לכל הדוחות ←
        </Link>
      </Card>
    </div>
  );
}
