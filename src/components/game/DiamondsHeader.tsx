import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";

/**
 * Shared header for the two diamond screens — the balance on one side and a
 * segmented switch between "spend" (/game/diamonds) and "buy"
 * (/game/diamonds/buy) on the other. Both pages render it so the player always
 * sees the balance and can hop between the screens without a stray link
 * dangling at the bottom of the page.
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
    <div className="panel-gold rounded-2xl px-4 py-3.5">
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
            <p className="nums mt-1.5 text-2xl font-black text-sky-300" dir="ltr">
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
