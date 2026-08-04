import { LOCALE_TAG, type Locale } from "@/i18n/locale";

/**
 * One formatter for both languages: Hebrew and English group thousands the same
 * way and share Western digits, so a figure reads identically either side of the
 * switch. Dates do not — see `formatDate`.
 */
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// Suffixes for large numbers: million, billion, trillion, quadrillion, quintillion.
const UNITS = [
  { value: 1e18, suffix: "Qi" },
  { value: 1e15, suffix: "Qa" },
  { value: 1e12, suffix: "T" },
  { value: 1e9, suffix: "B" },
  { value: 1e6, suffix: "M" },
];

/**
 * Print `value` in the largest unit it fits in — *after* rounding.
 *
 * Choosing the unit by raw magnitude alone is off by a whole unit at the top of
 * every band: 999,950,000,000 is short of a trillion, so it lands in the
 * billions, and one decimal rounds its mantissa up to four digits — "1000B",
 * which is not how anyone writes a trillion. Whenever the rounded mantissa
 * reaches 1000 we climb one unit and re-round there, so the same figure reads
 * "1T". The check has to happen on the rounded text, not on the value: it is
 * the rounding itself that pushes it over.
 *
 * `digits` decides the decimals for a given mantissa, and is re-asked after a
 * promotion because the mantissa changes (999.95B → 1.00T).
 */
function withUnit(value: number, digits: (mantissa: number) => number): string {
  const abs = Math.abs(value);
  let index = UNITS.findIndex((u) => abs >= u.value);
  const print = (i: number) => {
    const mantissa = value / UNITS[i].value;
    return mantissa.toFixed(digits(Math.abs(mantissa)));
  };
  let text = print(index);
  if (Math.abs(Number(text)) >= 1000 && index > 0) text = print(--index);
  // Trailing zeros carry nothing: "1.00T" is a trillion, and so is "1T".
  return `${text.replace(/\.?0+$/, "")}${UNITS[index].suffix}`;
}

export function formatNumber(value: number): string {
  const abs = Math.abs(value);
  // 2 significant decimals for a mantissa < 10, else 1 — trailing zeros trimmed.
  if (abs >= 1_000_000) return withUnit(value, (m) => (m < 10 ? 2 : 1));
  return nf.format(Math.floor(value));
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return withUnit(value, () => 1);
  // Same boundary one unit down: 999,950 rounds to "1000K", i.e. a million.
  if (abs >= 10_000) {
    const text = (value / 1_000).toFixed(1);
    if (Math.abs(Number(text)) >= 1000) {
      return `${(value / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    }
    return `${text.replace(/\.0$/, "")}K`;
  }
  return nf.format(Math.floor(value));
}

/**
 * A bonus figure, as it is printed everywhere gear is shown.
 *
 * Percentages are no longer whole: an extra on a low-rung item is genuinely
 * worth a quarter of a percent, and it says so. Only the digits that carry
 * information are printed — "+40%", not "+40.00%".
 *
 * Flat counts are always whole, so they take the decimals branch never and the
 * shared number formatting always: a maxed relic pays 350,000,000 resources per
 * update and has to read as "350M" on a tile the way every other large figure in
 * the game does. Percentages top out at +40 and so never reach a separator.
 */
export function formatBonus(value: number): string {
  return Number.isInteger(value)
    ? formatNumber(value)
    : String(Number(value.toFixed(2)));
}

/**
 * A timestamp in the reader's language.
 *
 * The locale is a required argument rather than a default, because the two
 * languages order the parts differently — 5.8.26 to a Hebrew reader is 8/5/26
 * to an English one, and a date that silently picks the wrong one is read
 * wrong rather than read as untranslated. Every caller is a server component or
 * a client component under the locale provider, so both have it to hand.
 */
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
