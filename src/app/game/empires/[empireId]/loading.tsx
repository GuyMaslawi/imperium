import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/** Mirrors an empire profile: command bar, hero banner, stats, power, gear. */
export default function EmpireProfileLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-32" />

      {/* attack / spy command bar */}
      <div className="panel-gold rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 w-36 rounded-lg" />
            <Skeleton className="h-11 w-36 rounded-lg" />
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <Skeleton className="h-10 w-40 rounded-lg" />
            <Skeleton className="h-7 w-48 rounded-lg" />
          </div>
        </div>
      </div>

      {/* hero banner */}
      <div className="panel-gold rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-md" />
              </div>
            </div>
          </div>
          <Skeleton className="h-16 w-40 rounded-xl" />
        </div>
      </div>

      {/* public stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>

      {/* power breakdown + intel */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>

      {/* hero equipment */}
      <div className="panel rounded-xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>

      {/* player description */}
      <Skeleton className="h-40 rounded-xl" />
    </SkeletonPage>
  );
}
