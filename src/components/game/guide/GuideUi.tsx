import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Presentational vocabulary of the guide screen (/game/guide).
 *
 * The manual is one very long page, so it lives or dies on rhythm: every
 * section opens the same way, every formula is set in the same plaque, every
 * worked example reads the same. These primitives are that rhythm — nothing
 * here holds game logic, and nothing here is a client component, so the whole
 * page streams as RSC except for the handful of calculators.
 */

/* ------------------------------ section shell ------------------------------ */

export interface GuideSectionMeta {
  id: string;
  /** Hebrew title, as it appears in the heading and the table of contents. */
  title: string;
  /** Small uppercase english line under the title. */
  sub: string;
  icon: IconName;
}

export function GuideSection({
  meta,
  index,
  children,
}: {
  meta: GuideSectionMeta;
  /** 1-based position — printed in the diamond numeral. */
  index: number;
  children: ReactNode;
}) {
  return (
    <section id={meta.id} className="scroll-mt-24">
      <header className="mb-4 flex items-center gap-3">
        <span className="guide-num" aria-hidden>
          <span className="nums">{String(index).padStart(2, "0")}</span>
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-wide text-gold-bright sm:text-xl">
            <Icon name={meta.icon} size={20} className="shrink-0 text-crimson" />
            {meta.title}
          </h2>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-dim">
            {meta.sub}
          </p>
        </div>
        <span className="rule-gold ms-2 hidden flex-1 sm:block" />
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Lead paragraph of a section — slightly larger, bone-toned. */
export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-bone/90 sm:text-[0.95rem]">{children}</p>
  );
}

/* ------------------------------ formula plaque ------------------------------ */

/** A named quantity inside a formula. */
export function V({ children }: { children: ReactNode }) {
  return <span className="font-bold text-bone-bright">{children}</span>;
}

/** A literal number inside a formula — always LTR, always tabular. */
export function N({ children }: { children: ReactNode }) {
  return (
    <span className="font-black text-gold-bright nums" dir="ltr">
      {children}
    </span>
  );
}

/** An operator / punctuation inside a formula. */
export function O({ children }: { children: ReactNode }) {
  return <span className="px-1 text-gold-dim">{children}</span>;
}

/** The result side of a formula. */
export function R({ children }: { children: ReactNode }) {
  return <span className="font-black text-emerald-300">{children}</span>;
}

