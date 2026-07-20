"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatNumber } from "@/lib/game/format";
import {
  DIAMOND_PACKAGES,
  discountedPrice,
  formatIls,
  packageTotal,
  STORE_IDLE,
  type DiamondPackage,
  type StoreActionState,
} from "@/lib/game/diamondStore";
import { purchaseDiamondPackage } from "@/server/actions/diamondStore";

const TAG_META: Record<
  NonNullable<DiamondPackage["tag"]>,
  { label: string; className: string }
> = {
  popular: {
    label: "הכי פופולרי",
    className: "border-sky-400/60 bg-sky-500/20 text-sky-200",
  },
  best: {
    label: "הכי משתלם",
    className: "border-amber-400/60 bg-amber-500/20 text-amber-200",
  },
};

export function DiamondStore({
  discountPct,
  purchasesLive = false,
}: {
  discountPct: number;
  /** Whether real-money purchases are open to everyone (real provider wired). */
  purchasesLive?: boolean;
}) {
  const hasDiscount = discountPct > 0;
  const [pending, setPending] = useState<DiamondPackage | null>(null);

  return (
    <div className="space-y-5">
      {hasDiscount && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-l from-amber-500/15 via-amber-400/5 to-transparent px-5 py-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 animate-pulse rounded-full bg-amber-400/20 blur-3xl"
          />
          <div className="relative flex items-center gap-4">
            <span aria-hidden className="text-4xl">
              🔥
            </span>
            <div className="min-w-0">
              <p className="text-lg font-black text-amber-200">מבצע לזמן מוגבל!</p>
              <p className="text-sm text-amber-100/80">
                כל חבילות היהלומים ב־
                <span className="nums font-black" dir="ltr">
                  {discountPct}%
                </span>{" "}
                הנחה. הזמן מוגבל — נצל את זה עכשיו.
              </p>
            </div>
            <span
              className="nums mr-auto shrink-0 rounded-full border border-amber-400/60 bg-amber-400/15 px-3 py-1.5 text-base font-black text-amber-200"
              dir="ltr"
            >
              −{discountPct}%
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DIAMOND_PACKAGES.map((pkg) => {
          const total = packageTotal(pkg);
          const net = discountedPrice(pkg.priceIls, discountPct);
          const tag = pkg.tag ? TAG_META[pkg.tag] : null;
          const highlight = pkg.tag === "best";

          return (
            <div
              key={pkg.id}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border p-5 transition-transform duration-200 hover:-translate-y-1 ${
                highlight
                  ? "border-amber-400/50 bg-gradient-to-b from-amber-500/10 via-panel to-panel shadow-[0_0_40px_-12px_rgba(251,191,36,0.5)]"
                  : "border-sky-400/25 bg-gradient-to-b from-sky-500/5 via-panel to-panel"
              }`}
            >
              {/* glow orb */}
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl transition-opacity group-hover:opacity-100 ${
                  highlight ? "bg-amber-400/20" : "bg-sky-400/15"
                } opacity-70`}
              />

              {tag && (
                <span
                  className={`absolute left-4 top-4 rounded-full border px-2.5 py-0.5 text-[11px] font-black ${tag.className}`}
                >
                  {tag.label}
                </span>
              )}

              <div className="relative flex flex-col items-center gap-1 pt-6 text-center">
                <span aria-hidden className="text-5xl drop-shadow-lg">
                  {pkg.emoji}
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <Icon name="diamond" size={26} className="text-sky-300" />
                  <span
                    className="nums text-3xl font-black text-sky-200"
                    dir="ltr"
                  >
                    {formatNumber(total)}
                  </span>
                </div>
                <span className="text-xs font-semibold text-zinc-400">יהלומים</span>

                {pkg.bonus > 0 && (
                  <span className="mt-1 nums rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-black text-emerald-300" dir="ltr">
                    +{formatNumber(pkg.bonus)} בונוס
                  </span>
                )}
              </div>

              {/* price */}
              <div className="relative mt-5 flex flex-col items-center gap-0.5">
                {hasDiscount && (
                  <span
                    className="nums text-sm text-zinc-500 line-through"
                    dir="ltr"
                  >
                    {formatIls(pkg.priceIls)}
                  </span>
                )}
                <span
                  className={`nums text-2xl font-black ${
                    hasDiscount ? "text-emerald-300" : "text-gold-bright"
                  }`}
                  dir="ltr"
                >
                  {formatIls(net)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setPending(pkg)}
                className={`relative mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-black transition-colors ${
                  highlight
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "bg-sky-500 text-black hover:bg-sky-400"
                }`}
              >
                רכישה מיידית
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-zinc-500">
        {purchasesLive
          ? "התשלומים מעובדים בצורה מאובטחת. היהלומים נזקפים לחשבונך מיד לאחר הרכישה."
          : "מערכת התשלומים בהרצה אחרונה. היהלומים נזקפים אוטומטית לחשבונך מיד עם סיום הרכישה."}
      </p>

      {pending && (
        <CheckoutModal
          pkg={pending}
          discountPct={discountPct}
          purchasesLive={purchasesLive}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------ checkout modal ------------------------------ */

function CheckoutModal({
  pkg,
  discountPct,
  purchasesLive,
  onClose,
}: {
  pkg: DiamondPackage;
  discountPct: number;
  purchasesLive: boolean;
  onClose: () => void;
}) {
  const [state, action] = useActionState<StoreActionState, FormData>(
    purchaseDiamondPackage,
    STORE_IDLE
  );

  const total = packageTotal(pkg);
  const net = discountedPrice(pkg.priceIls, discountPct);
  const hasDiscount = discountPct > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-sky-400/30 bg-panel p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-sky-400/15 blur-3xl"
        />

        {state.status === "success" ? (
          <div className="relative space-y-3 text-center">
            <span aria-hidden className="block text-5xl">
              ✅
            </span>
            <h3 className="text-lg font-black text-emerald-300">התשלום בוצע!</h3>
            <p className="text-sm text-zinc-300">
              נזקפו{" "}
              <span className="nums font-black text-sky-300" dir="ltr">
                {formatNumber(state.diamonds ?? total)}
              </span>{" "}
              יהלומים לחשבונך.
            </p>
            <button type="button" onClick={onClose} className="btn btn-gold w-full">
              מעולה!
            </button>
          </div>
        ) : state.status === "unavailable" ? (
          <div className="relative space-y-3 text-center">
            <span aria-hidden className="block text-5xl">
              🚧
            </span>
            <h3 className="text-lg font-black text-sky-200">התשלום בקרוב!</h3>
            <p className="text-sm text-zinc-400">
              {state.message ??
                "רכישות יהלומים ייפתחו ברגע שנחבר את מערכת התשלומים. תודה על הסבלנות!"}
            </p>
            <button type="button" onClick={onClose} className="btn btn-gold w-full">
              הבנתי
            </button>
          </div>
        ) : (
          <div className="relative space-y-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <span aria-hidden className="text-5xl drop-shadow-lg">
                {pkg.emoji}
              </span>
              <h3 className="text-lg font-black text-sky-100">אישור רכישה</h3>
            </div>

            <div className="space-y-2 rounded-xl border border-border-subtle bg-panel-inset p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">יהלומים</span>
                <span className="nums inline-flex items-center gap-1 font-black text-sky-200" dir="ltr">
                  <Icon name="diamond" size={16} className="text-sky-300" />
                  {formatNumber(total)}
                </span>
              </div>
              {pkg.bonus > 0 && (
                <div className="flex items-center justify-between text-emerald-300">
                  <span>כולל בונוס</span>
                  <span className="nums font-bold" dir="ltr">
                    +{formatNumber(pkg.bonus)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border-subtle pt-2">
                <span className="text-zinc-400">לתשלום</span>
                <span className="flex items-baseline gap-2">
                  {hasDiscount && (
                    <span className="nums text-xs text-zinc-500 line-through" dir="ltr">
                      {formatIls(pkg.priceIls)}
                    </span>
                  )}
                  <span
                    className={`nums text-xl font-black ${
                      hasDiscount ? "text-emerald-300" : "text-gold-bright"
                    }`}
                    dir="ltr"
                  >
                    {formatIls(net)}
                  </span>
                </span>
              </div>
            </div>

            {state.status === "error" && state.message && (
              <p className="rounded-lg border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
                {state.message}
              </p>
            )}

            <form className="grid gap-2">
              <input type="hidden" name="packageId" value={pkg.id} />
              <SubmitButton
                className="btn btn-gold w-full"
                formAction={action}
                pendingText="מעבד תשלום..."
              >
                שלם {formatIls(net)}
              </SubmitButton>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost w-full text-sm"
              >
                ביטול
              </button>
            </form>

            {!purchasesLive && (
              <p className="text-center text-[11px] text-zinc-500">
                מצב הדגמה — לא מתבצע חיוב אמיתי עד לחיבור ספק התשלומים.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
