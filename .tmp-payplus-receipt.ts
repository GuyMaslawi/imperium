/**
 * Throwaway harness: drive a real PayPlus *staging* charge end-to-end and see
 * whether חשבונית+ now issues a document for it.
 *
 *   npx tsx .tmp-payplus-receipt.ts link      -> creates an order, prints the page URL
 *   npx tsx .tmp-payplus-receipt.ts check <id> -> capture + fetch documents
 */
import "dotenv/config";

import { payplusProvider, payplusConfigStatus } from "./src/server/payplus";

async function main() {
  const status = payplusConfigStatus();
  console.log("config:", status.state, "env:", status.env);
  const provider = payplusProvider();
  if (!provider) return console.error("PayPlus not configured");

  const mode = process.argv[2] ?? "link";

  if (mode === "link") {
    const purchaseId = process.argv[3] ?? `test${Date.now()}`;
    const result = await provider.createOrder({
      purchaseId,
      empireId: "test-empire",
      packageId: "spark",
      amountIls: 19.9,
      description: "ניצוץ — 250 יהלומים (בדיקה)",
      buyer: { name: "גיא מסלאווי", email: "guymuslave@gmail.com", phone: "0501234567" },
    });
    console.log("purchaseId:", purchaseId);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const purchaseId = process.argv[3];
  if (!purchaseId) return console.error("usage: check <purchaseId>");

  const capture = await provider.captureOrder({ purchaseId, orderId: "", token: null });
  console.log("capture:", JSON.stringify(capture, null, 2));
  if (!capture.ok) return;

  const docs = await provider.fetchDocuments?.({
    captureId: capture.captureId,
    purchaseId,
    paidAt: new Date(),
  });
  console.log("documents:", JSON.stringify(docs, null, 2));
}

main();
