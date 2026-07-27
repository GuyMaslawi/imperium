import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
  SkeletonPanelTitle,
} from "@/components/ui/Skeleton";

/**
 * Mirrors /game/guild. The screen has two shapes — the recruitment board for a
 * player without a guild, and the roster + shops for a member — so the skeleton
 * shows what both share: the title, a status row, and a tall first panel. The
 * shop grids below are only drawn once, which is the shorter of the two.
 */
export default function GuildLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-40" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-44 rounded" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* members / recruitment board */}
      <div className="panel rounded-xl p-4">
        <SkeletonPanelTitle width="w-32" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      </div>

      {/* gold upgrades */}
      <div className="panel rounded-xl p-4">
        <SkeletonPanelTitle width="w-40" />
        <Skeleton className="mb-4 mt-2 h-4 w-3/4 rounded" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
      </div>

      {/* diamond spells */}
      <div className="panel rounded-xl p-4">
        <SkeletonPanelTitle width="w-32" />
        <Skeleton className="mb-4 mt-2 h-8 w-full rounded" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
