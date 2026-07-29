"use server";

import { getSessionUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/rateLimit";
import { logError } from "@/server/errorLog";

/**
 * Report an error that only the browser saw.
 *
 * Errors thrown while rendering on the server already reach `onRequestError`
 * (see src/instrumentation.ts). This covers the other kind: a client component
 * that threw in the browser, which reaches an `error.tsx` boundary and nowhere
 * else. Without it the boundary is a polite apology and the cause is lost.
 *
 * It is a public endpoint — an error boundary renders for logged-out visitors
 * too — so it is throttled per caller and everything it accepts is treated as
 * hostile text: the message is truncated by `logError`, and the digest is the
 * only field Next itself produced.
 */
export async function reportClientError(
  message: string,
  digest?: string,
  path?: string
): Promise<void> {
  try {
    const ip = await clientIp();
    // Generous: a boundary can legitimately fire a few times while a user
    // retries. Tight enough that nobody fills the table from a loop.
    if (!(await rateLimit(`client-error:${ip}`, 20, 10 * 60 * 1000))) return;

    const userId = await getSessionUserId();
    await logError(
      `client${digest ? ` [digest ${String(digest).slice(0, 40)}]` : ""}`,
      String(message),
      { path: path ?? null, userId }
    );
  } catch {
    // Reporting an error must never be able to create one.
  }
}
