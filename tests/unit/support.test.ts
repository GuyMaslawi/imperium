import { describe, expect, it } from "vitest";

import {
  SUPPORT_BODY_MAX,
  SUPPORT_EMAIL_MAX,
  SUPPORT_REPEAT_WINDOW_MS,
  isSupportRepeat,
  normalizeSupportBody,
  normalizeSupportEmail,
  parseSupportSince,
} from "@/lib/support";

describe("normalizeSupportBody", () => {
  it("keeps ordinary text intact", () => {
    expect(normalizeSupportBody("  לא הגיע לי מייל אימות  ")).toBe(
      "לא הגיע לי מייל אימות"
    );
  });

  it("keeps the paragraphs a bug report is made of", () => {
    // The whole reason this normaliser exists apart from the chat's: "what I
    // did / what I expected / what happened" is three paragraphs, and flattening
    // them costs us the only thing that makes the ticket answerable.
    expect(normalizeSupportBody("ניסיתי להירשם\n\nוקיבלתי שגיאה")).toBe(
      "ניסיתי להירשם\n\nוקיבלתי שגיאה"
    );
    expect(normalizeSupportBody("שורה\nשורה")).toBe("שורה\nשורה");
  });

  it("collapses walls of blank lines and whitespace", () => {
    expect(normalizeSupportBody("a\n\n\n\n\n\nb")).toBe("a\n\nb");
    expect(normalizeSupportBody("a\n \n\t\n \nb")).toBe("a\n\nb");
    expect(normalizeSupportBody("a" + " ".repeat(40) + "b")).toBe("a   b");
  });

  it("strips invisible and direction-flipping characters", () => {
    expect(normalizeSupportBody("​​​")).toBe("");
    // An unpaired RLO would reverse everything rendered after it — including
    // the rest of the admin's inbox.
    expect(normalizeSupportBody("‮משהו")).toBe("משהו");
  });

  it("never returns more than the stored length", () => {
    expect(normalizeSupportBody("x".repeat(SUPPORT_BODY_MAX + 500))).toHaveLength(
      SUPPORT_BODY_MAX
    );
    // Counted by character, not by UTF-16 unit: a cut must never land inside an
    // emoji and leave a lone surrogate in somebody's ticket.
    const emoji = normalizeSupportBody("🙂".repeat(SUPPORT_BODY_MAX + 10));
    expect([...emoji]).toHaveLength(SUPPORT_BODY_MAX);
    expect(emoji.includes("�")).toBe(false);
  });
});

describe("normalizeSupportEmail", () => {
  it("accepts an ordinary address, normalised", () => {
    expect(normalizeSupportEmail("  Player@Example.COM ")).toBe(
      "player@example.com"
    );
  });

  it("refuses what is not an address at all", () => {
    expect(normalizeSupportEmail("")).toBeNull();
    expect(normalizeSupportEmail(null)).toBeNull();
    expect(normalizeSupportEmail(undefined)).toBeNull();
    expect(normalizeSupportEmail(12)).toBeNull();
    expect(normalizeSupportEmail("player")).toBeNull();
    expect(normalizeSupportEmail("player@localhost")).toBeNull();
    expect(normalizeSupportEmail("a@b@c.com")).toBeNull();
  });

  it("refuses a header-injection shape and anything unbounded", () => {
    // Whitespace is removed rather than trimmed, so a newline cannot survive
    // into a field a human will later paste into a mail client.
    expect(normalizeSupportEmail("a@b.com\nbcc: victim@x.com")).toBeNull();
    expect(
      normalizeSupportEmail(`${"x".repeat(SUPPORT_EMAIL_MAX)}@example.com`)
    ).toBeNull();
  });
});

describe("isSupportRepeat", () => {
  const now = new Date("2026-08-07T12:00:00Z");

  it("is never a repeat with nothing before it", () => {
    expect(isSupportRepeat("שלום", null, now)).toBe(false);
  });

  it("catches the same words sent again inside the window", () => {
    const previous = {
      body: "שלום",
      createdAt: new Date(now.getTime() - SUPPORT_REPEAT_WINDOW_MS + 1_000),
    };
    expect(isSupportRepeat("שלום", previous, now)).toBe(true);
    expect(isSupportRepeat("שלום?", previous, now)).toBe(false);
  });

  it("lets the same words through once the window has passed", () => {
    const previous = {
      body: "שלום",
      createdAt: new Date(now.getTime() - SUPPORT_REPEAT_WINDOW_MS - 1),
    };
    expect(isSupportRepeat("שלום", previous, now)).toBe(false);
  });
});

describe("parseSupportSince", () => {
  it("takes a plausible cursor", () => {
    expect(parseSupportSince(1_754_000_000_000)).toBe(1_754_000_000_000);
    expect(parseSupportSince(1_754_000_000_000.7)).toBe(1_754_000_000_000);
  });

  it("ignores anything that would reach new Date() as garbage", () => {
    // Every one of these produced an *invalid* Date, which Prisma rejects —
    // turning a poll into a caught exception and an empty panel.
    expect(parseSupportSince(NaN)).toBeUndefined();
    expect(parseSupportSince(Infinity)).toBeUndefined();
    expect(parseSupportSince(0)).toBeUndefined();
    expect(parseSupportSince(-1)).toBeUndefined();
    expect(parseSupportSince(9e15)).toBeUndefined();
    expect(parseSupportSince("1754000000000")).toBeUndefined();
    expect(parseSupportSince({})).toBeUndefined();
    expect(parseSupportSince(undefined)).toBeUndefined();
  });
});
