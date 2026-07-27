import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/**
 * Shared loading state for the whole control center. Admin screens differ a lot
 * (dashboard tiles, player tables, config forms), so this shows only what they
 * all open with — a section heading, a toolbar row and a data block — and the
 * sidebar stays mounted and interactive around it.
 */
export default function AdminLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-36" />

      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>

      <div className="panel rounded-xl p-4">
        <Skeleton className="mb-4 h-5 w-40 rounded" />
        <div className="space-y-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
