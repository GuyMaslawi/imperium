import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/** Mirrors /game/hero: the paperdoll showcase, the bag, the power summary. */
export default function HeroLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-28" />

      {/* character showcase — paperdoll beside identity + point allocation */}
      <div className="panel relative rounded-2xl border border-border-gold-strong">
        <div className="grid md:grid-cols-[minmax(0,290px)_1fr]">
          {/* the portrait keeps the real 13/19 frame so the row height holds */}
          <div className="p-3">
            <Skeleton className="aspect-[13/19] w-full rounded-2xl" />
          </div>

          <div className="flex flex-col gap-3.5 p-4 md:p-5">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <Skeleton className="h-7 w-32 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <Skeleton className="h-4 w-56 rounded" />

            {/* class bonus chips */}
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-28 rounded-lg" />
              ))}
            </div>

            {/* xp */}
            <div className="space-y-1">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>

            {/* point allocation */}
            <div className="panel-inset rounded-xl p-3">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-6 w-20 rounded-lg" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            </div>

            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* inventory */}
      <div className="panel-gold rounded-xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32 rounded" />
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
        {/* rarity filter chips + the bag's footnote */}
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-2 h-4 w-2/3 rounded" />
      </div>

      {/* combined bonuses */}
      <Skeleton className="h-64 rounded-xl" />
    </SkeletonPage>
  );
}
