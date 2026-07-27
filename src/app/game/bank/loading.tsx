import {
  Skeleton,
  SkeletonHeading,
  SkeletonPage,
  SkeletonPanelTitle,
} from "@/components/ui/Skeleton";

/** Mirrors /game/bank: vault header, deposit form + yield, upgrades + history. */
export default function BankLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading titleWidth="w-20" />

      {/* vault card: the door on one side, the balance block on the other */}
      <div className="panel-gold rounded-xl p-5">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-7">
          <Skeleton className="h-54 w-54 shrink-0 rounded-full" />
          <div className="w-full flex-1 space-y-3">
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-10 w-52 rounded" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-64 rounded" />
          </div>
        </div>
      </div>

      {/* deposit / withdraw + daily yield */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>

      {/* upgrades summary + transactions */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="panel rounded-xl p-5">
          <SkeletonPanelTitle width="w-28" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <Skeleton className="mt-4 h-10 w-36 rounded-lg" />
        </div>

        <div className="panel rounded-xl p-5">
          <SkeletonPanelTitle width="w-32" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded" />
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
