const nf = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });

// Suffixes for large numbers: million, billion, trillion, quadrillion, quintillion.
const UNITS = [
  { value: 1e18, suffix: "Qi" },
  { value: 1e15, suffix: "Qa" },
  { value: 1e12, suffix: "T" },
  { value: 1e9, suffix: "B" },
  { value: 1e6, suffix: "M" },
];

export function formatNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const unit = UNITS.find((u) => abs >= u.value)!;
    const scaled = value / unit.value;
    // 2 significant decimals for < 10, else 1 — trim trailing zeros.
    const digits = Math.abs(scaled) < 10 ? 2 : 1;
    const text = scaled.toFixed(digits).replace(/\.?0+$/, "");
    return `${text}${unit.suffix}`;
  }
  return nf.format(Math.floor(value));
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const unit = UNITS.find((u) => abs >= u.value)!;
    const text = (value / unit.value).toFixed(1).replace(/\.0$/, "");
    return `${text}${unit.suffix}`;
  }
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return nf.format(Math.floor(value));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
