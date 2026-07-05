const nf = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });

export function formatNumber(value: number): string {
  return nf.format(Math.floor(value));
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  return nf.format(Math.floor(value));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
