import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Recording application errors.
 *
 * The rule this module exists to enforce: **nothing here may ever throw.** It is
 * called from `catch` blocks and from Next's request-error hook — the two places
 * in the codebase where something has already gone wrong. A logger that fails
 * loudly in either would turn a handled error into an unhandled one, which is
 * precisely the failure mode it was added to prevent. Every path is wrapped, and
 * a logging failure degrades to a `console.error` and nothing more.
 */

/** Longest stack we keep. Enough to recognise a bug, not to read a novel. */
const STACK_LIMIT = 4_000;
const MESSAGE_LIMIT = 500;

/** Errors older than this are swept away by the opportunistic cleaner. */
const RETENTION_MS = 14 * 24 * 3_600_000;
const SWEEP_EVERY = 200;
let sinceSweep = 0;

function text(value: unknown, limit: number): string {
  const s = typeof value === "string" ? value : String(value ?? "");
  return s.length > limit ? `${s.slice(0, limit)}…` : s;
}

/** Pull a message + stack out of anything that can be thrown. */
function describe(err: unknown): { message: string; stack: string | null } {
  if (err instanceof Error) {
    return {
      message: text(err.message || err.name, MESSAGE_LIMIT),
      stack: err.stack ? text(err.stack, STACK_LIMIT) : null,
    };
  }
  if (err && typeof err === "object") {
    try {
      return { message: text(JSON.stringify(err), MESSAGE_LIMIT), stack: null };
    } catch {
      return { message: text(err, MESSAGE_LIMIT), stack: null };
    }
  }
  return { message: text(err, MESSAGE_LIMIT), stack: null };
}

export interface ErrorContext {
  path?: string | null;
  userId?: string | null;
  empireId?: string | null;
}

/**
 * Record one error against `source` (an action name, a route, or "render").
 *
 * Repeats of the same (source, message) inside the retention window bump a
 * counter on the existing row instead of inserting a new one. Without that, one
 * bad deploy writes a row per request — the table becomes the outage, and the
 * monitor shows ten thousand copies of a single bug instead of the five distinct
 * bugs underneath it.
 */
export async function logError(
  source: string,
  err: unknown,
  ctx: ErrorContext = {}
): Promise<void> {
  const { message, stack } = describe(err);
  // Always reaches the platform log too: the database may be exactly what broke.
  console.error(`[error:${source}] ${message}`, err);

  try {
    const existing = await prisma.errorLog.findFirst({
      where: { source, message },
      orderBy: { lastSeen: "desc" },
      select: { id: true },
    });

    if (existing) {
      await prisma.errorLog.update({
        where: { id: existing.id },
        data: {
          count: { increment: 1 },
          lastSeen: new Date(),
          // Keep the freshest stack and context — the newest occurrence is the
          // one worth reproducing.
          ...(stack ? { stack } : {}),
          ...(ctx.path ? { path: text(ctx.path, 300) } : {}),
          ...(ctx.userId ? { userId: ctx.userId } : {}),
          ...(ctx.empireId ? { empireId: ctx.empireId } : {}),
        },
      });
    } else {
      await prisma.errorLog.create({
        data: {
          source,
          message,
          stack,
          path: ctx.path ? text(ctx.path, 300) : null,
          userId: ctx.userId ?? null,
          empireId: ctx.empireId ?? null,
        },
      });
    }

    if (++sinceSweep >= SWEEP_EVERY) {
      sinceSweep = 0;
      await prisma.errorLog.deleteMany({
        where: { lastSeen: { lt: new Date(Date.now() - RETENTION_MS) } },
      });
    }
  } catch (loggingFailure) {
    // The one place a swallowed error is correct: we are already in the failure
    // path, and there is nothing above us to tell.
    console.error("[error-log] could not record the error", loggingFailure);
  }
}
