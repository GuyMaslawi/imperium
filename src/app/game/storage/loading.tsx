import {
  Skeleton,
  SkeletonGrid,
  SkeletonHeading,
  SkeletonPage,
  SkeletonPanelTitle,
} from "@/components/ui/Skeleton";

/** Mirrors /game/storage: network summary, the protection note, four warehouses. */
export default function StorageLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-32" />

      <div className="panel-gold rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SkeletonPanelTitle width="w-32" />
          <div className="grid flex-1 grid-cols-3 gap-3 sm:max-w-md">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded" />
            ))}
          </div>
        </div>
      </div>

      <Skeleton className="h-[68px] rounded-xl" />

      <SkeletonGrid
        count={4}
        grid="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        tile="h-[470px]"
      />
    </SkeletonPage>
  );
}
