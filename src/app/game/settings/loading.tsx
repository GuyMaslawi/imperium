import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/** Mirrors /game/settings: the four stacked account panels. */
export default function SettingsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-32" />

      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-[152px] rounded-xl" />
        <Skeleton className="h-[196px] rounded-xl" />
        <Skeleton className="h-[168px] rounded-xl" />
        <Skeleton className="h-[164px] rounded-xl" />
      </div>
    </SkeletonPage>
  );
}
