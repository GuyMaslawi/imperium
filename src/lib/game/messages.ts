/**
 * Shared limits for player-to-player mail. They live here rather than in the
 * action module because a `"use server"` file may only export async functions —
 * the compose form needs these values at render time.
 */

/** Hard cap on how many players one message may be addressed to. */
export const MESSAGE_MAX_RECIPIENTS = 10;
export const MESSAGE_TITLE_MAX = 80;
export const MESSAGE_BODY_MAX = 1000;

/**
 * Three budgets, because each bounds a different abuse.
 *
 * SEND caps how often the action runs at all. On its own it bounds nothing a
 * spammer cares about: at ten sends of ten addressees it still permits a
 * hundred deliveries per window, so RECIPIENT is the one that actually limits
 * volume — it is charged per addressee, not per call.
 *
 * Neither stops the case that matters most to the player on the receiving end:
 * a whole budget aimed at one person. PAIR is per sender→recipient, over a
 * longer window, so burning the volume budget on a single target buys a few
 * messages rather than a mailbox full.
 */
export const MESSAGE_SEND_LIMIT = 10;
export const MESSAGE_SEND_WINDOW_MS = 5 * 60 * 1000;

// A multiple of MESSAGE_MAX_RECIPIENTS on purpose. The budget refuses a send
// whole rather than delivering part of it, so a limit that does not divide by
// the per-send cap would leave a remainder too small to spend — three full
// address lists fit exactly, and nothing is stranded.
export const MESSAGE_RECIPIENT_LIMIT = 3 * MESSAGE_MAX_RECIPIENTS;
export const MESSAGE_RECIPIENT_WINDOW_MS = 5 * 60 * 1000;

export const MESSAGE_PAIR_LIMIT = 5;
export const MESSAGE_PAIR_WINDOW_MS = 60 * 60 * 1000;

/* ------------------------- the addressee picker ------------------------- */

/**
 * How many empires the composer is seeded with, alphabetically, before anybody
 * types.
 *
 * The picker used to be handed the *whole* game — a thousand `{id, name}` rows,
 * serialised into the RSC payload of /game/messages on every load and every
 * refresh of it, so that a search box could filter them in the browser. That is
 * the entire player directory shipped to every client, repeatedly, to answer a
 * question the database answers in one indexed query. The seed is what the list
 * shows at rest; anything past it is reached by typing, which is what the search
 * box was already for.
 */
export const MESSAGE_ROSTER_SEED = 40;

/** Minimum characters before the composer asks the server for matches. */
export const MESSAGE_SEARCH_MIN = 2;

/** Most matches one search returns. */
export const MESSAGE_SEARCH_MAX_RESULTS = 30;
