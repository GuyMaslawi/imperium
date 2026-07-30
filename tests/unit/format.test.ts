import { describe, expect, it } from "vitest";

import { formatCompact, formatNumber } from "@/lib/game/format";

describe("formatNumber", () => {
  it("prints each unit", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(1_500_000)).toBe("1.5M");
    expect(formatNumber(2_000_000_000)).toBe("2B");
    expect(formatNumber(1e12)).toBe("1T");
    expect(formatNumber(1e15)).toBe("1Qa");
    expect(formatNumber(1e18)).toBe("1Qi");
  });

  it("climbs a unit when rounding fills the mantissa", () => {
    // A treasury a hair short of a trillion used to read "1000B".
    expect(formatNumber(999_922_167_686)).toBe("999.9B");
    expect(formatNumber(999_949_999_999)).toBe("999.9B");
    expect(formatNumber(999_950_000_001)).toBe("1T");
    expect(formatNumber(999_999_999_999)).toBe("1T");
    expect(formatNumber(999_950_000)).toBe("1B");
    expect(formatNumber(-999_999_999_999)).toBe("-1T");
  });

  it("floors and rounds the same value identically", () => {
    const gold = 999_999_999_999.7;
    expect(formatNumber(gold)).toBe(formatNumber(Math.floor(gold)));
    expect(formatCompact(gold)).toBe(formatCompact(Math.floor(gold)));
  });
});

describe("formatCompact", () => {
  it("prints K below a million", () => {
    expect(formatCompact(9_999)).toBe("9,999");
    expect(formatCompact(22_300)).toBe("22.3K");
    expect(formatCompact(999_400)).toBe("999.4K");
  });

  it("climbs a unit when rounding fills the mantissa", () => {
    expect(formatCompact(999_950)).toBe("1M");
    expect(formatCompact(999_950_000_001)).toBe("1T");
    expect(formatCompact(999_922_167_686)).toBe("999.9B");
  });
});
