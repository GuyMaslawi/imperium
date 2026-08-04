/**
 * The text side of an admin broadcast: what the forms start out saying, and
 * which audiences are public.
 *
 * Pure and client-safe on purpose — the admin form renders the defaults and the
 * server action builds the Discord post from the same module, so the two can
 * never drift into describing the same send differently.
 */

/* ----------------------------- form defaults ----------------------------- */

/**
 * What the broadcast and gift forms are pre-filled with.
 *
 * Not placeholders — real values, so a routine announcement takes one click and
 * anything more specific is a matter of typing over them.
 *
 * These four strings are the exception to the site's literary Hebrew, because
 * they are the one bit of site copy that is *also* a Discord post — mirrored
 * word for word — and they are read on a phone, mid-scroll, by someone deciding
 * in two seconds whether to open the game. So they take the channel's voice
 * instead of the site's: two short lines, no salutation, no sign-off, the news
 * in the first four words. "שחקנים יקרים," reads like a letter from a bank; the
 * player is being told something happened, not addressed.
 */
export const BROADCAST_DEFAULTS = {
  // i18n-exempt-start: the default text of a broadcast. An admin edits it in
  // the control centre before sending, and it then lands in one stored Message
  // row per player — one text, every reader. See the note in `attackEmpire`.
  title: "📣 עדכון חדש עלה לאוויר",
  body:
    "יש חדש בקראלדור. 🚀\n" +
    "תיכנסו לראות מה השתנה — ונתראה בשדה. ⚔️",
} as const;

export const GIFT_DEFAULTS = {
  title: "🎁 נחת לכם באוצר",
  body:
    "המתנה כבר אצלכם — לא צריך לעשות כלום. 💰\n" +
    "תשרפו את זה חכם. ⚔️", // i18n-exempt-end
} as const;

/* ------------------------------- audiences ------------------------------- */

/**
 * Is this audience the whole game — and therefore public?
 *
 * The two game-wide scopes get mirrored to Discord; a season, a guild or a
 * single player never do. That line is about privacy, not size: a message aimed
 * at one guild or one player is reposted into a room its target may not even be
 * in, which leaks who was told what. "Everyone" and "everyone who has played
 * lately" leak nothing — the second is simply the first minus the people who
 * were not going to read it anyway.
 */
export function isGameWideScope(scope: string): boolean {
  return scope === "all" || scope === "active";
}
