import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { REQUIRED_LEGAL_ENV, getLegalOperator, missingLegalFields } from "@/lib/legal";

/**
 * The operator-identity interlock.
 *
 * This is a go-live gate, not a display concern: `arePurchasesLive()` refuses to
 * open the store while `complete` is false, because selling to the public
 * without naming the merchant is what the law and the acquirer's underwriting
 * both care about. So the thing worth testing is that a *partially* filled
 * operator never reports itself complete — the failure mode is a deploy that
 * looks configured, passes review by nobody, and takes money anyway.
 */

const KEYS = [
  "LEGAL_OPERATOR_NAME",
  "LEGAL_OPERATOR_TAX_ID",
  "LEGAL_CONTACT_EMAIL",
  "LEGAL_CONTACT_PHONE",
  "LEGAL_OPERATOR_ADDRESS",
  "LEGAL_OPERATOR_CITY",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const key of KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function fill() {
  process.env.LEGAL_OPERATOR_NAME = "ישראל ישראלי";
  process.env.LEGAL_OPERATOR_TAX_ID = "123456789";
  process.env.LEGAL_CONTACT_EMAIL = "support@example.com";
  process.env.LEGAL_CONTACT_PHONE = "050-1234567";
  process.env.LEGAL_OPERATOR_ADDRESS = "הרצל 1, תל אביב 6100000";
}

describe("operator identity", () => {
  it("is incomplete while nothing is set, and names every gap", () => {
    expect(getLegalOperator().complete).toBe(false);
    expect(missingLegalFields()).toEqual([...REQUIRED_LEGAL_ENV]);
  });

  it("is complete only once every required field is filled", () => {
    fill();
    expect(missingLegalFields()).toEqual([]);
    expect(getLegalOperator().complete).toBe(true);
  });

  it.each([...REQUIRED_LEGAL_ENV])("stays incomplete while %s is missing", (key) => {
    fill();
    delete process.env[key];
    expect(getLegalOperator().complete).toBe(false);
    expect(missingLegalFields()).toContain(key);
  });

  it("treats whitespace as unset — a space is not a disclosure", () => {
    fill();
    process.env.LEGAL_CONTACT_PHONE = "   ";
    expect(getLegalOperator().complete).toBe(false);
  });

  it("publishes the acquirer's two new fields verbatim", () => {
    fill();
    const operator = getLegalOperator();
    expect(operator.phone).toBe("050-1234567");
    expect(operator.address).toBe("הרצל 1, תל אביב 6100000");
  });

  it("falls back to the retired city var so a mid-migration deploy still shows a place of business", () => {
    fill();
    delete process.env.LEGAL_OPERATOR_ADDRESS;
    process.env.LEGAL_OPERATOR_CITY = "תל אביב";
    // Displayed, but still not *complete* — a city is not a mailing address, and
    // the interlock is what stops the store opening on one.
    expect(getLegalOperator().address).toBe("תל אביב");
    expect(getLegalOperator().complete).toBe(false);
  });

  it("never prints an invented merchant name, only an obvious placeholder", () => {
    expect(getLegalOperator().name).toBe("מפעיל השירות");
  });
});
