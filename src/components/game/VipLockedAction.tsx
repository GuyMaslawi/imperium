"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import { vipLockHint } from "@/lib/game/vip";
import { VipUpsellDialog } from "./VipUpsellDialog";

/**
 * What stands where a one-click bulk button would be for a player without the
 * pass: the same slot, the action still named, a padlock on it, and the pass
 * itself one press away.
 *
 * Shown rather than hidden on purpose. Every one of these has a free path right
 * beside it — the amount box, the per-level button — so the locked control is
 * not a wall in front of the game, it is the advertisement for the shortcut. A
 * hidden button would make the pass invisible to exactly the people it is sold
 * to, and a control that names what it unlocks is the honest version of an ad.
 *
 * Pressing it opens the pass over the page it was pressed on, rather than
 * navigating to the diamond shop: the player asked a yes/no question about one
 * button, and answering it by moving him to a screen of other purchases leaves
 * him to work out on his own which card he was sent for — and puts the button
 * he actually wanted behind a trip back.
 */
export function VipLockedAction({
  label,
  className = "",
}: {
  label: string;
  /** Layout classes from the slot it fills (usually `w-full`). */
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const hint = vipLockHint(t);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title={hint}
        aria-label={`${label} — ${hint}`}
        className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-gold-dim/50 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-gold hover:text-gold-bright ${className}`}
      >
        <Icon name="lock" size={14} className="shrink-0 text-gold-dim" aria-hidden />
        {label}
      </button>

      <VipUpsellDialog open={open} onClose={() => setOpen(false)} action={label} />
    </>
  );
}
