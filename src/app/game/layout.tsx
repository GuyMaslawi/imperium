import type { ReactNode } from "react";
import { requireEmpire } from "@/lib/auth";
import { nextDailyUpdate, nextRegularUpdate, formatGameTime } from "@/lib/game/time";
import { ResourceBar } from "@/components/game/ResourceBar";
import { UpdateTimers } from "@/components/game/UpdateTimers";
import { Sidebar } from "@/components/game/Sidebar";

export default async function GameLayout({ children }: { children: ReactNode }) {
  // requireEmpire applies all pending regular/daily updates (lazy game clock).
  const empire = await requireEmpire();

  const now = new Date();
  const nextRegular = nextRegularUpdate(empire.lastRegularUpdateAt);
  const nextDaily = nextDailyUpdate(now);

  return (
    <div className="flex min-h-screen flex-col">
      <ResourceBar
        resources={{
          gold: empire.gold,
          wood: empire.wood,
          iron: empire.iron,
          stone: empire.stone,
          diamonds: empire.diamonds,
          citizens: empire.citizens,
          turns: empire.turns,
        }}
      />
      <UpdateTimers
        serverNow={now.getTime()}
        nextRegularAt={nextRegular.getTime()}
        nextDailyAt={nextDaily.getTime()}
        nextDailyLabel={formatGameTime(nextDaily)}
      />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar empireName={empire.name} empireLevel={empire.level} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
