import { describe, expect, it } from "vitest";
import {
  HERO_BAG_CAPACITY,
  HERO_DAMAGE_PER_LOST_DEFENSE,
  HERO_MAX_HEALTH,
  HERO_MAX_LEVEL,
  HERO_REVIVE_MS,
  ITEM_LEVELS,
  PRIMARY_WEIGHT,
  RARITY_ORDER,
  SECONDARY_WEIGHT,
  SLOT_ORDER,
  UPGRADE_COST_AT_LEVEL_10,
  UPGRADE_COST_AT_LEVEL_100,
  applyHeroXp,
  canEquipItem,
  canUpgradeItem,
  damagedHealth,
  heroReviveAt,
  isHeroDead,
  itemStatBonus,
  itemUpgradeCost,
  nextTierLevel,
  slotGrants,
  slotPrimaryStat,
  tierForLevel,
  xpToNextLevel,
} from "@/lib/game/hero";

const alive = { health: HERO_MAX_HEALTH, diedAt: null };

describe("levelling", () => {
  it("needs more XP for each level", () => {
    for (let l = 2; l < HERO_MAX_LEVEL; l++) {
      expect(xpToNextLevel(l)).toBeGreaterThanOrEqual(xpToNextLevel(l - 1));
    }
  });

  it("banks XP without levelling when it is not enough", () => {
    const next = applyHeroXp({ level: 1, xp: 0 }, 1);
    expect(next.level).toBe(1);
    expect(next.xp).toBe(1);
    expect(next.pointsGained).toBe(0);
  });

  it("awards a point per level gained", () => {
    const huge = applyHeroXp({ level: 1, xp: 0 }, 10_000_000);
    expect(huge.level).toBeGreaterThan(1);
    expect(huge.pointsGained).toBe(huge.level - 1);
  });

  it("stops dead at the level cap and never overflows XP past it", () => {
    const capped = applyHeroXp({ level: HERO_MAX_LEVEL, xp: 0 }, 1e12);
    expect(capped.level).toBe(HERO_MAX_LEVEL);
    expect(capped.pointsGained).toBe(0);
  });

  it("ignores a zero or negative award instead of going backwards", () => {
    const zero = applyHeroXp({ level: 5, xp: 10 }, 0);
    expect(zero.level).toBe(5);
    expect(zero.xp).toBe(10);
    const negative = applyHeroXp({ level: 5, xp: 10 }, -100);
    expect(negative.level).toBe(5);
    expect(negative.xp).toBeGreaterThanOrEqual(0);
  });
});

describe("health and death", () => {
  it("defaults to one lost defence's worth of damage", () => {
    // The second argument is the damage itself, not a count of lost points —
    // the per-loss figure is the default.
    expect(damagedHealth(HERO_MAX_HEALTH)).toBe(
      HERO_MAX_HEALTH - HERO_DAMAGE_PER_LOST_DEFENSE
    );
    expect(damagedHealth(HERO_MAX_HEALTH, HERO_DAMAGE_PER_LOST_DEFENSE * 3)).toBe(
      HERO_MAX_HEALTH - HERO_DAMAGE_PER_LOST_DEFENSE * 3
    );
  });

  it("floors at zero rather than going negative", () => {
    expect(damagedHealth(5, 99)).toBe(0);
  });

  it("never heals: a health above the cap is clamped down, and damage never adds", () => {
    expect(damagedHealth(HERO_MAX_HEALTH + 500, 10)).toBe(HERO_MAX_HEALTH - 10);
    expect(damagedHealth(50, -100)).toBe(50);
  });

  it("calls a hero at zero health dead, and one above it alive", () => {
    expect(isHeroDead({ health: 0, diedAt: new Date() })).toBe(true);
    expect(isHeroDead(alive)).toBe(false);
    expect(isHeroDead(null)).toBe(false);
    expect(isHeroDead(undefined)).toBe(false);
  });

  it("schedules the free revival exactly one window after the fall", () => {
    const diedAt = new Date("2026-07-30T10:00:00.000Z");
    const at = heroReviveAt({ health: 0, diedAt });
    expect(at?.getTime()).toBe(diedAt.getTime() + HERO_REVIVE_MS);
  });

  it("gives a living hero no revival time", () => {
    expect(heroReviveAt(alive)).toBeNull();
  });
});

