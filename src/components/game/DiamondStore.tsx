"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PayPalCheckout } from "@/components/game/PayPalCheckout";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatNumber } from "@/lib/game/format";
import {
  DIAMOND_PACKAGES,
  discountedPrice,
  formatIls,
  packageTotal,
  packageValuePct,
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
  paypalClientId = null,
  testMode = false,
}: {
  discountPct: number;
  /** Whether real-money purchases are open to everyone (real provider wired). */
  purchasesLive?: boolean;
  /**
   * PayPal browser-SDK client id. When set, checkout runs through the PayPal
   * buttons (approve → capture) instead of the single-call charge form.
   */
  paypalClientId?: string | null;
  /** Charges are play money (mock provider / PayPal sandbox credentials). */
  testMode?: boolean;
}) {
  const hasDiscount = discountPct > 0;
  const [pending, setPending] = useState<DiamondPackage | null>(null);

  /* The "best value" package headlines the store as a full-width card; the rest
     fill an exact 2×2 / 1×4 grid so no row is ever left with an empty slot. */
  const featured =
    DIAMOND_PACKAGES.find((p) => p.tag === "best") ?? DIAMOND_PACKAGES[0];
  const rest = DIAMOND_PACKAGES.filter((p) => p.id !== featured.id);

  return (
    <div className="space-y-4">
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

      <FeaturedPackage
        pkg={featured}
        discountPct={discountPct}
        onBuy={() => setPending(featured)}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {rest.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            discountPct={discountPct}
            onBuy={() => setPending(pkg)}
          />
        ))}
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
          paypalClientId={paypalClientId}
          testMode={testMode}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------ package cards ------------------------------ */

/** "+123% ערך" — how much more each shekel buys vs the entry package. */
function ValueBadge({ pct, className = "" }: { pct: number; className?: string }) {
  if (pct <= 0) return null;
  return (
    <span
      className={`nums rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300 ${className}`}
      dir="ltr"
    >
      +{pct}% ערך
    </span>
  );
}

/** Old price / new price, stacked inline. */
function PriceTag({
  pkg,
  discountPct,
  size = "sm",
}: {
  pkg: DiamondPackage;
  discountPct: number;
  size?: "sm" | "lg";
}) {
  const hasDiscount = discountPct > 0;
  const net = discountedPrice(pkg.priceIls, discountPct);
  return (
    <span className="flex items-baseline justify-center gap-2">
      {hasDiscount && (
        <span className="nums text-xs text-zinc-500 line-through" dir="ltr">
          {formatIls(pkg.priceIls)}
        </span>
      )}
      <span
        className={`nums font-black ${size === "lg" ? "text-3xl" : "text-xl"} ${
          hasDiscount ? "text-emerald-300" : "text-gold-bright"
        }`}
        dir="ltr"
      >
        {formatIls(net)}
      </span>
    </span>
  );
}

/** The headline "best value" package — a wide banner card. */
function FeaturedPackage({
  pkg,
  discountPct,
  onBuy,
}: {
  pkg: DiamondPackage;
  discountPct: number;
  onBuy: () => void;
}) {
  const total = packageTotal(pkg);
  const tag = pkg.tag ? TAG_META[pkg.tag] : null;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-amber-400/50 bg-gradient-to-l from-amber-500/12 via-panel to-panel p-4 shadow-[0_0_40px_-14px_rgba(251,191,36,0.5)] sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl"
      />

      <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-right">
        <span aria-hidden className="text-5xl drop-shadow-lg sm:text-6xl">
          {pkg.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {tag && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${tag.className}`}
              >
                {tag.label}
              </span>
            )}
            <ValueBadge pct={packageValuePct(pkg)} />
          </div>
          <p className="mt-1.5 text-base font-black text-amber-100">{pkg.name}</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
            <Icon name="diamond" size={24} className="text-cyan-300" />
            <span className="nums text-3xl font-black text-sky-200" dir="ltr">
              {formatNumber(total)}
            </span>
            <span className="text-xs font-semibold text-zinc-400">יהלומים</span>
            {pkg.bonus > 0 && (
              <span
                className="nums rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-300"
                dir="ltr"
              >
                +{formatNumber(pkg.bonus)} בונוס
              </span>
            )}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-center gap-2 sm:w-auto">
          <PriceTag pkg={pkg} discountPct={discountPct} size="lg" />
          <button
            type="button"
            onClick={onBuy}
            className="btn btn-gold w-full px-6 py-2.5 text-sm sm:w-auto"
          >
            רכישה מיידית
          </button>
        </div>
      </div>
    </div>
  );
}

/** One standard package tile. */
function PackageCard({
  pkg,
  discountPct,
  onBuy,
}: {
  pkg: DiamondPackage;
  discountPct: number;
  onBuy: () => void;
}) {
  const total = packageTotal(pkg);
  const tag = pkg.tag ? TAG_META[pkg.tag] : null;
  const valuePct = packageValuePct(pkg);

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-3.5 text-center transition-transform duration-200 hover:-translate-y-1 ${
        tag
          ? "border-sky-400/50 bg-gradient-to-b from-sky-500/12 via-panel to-panel"
          : "border-sky-400/20 bg-gradient-to-b from-sky-500/5 via-panel to-panel"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-sky-400/12 blur-3xl"
      />

      {/* badge row — always rendered so every tile shares one baseline */}
      <div className="relative flex h-5 items-center justify-center">
        {tag ? (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${tag.className}`}
          >
            {tag.label}
          </span>
        ) : (
          <ValueBadge pct={valuePct} />
        )}
      </div>

      <p className="relative mt-1.5 text-xs font-bold text-zinc-300">{pkg.name}</p>
      <span aria-hidden className="relative mt-1 text-3xl drop-shadow-lg">
        {pkg.emoji}
      </span>

      <div className="relative mt-2 flex items-center justify-center gap-1.5">
        <Icon name="diamond" size={20} className="text-cyan-300" />
        <span className="nums text-xl font-black text-sky-200" dir="ltr">
          {formatNumber(total)}
        </span>
      </div>
      <span className="relative mt-0.5 block h-4 text-[11px] font-black text-emerald-300">
        {pkg.bonus > 0 && (
          <span className="nums" dir="ltr">
            +{formatNumber(pkg.bonus)} בונוס
          </span>
        )}
      </span>

      <div className="relative mt-auto grid gap-2 pt-3">
        <PriceTag pkg={pkg} discountPct={discountPct} />
        <button
          type="button"
          onClick={onBuy}
          className="btn btn-ghost w-full px-3 py-2 text-sm"
        >
          רכישה
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ checkout modal ------------------------------ */

