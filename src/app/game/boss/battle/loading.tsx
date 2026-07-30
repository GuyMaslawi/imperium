import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Mirrors the boss arena: the tyrant's stage, the telegraph, the three answers. */
export default function BossArenaLoading() {
  return (
    <SkeletonPage>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-3 w-36 rounded" />
        <Skeleton className="h-8 w-44 rounded-lg" />
      </div>

      {/* stage: portrait + health pool */}
      <div className="rounded-2xl border border-border-gold/40 bg-[#0a0709] p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,190px)_1fr]">
          <Skeleton className="mx-auto h-[210px] w-[150px] rounded-xl sm:mx-0 sm:h-[230px] sm:w-full" />
          <div className="space-y-3">
            <Skeleton className="h-7 w-48 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
        </div>
      </div>

      {/* telegraph */}
      <Skeleton className="h-[124px] rounded-xl" />

      {/* the three answers */}
      <div className="grid gap-2 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-14 rounded-xl" />

      {/* army + running loot */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl sm:w-60" />
      </div>
    </SkeletonPage>
  );
}
