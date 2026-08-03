import { describe, expect, it } from "vitest";
import {
  BOT_MAX_STACK,
  BOT_NAME_SPACE,
  BOT_POWER_OF_BOSS,
  botDefaultPower,
  botFallbackName,
  botGarrison,
  botHeroLevel,
  botMineSetup,
  botName,
  botRealisedPower,
  botWeaponKeys,
  botWeaponTier,
} from "@/lib/game/bots";
import { bossPower } from "@/lib/game/bosses";
import { MAX_CITIES, SOLDIER_POWER, SPY_POWER, cityHeroLevelRequired } from "@/lib/game/constants";
import { HERO_MAX_LEVEL } from "@/lib/game/hero";
import { MAX_WEAPON_TIER, weaponByKey, weaponGateStatus } from "@/lib/game/weapons";

/** Every city tier, since almost everything here is "for each of the ten". */
const TIERS = Array.from({ length: MAX_CITIES }, (_, i) => i + 1);

describe("bot power curve", () => {
  it("sits below the city boss at every tier — a bot is loot, not a second boss", () => {
    for (const tier of TIERS) {
      expect(botDefaultPower(tier)).toBeLessThan(bossPower(tier));
      expect(botDefaultPower(tier)).toBe(Math.round(bossPower(tier) * BOT_POWER_OF_BOSS));
    }
  });

  it("rises with the tier", () => {
    for (const tier of TIERS.slice(1)) {
      expect(botDefaultPower(tier)).toBeGreaterThan(botDefaultPower(tier - 1));
    }
  });
});

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
  it("never picks a tier the empire's city and hero level have not unlocked", () => {
    for (const tier of TIERS) {
      const heroLevel = botHeroLevel(tier);
      const weaponTier = botWeaponTier(tier, heroLevel, Number.MAX_SAFE_INTEGER);
      expect(weaponGateStatus(weaponTier, tier, heroLevel).met).toBe(true);
    }
  });

  it("steps down until the budget can field a real stack", () => {
    // A tenth-city bot has tier 30 unlocked, where one weapon costs more power
    // than the whole garrison — buying there would round the arsenal to nothing.
    const unlocked = botWeaponTier(MAX_CITIES, botHeroLevel(MAX_CITIES));
    const affordable = botWeaponTier(MAX_CITIES, botHeroLevel(MAX_CITIES), 50_000);
    expect(unlocked).toBe(MAX_WEAPON_TIER);
    expect(affordable).toBeLessThan(unlocked);
    expect(affordable).toBeGreaterThanOrEqual(1);
  });

  it("bottoms out at tier 1 rather than at zero", () => {
    expect(botWeaponTier(1, 1, 1)).toBe(1);
    expect(botWeaponTier(1, 1, 0)).toBeGreaterThanOrEqual(1);
  });
});

