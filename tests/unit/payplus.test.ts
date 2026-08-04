import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  payplusCallbackIsAuthentic,
  payplusConfigStatus,
  payplusProvider,
  payplusText,
} from "@/server/payplus";

/**
 * The PayPlus gateway, tested where it is actually dangerous.
 *
 * Three things here carry real risk and the rest is plumbing:
 *
 * 1. **The callback signature is the endpoint's only authentication.** A
 *    verification that accepts a tampered body, a wrong key, or a missing
 *    User-Agent turns a public URL into a diamond printer, so each way of
 *    getting it wrong gets its own case — including the one nobody thinks of,
 *    where PayPlus is unconfigured and there is no key to check against at all.
 * 2. **Nothing credits off an unverified answer.** `captureOrder` is the only
 *    source of a payment's amount, and it must fail closed on every shape it
 *    does not positively recognise: an unpaid status, a cancelled transaction,
 *    a missing uid, a non-numeric amount.
 * 3. **The lookup key is `more_info`, not the order id.** PayPlus's
 *    `Transactions/View` has no handle on the payment page, so a `captureOrder`
 *    that forgot to send our purchase id would silently verify nothing.
 */

const API_KEY = "api-key-1";
const SECRET = "secret-key-1";
const PAGE_UID = "page-uid-1";

const KEYS = [
  "PAYPLUS_API_KEY",
  "PAYPLUS_SECRET_KEY",
  "PAYPLUS_PAGE_UID",
  "PAYPLUS_ENV",
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
  process.env.PAYPLUS_API_KEY = API_KEY;
  process.env.PAYPLUS_SECRET_KEY = SECRET;
  process.env.PAYPLUS_PAGE_UID = PAGE_UID;
  process.env.NEXT_PUBLIC_APP_URL = "https://kraldor.example";
  for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
}

/** Stub `fetch` with a canned envelope and capture what was sent. */
function stubPayPlus(envelope: unknown, status = 200) {
  const calls: { url: string; headers: Record<string, string>; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({
        url: String(url),
        headers: init.headers as Record<string, string>,
        body: JSON.parse(String(init.body)),
      });
      return new Response(JSON.stringify(envelope), {
        status,
        headers: { "content-type": "application/json" },
      });
    })
  );
  return calls;
}

const sign = (body: string, key = SECRET) =>
  createHmac("sha256", key).update(body, "utf8").digest("base64");

/* ------------------------------ configuration ------------------------------ */

describe("payplusConfigStatus", () => {
  it("is unset when nothing is configured, and stays on the mock", () => {
    expect(payplusConfigStatus().state).toBe("unset");
    expect(payplusProvider()).toBeNull();
  });

  it("reports a partial configuration by name instead of failing every checkout", () => {
    process.env.PAYPLUS_API_KEY = API_KEY;
    const status = payplusConfigStatus();
    expect(status.state).toBe("partial");
    expect(status.missing).toEqual(["PAYPLUS_SECRET_KEY", "PAYPLUS_PAGE_UID"]);
    // Still null: a half-configured gateway must not take the seat from the mock.
    expect(payplusProvider()).toBeNull();
  });

  it("defaults to staging, and staging charges are test charges", () => {
    configure();
    expect(payplusConfigStatus().env).toBe("staging");
    expect(payplusProvider()?.isTestMode).toBe(true);
  });

  it("only production moves real money", () => {
    configure({ PAYPLUS_ENV: "production" });
    expect(payplusProvider()?.isTestMode).toBe(false);
  });
});

/* --------------------------- callback authentication ---------------------- */

