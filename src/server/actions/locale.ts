"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  toLocale,
} from "@/i18n/locale";

/**
 * Switch the site's language.
 *
 * Deliberately the shallowest action in the codebase: no session, no rate
 * limit, no empire. Choosing a language is not an authenticated act — the
 * landing page, the login form and the legal pages all need the switch, and
 * gating it would leave a logged-out visitor stuck in a language they cannot
 * read on the one screen that is meant to let them in.
 *
 * `httpOnly: false` for the same reason: nothing here is a secret, and a
 * readable cookie lets a future client-side render pick the language up without
 * a round trip. `sameSite: "lax"` keeps it off cross-site requests anyway.
 *
 * The value is narrowed through `toLocale`, so an unknown string from a forged
 * form lands on Hebrew rather than being written back verbatim and reflected
 * into `<html lang>`.
 *
 * `revalidatePath("/", "layout")` is what makes the change appear: every screen
 * renders on the server from `getT()`, so the cached render of the current page
 * is in the *old* language and has to be thrown away. Scoped to the root layout
 * because the switch itself lives there — one action, every page.
 */
export async function setLocale(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get("locale"));
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });
  revalidatePath("/", "layout");
}
