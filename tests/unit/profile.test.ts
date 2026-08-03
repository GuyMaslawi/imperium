import { describe, expect, it } from "vitest";

import { BIO_MAX, BIO_MAX_LINES, normalizeBio } from "@/lib/game/profile";
import { charCount } from "@/lib/game/text";

describe("normalizeBio", () => {
  it("keeps ordinary prose intact", () => {
    expect(normalizeBio("  קיסר תדמור, לא תוקף חלשים  ")).toBe(
      "קיסר תדמור, לא תוקף חלשים"
    );
  });

  it("keeps a paragraph break but not a run of them", () => {
    // The one difference from a chat line: a blurb is allowed to have
    // paragraphs, so a single blank line survives.
    expect(normalizeBio("מי אני\n\nמה אני משחק")).toBe("מי אני\n\nמה אני משחק");
    expect(normalizeBio("a\nb")).toBe("a\nb");
    expect(normalizeBio("a\n\n\n\n\n\nb")).toBe("a\n\nb");
    // A "blank" line padded with spaces is still a blank line.
    expect(normalizeBio("a\n   \nb")).toBe("a\n\nb");
    expect(normalizeBio("a\r\n\r\nb")).toBe("a\n\nb");
    expect(normalizeBio("a" + " ".repeat(40) + "b")).toBe("a  b");
  });

  it("strips invisible and direction-flipping characters", () => {
    expect(normalizeBio("​​​")).toBe("");
    expect(normalizeBio("a​b")).toBe("ab");
    // An unpaired RLO would reverse the rest of the page it renders in.
    expect(normalizeBio("‮משהו")).toBe("משהו");
    // …but the emoji joiner survives, or every family becomes three people.
    expect(normalizeBio("👨‍👩‍👧")).toBe("👨‍👩‍👧");
  });

  it("bounds the height of the column, not just its length", () => {
    // 400 characters spent one per line is a 200-row panel on somebody else's
    // screen — the character cap alone does not stop that.
    const tall = Array.from({ length: 60 }, (_, i) => `x${i}`).join("\n");
    expect(normalizeBio(tall).split("\n")).toHaveLength(BIO_MAX_LINES);
  });

  it("never returns more than the stored length, counting by character", () => {
    const long = "🙂".repeat(BIO_MAX + 40);
    const stored = normalizeBio(long);
    expect(charCount(stored)).toBe(BIO_MAX);
    // Cut between whole characters — a lone surrogate would render as "�".
    expect(stored.endsWith("🙂")).toBe(true);
  });

  it("reads an empty submission as nothing written", () => {
    expect(normalizeBio("")).toBe("");
    expect(normalizeBio("   \n\n  ")).toBe("");
  });
});
