import Link from "next/link";
import { redirect } from "next/navigation";
import { requireEmpire } from "@/lib/auth";
import { getBossArenaState, recentBossFightId } from "@/server/bossBattleState";
import { BossArena } from "@/components/game/BossArena";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "קרב בוס | IMPERIUM" };

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
    const justSettled = await recentBossFightId(me.id);
    redirect(justSettled ? `/game/boss/${justSettled}` : "/game/rankings");
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
