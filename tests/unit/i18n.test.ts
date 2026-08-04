import { describe, expect, it } from "vitest";
import { makeT } from "@/i18n/translate";
import { EN } from "@/i18n/dictionaries/en";
import { LOCALES, LOCALE_DIR, toLocale } from "@/i18n/locale";

describe("the translator", () => {
  it("returns Hebrew source untouched — the source language never consults a dictionary", () => {
    const t = makeT("he");
    expect(t("חנות נשקים")).toBe("חנות נשקים");
    // Even a string that HAS an English entry stays as written.
    expect(t("קנה")).toBe("קנה");
  });

  it("translates a known key into English", () => {
    expect(makeT("en")("קנה")).toBe("Buy");
  });

  it("falls back to the Hebrew source for a key with no entry", () => {
    // This is the whole reason a half-translated screen is shippable: an
    // unknown key must render the original, never a blank or the key itself.
    const t = makeT("en");
    expect(t("מחרוזת שאיש לא תרגם")).toBe("מחרוזת שאיש לא תרגם");
  });

  it("fills placeholders in both languages", () => {
    expect(makeT("he")("נקנו {count} {weapon} בהצלחה!", { count: 5, weapon: "חרב" })).toBe(
      "נקנו 5 חרב בהצלחה!"
    );
    expect(makeT("en")("נקנו {count} {weapon} בהצלחה!", { count: 5, weapon: "Sword" })).toBe(
      "Bought 5 Sword."
    );
  });

  it("leaves an unmatched placeholder standing rather than printing undefined", () => {
    // A visible {count} is a bug report; the word "undefined" mid-sentence is a
    // mystery. See makeT.
    expect(makeT("he")("יש {count} דברים", {})).toBe("יש {count} דברים");
  });

  it("fills a placeholder in an untranslated string too", () => {
    expect(makeT("en")("{a} ועוד {b}", { a: 1, b: 2 })).toBe("1 ועוד 2");
  });
});

describe("the English dictionary", () => {
  it("never drops a placeholder its key carries", () => {
    // An English value missing a `{name}` its Hebrew key has would silently
    // swallow the number or noun it was meant to show.
    const placeholders = (s: string) =>
      new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
    const broken: string[] = [];
    for (const [key, value] of Object.entries(EN)) {
      for (const name of placeholders(key)) {
        if (!placeholders(value).has(name)) broken.push(`${key} → missing {${name}}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("has no entry that translates to itself", () => {
    // A key whose value is the same Hebrew is a line that looks translated in
    // the coverage report and is not.
    const untranslated = Object.entries(EN)
      .filter(([key, value]) => key === value)
      .map(([key]) => key);
    expect(untranslated).toEqual([]);
  });
});

describe("locales", () => {
  it("narrows an unknown value to the source language", () => {
    expect(toLocale("klingon")).toBe("he");
    expect(toLocale(undefined)).toBe("he");
    expect(toLocale("en")).toBe("en");
  });

  it("gives every locale a writing direction", () => {
    for (const locale of LOCALES) {
      expect(["rtl", "ltr"]).toContain(LOCALE_DIR[locale]);
    }
  });
});
