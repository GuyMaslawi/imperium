import { Skeleton, SkeletonHeading, SkeletonPage } from "@/components/ui/Skeleton";

/** Mirrors /game/prizes: the hall, the clock, and the three-seat podium. */
export default function PrizesLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-48" />

      <Skeleton className="h-52 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />

      <div className="grid items-end gap-3 sm:grid-cols-3">
        {[2, 1, 3].map((rank) => (
          <div key={rank} className="flex flex-col justify-end">
            <Skeleton className={`rounded-xl ${rank === 1 ? "h-72" : "h-64"}`} />
            <Skeleton
              className={`mt-2 rounded-t-lg rounded-b-none ${
                rank === 1 ? "h-[4.5rem]" : rank === 2 ? "h-11" : "h-7"
              }`}
            />
          </div>
        ))}
      </div>

      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </SkeletonPage>
  );
}
