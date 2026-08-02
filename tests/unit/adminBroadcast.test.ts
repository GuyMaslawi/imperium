import { describe, expect, it } from "vitest";
import {
  BROADCAST_DEFAULTS,
  GIFT_DEFAULTS,
  isGameWideScope,
} from "@/lib/adminBroadcast";

describe("isGameWideScope", () => {
  it("treats both everyone-scopes as public", () => {
    expect(isGameWideScope("all")).toBe(true);
    expect(isGameWideScope("active")).toBe(true);
  });

  // The privacy rule the Discord mirror rests on: a targeted send must never
  // be reposted into a room its target may not even be in.
  it("keeps targeted sends private", () => {
    expect(isGameWideScope("season")).toBe(false);
    expect(isGameWideScope("guild")).toBe(false);
    expect(isGameWideScope("empire")).toBe(false);
    expect(isGameWideScope("")).toBe(false);
  });
});

describe("form defaults", () => {
  // They are pre-filled into required fields — an empty default would make the
  // form unsubmittable until the admin noticed why.
  it("are non-empty for every field they fill", () => {
    for (const text of [
      BROADCAST_DEFAULTS.title,
      BROADCAST_DEFAULTS.body,
      GIFT_DEFAULTS.title,
      GIFT_DEFAULTS.body,
    ]) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  // The same string is posted to Discord verbatim, and Discord rejects the
  // whole POST over its ceilings (256 / 4000).
  it("fit inside a Discord embed", () => {
    expect(BROADCAST_DEFAULTS.title.length).toBeLessThanOrEqual(256);
    expect(GIFT_DEFAULTS.title.length).toBeLessThanOrEqual(256);
    expect(BROADCAST_DEFAULTS.body.length).toBeLessThanOrEqual(4000);
    expect(GIFT_DEFAULTS.body.length).toBeLessThanOrEqual(4000);
  });
});
