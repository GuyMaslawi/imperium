import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
  SkeletonPanelTitle,
} from "@/components/ui/Skeleton";

/** Mirrors /game/base: announcement, wheel + season track, power, panels, feed. */
export default function BaseLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-52" />

      {/* announcement strip */}
      <Skeleton className="h-[54px] rounded-lg" />

      {/* wheel + season milestones */}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Skeleton className="h-52 rounded-xl" />
        <div className="panel rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <SkeletonPanelTitle width="w-44" />
            <Skeleton className="h-10 w-12 rounded" />
          </div>
          <div className="flex items-center gap-1 overflow-hidden pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="flex w-24 shrink-0 flex-col items-center gap-1.5">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                {i < 4 && <Skeleton className="h-0.5 w-6 rounded-none" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* empire power */}
      <div className="panel rounded-xl p-5">
        <SkeletonPanelTitle width="w-36" />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>

      {/* base details + resources */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>

      {/* recent activity */}
      <div className="panel rounded-xl p-5">
        <SkeletonPanelTitle width="w-32" />
        <div className="mt-3 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded" />
          ))}
        </div>
        <Skeleton className="mt-4 h-10 w-full rounded-lg" />
      </div>
    </SkeletonPage>
  );
}
