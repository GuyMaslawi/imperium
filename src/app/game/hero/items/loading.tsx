import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/** Mirrors /game/hero/items: the back link and one panel per equipment slot. */
export default function HeroItemsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-44" />

      <div className="flex justify-center">
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <div className="space-y-5">
        <Skeleton className="h-16 rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <section key={i} className="panel rounded-xl p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-10">
              {Array.from({ length: 10 }).map((_, j) => (
                <Skeleton key={j} className="aspect-square rounded-xl" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </SkeletonPage>
  );
}
