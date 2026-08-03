import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidBuyerName, isValidBuyerPhone } from "@/lib/game/diamondStore";
import {
  growCallbackSecretMatches,
  growConfigStatus,
  growFullName,
  growPhone,
  growProvider,
  growSafeText,
} from "@/server/grow";

/**
 * The Grow gateway, tested where it is actually dangerous.
 *
 * Two things here are worth a test and the rest is plumbing:
 *
 * 1. **Nothing credits off an unverified answer.** `captureOrder` is the only
 *    source of a payment's amount, and it has to fail closed on every shape it
 *    does not positively recognise — an unpaid status, a missing transaction id,
 *    a non-numeric sum. Getting this wrong turns an unsigned public callback
 *    into a diamond printer, so each way of getting it wrong gets its own case.
 * 2. **The request Grow receives is the request we meant.** The gateway
 *    validates the name and phone formats itself, but only *after* a PENDING
 *    purchase row exists — and the callback URL is the endpoint's only
 *    credential, so a malformed one silently loses every payment notification.
 *
 * The tests drive real env vars and a stubbed `fetch` rather than mocking the
 * provider, because the mapping between our fields and Grow's is exactly the
 * part that has no other check on it.
 */

const SECRET = "a".repeat(32);

/** Env keys this file owns; restored after every case. */
const KEYS = [
  "GROW_USER_ID",
  "GROW_PAGE_CODE",
  "GROW_CALLBACK_SECRET",
  "GROW_ENV",
  "GROW_PAYMENT_METHODS",
  "NEXT_PUBLIC_APP_URL",
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
  vi.unstubAllGlobals();
});

function configure(overrides: Partial<Record<(typeof KEYS)[number], string>> = {}) {
  process.env.GROW_USER_ID = "user-1";
  process.env.GROW_PAGE_CODE = "page-1";
  process.env.GROW_CALLBACK_SECRET = SECRET;
  process.env.NEXT_PUBLIC_APP_URL = "https://kraldor.example";
  for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
}

/** Stub `fetch` with a canned envelope and capture what was sent. */
function stubGrow(envelope: unknown, status = 200) {
  const calls: { url: string; fields: Record<string, string> }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const fields: Record<string, string> = {};
      for (const [key, value] of (init.body as FormData).entries()) {
        fields[key] = String(value);
      }
      calls.push({ url: String(url), fields });
      return new Response(JSON.stringify(envelope), {
        status,
        headers: { "content-type": "application/json" },
      });
    })
  );
  return calls;
}

/* ------------------------------ field mapping ------------------------------ */

describe("growPhone", () => {
  it("accepts what people actually type", () => {
    expect(growPhone("0501234567")).toBe("0501234567");
    expect(growPhone("050-123-4567")).toBe("0501234567");
    expect(growPhone(" 050 123 4567 ")).toBe("0501234567");
    expect(growPhone("+972501234567")).toBe("0501234567");
    expect(growPhone("972-50-1234567")).toBe("0501234567");
  });

  it("rejects anything that is not an Israeli mobile", () => {
    expect(growPhone("021234567")).toBeNull(); // landline
    expect(growPhone("05012345")).toBeNull(); // too short
    expect(growPhone("05012345678")).toBeNull(); // too long
    expect(growPhone("")).toBeNull();
  });
});

describe("growFullName", () => {
  it("requires two parts, because the gateway does", () => {
    expect(growFullName("ישראל ישראלי")).toBe("ישראל ישראלי");
    expect(growFullName("ישראל")).toBeNull();
    expect(growFullName("   ")).toBeNull();
  });

  it("strips characters the payment page rejects without losing the name", () => {
    expect(growFullName("Israel <b>Israeli</b>")).toBe("Israel b Israeli b");
  });
});

describe("growSafeText", () => {
  it("collapses whitespace and drops special characters", () => {
    expect(growSafeText("1000  יהלומים!! (מבצע)")).toBe("1000 יהלומים מבצע");
  });

  it("truncates to the limit", () => {
    expect(growSafeText("x".repeat(200)).length).toBe(60);
  });
});