describe("item tiers and upgrades", () => {
  it("cycles rarity within each decade rather than climbing forever", () => {
    // Rarity is the item's position inside its decade, not its absolute power:
    // a level-11 פשוט is stronger than a level-10 אגדי. The band therefore
    // resets every ten levels, and that is deliberate.
    expect(tierForLevel(1)).toBe("COMMON");
    expect(tierForLevel(10)).toBe("LEGENDARY");
    expect(tierForLevel(11)).toBe("COMMON");
    expect(tierForLevel(20)).toBe("LEGENDARY");
    for (let level = 1; level <= 100; level++) {
      expect(tierForLevel(level)).toBe(tierForLevel(level + 10));
    }
  });

  it("returns a known rarity for every rung, including nonsense input", () => {
    for (const level of [...ITEM_LEVELS, 0, -5]) {
      expect(RARITY_ORDER).toContain(tierForLevel(level));
    }
  });

  it("stops offering an upgrade at the top rung", () => {
    expect(nextTierLevel(ITEM_LEVELS[ITEM_LEVELS.length - 1])).toBeNull();
    expect(itemUpgradeCost(ITEM_LEVELS[ITEM_LEVELS.length - 1])).toBeNull();
  });

  it("prices an upgrade by the level it lands on, anchored at 10 and 100", () => {
    // The cost is a function of the TARGET rung, not the current one.
    const intoTen = ITEM_LEVELS.filter((l) => nextTierLevel(l) === 10);
    expect(intoTen.length).toBeGreaterThan(0);
    for (const from of intoTen) {
      expect(itemUpgradeCost(from)).toBeCloseTo(UPGRADE_COST_AT_LEVEL_10, -4);
    }
    const intoHundred = ITEM_LEVELS.filter((l) => nextTierLevel(l) === 100);
    for (const from of intoHundred) {
      // Rounded for display, so compare within a percent of the anchor.
      const cost = itemUpgradeCost(from)!;
      expect(Math.abs(cost - UPGRADE_COST_AT_LEVEL_100) / UPGRADE_COST_AT_LEVEL_100)
        .toBeLessThan(0.01);
    }
  });

  it("never gets cheaper as the item climbs", () => {
    let prev = 0;
    for (const level of ITEM_LEVELS) {
      const cost = itemUpgradeCost(level);
      if (cost === null) continue;
      expect(cost).toBeGreaterThanOrEqual(prev);
      prev = cost;
    }
  });

  it("gates equipping and upgrading on the hero's own level", () => {
    expect(canEquipItem(1, 1)).toBe(true);
    expect(canEquipItem(1, 20)).toBe(false);
    expect(canEquipItem(50, 20)).toBe(true);
    // An upgrade needs the hero to already be at the *target* level.
    expect(canUpgradeItem(1, 1)).toBe(false);
  });
});

describe("item stats", () => {
  it("gives every slot exactly one primary stat", () => {
    for (const slot of SLOT_ORDER) {
      const primary = slotPrimaryStat(slot);
      expect(slotGrants(slot, primary)).toBe(true);
    }
  });

  it("grants nothing for a stat the slot does not carry", () => {
    for (const slot of SLOT_ORDER) {
      for (const stat of ["attack", "defense", "spy", "resources", "turns", "citizens"] as const) {
        if (!slotGrants(slot, stat)) expect(itemStatBonus(slot, 100, stat)).toBe(0);
      }
    }
  });

  it("never prints a granted stat as +0", () => {
    for (const slot of SLOT_ORDER) {
      for (const stat of ["attack", "defense", "spy", "resources", "turns", "citizens"] as const) {
        if (slotGrants(slot, stat)) {
          expect(itemStatBonus(slot, 1, stat)).toBeGreaterThan(0);
        }
      }
    }
  });

  it("never lets an upgrade lower a stat", () => {
    for (const slot of SLOT_ORDER) {
      const stat = slotPrimaryStat(slot);
      let prev = 0;
      for (const level of ITEM_LEVELS) {
        const value = itemStatBonus(slot, level, stat);
        expect(value).toBeGreaterThanOrEqual(prev);
        prev = value;
      }
    }
  });

  it("moves the primary on every single rung — no upgrade is ever a no-op", () => {
    for (const slot of SLOT_ORDER) {
      const stat = slotPrimaryStat(slot);
      for (let i = 1; i < ITEM_LEVELS.length; i++) {
        expect(itemStatBonus(slot, ITEM_LEVELS[i], stat)).toBeGreaterThan(
          itemStatBonus(slot, ITEM_LEVELS[i - 1], stat)
        );
      }
    }
  });

  it("pays a stat less where it is an extra than where it is the primary", () => {
    // The comparison has to be stat-by-stat: units differ wildly between stats
    // (a turn is not a citizen), so a slot's own primary and extra are not
    // comparable numbers. What must hold is that the SAME stat is worth less as
    // somebody else's extra.
    expect(SECONDARY_WEIGHT).toBeLessThan(PRIMARY_WEIGHT);
    const STATS = ["attack", "defense", "spy", "resources", "turns", "citizens"] as const;
    for (const stat of STATS) {
      const asPrimary = SLOT_ORDER.filter((s) => slotPrimaryStat(s) === stat);
      const asExtra = SLOT_ORDER.filter(
        (s) => slotGrants(s, stat) && slotPrimaryStat(s) !== stat
      );
      if (asPrimary.length === 0 || asExtra.length === 0) continue;
      const best = Math.max(...asPrimary.map((s) => itemStatBonus(s, 100, stat)));
      for (const slot of asExtra) {
        expect(itemStatBonus(slot, 100, stat)).toBeLessThan(best);
      }
    }
  });

  it("never grants diamonds from gear", () => {
    // A repeatable diamond faucet would undercut the real-money store; this is
    // the assertion that keeps it that way when slots are re-tuned.
    for (const slot of SLOT_ORDER) {
      expect(slotGrants(slot, "diamonds" as never)).toBe(false);
    }
  });
});

describe("the bag", () => {
  it("has a positive, finite capacity", () => {
    expect(HERO_BAG_CAPACITY).toBeGreaterThan(0);
    expect(Number.isInteger(HERO_BAG_CAPACITY)).toBe(true);
  });
});