describe("payplusCallbackIsAuthentic", () => {
  const body = JSON.stringify({ transaction: { uid: "t1", amount: 69.9 }, more_info: "p1" });

  it("accepts a correctly signed PayPlus request", () => {
    configure();
    expect(payplusCallbackIsAuthentic(body, sign(body), "PayPlus")).toBe(true);
  });

  it("rejects a body that was altered after signing", () => {
    configure();
    const hash = sign(body);
    const tampered = body.replace("69.9", "6990");
    expect(payplusCallbackIsAuthentic(tampered, hash, "PayPlus")).toBe(false);
  });

  it("rejects a signature made with the wrong key", () => {
    configure();
    expect(payplusCallbackIsAuthentic(body, sign(body, "not-the-secret"), "PayPlus")).toBe(false);
  });

  it("rejects anything not stamped with PayPlus's User-Agent", () => {
    configure();
    const hash = sign(body);
    expect(payplusCallbackIsAuthentic(body, hash, "curl/8.0")).toBe(false);
    expect(payplusCallbackIsAuthentic(body, hash, null)).toBe(false);
  });

  it("rejects a missing hash or an empty body", () => {
    configure();
    expect(payplusCallbackIsAuthentic(body, null, "PayPlus")).toBe(false);
    expect(payplusCallbackIsAuthentic("", sign(""), "PayPlus")).toBe(false);
  });

  it("refuses everything while PayPlus is unconfigured", () => {
    // The case that matters most: an un-keyed deploy must not accept requests it
    // has no way to verify.
    expect(payplusCallbackIsAuthentic(body, sign(body), "PayPlus")).toBe(false);
  });

  it("also accepts the re-stringified reading PayPlus's own sample produces", () => {
    configure();
    const spaced = '{ "a" : 1 }';
    const canonical = JSON.stringify(JSON.parse(spaced));
    expect(payplusCallbackIsAuthentic(spaced, sign(canonical), "PayPlus")).toBe(true);
  });
});

/* -------------------------------- createOrder ------------------------------ */

const ORDER = {
  purchaseId: "purchase-1",
  empireId: "empire-1",
  packageId: "chest",
  amountIls: 69.9,
  description: "3500 יהלומים KRALDOR",
  buyer: { name: "ישראל ישראלי", phone: "0501234567", email: "buyer@example.com" },
};

describe("createOrder", () => {
  it("sends the credentials in headers and our purchase id as more_info", async () => {
    configure();
    const calls = stubPayPlus({
      results: { status: "success", code: 0 },
      data: { page_request_uid: "req-1", payment_page_link: "https://pay.example/p/1" },
    });

    const result = await payplusProvider()!.createOrder(ORDER);
    expect(result).toMatchObject({
      ok: true,
      orderId: "req-1",
      redirectUrl: "https://pay.example/p/1",
    });

    const { url, headers, body } = calls[0];
    expect(url).toBe("https://restapidev.payplus.co.il/api/v1.0/PaymentPages/generateLink");
    expect(headers["api-key"]).toBe(API_KEY);
    expect(headers["secret-key"]).toBe(SECRET);

    const sent = body as Record<string, unknown>;
    expect(sent.payment_page_uid).toBe(PAGE_UID);
    expect(sent.amount).toBe(69.9);
    expect(sent.currency_code).toBe("ILS");
    // The only thread from the callback back to a purchase — and the only handle
    // `Transactions/View` accepts.
    expect(sent.more_info).toBe("purchase-1");
    expect(sent.refURL_callback).toBe("https://kraldor.example/api/pay/payplus");
    expect(sent.refURL_success).toBe("https://kraldor.example/game/diamonds/buy/success");
    // Receipts are a legal obligation for an עוסק פטור, not a nicety.
    expect(sent.sendEmailApproval).toBe(true);
    // The parameter PayPlus's integration guide names for issuing the document.
    // It cannot make a receipt appear on its own — the invoice module still has
    // to be live on the page — but its absence is one reason none would.
    expect(sent.initial_invoice).toBe(true);
    // 1 = Charge (J4). A page left on J5 authorises without ever capturing.
    expect(sent.charge_method).toBe(1);
  });

  it("bills as VAT-exempt, because the operator is an עוסק פטור", async () => {
    // The failure this guards against is silent and expensive: left to PayPlus's
    // default, every issued receipt breaks out VAT the operator is not
    // registered to charge — a wrong tax document per sale, discovered only
    // after the money is real.
    configure();
    const calls = stubPayPlus({
      results: { status: "success" },
      data: { page_request_uid: "r", payment_page_link: "u" },
    });
    await payplusProvider()!.createOrder(ORDER);

    const sent = calls[0].body as Record<string, never>;
    expect(sent.paying_vat).toBe(false);
    const items = sent.items as unknown as { price: number; quantity: number; vat_type: number }[];
    expect(items).toHaveLength(1);
    expect(items[0].vat_type).toBe(2); // 2 = exempt
    // The line total must be the amount actually charged, or the receipt and the
    // charge disagree — which is the one discrepancy an auditor always finds.
    expect(items[0].price).toBe(69.9);
    expect(items[0].quantity).toBe(1);
    expect(sent.amount).toBe(69.9);
  });

  it("uses the production host only when told to", async () => {
    configure({ PAYPLUS_ENV: "production" });
    const calls = stubPayPlus({
      results: { status: "success" },
      data: { page_request_uid: "r", payment_page_link: "u" },
    });
    await payplusProvider()!.createOrder(ORDER);
    expect(calls[0].url.startsWith("https://restapi.payplus.co.il/")).toBe(true);
  });

  it("treats a business error as a failure even though the HTTP status is 200", async () => {
    configure();
    stubPayPlus({ results: { status: "error", code: 1, description: "invalid page uid" } });
    expect((await payplusProvider()!.createOrder(ORDER)).ok).toBe(false);
  });

  it("fails when the gateway answers without a payment page", async () => {
    configure();
    stubPayPlus({ results: { status: "success" }, data: { page_request_uid: "req-1" } });
    expect((await payplusProvider()!.createOrder(ORDER)).ok).toBe(false);
  });

  it("never throws when the gateway is unreachable", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      })
    );
    await expect(payplusProvider()!.createOrder(ORDER)).resolves.toMatchObject({ ok: false });
  });
});

