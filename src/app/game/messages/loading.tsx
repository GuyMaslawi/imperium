import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
  SkeletonRows,
} from "@/components/ui/Skeleton";

/** Mirrors /game/messages: the compose row, then the inbox list. */
export default function MessagesLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-32" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-72 rounded" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <SkeletonRows count={6} row="h-[104px]" />
    </SkeletonPage>
  );
}
