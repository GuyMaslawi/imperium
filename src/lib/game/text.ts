/**
 * Hygiene shared by every free-text field a player can write into the game —
 * chat lines today, and the profile blurb beside them.
 *
 * Both of these were written for chat first (see normalizeChatBody) and pulled
 * out here when the profile needed the same two guarantees: that nothing
 * invisible survives a submission, and that a cut never lands inside a
 * character. The collapse rules themselves are *not* shared — a chat line is one
 * line and a blurb has paragraphs — so each field keeps its own normaliser and
 * only the two primitives live here.
 */

/**
 * Controls, the zero-width family and the bidi overrides — everything that
 * renders as nothing but survives a length check.
 *
 * Tab and newline are deliberately outside the ranges: they are the only
 * whitespace a normaliser is allowed to interpret rather than delete.
 *
 * The bidi marks matter more here than they would in a left-to-right app: an
 * unpaired RLO reverses everything rendered after it, so one submitted line
 * could scramble the rest of the panel it sits in.
 *
 * U+200D (the zero-width JOINER) is deliberately NOT in the list, even though
 * it is invisible: it is the glue inside every compound emoji, so stripping it
 * turns 👨‍👩‍👧 into three separate people and 🏳️‍🌈 into a white flag. Padding text
 * with joiners is still bounded by the length cap.
 */
const INVISIBLE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B\u200C\u200E\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** Drop everything invisible; see INVISIBLE for what that covers and what it doesn't. */
export function stripInvisible(raw: string): string {
  return raw.replace(INVISIBLE, "");
}

/**
 * Count characters the way a reader does — by code point, not by UTF-16 unit.
 *
 * `"🙂".length` is 2, so a plain `.length` cap spends a player's whole budget on
 * half as many emoji as it promised.
 */
export function charCount(text: string): number {
  return [...text].length;
}

/**
 * Cut text to a length cap **by character, not by code unit**.
 *
 * `String.slice` counts UTF-16 units, so a cut that lands between the two halves
 * of an emoji leaves a lone surrogate — a permanent "�" in somebody's text,
 * stored that way forever. Spreading the string iterates by code point, so the
 * cut can only ever fall between whole characters.
 *
 * Multi-code-point sequences (a flag, a family, a skin tone) can still be split
 * into their parts at the very end of an over-long run; that degrades to
 * separate emoji rather than to a broken glyph.
 */
export function clampChars(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : chars.slice(0, max).join("");
}
