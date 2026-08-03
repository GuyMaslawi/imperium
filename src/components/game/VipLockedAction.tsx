import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { VIP_LOCK_HINT } from "@/lib/game/vip";

/**
 * What stands where a one-click bulk button would be for a player without the
 * pass: the same slot, the action still named, a padlock on it, and a link to
 * the shop.
 *
 * Shown rather than hidden on purpose. Every one of these has a free path right
 * beside it — the amount box, the per-level button — so the locked control is
 * not a wall in front of the game, it is the advertisement for the shortcut. A
 * hidden button would make the pass invisible to exactly the people it is sold
 * to, and a control that names what it unlocks is the honest version of an ad.
 */
export function VipLockedAction({
  label,
  className = "",
}: {
  label: string;
  /** Layout classes from the slot it fills (usually `w-full`). */
  className?: string;
}) {
  return (
    <Link
      href="/game/diamonds"
      title={VIP_LOCK_HINT}
      aria-label={`${label} — ${VIP_LOCK_HINT}`}
      className={`flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gold-dim/50 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-gold hover:text-gold-bright ${className}`}
    >
      <Icon name="lock" size={14} className="shrink-0 text-gold-dim" aria-hidden />
      {label}
    </Link>
  );
}
