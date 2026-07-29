import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
  SkeletonPanelTitle,
} from "@/components/ui/Skeleton";

/**
 * Mirrors /game/war: the arena banner, then the scoreboard and fighter table
 * beside the live feed. The screen has the same shape all day — the campaign
 * runs itself, so nothing appears or disappears when the window opens.
 */
export default function GuildWarLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-52" />

      {/* arena banner */}
      <Skeleton className="h-56 rounded-xl" />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-4">
          {/* scoreboard */}
          <div className="panel rounded-xl p-4">
            <SkeletonPanelTitle width="w-28" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>

          {/* fighters */}
          <div className="panel rounded-xl p-4">
            <SkeletonPanelTitle width="w-32" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* live feed */}
        <div className="panel rounded-xl p-4">
          <SkeletonPanelTitle width="w-36" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* registration + prizes */}
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </SkeletonPage>
  );
}
