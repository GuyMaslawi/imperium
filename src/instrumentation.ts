import type { Instrumentation } from "next";

/**
 * Server-side error capture.
 *
 * Next calls `onRequestError` for every error it catches while handling a
 * request — a Server Component that threw during render, a route that blew up,
 * a Server Action that rejected without being caught. Those used to go to the
 * platform log and scroll away, which on Vercel means they were effectively
 * gone by the time anyone thought to look.
 *
 * This is only half the picture, and the smaller half. The larger half is the
 * ~40 server actions that end in `catch { return { error: "אירעה שגיאה, נסה
 * שוב" } }`: Next never sees those, because the action handled them. They log
 * themselves through the same `logError` — see src/server/errorLog.ts.
 *
 * The import is dynamic and the whole body is wrapped: this hook runs while the
 * app is already failing, and an error thrown *here* would replace a useful
 * error with a useless one.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  try {
    const { logError } = await import("@/server/errorLog");
    const digest =
      typeof err === "object" && err !== null && "digest" in err
        ? ` [digest ${String((err as { digest: unknown }).digest)}]`
        : "";
    await logError(`${context.routerKind}:${context.routePath ?? "?"}${digest}`, err, {
      path: request.path,
    });
  } catch (hookFailure) {
    console.error("[instrumentation] failed to record a request error", hookFailure);
  }
};
