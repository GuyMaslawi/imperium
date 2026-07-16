/** Thin progress meter. `tone` selects the fill gradient. */
export function Meter({
  value,
  max = 100,
  tone = "xp",
  className = "",
}: {
  value: number;
  max?: number;
  tone?: "xp" | "health";
  className?: string;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`meter meter-${tone} ${className}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * A two-sided power bar (red vs blue) like the hero attack/defence gauge in
 * the reference sidebar.
 */
export function DuelBar({
  leftPct,
  className = "",
}: {
  /** 0–100, share going to the left (red) side. */
  leftPct: number;
  className?: string;
}) {
  const left = Math.max(0, Math.min(100, leftPct));
  return (
    <div
      className={`flex h-1.5 overflow-hidden rounded-full border border-black/50 ${className}`}
    >
      <span style={{ width: `${left}%` }} className="bg-gradient-to-l from-red-500 to-red-700" />
      <span style={{ width: `${100 - left}%` }} className="bg-gradient-to-r from-sky-500 to-sky-700" />
    </div>
  );
}
