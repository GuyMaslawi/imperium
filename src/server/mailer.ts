import "server-only";

/**
 * Outbound email, with the same mock-provider seam as `payments.ts`.
 *
 * Three providers, picked by whichever key is present:
 *
 *  - **Brevo** (`BREVO_API_KEY`) — the default choice for this app. Its free
 *    tier is 300 mails/day with no expiry, and crucially it will send to *any*
 *    recipient once you verify a single sender address. That matters because
 *    the game runs on a `*.vercel.app` subdomain we cannot add DNS records to.
 *  - **Resend** (`RESEND_API_KEY`) — supported, but its sandbox sender only
 *    reaches your own address until you verify a domain you control, so it
 *    cannot deliver to real players here.
 *  - **Neither** — the message (including the verification link) is logged to
 *    the server console, so the whole flow is exercisable in development
 *    without an account anywhere.
 *
 * Failing to send is reported, never thrown: a registration must not roll back
 * because an upstream mail provider had a bad minute. Callers surface a "we
 * couldn't send it, try resending" message instead.
 */

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** True when a real provider is configured — i.e. mail actually leaves the box. */
export function isMailLive(): boolean {
  return Boolean(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY);
}

/** Raw MAIL_FROM, in either `you@example.com` or `Name <you@example.com>` form. */
function fromAddress(): string {
  return process.env.MAIL_FROM ?? "Imperium <onboarding@resend.dev>";
}

/**
 * Split `Name <addr>` into the parts Brevo's JSON API wants separately.
 * Brevo caps the sender name at 70 characters, so clamp rather than let the
 * provider reject the whole send over a cosmetic field.
 */
function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  const name = (m ? m[1] : "").trim() || "Imperium";
  const email = (m ? m[2]! : raw).trim();
  return { name: name.slice(0, 70), email };
}

/** Give up on a single attempt after this long. */
const SEND_TIMEOUT_MS = 10_000;
/** Extra attempts after the first, for transient failures only. */
const SEND_RETRIES = 2;

/**
 * Turn a failed response into a log line that names the actual cause.
 *
 * The one worth calling out is 401/403. Brevo has an "authorised IPs" feature
 * whose blocking can switch itself on after a learning period, and Vercel
 * functions egress from a dynamic IP range that cannot be allowlisted on a
 * free plan — so mail can start bouncing weeks after a working launch, with
 * nothing else changing. Left as a generic "send failed" that is a miserable
 * thing to debug, so it gets its own message.
 */
function logSendFailure(provider: string, status: number, body: string): void {
  if (status === 401 || status === 403) {
    console.error(
      `[mailer:${provider}] auth rejected (HTTP ${status}). Either the API key is wrong, ` +
        `or the account's authorised-IP blocking is on and this server's IP is not on the list ` +
        `(Vercel functions use a dynamic IP range). Body: ${body}`
    );
    return;
  }
  if (status === 429) {
    console.error(
      `[mailer:${provider}] rate limited / daily quota reached (HTTP 429). Body: ${body}`
    );
    return;
  }
  // Never log the API key itself — only the provider's own reason.
  console.error(`[mailer:${provider}] send failed (HTTP ${status}). Body: ${body}`);
}

/** Transient conditions worth a second try; anything else is a hard no. */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Without a deadline a stalled provider connection holds the registration
    // request open for the whole function timeout.
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
}

async function sendWithRetry(
  provider: string,
  attempt: () => Promise<Response>
): Promise<boolean> {
  for (let i = 0; i <= SEND_RETRIES; i++) {
    try {
      const res = await attempt();
      if (res.ok) return true;

      const body = await res.text();
      if (i < SEND_RETRIES && isRetryable(res.status)) {
        await new Promise((r) => setTimeout(r, 300 * 2 ** i));
        continue;
      }
      logSendFailure(provider, res.status, body);
      return false;
    } catch (e) {
      // Timeout or network error — both worth one more go.
      if (i < SEND_RETRIES) {
        await new Promise((r) => setTimeout(r, 300 * 2 ** i));
        continue;
      }
      console.error(`[mailer:${provider}] send threw`, e);
      return false;
    }
  }
  return false;
}

async function sendViaBrevo(msg: MailMessage, apiKey: string): Promise<boolean> {
  return sendWithRetry("brevo", () =>
    postJson(
      "https://api.brevo.com/v3/smtp/email",
      { "api-key": apiKey, Accept: "application/json" },
      {
        sender: parseFrom(fromAddress()),
        to: [{ email: msg.to }],
        subject: msg.subject,
        htmlContent: msg.html,
        textContent: msg.text,
      }
    )
  );
}

async function sendViaResend(msg: MailMessage, apiKey: string): Promise<boolean> {
  return sendWithRetry("resend", () =>
    postJson(
      "https://api.resend.com/emails",
      { Authorization: `Bearer ${apiKey}` },
      {
        from: fromAddress(),
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }
    )
  );
}

export async function sendMail(msg: MailMessage): Promise<boolean> {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!brevoKey && !resendKey) {
    // Dev / unconfigured: the link goes to the server log so the flow still works.
    console.info(
      `[mailer:mock] to=${msg.to} subject=${JSON.stringify(msg.subject)}\n${msg.text}`
    );
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[mailer] No BREVO_API_KEY / RESEND_API_KEY — verification mail is NOT being delivered in production."
      );
    }
    return true;
  }

  // sendWithRetry already contains its own failures; this guard is only for
  // anything unexpected outside the request itself.
  try {
    return brevoKey
      ? await sendViaBrevo(msg, brevoKey)
      : await sendViaResend(msg, resendKey!);
  } catch (e) {
    console.error("[mailer] send threw", e);
    return false;
  }
}

/**
 * Absolute base URL for links we email out.
 *
 * Deliberately NOT derived from the request's Host header: that header is
 * attacker-controlled, and a forged one would rewrite the verification link in
 * a real user's inbox to point at the attacker's domain, handing them the
 * token. Configured value first, then Vercel's own deployment URL.
 */
export function appBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
