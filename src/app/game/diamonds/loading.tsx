import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/** Mirrors /game/diamonds: the balance header, then the three shop sections. */
export default function DiamondsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-36" />

      {/* balance + spend/buy switch */}
      <Skeleton className="h-[104px] rounded-2xl" />

      <div className="space-y-7">
        {/* resource boosts */}
        <div>
          <Skeleton className="mb-3 h-6 w-48 rounded" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>

        {/* turn packages */}
        <div>
          <Skeleton className="mb-3 h-6 w-40 rounded" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        </div>

        {/* spells and services */}
        <div>
          <Skeleton className="mb-3 h-6 w-36 rounded" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
