import type { CSSProperties } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";

/**
 * Flecks of light off the cut stone. Fixed positions and delays, like every
 * other scene on the site, so the server and the first client frame agree.
 */
const SPARKS = [
  { x: "12%", y: "28%", d: "0s", dur: "6s" },
  { x: "31%", y: "68%", d: "2.1s", dur: "7s" },
  { x: "52%", y: "22%", d: "3.4s", dur: "6.5s" },
  { x: "68%", y: "74%", d: "1.2s", dur: "7.5s" },
  { x: "84%", y: "36%", d: "4.3s", dur: "6.2s" },
  { x: "93%", y: "66%", d: "2.7s", dur: "8s" },
];

/**
 * Shared header for the two diamond screens — the balance on one side and a
 * segmented switch between "spend" (/game/diamonds) and "buy"
 * (/game/diamonds/buy) on the other. Both pages render it so the player always
 * sees the balance and can hop between the screens without a stray link
 * dangling at the bottom of the page.
 *
 * It is also the one element both screens share, so the vault scene lives
 * here: a cut stone turning on its axis, a wheel of light off its facets and
 * sparks in the air. Cold blues, deliberately — everything else in KRALDOR
 * is gold and firelight, and diamonds are the one currency you cannot mine.
 */
export function DiamondsHeader({
  diamonds,
  active,
  note,
}: {
  diamonds: number;
  active: "spend" | "buy";
  /** One-line pitch under the switch (optional). */
  note?: string;
}) {
  return (
    <div className="panel-gold dia-vault rounded-2xl px-4 py-3.5">
      <span className="dia-rays" aria-hidden />
      <span className="dia-gem" aria-hidden />
      <span className="dia-sparks" aria-hidden>
        {SPARKS.map((spark) => (
          <span
            key={spark.x}
            style={
              { "--x": spark.x, "--y": spark.y, "--d": spark.d, "--dur": spark.dur } as CSSProperties
            }
          />
        ))}
      </span>

      <div className="dia-body">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          {/* balance */}
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-500/10">
              <Icon name="diamond" size={24} className="text-cyan-300" />
            </span>
            <div className="leading-none">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                היתרה שלך
              </p>
              <p className="nums dia-balance mt-1.5 text-2xl font-black text-sky-300" dir="ltr">
                {formatNumber(diamonds)}
              </p>
            </div>
          </div>

          {/* spend / buy switch */}
          <nav className="flex gap-1 rounded-xl border border-border-subtle bg-panel-inset p-1">
            <Tab href="/game/diamonds" icon="shop" label="הוצאת יהלומים" active={active === "spend"} />
            <Tab href="/game/diamonds/buy" icon="gift" label="רכישת יהלומים" active={active === "buy"} />
          </nav>
        </div>

        {note && <p className="mt-3 text-xs leading-relaxed text-zinc-400">{note}</p>}
      </div>
    </div>
  );
}

function Tab({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: "shop" | "gift";
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition-colors sm:text-sm ${
        active
          ? "bg-gradient-to-b from-tan-bright to-tan text-[#241a06] shadow-[0_2px_0_rgba(0,0,0,0.35)]"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
      }`}
    >
      <Icon name={icon} size={15} />
      {label}
    </Link>
  );
}
