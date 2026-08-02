import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HERO_MAX_LEVEL, ITEM_LEVELS, SLOT_META, SLOT_ORDER } from "@/lib/game/hero";
import {
  HERO_ITEM_SETS,
  ITEM_SET_SPAN,
  heroItemArtPath,
  itemSetForLevel,
} from "@/lib/game/heroSets";

describe("hero item sets", () => {
  it("covers 1..100 with ten contiguous decades", () => {
    expect(HERO_ITEM_SETS).toHaveLength(HERO_MAX_LEVEL / ITEM_SET_SPAN);
    expect(HERO_ITEM_SETS[0].from).toBe(1);
    expect(HERO_ITEM_SETS.at(-1)!.to).toBe(HERO_MAX_LEVEL);
    HERO_ITEM_SETS.forEach((set, i) => {
      expect(set.index).toBe(i + 1);
      if (i > 0) expect(set.from).toBe(HERO_ITEM_SETS[i - 1].to + 1);
    });
  });

  it("names every set exactly once", () => {
    expect(new Set(HERO_ITEM_SETS.map((s) => s.label)).size).toBe(HERO_ITEM_SETS.length);
    expect(new Set(HERO_ITEM_SETS.map((s) => s.dir)).size).toBe(HERO_ITEM_SETS.length);
  });

  it("puts every level in the set whose range contains it", () => {
    for (let level = 1; level <= HERO_MAX_LEVEL; level++) {
      const set = itemSetForLevel(level);
      expect(level).toBeGreaterThanOrEqual(set.from);
      expect(level).toBeLessThanOrEqual(set.to);
    }
  });

  it("changes set on the decade boundary, not around it", () => {
    expect(itemSetForLevel(1).index).toBe(1);
    expect(itemSetForLevel(10).index).toBe(1);
    expect(itemSetForLevel(11).index).toBe(2);
    expect(itemSetForLevel(100).index).toBe(10);
  });

  it("clamps out-of-range levels rather than returning undefined", () => {
    expect(itemSetForLevel(0).index).toBe(1);
    expect(itemSetForLevel(-5).index).toBe(1);
    expect(itemSetForLevel(999).index).toBe(10);
  });

  it("falls back to the pre-set art when there is no level", () => {
    expect(heroItemArtPath("sword")).toBe("/hero/sword.png");
    expect(heroItemArtPath("sword", 1)).toBe("/hero/sets/set01/sword.webp");
    expect(heroItemArtPath("sword", 100)).toBe("/hero/sets/set10/sword.webp");
  });

  // The tile falls back on a missing file, so a hole would be invisible in the
  // UI — every slot of every set has to actually be on disk.
  it("has art on disk for every slot of every set", () => {
    const missing: string[] = [];
    for (const set of HERO_ITEM_SETS) {
      for (const slot of SLOT_ORDER) {
        const rel = heroItemArtPath(SLOT_META[slot].slug, set.from);
        if (!existsSync(join(process.cwd(), "public", rel))) missing.push(rel);
      }
    }
    expect(missing).toEqual([]);
  });

  it("gives every upgrade rung a set", () => {
    for (const level of ITEM_LEVELS) expect(itemSetForLevel(level)).toBeTruthy();
  });
});
