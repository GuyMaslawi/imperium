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
 * anything more specific is a matter of typing over them. Written to read as an
 * in-game system message, because that is exactly what gets posted to Discord:
 * the same words, unchanged.
 */
export const BROADCAST_DEFAULTS = {
  title: "📣 הודעה מההנהלה",
  body:
    "שחקנים יקרים,\n" +
    "עדכון חדש עלה לקראלדור. היכנסו לראות מה השתנה.\n" +
    "נתראה בשדה הקרב! ⚔️",
} as const;

export const GIFT_DEFAULTS = {
  title: "🎁 מתנה מההנהלה",
  body:
    "מתנה קטנה מאיתנו — היא כבר נכנסה לאוצר שלכם.\n" +
    "תעשו בה שימוש חכם. ⚔️",
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