function CheckoutModal({
  pkg,
  discountPct,
  paypalClientId,
  testMode,
  onClose,
}: {
  pkg: DiamondPackage;
  discountPct: number;
  paypalClientId: string | null;
  testMode: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action] = useActionState<StoreActionState, FormData>(
    purchaseDiamondPackage,
    STORE_IDLE
  );
  /* The PayPal path settles outside the form action, so the diamonds it
     credited are tracked here rather than in `state`. */
  const [paidDiamonds, setPaidDiamonds] = useState<number | null>(null);

  const total = packageTotal(pkg);
  const net = discountedPrice(pkg.priceIls, discountPct);
  const hasDiscount = discountPct > 0;
  const credited =
    paidDiamonds ?? (state.status === "success" ? (state.diamonds ?? total) : null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-sky-400/30 bg-panel p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-sky-400/15 blur-3xl"
        />

        {credited !== null ? (
          <div className="relative space-y-3 text-center">
            <span aria-hidden className="block text-5xl">
              ✅
            </span>
            <h3 className="text-lg font-black text-emerald-300">התשלום בוצע!</h3>
            <p className="text-sm text-zinc-300">
              נזקפו{" "}
              <span className="nums font-black text-sky-300" dir="ltr">
                {formatNumber(credited || total)}
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
              <p className="text-xs font-bold text-zinc-400">{pkg.name}</p>
            </div>

            <div className="space-y-2 rounded-xl border border-border-subtle bg-panel-inset p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">יהלומים</span>
                <span className="nums inline-flex items-center gap-1 font-black text-sky-200" dir="ltr">
                  <Icon name="diamond" size={16} className="text-cyan-300" />
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

            {paypalClientId ? (
              <div className="grid gap-2">
                <PayPalCheckout
                  clientId={paypalClientId}
                  packageId={pkg.id}
                  onPaid={(diamonds) => {
                    setPaidDiamonds(diamonds);
                    // Refresh the server-rendered diamond counters in the layout.
                    router.refresh();
                  }}
                />
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost w-full text-sm"
                >
                  ביטול
                </button>
              </div>
            ) : (
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
            )}

            {/* Said out loud because the PayPal logo makes players assume an
                account is required and close the modal — the card button is the
                one most Israeli buyers actually want. */}
            {paypalClientId && (
              <p className="text-center text-[11px] text-zinc-500">
                אפשר לשלם בכרטיס אשראי או חיוב גם בלי חשבון PayPal.
              </p>
            )}

            <p className="text-center text-[11px] leading-relaxed text-zinc-500">
              בהשלמת הרכישה אתה מאשר את{" "}
              <Link href="/terms" target="_blank" className="text-gold underline">
                תנאי השימוש
              </Link>{" "}
              ואת{" "}
              <Link href="/refund" target="_blank" className="text-gold underline">
                מדיניות הביטולים
              </Link>
              .
            </p>

            {testMode && (
              <p className="text-center text-[11px] text-zinc-500">
                {paypalClientId
                  ? "מצב בדיקה (PayPal Sandbox) — לא מתבצע חיוב אמיתי."
                  : "מצב הדגמה — לא מתבצע חיוב אמיתי עד לחיבור ספק התשלומים."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
