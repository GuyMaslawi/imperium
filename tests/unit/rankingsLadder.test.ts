import { describe, expect, it } from "vitest";
import { withViewerRow, type LadderRow } from "@/server/rankingsLadder";

/**
 * `withViewerRow` exists because the ladder is served from a 20-second cache, so
 * a player who trains an army and walks straight to /game/rankings would read
 * their own row as it was before they acted. These tests pin the two properties
 * that make that safe: the merged ladder is still ordered by exactly the rule
 * the SQL build uses, and the cached array is never touched.
 */

function row(id: string, power: number, extra: Partial<LadderRow> = {}): LadderRow {
  return {
    id,
    name: id,
    gold: 0,
    army: { soldiers: 0 },
    hero: { level: 1, resets: 0 },
    power,
    ...extra,
  };
}

const ids = (rows: LadderRow[]) => rows.map((r) => r.id);

describe("withViewerRow", () => {
  it("replaces the viewer's stale row and re-places it by its new power", () => {
    const cached = [row("a", 900), row("me", 500), row("b", 300)];

    const merged = withViewerRow(cached, row("me", 1000, { army: { soldiers: 42 } }));

    expect(ids(merged)).toEqual(["me", "a", "b"]);
    expect(merged[0].army).toEqual({ soldiers: 42 });
    // Exactly one row per empire — the stale one is gone, not shadowed.
    expect(merged).toHaveLength(3);
  });

  it("keeps the viewer in place when nothing moved", () => {
    const cached = [row("a", 900), row("me", 500), row("b", 300)];

    expect(ids(withViewerRow(cached, row("me", 500)))).toEqual(["a", "me", "b"]);
  });

  it("sends the viewer to the bottom when they lose power", () => {
    const cached = [row("a", 900), row("me", 500), row("b", 300)];

    expect(ids(withViewerRow(cached, row("me", 10)))).toEqual(["a", "b", "me"]);
  });

  it("inserts an empire the cached build has never seen", () => {
    // A player who just took their first city: the new tier's ladder was built
    // before they arrived, and used to omit them for a whole TTL.
    const cached = [row("a", 900), row("b", 300)];

    expect(ids(withViewerRow(cached, row("me", 400)))).toEqual(["a", "me", "b"]);
  });

  it("breaks ties on hero level, then resets — the build's own rule", () => {
    const cached = [
      row("hi-level", 500, { hero: { level: 30, resets: 0 } }),
      row("many-resets", 500, { hero: { level: 5, resets: 3 } }),
      row("plain", 500, { hero: { level: 5, resets: 0 } }),
    ];

    const viewer = row("me", 500, { hero: { level: 5, resets: 1 } });

    expect(ids(withViewerRow(cached, viewer))).toEqual([
      "hi-level",
      "many-resets",
      "me",
      "plain",
    ]);
  });

  it("treats a heroless empire as level 1, reset 0", () => {
    const cached = [row("has-hero", 100, { hero: { level: 2, resets: 0 } })];

    expect(ids(withViewerRow(cached, row("me", 100, { hero: null })))).toEqual([
      "has-hero",
      "me",
    ]);
  });

  it("never mutates the cached array — it is the shared cache entry", () => {
    const cached = [row("a", 900), row("me", 500), row("b", 300)];
    const snapshot = ids(cached);

    withViewerRow(cached, row("me", 5000));

    expect(ids(cached)).toEqual(snapshot);
    expect(cached[1].power).toBe(500);
  });
});
