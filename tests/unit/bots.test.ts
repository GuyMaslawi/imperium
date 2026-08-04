import { describe, expect, it } from "vitest";
import {
  BOT_MINE_SLAVES,
  BOT_NAME_SPACE,
  BOT_SOLDIERS,
  botFallbackName,
  botGarrison,
  botHeroLevel,
  botMineSetup,
  botName,
  botRealisedPower,
  botWeaponKeys,
  botWeaponTier,
} from "@/lib/game/bots";
import {
  ENSLAVE_MIN_SOLDIERS,
  MAX_CITIES,
  SOLDIER_POWER,
  cityHeroLevelRequired,
} from "@/lib/game/constants";
import { HERO_MAX_LEVEL } from "@/lib/game/hero";
import { weaponByKey, weaponGateStatus } from "@/lib/game/weapons";

/** Every city tier, since almost everything here is "for each of the ten". */
const TIERS = Array.from({ length: MAX_CITIES }, (_, i) => i + 1);

describe("bot hero level", () => {
  it("matches what a player must reach to live in that city", () => {
    for (const tier of TIERS.slice(1)) {
      expect(botHeroLevel(tier)).toBe(cityHeroLevelRequired(tier - 1));
    }
  });

  it("never leaves the legal 1..HERO_MAX_LEVEL range", () => {
    for (const tier of [-5, 0, ...TIERS, 99]) {
      const level = botHeroLevel(tier);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(HERO_MAX_LEVEL);
    }
  });
});

describe("bot weapon tier", () => {
  it("never names a tier the empire's city and hero level have not unlocked", () => {
    for (const tier of TIERS) {
      const heroLevel = botHeroLevel(tier);
      const weaponTier = botWeaponTier(tier, heroLevel);
      expect(weaponGateStatus(weaponTier, tier, heroLevel).met).toBe(true);
    }
  });

  it("is never zero, even for the smallest empire there is", () => {
    // A first-city, level-1 empire has already cleared the opening tiers, so the
    // floor is not reached in practice — but it must exist: tier 0 is not a
    // weapon, and `botWeaponKeys` would hand back three empty strings.
    expect(botWeaponTier(1, 1)).toBeGreaterThanOrEqual(1);
    expect(botWeaponTier(0, 0)).toBeGreaterThanOrEqual(1);
  });
});

describe("bot garrison", () => {
  it("is nineteen soldiers and nothing else, in every city", () => {
    for (const tier of TIERS) {
      const garrison = botGarrison(tier, botHeroLevel(tier));
      expect(garrison.soldiers).toBe(BOT_SOLDIERS);
      expect(garrison.spies).toBe(0);
      expect(garrison.attackWeapons).toBe(0);
      expect(garrison.defenseWeapons).toBe(0);
      expect(garrison.spyWeapons).toBe(0);
    }
  });

  it("stays below the threshold a won attack enslaves from", () => {
    // The whole reason for the number: enslavement fires on a defender holding
    // ENSLAVE_MIN_SOLDIERS or more, and a bot rebuilds itself every hour. One
    // soldier more and a bot is an unlimited supply of mine slaves.
    expect(BOT_SOLDIERS).toBeLessThan(ENSLAVE_MIN_SOLDIERS);
    expect(BOT_SOLDIERS).toBe(19);
  });

  it("fields the bodies and not one point more", () => {
    for (const tier of TIERS) {
      const garrison = botGarrison(tier, botHeroLevel(tier));
      expect(botRealisedPower(garrison)).toBe(BOT_SOLDIERS * SOLDIER_POWER);
    }
  });

  it("is identical for two bots in the same city", () => {
    expect(botGarrison(6, botHeroLevel(6))).toEqual(botGarrison(6, botHeroLevel(6)));
  });

  it("still names a real weapon key in all three categories", () => {
    // The stacks are empty, but the tier is recorded and granted as an unlock —
    // a spy dossier has to read as an empire of this city with a bare armoury.
    for (const tier of TIERS) {
      const garrison = botGarrison(tier, botHeroLevel(tier));
      const keys = botWeaponKeys(garrison.weaponTier);
      expect(weaponByKey(keys.attack)?.category).toBe("ATTACK");
      expect(weaponByKey(keys.defense)?.category).toBe("DEFENSE");
      expect(weaponByKey(keys.spy)?.category).toBe("SPY");
    }
  });
});

describe("bot mines", () => {
  it("scales the level with the tier — the one thing a bot's income follows", () => {
    expect(botMineSetup(MAX_CITIES).level).toBeGreaterThan(botMineSetup(1).level);
  });

  it("staffs every mine the same, whatever the city", () => {
    for (const tier of TIERS) {
      expect(botMineSetup(tier).slavesPerMine).toBe(BOT_MINE_SLAVES);
    }
  });

  it("never leaves a mine unmanned or unbuilt", () => {
    for (const tier of [-5, 0, ...TIERS, 99]) {
      const setup = botMineSetup(tier);
      expect(setup.level).toBeGreaterThanOrEqual(1);
      expect(setup.slavesPerMine).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("bot names", () => {
  it("produces a two-word Hebrew name from the declared space", () => {
    const name = botName(() => 0);
    expect(name.split(" ")).toHaveLength(2);
    expect(name).toMatch(/^[֐-׿]+ [֐-׿]+$/);
  });

  it("covers its whole advertised space and no more", () => {
    const seen = new Set<string>();
    // Exhaustive rather than random: walk every (head, tail) pair by index.
    for (let head = 0; head < BOT_NAME_SPACE; head++) {
      for (let tail = 0; tail < BOT_NAME_SPACE; tail++) {
        let call = 0;
        const name = botName((n) => (call++ === 0 ? head % n : tail % n));
        seen.add(name);
      }
    }
    expect(seen.size).toBe(BOT_NAME_SPACE);
  });

  it("falls back to an ordinal that cannot collide", () => {
    expect(botFallbackName("בני הנחושת", 2)).toBe("בני הנחושת 2");
    expect(botFallbackName("בני הנחושת", 2)).not.toBe(botFallbackName("בני הנחושת", 3));
  });
});
