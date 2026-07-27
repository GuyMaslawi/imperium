import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
  SkeletonRows,
} from "@/components/ui/Skeleton";

/** Mirrors /game/achievements: the progress header, then the graded ladder. */
export default function AchievementsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-32" />

      <div className="mx-auto max-w-5xl space-y-5">
        {/* overall standing */}
        <div className="mx-auto max-w-xl">
          <div className="flex items-end justify-between gap-3">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
          </div>
          <Skeleton className="mt-1.5 h-2.5 w-full rounded-full" />
        </div>

        {/* ready / locked sections */}
        {Array.from({ length: 2 }).map((_, section) => (
          <div key={section} className="space-y-3">
            <Skeleton className="h-4 w-40 rounded" />
            <SkeletonRows count={section === 0 ? 3 : 6} row="h-[74px]" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
