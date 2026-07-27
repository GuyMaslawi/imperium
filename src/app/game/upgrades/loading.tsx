import {
  Skeleton,
  SkeletonGrid,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/** Mirrors /game/upgrades: the city section, then the six empire upgrades. */
export default function UpgradesLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-36" />

      <section className="space-y-4">
        <Skeleton className="h-[92px] rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </section>

      <Skeleton className="h-[68px] rounded-xl" />

      <SkeletonGrid count={6} tile="h-72" />
    </SkeletonPage>
  );
}
