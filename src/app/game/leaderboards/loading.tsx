import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/** Mirrors /game/leaderboards: four standing boards, then the pair of raid boards. */
export default function LeaderboardsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-56" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-64 rounded" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel-gold rounded-xl p-4">
            <Skeleton className="mb-3 h-5 w-40 rounded" />
            <div className="space-y-1.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-7 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* biggest thefts + biggest enslavements, under one shared period toggle */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Skeleton className="h-4 w-72 rounded" />
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="panel-gold rounded-xl p-4">
              <Skeleton className="mb-3 h-5 w-48 rounded" />
              <div className="space-y-1.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-7 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
