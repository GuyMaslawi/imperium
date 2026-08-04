import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_DIR,
  toLocale,
  type Locale,
} from "./locale";
import { makeT, type T } from "./translate";

/** Re-exported so a caller that threads the translator through a helper can
 * name its type without also importing from `./translate`. */
export type { T } from "./translate";

/**
 * The reader's language, on the server.
 *
 * `cache`d per request: a page load asks for it from the layout, from the page
 * itself, and from every server component underneath — this makes all of those
 * one cookie read.
 *
 * Reading `cookies()` opts the caller into dynamic rendering. Every screen in
 * the game is already dynamic (they all read the session), so nothing here
 * loses static rendering that it had. The public pages that *are* static — the
 * legal pages — take the same hit knowingly: a terms page that renders in the
 * wrong language is worse than a terms page that is not cached.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const store = await cookies();
    return toLocale(store.get(LOCALE_COOKIE)?.value);
  } catch {
    // No request to read a cookie from. `cookies()` throws rather than
    // returning empty, and there are three real callers with no request:
    //
    //  - the scripts in scripts/ (the wipe, the repairs, the backfills);
    //  - the DB test suite, which calls server actions directly;
    //  - anything the game does off a request — a season closing on its own
    //    clock, a scheduled announcement.
    //
    // All of those still build player-facing strings, so `t()` must work for
    // them. The source language is the right answer: there is no reader here
    // whose preference could be honoured, and Hebrew is what every stored row
    // written before this existed is already in.
    return DEFAULT_LOCALE;
  }
});

/**
 * The translator for this request. The one thing a server component or a
 * server action needs:
 *
 *     const t = await getT();
 *     return <h1>{t("בסיס האימפריה")}</h1>;
 */
export const getT = cache(async (): Promise<T> => makeT(await getLocale()));

/** The server counterpart of `useDir()` — see the note there for when it is needed. */
export async function getDir(): Promise<"rtl" | "ltr"> {
  return LOCALE_DIR[await getLocale()];
}

/**
 * Locale, translator and direction in one await, for the many call sites that
 * need more than one — a component that translates text and also formats a
 * number, or a layout that translates and sets `dir`.
 */
export async function getI18n(): Promise<{
  locale: Locale;
  t: T;
  dir: "rtl" | "ltr";
}> {
  const locale = await getLocale();
  return { locale, t: makeT(locale), dir: LOCALE_DIR[locale] };
}
