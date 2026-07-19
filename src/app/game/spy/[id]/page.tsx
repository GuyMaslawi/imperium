import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { formatNumber, formatDate } from "@/lib/game/format";

export const metadata = { title: "תוצאת ריגול | WARZONE" };

export default async function SpyResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireEmpire();

  const report = await prisma.spyReport.findUnique({
    where: { id },
    include: { defenderEmpire: true },
  });
  if (!report) notFound();
  // Only the spymaster who ran the mission may read its report.
  if (report.attackerEmpireId !== me.id) notFound();

  const foe = report.defenderEmpire;
  const pop = [
    { icon: <Icon name="army" size={14} className="inline-block align-middle" />, label: "חיילים", value: report.revealedSoldiers },
    { icon: <Icon name="spy" size={14} className="inline-block align-middle" />, label: "מרגלים", value: report.revealedSpies },
    { icon: <Icon name="mine" size={14} className="inline-block align-middle" />, label: "עבדי מכרות", value: report.revealedMineSlaves },
  ];
  const res = [
    { icon: <Icon name="gold" size={14} className="inline-block align-middle" />, label: "זהב", value: report.revealedGold },
    { icon: <Icon name="wood" size={14} className="inline-block align-middle" />, label: "עץ", value: report.revealedWood },
    { icon: <Icon name="iron" size={14} className="inline-block align-middle" />, label: "ברזל", value: report.revealedIron },
    { icon: <Icon name="stone" size={14} className="inline-block align-middle" />, label: "אבן", value: report.revealedStone },
  ];

  return (
    <div className="space-y-6">
      <SectionHeading title="תוצאת ריגול" subtitle="SPY REPORT" ornament={<Icon name="spy" size={22} className="text-crimson" />} />

      {/* verdict banner */}
      <div
        className={`rounded-xl border p-5 text-center ${
          report.success
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-red-500/40 bg-red-500/10"
        }`}
      >
        <p className={`text-xl font-black ${report.success ? "text-emerald-300" : "text-red-400"}`}>
          {report.success ? `הריגול על ${foe.name} הצליח! ✅` : "המרגל נתפס! המשימה נכשלה 🚨"}
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          {report.success
            ? "המידע על האימפריה נחשף במלואו."
            : "המרגל אבד. נסה שוב עם מודיעין גבוה יותר או נשקי ריגול."}
        </p>
        {report.finalChance != null && (
          <p className="mt-2 text-xs text-zinc-500 nums" dir="ltr">
            סיכוי הצלחה: {Math.round(report.finalChance * 100)}%
            {report.weaponsBonus ? ` · בונוס נשקים +${Math.round(report.weaponsBonus)}%` : ""}
            {report.guildBonus ? ` · קסם ברית +${Math.round(report.guildBonus)}%` : ""}
          </p>
        )}
      </div>

      {report.success && (
        <>
          <div className="panel-gold rounded-xl p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gold-bright"><Icon name="citizens" size={18} className="text-crimson-bright" /> אוכלוסייה</h3>
            <div className="grid grid-cols-3 gap-3">
              {pop.map((p) => (
                <div key={p.label} className="panel-inset rounded-lg p-3 text-center">
                  <p className="text-[11px] text-zinc-400">{p.icon} {p.label}</p>
                  <p className="nums mt-0.5 text-lg font-black text-zinc-100" dir="ltr">
                    {formatNumber(p.value ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-gold rounded-xl p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gold-bright"><Icon name="gold" size={18} className="text-crimson-bright" /> משאבים זמינים</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {res.map((r) => (
                <div key={r.label} className="panel-inset rounded-lg p-3 text-center">
                  <p className="text-[11px] text-zinc-400">{r.icon} {r.label}</p>
                  <p className="nums mt-0.5 font-black text-gold-bright" dir="ltr">
                    {formatNumber(r.value ?? 0)}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-600">
              משאבים אלה זמינים לביזה — משאבים במחסן מוגנים מפני תקיפה.
            </p>
          </div>
        </>
      )}

      {/* actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs text-zinc-500 nums" dir="ltr">{formatDate(report.createdAt)}</p>
        <div className="flex gap-2">
          <Link href={`/game/empires/${foe.id}`} className="btn btn-gold px-5 py-2 text-sm">
            <Icon name="attack" size={16} className="inline-block align-middle" /> תקוף את {foe.name}
          </Link>
          <Link href="/game/base" className="btn btn-ghost px-5 py-2 text-sm"><Icon name="base" size={16} className="inline-block align-middle" /> חזרה לבסיס</Link>
          <Link href="/game/reports" className="btn btn-ghost px-5 py-2 text-sm"><Icon name="reports" size={16} className="inline-block align-middle" /> היסטוריה</Link>
        </div>
      </div>
    </div>
  );
}
