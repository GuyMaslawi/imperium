import { describe, expect, it } from "vitest";
import {
  COMMUNITY_HIGHLIGHTS,
  COMMUNITY_RULES,
  DISCORD_JOIN_DIAMONDS,
  parseDiscordInvite,
} from "@/lib/community";

/**
 * The invite is the one piece of configuration in this feature that is printed
 * into a page as a link the player is invited to click — on the auth screens,
 * where it is offered to people who are not even signed in. So it is validated
 * rather than trusted, and this pins the rule: anything that is not plainly an
 * https Discord URL must come back as *unconfigured*, which every surface
 * already knows how to render (as nothing at all).
 */
describe("parseDiscordInvite", () => {
  it("accepts a discord.gg invite", () => {
    expect(parseDiscordInvite("https://discord.gg/kraldor")).toBe(
      "https://discord.gg/kraldor"
    );
  });

  it("accepts the discord.com/invite form", () => {
    expect(parseDiscordInvite("https://discord.com/invite/kraldor")).toBe(
      "https://discord.com/invite/kraldor"
    );
  });

  it("trims surrounding whitespace, which a pasted env var carries", () => {
    expect(parseDiscordInvite("  https://discord.gg/kraldor  ")).toBe(
      "https://discord.gg/kraldor"
    );
  });

  it("treats missing, empty and whitespace-only values as unconfigured", () => {
    expect(parseDiscordInvite(undefined)).toBeNull();
    expect(parseDiscordInvite(null)).toBeNull();
    expect(parseDiscordInvite("")).toBeNull();
    expect(parseDiscordInvite("   ")).toBeNull();
  });

  it("refuses a non-Discord host — the whole point of validating at all", () => {
    expect(parseDiscordInvite("https://discord.evil.com/kraldor")).toBeNull();
    expect(parseDiscordInvite("https://example.com/discord.gg")).toBeNull();
  });

  it("refuses http, so the invite can never be downgraded on the wire", () => {
    expect(parseDiscordInvite("http://discord.gg/kraldor")).toBeNull();
  });

  it("refuses anything that is not a URL, including a bare invite code", () => {
    expect(parseDiscordInvite("kraldor")).toBeNull();
    expect(parseDiscordInvite("discord.gg/kraldor")).toBeNull();
    expect(parseDiscordInvite("javascript:alert(1)")).toBeNull();
  });
});

describe("community copy", () => {
  it("keeps the welcome purse inside the ceiling the honour system can carry", () => {
    // This test used to pin the purse at ≤50, on the reasoning that its size
    // *was* the anti-abuse design: nothing verifies the player joined, so the
    // number is what anyone gets for one click. That reasoning did not survive
    // the 2026-08-02 raise to 500 — a deliberate launch decision — so the test
    // now guards the new ceiling instead of pretending the old one held.
    //
    // 500 is roughly ₪17 of store value per account (diamondStore: 400 for
    // ₪13.90). Anything past it should not arrive as a bigger number on the
    // same honour system; it needs a bot that confirms guild membership.
    expect(DISCORD_JOIN_DIAMONDS).toBeGreaterThan(0);
    expect(DISCORD_JOIN_DIAMONDS).toBeLessThanOrEqual(500);
  });

  it("keeps the anti-phishing rule in the house rules", () => {
    // The rule that staff never ask for a password is the one item on that list
    // that protects an account rather than the tone of the room.
    expect(COMMUNITY_RULES.some((rule) => rule.includes("סיסמה"))).toBe(true);
  });

  it("has a title and a body for every highlight", () => {
    expect(COMMUNITY_HIGHLIGHTS.length).toBeGreaterThan(0);
    for (const item of COMMUNITY_HIGHLIGHTS) {
      expect(item.title.trim()).not.toBe("");
      expect(item.body.trim()).not.toBe("");
    }
  });
});