describe("the checkout form and the gateway agree on what is valid", () => {
  /**
   * The rules exist twice — once in `@/lib/game/diamondStore` so the browser can
   * grey the button out, once in `@/server/grow` because the gateway is where
   * they are actually enforced. Drift between them is invisible in both
   * directions and bad in both: a form that is stricter blocks real buyers, and
   * a form that is looser opens a PENDING purchase row for every typo.
   */
  const NAMES = ["ישראל ישראלי", "ישראל", "  ", "Israel Israeli", "א ב", "Israel  "];
  const PHONES = ["0501234567", "050-123-4567", "+972501234567", "021234567", "", "05012345"];

  it.each(NAMES)("agrees on the name %j", (name) => {
    expect(isValidBuyerName(name)).toBe(growFullName(name) !== null);
  });

  it.each(PHONES)("agrees on the phone %j", (phone) => {
    expect(isValidBuyerPhone(phone)).toBe(growPhone(phone) !== null);
  });
});

/* ------------------------------ configuration ------------------------------ */

describe("growConfigStatus", () => {
  it("is unset when nothing is configured, and stays on the mock", () => {
    const status = growConfigStatus();
    expect(status.state).toBe("unset");
    expect(growProvider()).toBeNull();
  });

  it("reports a partial configuration by name instead of failing every checkout", () => {
    process.env.GROW_USER_ID = "user-1";
    const status = growConfigStatus();
    expect(status.state).toBe("partial");
    expect(status.missing).toEqual(["GROW_PAGE_CODE", "GROW_CALLBACK_SECRET"]);
    // Still null: a half-configured gateway must not take the seat from the mock.
    expect(growProvider()).toBeNull();
  });

  it("treats a weak or URL-hostile callback secret as missing", () => {
    configure({ GROW_CALLBACK_SECRET: "short" });
    expect(growConfigStatus().state).toBe("partial");
    configure({ GROW_CALLBACK_SECRET: `${"a".repeat(30)}/../` });
    expect(growConfigStatus().state).toBe("partial");
  });

  it("defaults to sandbox, and sandbox charges are test charges", () => {
    configure();
    expect(growConfigStatus().env).toBe("sandbox");
    expect(growProvider()?.isTestMode).toBe(true);
  });

  it("only production moves real money", () => {
    configure({ GROW_ENV: "production" });
    expect(growProvider()?.isTestMode).toBe(false);
  });
});

describe("growCallbackSecretMatches", () => {
  it("matches the configured secret and nothing else", () => {
    configure();
    expect(growCallbackSecretMatches(SECRET)).toBe(true);
    expect(growCallbackSecretMatches(`${"a".repeat(31)}b`)).toBe(false);
    expect(growCallbackSecretMatches("a")).toBe(false);
    expect(growCallbackSecretMatches("")).toBe(false);
  });

  it("never matches while Grow is unconfigured", () => {
    expect(growCallbackSecretMatches(SECRET)).toBe(false);
    expect(growCallbackSecretMatches("")).toBe(false);
  });
});

/* ------------------------------- createOrder ------------------------------- */

const ORDER = {
  purchaseId: "purchase-1",
  empireId: "empire-1",
  packageId: "chest",
  amountIls: 69.9,
  description: "3500 יהלומים KRALDOR",
  buyer: { name: "ישראל ישראלי", phone: "050-123-4567", email: "buyer@example.com" },
};

