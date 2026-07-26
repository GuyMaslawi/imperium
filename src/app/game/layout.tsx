import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { nextDailyUpdate, nextRegularUpdate, formatGameTime } from "@/lib/game/time";
import {
  HERO_CLASS_META,
  HERO_MAX_LEVEL,
  heroBonuses,
  heroClassImage,
  xpToNextLevel,
} from "@/lib/game/hero";
import { ResourceBar } from "@/components/game/ResourceBar";
import { UpdateTimers } from "@/components/game/UpdateTimers";
import { SeasonPassButton } from "@/components/game/SeasonPass";
import { Sidebar, MobileMenu, type SidebarProps } from "@/components/game/Sidebar";
import { InboxNav } from "@/components/game/InboxNav";
import { WarAlerts } from "@/components/game/WarAlerts";
import { MiniGameLauncher } from "@/components/game/MiniGameLauncher";
import { getMiniGameState } from "@/server/actions/minigame";
import { getSeasonPassState } from "@/server/actions/seasonPass";
import { OrnateFrame } from "@/components/ui/OrnateFrame";

export default async function GameLayout({ children }: { children: ReactNode }) {
  // requireEmpire applies all pending regular/daily updates (lazy game clock).
  const empire = await requireEmpire();

  const now = new Date();
  // Global boundary (XX:00, XX:05, …) — the same countdown for every player.
  const nextRegular = nextRegularUpdate(now);
  const nextDaily = nextDailyUpdate(now);

  // Real season-pass progression: XP earned by gameplay actions this cycle,
  // rewards priced at the current season day. See src/lib/game/seasonPass.ts.
  const seasonPass = await getSeasonPassState();

  // Real hero progression (battles grant XP; see src/lib/game/hero.ts).
  const hero = empire.hero;
  const heroLevel = hero?.level ?? 1;
  const heroAtCap = heroLevel >= HERO_MAX_LEVEL;
  const heroXpMax = heroAtCap ? 1 : xpToNextLevel(heroLevel);
  const heroXp = heroAtCap ? 1 : hero?.xp ?? 0;
  const bonuses = heroBonuses(hero);

  const admin = await isAdmin();
  const miniGame = await getMiniGameState();

  // Command-bar badges: unread inbox messages + reports since the last visit.
  // The spy count mirrors what the history screen actually shows: every mission
  // I sent, plus only the enemy spies my defenses caught (a successful enemy
  // spy stays invisible to its target — see ReportsTabs).
  const [unreadMessages, newBattleReports, newSpyReports] = await Promise.all([
    prisma.message.count({ where: { empireId: empire.id, readAt: null } }),
    prisma.battleReport.count({
      where: {
        OR: [{ attackerEmpireId: empire.id }, { defenderEmpireId: empire.id }],
        createdAt: { gt: empire.reportsSeenAt },
      },
    }),
    prisma.spyReport.count({
      where: {
        OR: [
          { attackerEmpireId: empire.id },
          { defenderEmpireId: empire.id, success: false },
        ],
        createdAt: { gt: empire.reportsSeenAt },
      },
    }),
  ]);

  const sidebarProps: SidebarProps = {
    empireName: empire.name,
    heroClass: HERO_CLASS_META[hero?.heroClass ?? "WARLORD"].label,
    heroImage: heroClassImage(hero?.heroClass ?? "WARLORD"),
    heroLevel,
    heroResets: hero?.resets ?? 0,
    heroPoints: hero?.unspentPoints ?? 0,
    heroAttackPct: bonuses.totalPct.attack,
    heroDefensePct: bonuses.totalPct.defense,
    heroHealthPct: 100,
    heroXp,
    heroXpMax,
    recruits: empire.citizens,
    isAdmin: admin,
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Live toasts for incoming attacks / spies / messages. */}
      <WarAlerts />
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
        miniGame={<MiniGameLauncher initial={miniGame} />}
        mobileMenu={<MobileMenu {...sidebarProps} />}
        inbox={
          <InboxNav
            newReports={newBattleReports + newSpyReports}
            unreadMessages={unreadMessages}
          />
        }
      />

      <div
        dir="rtl"
        className="mx-auto flex w-full max-w-[1900px] flex-1 flex-col gap-4 px-3 py-4 lg:flex-row lg:px-5"
      >
        <Sidebar {...sidebarProps} />

        <main className="min-w-0 flex-1">
          <OrnateFrame className="flex min-h-full flex-col overflow-hidden p-3 sm:p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border-subtle pb-3">
              {seasonPass && <SeasonPassButton initial={seasonPass} />}
              <UpdateTimers
                serverNow={now.getTime()}
                nextRegularAt={nextRegular.getTime()}
                nextDailyAt={nextDaily.getTime()}
                nextDailyLabel={formatGameTime(nextDaily)}
              />
            </div>
            <div className="flex-1 pt-5">{children}</div>
          </OrnateFrame>
        </main>
      </div>
    </div>
  );
}
