import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/** Mirrors /game/rankings: the city-boss banner, the ladder table, hall of fame. */
export default function RankingsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-28" />

      {/* city boss */}
      <Skeleton className="h-72 rounded-2xl" />

      {/* leaderboard table */}
      <div className="panel-gold rounded-xl p-0">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pb-3 pt-4">
          <Skeleton className="h-7 w-64 rounded" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>
        <div className="border-y border-border-subtle px-4 py-2.5">
          <Skeleton className="h-4 w-full rounded" />
        </div>
        <div className="divide-y divide-border-subtle">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* hall of fame */}
      <div>
        <div className="mb-3 flex justify-center">
          <Skeleton className="h-6 w-40 rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
