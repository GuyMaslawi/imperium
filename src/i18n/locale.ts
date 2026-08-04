/**
 * The languages the site speaks, and how a request is told which one to use.
 *
 * Pure constants with no imports, because everything else in the i18n layer
 * needs them: the server helper, the client provider, the middleware-free
 * cookie switch, and the root layout that stamps `lang`/`dir` on <html>.
 *
 * ## Why a cookie and not a `/en/...` path
 *
 * The game was built as a single-locale Hebrew app and its routes are wired
 * through ~40 `page.tsx` files, dozens of `<Link href="/game/...">` and a long
 * tail of `redirect("/game/base")` calls in server actions. Moving all of that
 * under `app/[lang]/` means every one of those strings grows a prefix, and any
 * one that is missed silently drops the player back into the default language
 * mid-session. A cookie costs none of that: the URL space is untouched, the
 * links keep working, and the only thing that changes per request is which
 * dictionary `getT()` hands back.
 *
 * The trade is that a shared link does not carry the sender's language. For a
 * logged-in game whose pages are all private and dynamic anyway — none of them
 * are indexed, and there is nothing to rank — that costs nothing real.
 */

export const LOCALES = ["he", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * Hebrew: the language the game was written in and the one every untranslated
 * string falls back to, so a missing entry in the English dictionary shows the
 * original rather than a key or a blank.
 */
export const DEFAULT_LOCALE: Locale = "he";

/** Cookie the switch writes and every request reads. */
export const LOCALE_COOKIE = "kraldor_lang";

/** A year: the choice is a preference, not a session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Writing direction per language — what <html dir> gets. */
export const LOCALE_DIR: Record<Locale, "rtl" | "ltr"> = {
  he: "rtl",
  en: "ltr",
};

/** What each language calls itself, for the switch. */
export const LOCALE_LABEL: Record<Locale, string> = {
  he: "עברית",
  en: "English",
};

/** Short badge for the switch in the command bar, where space is scarce. */
export const LOCALE_SHORT: Record<Locale, string> = {
  he: "עב",
  en: "EN",
};

/**
 * BCP 47 tag for `Intl` / `toLocaleString`. Separate from `Locale` because the
 * dictionary is keyed by language while number and date formatting want a
 * region too.
 */
export const LOCALE_TAG: Record<Locale, string> = {
  he: "he-IL",
  en: "en-US",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Narrow an untrusted value (a cookie, a form field) to a language. */
export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