/* ------------------------------- captureOrder ------------------------------ */

const paidRow = (over: Record<string, unknown> = {}) => ({
  results: { status: "success", code: 0 },
  data: [
    {
      transaction: {
        transaction_uid: "tx-1",
        status_code: "000",
        amount: 69.9,
        currency: "ILS",
        more_info: "purchase-1",
        ...over,
      },
    },
  ],
});

describe("captureOrder", () => {
  const ref = { orderId: "req-1", token: null, purchaseId: "purchase-1" };

  it("looks the transaction up by our purchase id, not the page request", async () => {
    configure();
    const calls = stubPayPlus(paidRow());
    const result = await payplusProvider()!.captureOrder(ref);

    expect(result).toMatchObject({
      ok: true,
      captureId: "tx-1",
      amount: 69.9,
      currency: "ILS",
      purchaseId: "purchase-1",
    });
    expect(calls[0].url.endsWith("/Transactions/View")).toBe(true);
    expect(calls[0].body).toEqual({ more_info: "purchase-1" });
  });

  it("fails closed on any status it does not positively recognise as paid", async () => {
    configure();
    for (const status_code of ["001", "999", "", "0", "000 "]) {
      stubPayPlus(paidRow({ status_code }));
      const result = await payplusProvider()!.captureOrder(ref);
      expect(result.ok, `status_code=${JSON.stringify(status_code)}`).toBe(false);
    }
  });

  it("refuses a cancelled transaction even when its status says paid", async () => {
    configure();
    stubPayPlus(paidRow({ transaction_is_cancelled: true }));
    expect((await payplusProvider()!.captureOrder(ref)).ok).toBe(false);
  });

  it("picks the successful attempt when a buyer retried on the same link", async () => {
    configure();
    stubPayPlus({
      results: { status: "success" },
      data: [
        { transaction: { transaction_uid: "tx-fail", status_code: "001", amount: 69.9 } },
        {
          transaction: {
            transaction_uid: "tx-ok",
            status_code: "000",
            amount: 69.9,
            currency: "ILS",
            more_info: "purchase-1",
          },
        },
      ],
    });
    expect(await payplusProvider()!.captureOrder(ref)).toMatchObject({
      ok: true,
      captureId: "tx-ok",
    });
  });

  it("fails closed when the transaction uid or amount is unusable", async () => {
    configure();

    stubPayPlus(paidRow({ transaction_uid: "" }));
    expect((await payplusProvider()!.captureOrder(ref)).ok).toBe(false);

    stubPayPlus(paidRow({ amount: "לא מספר" }));
    expect((await payplusProvider()!.captureOrder(ref)).ok).toBe(false);
  });

  it("refuses to ask at all without our purchase id", async () => {
    configure();
    const calls = stubPayPlus(paidRow());
    const result = await payplusProvider()!.captureOrder({ orderId: "req-1", purchaseId: null });
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("reports no transactions as unpaid rather than erroring", async () => {
    configure();
    stubPayPlus({ results: { status: "success" }, data: [] });
    expect((await payplusProvider()!.captureOrder(ref)).ok).toBe(false);
  });
});

/* ------------------------------ fetchDocuments ----------------------------- */

/**
 * The receipt lookup, which fails in a way none of the other calls do.
 *
 * `Invoice/GetDocuments` answers with a bare `{ invoices: [...] }` and **no
 * `results` envelope**, so routing it through the ordinary poster would reject
 * every successful answer as a business error. And its empty case is not a
 * failure at all: no document yet — the state the store is in for as long as the
 * חשבונית+ module is unsubscribed — has to read as "none", never as an error, or
 * the operator goes looking at the code instead of at the panel.
 */
describe("fetchDocuments", () => {
  const docRow = (over: Record<string, unknown> = {}) => ({
    status: "success",
    type: "Invoice Receipt",
    date: "16/02/2021 11:21",
    original_doc_url: "https://invoice.example/doc/1",
    copy_doc_url: "https://invoice.example/doc/1-copy",
    ...over,
  });

  it("asks by transaction uid, inside a date window, and maps the documents", async () => {
    configure();
    const calls = stubPayPlus({ invoices: [docRow()] });

    const result = await payplusProvider()!.fetchDocuments!({
      captureId: "tx-1",
      paidAt: new Date("2026-08-04T12:00:00Z"),
    });

    expect(calls[0].url).toBe("https://restapidev.payplus.co.il/api/v1.0/Invoice/GetDocuments");
    const sent = calls[0].body as { transaction_uid: string; filter: Record<string, string> };
    expect(sent.transaction_uid).toBe("tx-1");
    // A day earlier, because the docs never state which timezone the range is in.
    expect(sent.filter.fromDate).toBe("2026-08-03");
    // And far ahead, because a credit invoice for a refund lands weeks later and
    // belongs to the same payment.
    expect(sent.filter.untilDate > "2027-08-01").toBe(true);

    expect(result).toEqual({
      ok: true,
      documents: [
        {
          type: "Invoice Receipt",
          date: "16/02/2021 11:21",
          url: "https://invoice.example/doc/1",
          copyUrl: "https://invoice.example/doc/1-copy",
        },
      ],
    });
  });

  it("reads an empty list as 'none issued yet', not as an error", async () => {
    configure();
    stubPayPlus({ invoices: [] });
    const result = await payplusProvider()!.fetchDocuments!({ captureId: "tx-1" });
    expect(result).toEqual({ ok: true, documents: [] });
  });

  it("drops rows with no usable link rather than offering a dead button", async () => {
    configure();
    stubPayPlus({ invoices: [docRow({ original_doc_url: null }), docRow()] });
    const result = await payplusProvider()!.fetchDocuments!({ captureId: "tx-1" });
    expect(result.ok && result.documents).toHaveLength(1);
  });

  it("treats a response with no invoices key as a failure, quoting the provider", async () => {
    configure();
    stubPayPlus({ results: { status: "error", description: "invoice module is not active" } });
    const result = await payplusProvider()!.fetchDocuments!({ captureId: "tx-1" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("invoice module is not active");
  });

  it("never calls the gateway without a capture id", async () => {
    configure();
    const calls = stubPayPlus({ invoices: [docRow()] });
    expect((await payplusProvider()!.fetchDocuments!({ captureId: "" })).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

/* ------------------------------- field mapping ----------------------------- */

describe("payplusText", () => {
  it("strips control characters and collapses whitespace", () => {
    expect(payplusText("ישראל\n\tישראלי  ")).toBe("ישראל ישראלי");
  });

  it("keeps punctuation that Grow would have stripped — JSON needs no scrubbing", () => {
    expect(payplusText("O'Brien (Ltd.)")).toBe("O'Brien (Ltd.)");
  });

  it("truncates to the limit", () => {
    expect(payplusText("x".repeat(200)).length).toBe(80);
  });
});