export function Formula({
  label,
  expr,
  legend,
  example,
}: {
  /** What is being computed, e.g. "תפוקת מכרה לעדכון רגיל". */
  label?: string;
  expr: ReactNode;
  /** Term → meaning rows explaining each factor. */
  legend?: { term: ReactNode; desc: ReactNode }[];
  /** A fully worked number, so the formula is never abstract. */
  example?: ReactNode;
}) {
  return (
    <div className="guide-formula ps-5 pe-4 py-3.5">
      {label && (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-dim">
          {label}
        </p>
      )}
      <p className="text-[0.9rem] leading-loose">{expr}</p>

      {legend && legend.length > 0 && (
        <dl className="mt-3 grid gap-x-5 gap-y-1.5 border-t border-border-subtle pt-3 text-xs sm:grid-cols-2">
          {legend.map((row, i) => (
            <div key={i} className="flex gap-2">
              <dt className="shrink-0 font-bold text-gold/90">{row.term}</dt>
              <dd className="text-zinc-400">{row.desc}</dd>
            </div>
          ))}
        </dl>
      )}

      {example && (
        <div className="mt-3 flex flex-wrap items-baseline gap-2 rounded-lg bg-black/40 px-3 py-2 text-xs">
          <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-black text-gold-bright">
            דוגמה
          </span>
          <span className="leading-relaxed text-zinc-300">{example}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ callouts & facts ------------------------------ */

const NOTE_TONE = {
  gold: "border-gold/40 bg-gold/8 text-bone",
  green: "border-emerald-500/35 bg-emerald-500/8 text-emerald-100/90",
  red: "border-red-500/35 bg-red-500/8 text-red-100/90",
  purple: "border-purple-500/35 bg-purple-500/8 text-purple-100/90",
} as const;

export function Note({
  tone = "gold",
  icon = "spark",
  title,
  children,
}: {
  tone?: keyof typeof NOTE_TONE;
  icon?: IconName;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex gap-3 rounded-xl border px-4 py-3 text-[0.8rem] leading-relaxed ${NOTE_TONE[tone]}`}
    >
      <Icon name={icon} size={18} className="mt-0.5 shrink-0 opacity-80" />
      <div>
        {title && <p className="mb-0.5 font-black">{title}</p>}
        <div className="text-zinc-300/90">{children}</div>
      </div>
    </div>
  );
}

/** A single headline number — used in rows of three or four. */
export function Fact({
  icon,
  label,
  value,
  hint,
  tone = "text-gold-bright",
}: {
  icon?: IconName;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="panel-inset flex flex-col items-center gap-0.5 rounded-xl px-3 py-3 text-center">
      {icon && <Icon name={icon} size={18} className={`${tone} opacity-80`} />}
      <p className={`text-lg font-black nums ${tone}`} dir="ltr">
        {value}
      </p>
      <p className="text-[11px] font-semibold text-bone/80">{label}</p>
      {hint && <p className="text-[10px] leading-tight text-zinc-500">{hint}</p>}
    </div>
  );
}

/** Scroll container for the wide reference tables. */
export function TableWrap({
  children,
  maxHeight,
}: {
  children: ReactNode;
  maxHeight?: number;
}) {
  return (
    <div
      className="panel-inset overflow-auto rounded-xl"
      style={maxHeight ? { maxHeight } : undefined}
    >
      {children}
    </div>
  );
}

/** A resource amount with its own icon + tint, for cost cells. */
export function Cost({
  amounts,
  className = "",
}: {
  amounts: { key: string; value: number }[];
  className?: string;
}) {
  return (
    <span className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}>
      {amounts
        .filter((a) => a.value > 0)
        .map((a) => (
          <span key={a.key} className="flex items-center gap-1 whitespace-nowrap">
            <Icon
              name={RESOURCE_ICON_SAFE[a.key] ?? "gold"}
              size={13}
              className={RESOURCE_TINT[a.key] ?? "text-gold-bright"}
            />
            <span className="nums text-[0.78rem] text-zinc-300" dir="ltr">
              {formatShort(a.value)}
            </span>
          </span>
        ))}
    </span>
  );
}

const RESOURCE_ICON_SAFE: Record<string, IconName> = {
  gold: "gold",
  wood: "wood",
  iron: "iron",
  stone: "stone",
  diamonds: "diamond",
  citizens: "citizens",
  turns: "turns",
  soldiers: "army",
};

const RESOURCE_TINT: Record<string, string> = {
  gold: "text-gold-bright",
  wood: "text-amber-600",
  iron: "text-slate-300",
  stone: "text-stone-400",
  diamonds: "text-cyan-300",
  citizens: "text-bone",
  turns: "text-emerald-400",
  soldiers: "text-red-300",
};

const SHORT_UNITS: [number, string][] = [
  [1e12, "T"],
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"],
];

/**
 * Compact money formatting for dense table cells. Mirrors `formatNumber` but
 * keeps three significant digits at every magnitude, which is what the weapon
 * and item ladders need once they run past a billion.
 *
 * The unit is chosen *after* rounding, for the same reason `formatNumber` does
 * it (see lib/game/format.ts): at three significant digits 999.6B rounds to a
 * four-digit mantissa, and "1000B" is not how anyone writes a trillion.
 */
function formatShort(value: number): string {
  const abs = Math.abs(value);
  let index = SHORT_UNITS.findIndex(([size]) => abs >= size);
  if (index === -1) return Math.round(value).toLocaleString("he-IL");

  const print = (i: number) => {
    const scaled = value / SHORT_UNITS[i][0];
    const magnitude = Math.abs(scaled);
    return scaled.toFixed(magnitude < 10 ? 2 : magnitude < 100 ? 1 : 0);
  };
  let text = print(index);
  if (Math.abs(Number(text)) >= 1000 && index > 0) text = print(--index);
  // Only ever trim a fractional tail. Trimming unconditionally eats real
  // trailing zeros in the integer part — 610.351M rendered as "61M".
  const trimmed = text.includes(".") ? text.replace(/\.?0+$/, "") : text;
  return `${trimmed}${SHORT_UNITS[index][1]}`;
}

export { formatShort };
