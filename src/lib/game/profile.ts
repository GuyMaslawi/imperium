/**
 * The player's own words on their dossier — the limits and the one pure
 * function the editor and the action both need.
 *
 * Kept out of the action module because a `"use server"` file may only export
 * async functions, and the textarea needs the cap and the normaliser at render
 * time to draw an honest counter.
 */

import { clampChars, stripInvisible } from "./text";

/**
 * Longest blurb. Deliberately shorter than a letter (MESSAGE_BODY_MAX = 1000):
 * this is a caption under a medal case in a 288px column, and the version of it
 * that reads well is a sentence or three. A player with more to say has mail,
 * chat and a guild page.
 */
export const BIO_MAX = 400;

/**
 * Most lines a blurb may occupy.
 *
 * The character cap alone does not bound the *height* of the column: 400
 * characters spent one per line is a two-hundred-row panel on somebody else's
 * screen, which is the same layout abuse a wall of blank chat lines is. Nobody
 * writing prose comes near this — it is reached only on purpose.
 */
export const BIO_MAX_LINES = 12;

/**
 * Collapse a submitted blurb to what actually gets stored.
 *
 * The hygiene is chat's (see normalizeChatBody), with one deliberate
 * difference: a chat line is one line, so it collapses every run of breaks to a
 * single newline. A blurb is a paragraph or three — "who I am / what I play for
 * / who not to raid" — so a blank line between paragraphs survives, and only
 * runs longer than that are collapsed.
 *
 * Everything here is about layout rather than language: what a player says
 * about themselves is their business, but it may not reverse the page, pad
 * itself with invisible characters, or grow the column without bound.
 */
export function normalizeBio(raw: string): string {
  const collapsed = stripInvisible(raw)
    .replace(/\r\n?/g, "\n")
    // Three or more breaks (with any spacing between them) become one blank
    // line — a paragraph gap, never a scroll.
    .replace(/\n[ \t]*(\n[ \t]*){2,}/g, "\n\n")
    // …and a "blank" line is a genuinely empty one, not one padded with spaces.
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/[ \t]{3,}/g, "  ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  // Line cap before the character cap, so the cut that ends up stored is the
  // stricter of the two rather than whichever ran last.
  const lines = collapsed.split("\n");
  const bounded =
    lines.length <= BIO_MAX_LINES
      ? collapsed
      : lines.slice(0, BIO_MAX_LINES).join("\n");

  return clampChars(bounded, BIO_MAX);
}
