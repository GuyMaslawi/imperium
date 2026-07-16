/**
 * Shown instantly while a /game/* page's server component fetches, so
 * navigation feels responsive instead of freezing on the old screen.
 * The layout (resource bar + sidebar + frame) stays mounted around it.
 */
export default function GameLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="טוען">
      {/* heading placeholder */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-7 w-40 animate-pulse rounded bg-white/5" />
        <div className="h-2 w-24 animate-pulse rounded bg-white/5" />
      </div>

      {/* emblem */}
      <div className="flex flex-col items-center gap-3 py-8">
        <span className="flex h-16 w-16 animate-pulse items-center justify-center rounded-xl border border-gold/40 bg-gradient-to-b from-[#2a2013] to-[#12100c] text-3xl">
          ⚔️
        </span>
        <p className="text-sm text-gold-dim">טוען…</p>
      </div>

      {/* skeleton panels */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="panel h-28 animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}
