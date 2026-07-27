import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Mirrors a city-boss fight report: action row, VS banner, loot, breakdowns. */
export default function BossFightLoading() {
  return (
    <SkeletonPage>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-28 rounded" />
      </div>

      {/* verdict banner */}
      <div className="rounded-2xl border border-border-gold/40 bg-[#0a0709] p-6">
        <div className="flex items-center justify-between gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-1.5">
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-4 w-full rounded" />
        </div>
      </div>

      {/* loot */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[86px] rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-48 rounded-xl" />
    </SkeletonPage>
  );
}
