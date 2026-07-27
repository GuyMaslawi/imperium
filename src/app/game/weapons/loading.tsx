import {
  Skeleton,
  SkeletonGrid,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/** Mirrors /game/weapons: the category tabs, the tier track, the weapon grid. */
export default function WeaponsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-48" />

      <div className="space-y-4">
        {/* category tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-lg" />
          ))}
        </div>

        {/* tier progress track */}
        <div className="flex justify-end">
          <Skeleton className="h-4 w-52 rounded" />
        </div>

        <SkeletonGrid
          count={8}
          grid="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          tile="h-56"
        />
      </div>
    </SkeletonPage>
  );
}
