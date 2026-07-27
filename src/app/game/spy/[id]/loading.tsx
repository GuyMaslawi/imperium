import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/** Mirrors a spy report: verdict banner, population + resource intel, actions. */
export default function SpyReportLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-48" />

      {/* verdict banner */}
      <div className="rounded-xl border border-border-subtle p-5">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-7 w-72 rounded" />
          <Skeleton className="h-4 w-full max-w-lg rounded" />
        </div>
      </div>

      {/* population */}
      <div className="panel-gold rounded-xl p-4">
        <Skeleton className="mb-3 h-5 w-32 rounded" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px] rounded-lg" />
          ))}
        </div>
      </div>

      {/* available resources */}
      <div className="panel-gold rounded-xl p-4">
        <Skeleton className="mb-3 h-5 w-40 rounded" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[70px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-3 h-4 w-72 rounded" />
      </div>

      {/* actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Skeleton className="h-4 w-28 rounded" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </SkeletonPage>
  );
}
