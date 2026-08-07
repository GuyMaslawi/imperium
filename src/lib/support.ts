/**
 * The support chat's limits and its two pure functions.
 *
 * Kept out of the action module because a `"use server"` file may only export
 * async functions — the composer needs the length cap at render time, and the
 * widget needs the poll cadence. Kept out of `lib/game/` too: this is the one
 * conversation in the app that is *not* part of the game. Its writer may have no
 * empire, no verified address, no session at all.
 */

import { clampChars, stripInvisible } from "@/lib/game/text";

/**
 * Longest single support message.
 *
 * Three times the chat's cap (CHAT_BODY_MAX = 300) and the same as the player
 * inbox's, because the two are the same kind of writing: a chat line is a shout
 * across a room, but "I paid and got nothing, here is the confirmation number
 * and what the screen said" is a letter. Cutting that at 300 characters would
 * make the first message of every real ticket arrive in three pieces.
 */
export const SUPPORT_BODY_MAX = 1000;

/** Longest address we will store as a reply-to. The RFC's practical ceiling. */
export const SUPPORT_EMAIL_MAX = 254;

/** How much transcript one poll ships. A support thread is short by nature. */
export const SUPPORT_PAGE_SIZE = 60;

/** Threads listed in the admin inbox, newest activity first. */
export const SUPPORT_INBOX_MAX = 60;

/**
 * How many conversations one address may *start* in an hour.
 *
 * Opening a thread is the expensive half — it writes a row, and it pings
 * Discord, which is the part that turns an open endpoint into somebody else's
 * notification spam. Three is more than any honest visitor needs (the second
 * one already means "I could not find my first"), and every message after that
 * goes into a thread that already exists, budgeted separately below.
 */
export const SUPPORT_NEW_LIMIT = 3;
export const SUPPORT_NEW_WINDOW_MS = 60 * 60 * 1000;

/** What a human types: two lines in ten seconds is a fast typist, more is a loop. */
export const SUPPORT_BURST_LIMIT = 3;
export const SUPPORT_BURST_WINDOW_MS = 10 * 1000;

/** Volume inside one conversation. Generous — a frustrated person writes a lot. */
export const SUPPORT_SEND_LIMIT = 20;
export const SUPPORT_SEND_WINDOW_MS = 5 * 60 * 1000;

/**
 * The backstop the other two cannot provide: both of them are keyed on a thread,
 * and a thread is identified by a cookie the client controls. Deleting the
 * cookie is a fresh bucket, so the address behind it gets its own ceiling.
 */
export const SUPPORT_IP_LIMIT = 40;
export const SUPPORT_IP_WINDOW_MS = 60 * 60 * 1000;

/** How long a just-sent line blocks an identical repeat. */
export const SUPPORT_REPEAT_WINDOW_MS = 60 * 1000;

/**
 * How long after a Discord ping about a thread the next one is allowed.
 *
 * Somebody describing a problem writes in bursts — three short lines in a
 * minute, then nothing for ten. One notification per burst is the useful signal;
 * one per line is what makes staff mute the channel.
 */
export const SUPPORT_PING_COOLDOWN_MS = 10 * 60 * 1000;

/** How long the visitor's cookie lives. Long enough to still be there when they
 *  come back the next evening to see whether anybody answered. */
export const SUPPORT_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30;

/** The cookie itself. Named like the session so the pair is recognisable. */
export const SUPPORT_COOKIE = "kraldor_support";

/** Bound on the client-supplied poll cursor and on any id reaching a query. */
export const SUPPORT_ID_MAX = 64;

/* ------------------------------- cadence -------------------------------- */

/** Open panel: fast enough that a staff reply feels like a conversation. */
export const SUPPORT_POLL_OPEN_MS = 6_000;
/**
 * Shut, with a conversation already going: just the badge. Slower than the
 * chat's 25s because there is exactly one person on the other side and they are
 * typing by hand, not playing.
 */
export const SUPPORT_POLL_CLOSED_MS = 30_000;

/**
 * Collapse a submitted message to what actually gets stored.
 *
 * Deliberately gentler than `normalizeChatBody`: that one flattens every newline
 * run to a single break because a chat line is one line. A bug report is not —
 * "what I did / what I expected / what happened" is three paragraphs, and
 * mangling them costs us the only thing that makes the ticket answerable. So
 * blank lines survive, runs of three or more collapse to one blank line, and the
 * rest of the hygiene (invisible characters, whitespace walls) is the same.
 */
export function normalizeSupportBody(raw: string): string {
  const collapsed = stripInvisible(raw)
    .replace(/\r\n?/g, "\n")
    // Three or more breaks (with any spacing between them) become one blank line.
    .replace(/\n[ \t]*\n[ \t]*(\n[ \t]*)+/g, "\n\n")
    .replace(/[ \t]{4,}/g, "   ")
    .trim();
  return clampChars(collapsed, SUPPORT_BODY_MAX);
}

/**
 * Whether a message repeats what the same side just wrote. The one spam shape a
 * per-minute budget cannot see: a bored visitor holding the send key sends
 * different-enough-in-time, identical-in-content lines.
 */
export function isSupportRepeat(
  body: string,
  previous: { body: string; createdAt: Date } | null,
  now: Date
): boolean {
  if (previous === null) return false;
  if (previous.body !== body) return false;
  return now.getTime() - previous.createdAt.getTime() < SUPPORT_REPEAT_WINDOW_MS;
}

/**
 * A reply-to address, or null.
 *
 * Deliberately forgiving where the registration form is strict: this is a
 * *convenience* — somewhere to write back if the tab is closed — not an identity
 * claim, and nothing is ever sent to it automatically. A visitor who mistypes it
 * still gets their answer in the panel. What it must not be is unbounded, or a
 * newline (a header-injection shape) in a field that a human will later paste
 * into a mail client.
 */
export function normalizeSupportEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = stripInvisible(raw).replace(/\s+/g, "").toLowerCase();
  if (email.length === 0 || email.length > SUPPORT_EMAIL_MAX) return null;
  // One @, something either side of it, and a dot in the domain. Anything
  // stricter rejects addresses that are perfectly valid and belong to people
  // who are already having a bad day.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  return email;
}

/**
 * Bounds on the poll cursor the client supplies. Same reasoning as the chat's
 * `parseSinceMs`: it goes straight into `new Date()` and from there into a
 * query, so anything unparseable degrades to "send me the tail" rather than
 * turning a poll into a caught exception and an empty panel.
 */
export function parseSupportSince(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const ms = Math.floor(value);
  if (ms <= 0 || ms > 8.64e15) return undefined;
  return ms;
}
