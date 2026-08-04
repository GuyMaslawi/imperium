import Link from "next/link";

import { getSessionUserId, requireEmpire } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatNumber } from "@/lib/game/format";
import { settleOrderReturn, type OrderReturnStatus } from "@/server/orderSettle";

/**
 * Where the gateway returns the buyer after a successful payment.
 *
 * The page settles as a *convenience*, not as the mechanism: it asks the gateway
 * what the buyer's newest open order is worth and credits it, so the diamonds
 * are already in the balance by the time this paints. If anything about that is
 * slow, down, or merely out of order, the gateway's callback settles the same
 * purchase moments later through the same guard — which is why nothing here
 * treats "not confirmed yet" as a failure.
 *
 * Nothing in the URL is read. The return carries no field worth trusting, so the
 * order is found by session instead. See `@/server/orderSettle`.
 */

export const metadata = {
  title: "התשלום התקבל | KRALDOR",
  // A payment confirmation has no business in a search index, and the URL is
  // reachable by anyone who guesses it (it just shows them nothing).
  robots: { index: false, follow: false },
};

// Settlement is a write. Never prerender, never cache.
export const dynamic = "force-dynamic";

const VIEWS: Record<
  OrderReturnStatus,
  { emoji: string; title: string; tone: string; body: string }
> = {
  credited: {
    emoji: "✅",
    title: "התשלום בוצע!",
    tone: "text-emerald-300",
    body: "היהלומים נזקפו לחשבונך. קבלה נשלחה לכתובת האימייל שלך.",
  },
  already: {
    emoji: "✅",
    title: "התשלום בוצע!",
    tone: "text-emerald-300",
    body: "היהלומים כבר נזקפו לחשבונך. קבלה נשלחה לכתובת האימייל שלך.",
  },
  pending: {
    emoji: "⏳",
    title: "התשלום בבדיקה",
    tone: "text-amber-300",
    body: "קיבלנו את התשלום והוא ממתין לאישור סופי מחברת הסליקה. היהלומים ייזקפו אוטומטית תוך דקות ספורות — אין צורך לשלם שוב.",
  },
  none: {
    emoji: "🔎",
    title: "לא נמצאה רכישה פתוחה",
    tone: "text-zinc-300",
    body: "לא מצאנו רכישה שממתינה לאישור בחשבון הזה. אם חויבת ולא קיבלת יהלומים, פנה אלינו ונטפל בזה מיד.",
  },
};

export default async function PurchaseSuccessPage() {
  const empire = await requireEmpire();
  const userId = await getSessionUserId();
  const result = userId
    ? await settleOrderReturn(userId)
    : ({ status: "none", diamonds: 0 } as const);

  const view = VIEWS[result.status];

  return (
    <div className="space-y-6">
      <SectionHeading
        title="רכישת יהלומים"
        ornament={<Icon name="diamond" size={22} className="text-cyan-300" />}
      />

      <div className="panel-inset mx-auto max-w-md space-y-4 rounded-2xl p-6 text-center">
        <span aria-hidden className="block text-6xl">
          {view.emoji}
        </span>
        <h2 className={`text-xl font-black ${view.tone}`}>{view.title}</h2>

        {result.diamonds > 0 && (
          <p className="flex items-center justify-center gap-2 text-lg">
            <Icon name="diamond" size={22} className="text-cyan-300" />
            <span className="nums font-black text-sky-200" dir="ltr">
              +{formatNumber(result.diamonds)}
            </span>
          </p>
        )}

        <p className="text-sm leading-relaxed text-zinc-400">{view.body}</p>

        <p className="text-sm text-zinc-500">
          יתרה נוכחית:{" "}
          <span className="nums font-black text-sky-300" dir="ltr">
            {formatNumber(Math.floor(empire.diamonds))}
          </span>{" "}
          יהלומים
        </p>

        <div className="grid gap-2 pt-2">
          <Link href="/game/diamonds" className="btn btn-gold w-full">
            לחנות היהלומים
          </Link>
          <Link href="/game/diamonds/buy" className="btn btn-ghost w-full text-sm">
            חזרה לרכישה
          </Link>
        </div>
      </div>
    </div>
  );
}
