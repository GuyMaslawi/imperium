import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
  SkeletonRows,
} from "@/components/ui/Skeleton";

/** Mirrors /game/reports: the four history tabs, then the report rows. */
export default function ReportsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-36" />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-lg" />
          ))}
        </div>

        <SkeletonRows count={8} row="h-24" />
      </div>
    </SkeletonPage>
  );
}
