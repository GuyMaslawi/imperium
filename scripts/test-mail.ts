/**
 * Send one real test email through whichever provider is configured.
 *
 * Use it to confirm a new BREVO_API_KEY actually delivers *before* wiping the
 * database — once the world is reset, a broken mailer means no new player can
 * ever clear the verification gate.
 *
 *   BREVO_API_KEY=xkeysib-... \
 *   MAIL_FROM='Kraldor <you@example.com>' \
 *   npx tsx scripts/test-mail.ts you@example.com
 *
 * Deliberately does NOT import src/server/mailer.ts: that module is marked
 * `server-only`, a guard worth keeping intact rather than relaxing for a
 * diagnostic. The request shape below must stay in step with it.
 *
 * A failure prints the provider's own reason — most often "sender not
 * verified", meaning the MAIL_FROM address still needs confirming in Brevo.
 */

function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { name: m[1] || "Kraldor", email: m[2]! };
  return { name: "Kraldor", email: raw.trim() };
}

const SUBJECT = "בדיקת שליחה — קראלדור";
const TEXT = "אם הגיע אליך המייל הזה, שליחת המיילים מוגדרת נכון.";
const HTML =
  '<div dir="rtl" style="font-family:system-ui,sans-serif">אם הגיע אליך המייל הזה, שליחת המיילים מוגדרת נכון. ✅</div>';

async function main(): Promise<void> {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npx tsx scripts/test-mail.ts <recipient@example.com>");
    process.exit(1);
  }

  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "";

  console.log(
    `Provider : ${brevoKey ? "brevo" : resendKey ? "resend" : "none configured"}`
  );
  console.log(`From     : ${from || "(MAIL_FROM not set)"}`);
  console.log(`To       : ${to}\n`);

  if (!brevoKey && !resendKey) {
    console.error(
      "No BREVO_API_KEY or RESEND_API_KEY in the environment — nothing would be delivered."
    );
    process.exit(1);
  }
  if (!from) {
    console.error("MAIL_FROM is not set; the provider will reject the send.");
    process.exit(1);
  }

  let res: Response;
  if (brevoKey) {
    res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseFrom(from),
        to: [{ email: to }],
        subject: SUBJECT,
        htmlContent: HTML,
        textContent: TEXT,
      }),
    });
  } else {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: SUBJECT,
        html: HTML,
        text: TEXT,
      }),
    });
  }

  const body = await res.text();
  if (!res.ok) {
    console.error(`Send FAILED ❌  HTTP ${res.status}`);
    console.error(body);
    // The same three causes the runtime mailer classifies — spelled out here
    // because this script is what you run *while* diagnosing.
    if (res.status === 401 || res.status === 403) {
      console.error(
        "\nEither the API key is wrong, or the account's authorised-IP blocking is on\n" +
          "and this machine's IP is not on the list (Brevo: Security → Authorized IPs)."
      );
    } else if (res.status === 400 && /sender/i.test(body)) {
      console.error(
        "\nThe MAIL_FROM address is not a verified sender.\n" +
          "Brevo: Senders, Domains & Dedicated IPs → Senders → add and confirm it."
      );
    } else if (res.status === 429) {
      console.error("\nRate limited or the daily quota (300/day on free) is used up.");
    }
    process.exit(1);
  }
  // Brevo answers 201 with {"messageId": "..."}.
  console.log(`Accepted by provider ✅  HTTP ${res.status}`);
  console.log(body);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
