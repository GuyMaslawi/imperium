"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_DIR, type Locale } from "./locale";
import { makeT, type T } from "./translate";

/**
 * The reader's language, on the client.
 *
 * The root layout resolves it from the cookie and hands it down through this
 * provider, so a client component never reads `document.cookie` and never
 * renders the wrong language for a frame. The value is a plain string, which is
 * all that crosses the server/client boundary — the dictionary itself is
 * imported by the bundle, not serialised into the RSC payload.
 *
 * The default is the source language rather than a throw: a client component
 * rendered outside the provider (a test, a Storybook-style harness) should show
 * Hebrew, not crash.
 */
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/**
 * The client counterpart of `getT()`:
 *
 *     const t = useT();
 *     return <button>{t("קנה")}</button>;
 *
 * Memoised on the language so the identity is stable across renders — it is a
 * legitimate dependency of a `useMemo`/`useEffect` in a component that builds
 * translated strings.
 */
export function useT(): T {
  const locale = useLocale();
  return useMemo(() => makeT(locale), [locale]);
}

/**
 * The document's writing direction, for the handful of boxes that have to say
 * it out loud.
 *
 * `<html dir>` already carries it, and prose inherits — so most components need
 * nothing. These do:
 *
 *  - anything portaled to `<body>` that sits under a `dir="ltr"` wrapper (the
 *    command bar sets LTR so the emblem stays on the right in both languages);
 *  - a row whose *order* is meaningful and which lives inside such a wrapper.
 *
 * Writing `dir="rtl"` at those sites was correct while the site had one
 * language. It is now a bug in the making: an English page with an RTL island
 * inside it lays its own children out backwards.
 */
export function useDir(): "rtl" | "ltr" {
  return LOCALE_DIR[useLocale()];
}
