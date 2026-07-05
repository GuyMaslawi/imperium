import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import { armyPower } from "@/lib/game/power";
import { weaponsPower } from "@/lib/game/weapons";
import { formatNumber, formatDate } from "@/lib/game/format";
import { RankActions } from "@/components/game/RankActions";

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
    include: { army: true, user: true, season: true, weapons: true },
  });
  if (!empire) notFound();

  const isMe = empire.id === myEmpire.id;

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

  const attackWeaponsPower = weaponsPower(empire.weapons, "ATTACK");
  const defenseWeaponsPower = weaponsPower(empire.weapons, "DEFENSE");
  const spyWeaponsPower = weaponsPower(empire.weapons, "SPY");
  const power = armyPower(empire.army) + attackWeaponsPower + defenseWeaponsPower;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-100">
            👑 {empire.name}
            {isMe && (
              <span className="mr-3 rounded-full bg-gold/15 px-2.5 py-1 align-middle text-xs font-bold text-gold">
                האימפריה שלך
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            פרופיל ציבורי של האימפריה.
          </p>
        </div>
        {!isMe && (
          <RankActions targetEmpireId={empire.id} currentTurns={myEmpire.turns} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon="📊">נתונים כלליים</CardTitle>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-400">רמה</dt>
              <dd className="font-bold text-zinc-100">{empire.level}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">עוצמה צבאית</dt>
              <dd className="font-bold text-gold">⚡ {formatNumber(power)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">אזרחים</dt>
              <dd className="font-bold text-zinc-100">{formatNumber(empire.citizens)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">שליט</dt>
              <dd className="font-medium text-zinc-100">{empire.user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">האימפריה נוסדה</dt>
              <dd className="font-medium text-zinc-100">{formatDate(empire.createdAt)}</dd>
            </div>
            {empire.season && (
              <div className="flex justify-between">
                <dt className="text-zinc-400">עונה</dt>
                <dd className="font-medium text-zinc-100">{empire.season.name}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardTitle icon="🕵️">מידע מודיעיני</CardTitle>
          {isMe ? (
            <p className="text-sm text-zinc-400">
              זו האימפריה שלך — כל המידע זמין בעמוד הבסיס.
            </p>
          ) : spyReport ? (
            <>
              <p className="mb-3 text-xs text-zinc-500">
                מבוסס על דוח ריגול מ־{formatDate(spyReport.createdAt)}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm text-zinc-300 sm:grid-cols-3">
                <span>🪙 זהב: {formatNumber(spyReport.revealedGold ?? 0)}</span>
                <span>🪵 עץ: {formatNumber(spyReport.revealedWood ?? 0)}</span>
                <span>⚙️ ברזל: {formatNumber(spyReport.revealedIron ?? 0)}</span>
                <span>🪨 אבן: {formatNumber(spyReport.revealedStone ?? 0)}</span>
                <span>🪖 חיילים: {formatNumber(spyReport.revealedSoldiers ?? 0)}</span>
                <span>🕵️ מרגלים: {formatNumber(spyReport.revealedSpies ?? 0)}</span>
                <span>⛏️ עבדי מכרות: {formatNumber(spyReport.revealedMineSlaves ?? 0)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              בצע ריגול כדי לחשוף מידע נוסף על האימפריה.
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle icon="🗡️">נשקים</CardTitle>
        {isMe ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm text-zinc-300 sm:grid-cols-3">
              <span>⚔️ כוח התקפה מנשקים: {formatNumber(attackWeaponsPower)}</span>
              <span>🛡️ כוח הגנה מנשקים: {formatNumber(defenseWeaponsPower)}</span>
              <span>🕵️ כוח ריגול מנשקים: {formatNumber(spyWeaponsPower)}</span>
            </div>
            <Link
              href="/game/weapons"
              className="inline-block rounded-lg border border-gold-dim px-4 py-2 text-sm font-bold text-gold transition-colors hover:bg-gold/10"
            >
              ניהול נשקים
            </Link>
          </div>
        ) : spyReport ? (
          <>
            <p className="mb-3 text-xs text-zinc-500">
              מבוסס על דוח ריגול מ־{formatDate(spyReport.createdAt)}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm text-zinc-300 sm:grid-cols-3">
              <span>⚔️ כוח התקפה מנשקים: {formatNumber(attackWeaponsPower)}</span>
              <span>🛡️ כוח הגנה מנשקים: {formatNumber(defenseWeaponsPower)}</span>
              <span>🕵️ כוח ריגול מנשקים: {formatNumber(spyWeaponsPower)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-400">
            בצע ריגול כדי לחשוף מידע על נשקי היריב.
          </p>
        )}
      </Card>

      {/* Future systems */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle icon="🦸">גיבור</CardTitle>
          <p className="text-sm text-zinc-400">מערכת הגיבור תיפתח בהמשך.</p>
        </Card>
        <Card>
          <CardTitle icon="🗡️">ציוד גיבור</CardTitle>
          <p className="text-sm text-zinc-400">
            ציוד היריב יוצג כאן כאשר מערכת הגיבורים תתווסף.
          </p>
        </Card>
        <Card>
          <CardTitle icon="🤝">ברית</CardTitle>
          <p className="text-sm text-zinc-400">מערכת הבריתות תיפתח בהמשך.</p>
        </Card>
      </div>
    </div>
  );
}
