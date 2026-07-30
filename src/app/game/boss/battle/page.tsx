import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { getBossArenaState } from "@/server/bossBattleState";
import { BossArena } from "@/components/game/BossArena";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "קרב בוס | IMPERIUM" };

/**
 * How recently a sortie must have settled for this route to forward to its
 * report rather than back to the banner.
 */
const JUST_SETTLED_MS = 3 * 60 * 1000;

/**
 * The arena — a running assault, watched.
 *
 * There is no way to *start* a fight from here: the attack is paid for on the
 * rankings banner, and this route only ever shows what that attack launched. A
 * player who lands here with nothing running is sent onward — to the report if an
 * assault has just settled, otherwise to the banner — which is what makes the URL
 * safe to keep in a tab.
 *
 * The settle is deliberately *not* done here. It belongs to `settleDueAssault`,
 * which the arena's own poll and the inbox poll both call, so a finished assault
 * pays out whether or not anyone opens this page.
 */
export default async function BossBattlePage() {
  const me = await requireEmpire();
  const state = await getBossArenaState(me.id);
  if (!state) {
    // `new Date()`, not `Date.now()`: the purity lint flags the latter inside a
    // component render, and this is a render.
    const cutoff = new Date(new Date().getTime() - JUST_SETTLED_MS);
    const justSettled = await prisma.bossFight.findFirst({
      where: { empireId: me.id, createdAt: { gt: cutoff } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    redirect(justSettled ? `/game/boss/${justSettled.id}` : "/game/rankings");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-bone-dim">
          מצור על {state.boss.name}
        </p>
        {/* Leaving costs nothing and the arena says so in its own copy too — the
            fight is on a server clock, not on this page being open. */}
        <Link href="/game/rankings" className="btn btn-ghost px-4 py-1.5 text-xs">
          <Icon name="rankings" size={14} className="inline-block align-middle" /> חזרה לדירוג
        </Link>
      </div>

      <BossArena initial={state} />
    </div>
  );
}
