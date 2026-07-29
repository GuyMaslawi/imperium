import {
  Skeleton,
  SkeletonGrid,
  SkeletonHeading,
  SkeletonPage,
  SkeletonPanelTitle,
} from "@/components/ui/Skeleton";

/** Mirrors /game/production: slave summary, quick actions, four mine cards. */
export default function ProductionLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-32" />

      <div className="panel-gold rounded-xl p-4">
        <SkeletonPanelTitle width="w-40" />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[70px] rounded-lg" />
          ))}
        </div>
      </div>

      {/* mine-slave quick actions */}
      <div className="panel space-y-3 rounded-xl p-4">
        <SkeletonPanelTitle width="w-44" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32 rounded-lg" />
          ))}
        </div>
      </div>

      {/* mine cards run tall — the rig drawing, breakdown, slave form, upgrade */}
      <SkeletonGrid
        count={4}
        grid="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        tile="h-[660px]"
      />
    </SkeletonPage>
  );
}
