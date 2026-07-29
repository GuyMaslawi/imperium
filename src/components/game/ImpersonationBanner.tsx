import { readImpersonationReturn } from "@/lib/auth";
import { returnToAdmin } from "@/server/actions/impersonation";

/**
 * The strip that says "this is not your account".
 *
 * An impersonated session is byte-for-byte an ordinary player session — that is
 * what makes it useful and what makes it dangerous — so the only thing keeping
 * an admin from forgetting they are inside someone else's empire and playing it
 * is this bar. It renders nothing (and costs one cookie read) for real players.
 */
export async function ImpersonationBanner({ empireName }: { empireName: string }) {
  const ticket = await readImpersonationReturn();
  if (!ticket) return null;

  return (
    <div
      dir="rtl"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-crimson/40 bg-crimson/20 px-3 py-1.5 text-center text-xs text-amber-100"
    >
      <span>
        <span aria-hidden>👁️</span> מצב אדמין — אתה משחק בתור{" "}
        <strong className="text-gold-bright">{empireName}</strong>. כל פעולה
        תירשם על שם השחקן.
      </span>
      <form action={returnToAdmin}>
        <button
          type="submit"
          className="rounded-md border border-gold/50 px-2 py-0.5 font-bold text-gold-bright transition-colors hover:bg-gold/15"
        >
          חזרה לחשבון האדמין
        </button>
      </form>
    </div>
  );
}
