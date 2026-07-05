import { RESOURCE_META, type ResourceKey } from "@/lib/game/constants";
import { formatCompact } from "@/lib/game/format";

/**
 * Shows the empire's available balances only — resources deposited in
 * warehouses are visible on the storage page, not here.
 */
export function ResourceBar({
  resources,
}: {
  resources: Record<ResourceKey, number>;
}) {
  const keys = Object.keys(RESOURCE_META) as ResourceKey[];
  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-zinc-950/95 backdrop-blur">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5">
        {keys.map((key) => {
          const meta = RESOURCE_META[key];
          return (
            <div
              key={key}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-1.5"
              title={meta.label}
            >
              <span aria-hidden className="text-base">{meta.icon}</span>
              <span className="hidden text-xs text-zinc-400 sm:inline">{meta.label}</span>
              <span className="text-sm font-bold tabular-nums text-zinc-100">
                {formatCompact(resources[key])}
              </span>
            </div>
          );
        })}
      </div>
    </header>
  );
}
