import { DEFAULT_LOCALE, type Locale } from "./locale";
import { EN } from "./dictionaries/en";

/**
 * The translator.
 *
 * ## Why the Hebrew text is the key
 *
 * The usual shape for this is a made-up key per string (`weapons.buy.cta`) and
 * one dictionary per language. That is the right call when a project starts
 * multilingual. This one did not: there are ~4,400 lines of Hebrew already
 * written across 209 files, and inventing a name for each of them is a second
 * full pass over the codebase that buys nothing — the names would be derived
 * from the Hebrew anyway.
 *
 * So the source text *is* the key. Three things follow, and all three are why
 * this is the right trade here:
 *
 *  1. **Migration is mechanical.** `קנה` becomes `t("קנה")`. Nothing has to be
 *     invented, nothing has to be looked up, and a reviewer can read the call
 *     site and see exactly what it renders.
 *  2. **Hebrew cannot regress.** `he` returns the source untouched — it never
 *     consults a dictionary at all. Every existing player sees byte-identical
 *     text no matter how far the English translation has got.
 *  3. **English degrades one string at a time.** A key with no entry falls back
 *     to the Hebrew source, so a half-translated screen is a half-translated
 *     screen, not a wall of `missing.key.name`.
 *
 * The cost is that two different Hebrew strings that happen to be identical
 * cannot be translated differently. That collision is real but rare, and the
 * escape hatch is to disambiguate at the call site (`t("כוח — התקפה")`).
 *
 * ## Placeholders
 *
 * `{name}` in the source, filled from `params`. This is what replaces a
 * template literal, and it is what makes a translatable sentence possible at
 * all: word order differs between the two languages, so the number and the
 * noun cannot be concatenated at the call site.
 *
 *     t("נקנו {count} {weapon} בהצלחה!", { count: 5_000, weapon: "חרב" })
 *
 * A placeholder with no matching param is left standing rather than replaced
 * with "undefined" — a visible `{count}` in one string is a bug report; the
 * word "undefined" in the middle of a sentence is a mystery.
 */
export type TranslateParams = Record<string, string | number>;

export type T = (source: string, params?: TranslateParams) => string;

/** The English dictionary, exposed for the coverage script and for tests. */
export const DICTIONARIES: Record<Exclude<Locale, "he">, Record<string, string>> = {
  en: EN,
};

function interpolate(text: string, params?: TranslateParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole
  );
}

/**
 * Build a translator bound to one language. Cheap — it closes over a dictionary
 * that is already in memory, so a component may call this per render.
 */
export function makeT(locale: Locale): T {
  if (locale === DEFAULT_LOCALE) {
    // The source language: no lookup, no fallback, no chance of drift.
    return (source, params) => interpolate(source, params);
  }
  const dict = DICTIONARIES[locale as Exclude<Locale, "he">] ?? {};
  return (source, params) => interpolate(dict[source] ?? source, params);
}

/**
 * Format a number in the reader's language. Both languages use Western digits
 * and a comma group separator, so this changes nothing today — it exists so the
 * `"he-IL"` literal scattered through the codebase has one place to become a
 * variable, and a third language does not have to hunt them down.
 */
export function localeTag(locale: Locale): string {
  return locale === "he" ? "he-IL" : "en-US";
}
