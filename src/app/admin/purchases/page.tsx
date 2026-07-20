import Link from "next/link";
import type { PurchaseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { formatIls } from "@/lib/game/diamondStore";

export const dynamic = "force-dynamic";

const STATUS_META: Record<PurchaseStatus, { label: string; className: string }> = {
  PAID: { label: "שולם", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  PENDING: { label: "ממתין", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  FAILED: { label: "נכשל", className: "border-red-500/40 bg-red-500/10 text-red-300" },
};

function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: string;
  hint?: string;
}) {
  return (
    <div className="panel rounded-xl p-4 text-center">
      <div className="text-2xl" aria-hidden>
        {icon}
      </div>
      <div className="nums mt-1 text-2xl font-black text-gold-bright" dir="ltr">
        {typeof value === "number" ? value.toLocaleString("he-IL") : value}
      </div>
      <div className="text-xs text-zinc-400">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-zinc-500">{hint}</div>}
    </div>
  );
}

export default async function AdminPurchasesPage() {
  await requireAdmin();

  const [realRevenue, testRevenue, byStatus, purchases] = await Promise.all([
    // Real money (mock charges excluded).
    prisma.diamondPurchase.aggregate({
      where: { status: "PAID", isTest: false },
      _sum: { priceIls: true, diamonds: true },
      _count: true,
    }),
    // Mock / admin test charges — "would-be" revenue.
    prisma.diamondPurchase.aggregate({
      where: { status: "PAID", isTest: true },
      _sum: { priceIls: true, diamonds: true },
      _count: true,
    }),
    prisma.diamondPurchase.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.diamondPurchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const statusCount = (s: PurchaseStatus) =>
    byStatus.find((r) => r.status === s)?._count._all ?? 0;

  const realIls = realRevenue._sum.priceIls ?? 0;
  const realDiamonds = realRevenue._sum.diamonds ?? 0;
  const testIls = testRevenue._sum.priceIls ?? 0;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="רכישות והכנסות"
        subtitle="REVENUE"
        ornament={<Icon name="diamond" size={22} className="text-sky-300" />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="הכנסות אמיתיות"
          value={formatIls(realIls)}
          icon="💰"
          hint={`${realRevenue._count.toLocaleString("he-IL")} רכישות`}
        />
        <StatCard label="יהלומים שנמכרו" value={Math.round(realDiamonds)} icon="💎" />
        <StatCard
          label="רכישות בדיקה"
          value={formatIls(testIls)}
          icon="🧪"
          hint={`${testRevenue._count.toLocaleString("he-IL")} מוק`}
        />
        <StatCard label="שולמו" value={statusCount("PAID")} icon="✅" />
        <StatCard label="ממתינים" value={statusCount("PENDING")} icon="⏳" />
        <StatCard label="נכשלו" value={statusCount("FAILED")} icon="❌" />
      </div>

      <p className="text-xs text-zinc-500">
        מציג {purchases.length} רכישות אחרונות. &quot;רכישות בדיקה&quot; הן חיובי מוק
        (ללא כסף אמיתי) עד לחיבור ספק תשלומים.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-right text-[11px] uppercase tracking-wider text-gold-dim">
              <th className="p-2 font-semibold">זמן</th>
              <th className="p-2 font-semibold">קונה</th>
              <th className="p-2 font-semibold">חבילה</th>
              <th className="p-2 font-semibold">יהלומים</th>
              <th className="p-2 font-semibold">סכום</th>
              <th className="p-2 font-semibold">סטטוס</th>
              <th className="p-2 font-semibold">ספק</th>
              <th className="p-2 font-semibold">אסמכתא</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => {
              const meta = STATUS_META[p.status];
              return (
                <tr key={p.id} className="border-b border-border-subtle/50">
                  <td className="p-2 text-[11px] text-zinc-500 nums" dir="ltr">
                    {p.createdAt.toLocaleString("he-IL")}
                  </td>
                  <td className="p-2">
                    {p.empireId ? (
                      <Link
                        href={p.userId ? `/admin/users/${p.userId}` : "#"}
                        className="min-w-0"
                      >
                        <span className="block truncate font-semibold text-zinc-100 hover:text-gold-bright">
                          {p.empireName ?? "—"}
                        </span>
                        <span className="block truncate text-[11px] text-zinc-500" dir="ltr">
                          {p.userEmail ?? "—"}
                        </span>
                      </Link>
                    ) : (
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-zinc-400">
                          {p.empireName ?? "חשבון שנמחק"}
                        </span>
                        <span className="block truncate text-[11px] text-zinc-500" dir="ltr">
                          {p.userEmail ?? "—"}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-[11px] text-zinc-400" dir="ltr">
                    {p.packageId}
                  </td>
                  <td className="p-2 nums font-bold text-sky-300" dir="ltr">
                    {p.diamonds.toLocaleString("he-IL")}
                    {p.bonusDiamonds > 0 && (
                      <span className="text-[10px] text-emerald-400">
                        {" "}
                        (+{p.bonusDiamonds})
                      </span>
                    )}
                  </td>
                  <td className="p-2 nums text-zinc-200" dir="ltr">
                    {formatIls(p.priceIls)}
                    {p.discountPct > 0 && (
                      <span className="text-[10px] text-emerald-400"> −{p.discountPct}%</span>
                    )}
                  </td>
                  <td className="p-2">
                    <span className="flex flex-wrap items-center gap-1">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                      {p.isTest && (
                        <span className="rounded-full border border-zinc-500/40 bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                          בדיקה
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="p-2 text-[11px] text-zinc-500" dir="ltr">
                    {p.provider}
                  </td>
                  <td className="p-2 text-[10px] text-zinc-600 font-mono" dir="ltr">
                    {p.providerRef ? p.providerRef.slice(0, 20) : "—"}
                  </td>
                </tr>
              );
            })}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-zinc-500">
                  עדיין אין רכישות
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Link href="/admin" className="inline-block text-xs text-gold hover:underline">
        ← חזרה ללוח הבקרה
      </Link>
    </div>
  );
}