describe("createOrder", () => {
  it("sends the fields Grow validates, in the shapes it validates them", async () => {
    configure();
    const calls = stubGrow({
      status: "1",
      data: { url: "https://pay.example/p/1", processId: "332002", processToken: "tok-1" },
    });

    const result = await growProvider()!.createOrder(ORDER);
    expect(result).toMatchObject({
      ok: true,
      orderId: "332002",
      redirectUrl: "https://pay.example/p/1",
      token: "tok-1",
    });

    const { url, fields } = calls[0];
    expect(url).toContain("sandbox.meshulam.co.il");
    expect(url.endsWith("/createPaymentProcess")).toBe(true);
    // Two decimals, always: the settlement comparison is exact, and a float that
    // serialises as "69.900000000000006" is a mismatch that refuses a real payment.
    expect(fields.sum).toBe("69.90");
    expect(fields["pageField[phone]"]).toBe("0501234567");
    expect(fields["pageField[fullName]"]).toBe("ישראל ישראלי");
    // Our row id is the only thread from the callback back to a purchase.
    expect(fields.cField1).toBe("purchase-1");
    // The secret rides in the path — Grow rejects query strings in notifyUrl.
    expect(fields.notifyUrl).toBe(`https://kraldor.example/api/pay/grow/${SECRET}`);
    expect(fields.successUrl).toBe("https://kraldor.example/game/diamonds/buy/success");
    expect(fields.cancelUrl).toBe("https://kraldor.example/game/diamonds/buy/cancel");
    // Card, Bit, Apple Pay, Google Pay by default.
    expect(fields["transactionTypes[0]"]).toBe("1");
    expect(fields["transactionTypes[1]"]).toBe("6");
  });

  it("honours a narrowed payment-method list", async () => {
    configure({ GROW_PAYMENT_METHODS: "1" });
    const calls = stubGrow({
      status: "1",
      data: { url: "u", processId: "1", processToken: "t" },
    });
    await growProvider()!.createOrder(ORDER);
    expect(calls[0].fields["transactionTypes[0]"]).toBe("1");
    expect(calls[0].fields["transactionTypes[1]"]).toBeUndefined();
  });

  it("rejects a bad name or phone before opening anything at the gateway", async () => {
    configure();
    const calls = stubGrow({ status: "1", data: {} });

    const noSurname = await growProvider()!.createOrder({
      ...ORDER,
      buyer: { ...ORDER.buyer, name: "ישראל" },
    });
    const badPhone = await growProvider()!.createOrder({
      ...ORDER,
      buyer: { ...ORDER.buyer, phone: "021234567" },
    });

    expect(noSurname.ok).toBe(false);
    expect(badPhone.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("treats a business error as a failure even though the HTTP status is 200", async () => {
    configure();
    stubGrow({ status: "0", err: { message: "invalid pageCode" } });
    const result = await growProvider()!.createOrder(ORDER);
    expect(result.ok).toBe(false);
  });

  it("fails when the gateway answers without a payment page", async () => {
    configure();
    stubGrow({ status: "1", data: { processId: "332002" } });
    const result = await growProvider()!.createOrder(ORDER);
    expect(result.ok).toBe(false);
  });

  it("never throws when the gateway is unreachable", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      })
    );
    await expect(growProvider()!.createOrder(ORDER)).resolves.toMatchObject({ ok: false });
  });
});

/* ------------------------------- captureOrder ------------------------------ */

const PAID = {
  status: "1",
  data: {
    statusCode: "2",
    status: "שולם",
    transactionId: "145111110",
    sum: "69.9",
    customFields: { cField1: "purchase-1" },
  },
};

describe("captureOrder", () => {
  it("reports the amount Grow says was paid, not one anybody sent us", async () => {
    configure();
    const calls = stubGrow(PAID);
    const result = await growProvider()!.captureOrder({ orderId: "332002", token: "tok-1" });

    expect(result).toMatchObject({
      ok: true,
      captureId: "145111110",
      amount: 69.9,
      currency: "ILS",
      purchaseId: "purchase-1",
    });
    expect(calls[0].fields.processId).toBe("332002");
    expect(calls[0].fields.processToken).toBe("tok-1");
  });

  it("fails closed on any status it does not positively recognise as paid", async () => {
    configure();
    for (const statusCode of ["0", "1", "3", "", "2 "]) {
      stubGrow({ ...PAID, data: { ...PAID.data, statusCode } });
      const result = await growProvider()!.captureOrder({ orderId: "1", token: "t" });
      expect(result.ok, `statusCode=${JSON.stringify(statusCode)}`).toBe(false);
    }
  });

  it("fails closed when the transaction id or sum is unusable", async () => {
    configure();

    stubGrow({ ...PAID, data: { ...PAID.data, transactionId: "" } });
    expect((await growProvider()!.captureOrder({ orderId: "1", token: "t" })).ok).toBe(false);

    stubGrow({ ...PAID, data: { ...PAID.data, sum: "לא מספר" } });
    expect((await growProvider()!.captureOrder({ orderId: "1", token: "t" })).ok).toBe(false);
  });

  it("refuses to ask at all without the order's lookup token", async () => {
    configure();
    const calls = stubGrow(PAID);
    const result = await growProvider()!.captureOrder({ orderId: "332002", token: null });
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});