describe("bot garrison", () => {
  it("fields close to the power it was asked for, at every tier", () => {
    for (const tier of TIERS) {
      const asked = botDefaultPower(tier);
      const realised = botRealisedPower(botGarrison(asked, tier, botHeroLevel(tier)));
      // Whole units only, so the two never match exactly — but a garrison that
      // rounded its arsenal away would land far below, which is the bug this
      // guards. 5% is comfortably inside rounding and nowhere near a lost stack.
      expect(Math.abs(realised - asked) / asked).toBeLessThan(0.05);
    }
  });

  it("buys soldiers, spies and all three weapon categories", () => {
    const garrison = botGarrison(botDefaultPower(4), 4, botHeroLevel(4));
    expect(garrison.soldiers).toBeGreaterThan(0);
    expect(garrison.spies).toBeGreaterThan(0);
    expect(garrison.attackWeapons).toBeGreaterThan(0);
    expect(garrison.defenseWeapons).toBeGreaterThan(0);
    expect(garrison.spyWeapons).toBeGreaterThan(0);
  });

  it("weights defence over attack — a bot is attacked far more than it is ranked", () => {
    const garrison = botGarrison(botDefaultPower(5), 5, botHeroLevel(5));
    const keys = botWeaponKeys(garrison.weaponTier);
    const attack = garrison.attackWeapons * (weaponByKey(keys.attack)?.power ?? 0);
    const defense = garrison.defenseWeapons * (weaponByKey(keys.defense)?.power ?? 0);
    expect(defense).toBeGreaterThan(attack);
  });

  it("gives every stack a real weapon key", () => {
    for (const tier of TIERS) {
      const garrison = botGarrison(botDefaultPower(tier), tier, botHeroLevel(tier));
      const keys = botWeaponKeys(garrison.weaponTier);
      expect(weaponByKey(keys.attack)?.category).toBe("ATTACK");
      expect(weaponByKey(keys.defense)?.category).toBe("DEFENSE");
      expect(weaponByKey(keys.spy)?.category).toBe("SPY");
    }
  });

  it("counts soldiers once — the realised figure is the ladder's own formula", () => {
    const garrison = botGarrison(200_000, 3, botHeroLevel(3));
    const keys = botWeaponKeys(garrison.weaponTier);
    expect(botRealisedPower(garrison)).toBe(
      garrison.soldiers * SOLDIER_POWER +
        garrison.attackWeapons * (weaponByKey(keys.attack)?.power ?? 0) +
        garrison.defenseWeapons * (weaponByKey(keys.defense)?.power ?? 0)
    );
  });

  it("carries an intelligence rating, so scouting it is a real check", () => {
    const garrison = botGarrison(100_000, 3, botHeroLevel(3));
    expect(garrison.spies * SPY_POWER).toBeGreaterThan(0);
  });

  it("keeps every stack inside an Int column, however rich the city it copies", () => {
    // The figure that broke it: the lone tier-4 resident this feature exists for
    // holds 4.4 trillion power, almost all of it in weapons. "Match the city"
    // handed that to the garrison, a third of it went to soldiers at 10 power a
    // head, and the insert died on int4 — every attempt, in that one city.
    for (const asked of [4.4e12, 1e12, 1e15]) {
      for (const tier of TIERS) {
        const garrison = botGarrison(asked, tier, botHeroLevel(tier));
        for (const stack of [
          garrison.soldiers,
          garrison.spies,
          garrison.attackWeapons,
          garrison.defenseWeapons,
          garrison.spyWeapons,
        ]) {
          expect(stack).toBeLessThanOrEqual(BOT_MAX_STACK);
          expect(Number.isSafeInteger(stack)).toBe(true);
        }
        // And the slaves that follow from the army, which land in one too.
        expect(botMineSetup(tier, garrison.soldiers).slavesPerMine).toBeLessThanOrEqual(
          BOT_MAX_STACK
        );
      }
    }
  });

  it("holds a plausible body count and spends the rest on weapons", () => {
    const rich = botGarrison(4.4e12, 4, botHeroLevel(4));
    const plain = botGarrison(botDefaultPower(4), 4, botHeroLevel(4));
    // Bodies do not scale with the request — a tier-4 empire fields a tier-4
    // army whatever its arsenal is worth.
    expect(rich.soldiers).toBe(plain.soldiers);
    expect(rich.spies).toBe(plain.spies);
    // The power still arrives, out of the arsenal.
    expect(rich.attackWeapons).toBeGreaterThan(plain.attackWeapons);
    expect(Math.abs(botRealisedPower(rich) - 4.4e12) / 4.4e12).toBeLessThan(0.05);
  });

  it("survives a zero or negative budget without inventing units", () => {
    for (const power of [0, -1, -1e9]) {
      const garrison = botGarrison(power, 1, 1);
      expect(garrison.soldiers).toBe(0);
      expect(garrison.spies).toBe(0);
      expect(garrison.attackWeapons).toBe(0);
      expect(garrison.defenseWeapons).toBe(0);
      expect(botRealisedPower(garrison)).toBe(0);
    }
  });
});

describe("bot mines", () => {
  it("scales the level with the tier and the slaves with the army", () => {
    const small = botMineSetup(1, 100);
    const big = botMineSetup(MAX_CITIES, 100_000);
    expect(big.level).toBeGreaterThan(small.level);
    expect(big.slavesPerMine).toBeGreaterThan(small.slavesPerMine);
  });

  it("never leaves a mine unmanned or unbuilt, however small the bot", () => {
    const setup = botMineSetup(1, 0);
    expect(setup.level).toBeGreaterThanOrEqual(1);
    expect(setup.slavesPerMine).toBeGreaterThanOrEqual(5);
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
