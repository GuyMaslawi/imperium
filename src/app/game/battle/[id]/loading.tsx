import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Mirrors a battle report: action row, VS banner, aftermath tiles, breakdowns. */
export default function BattleReportLoading() {
  return (
    <SkeletonPage>
      {/* actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-4 w-28 rounded" />
      </div>

      {/* VS banner — same 6-padding frame the real one uses */}
      <div className="rounded-xl border border-border-gold/40 bg-gradient-to-b from-[#1a1210] to-[#0c0908] p-6">
        <div className="flex items-center justify-between gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-1.5">
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-4 w-full rounded" />
        </div>
      </div>

      {/* aftermath */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[86px] rounded-xl" />
        ))}
      </div>

      {/* hero rewards */}
      <Skeleton className="h-32 rounded-xl" />

      {/* power breakdowns */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </SkeletonPage>
  );
}
