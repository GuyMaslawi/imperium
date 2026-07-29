import {
  Skeleton,
  SkeletonGrid,
  SkeletonHeading,
  SkeletonPage,
  SkeletonPanelTitle,
} from "@/components/ui/Skeleton";

/** Mirrors /game/army: the recruitment panel wrapping three training cards. */
export default function ArmyLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-28" />

      <div className="panel-gold rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SkeletonPanelTitle width="w-36" />
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>

        <SkeletonGrid
          count={3}
          grid="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          tile="h-[26rem]"
        />
      </div>
    </SkeletonPage>
  );
}
