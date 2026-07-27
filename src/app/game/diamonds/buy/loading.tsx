import {
  Skeleton,
  SkeletonGrid,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/** Mirrors /game/diamonds/buy: the balance header and the package grid. */
export default function BuyDiamondsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-52" />

      <Skeleton className="h-[104px] rounded-2xl" />

      <SkeletonGrid count={6} tile="h-64" />
    </SkeletonPage>
  );
}
