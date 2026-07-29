"use client";

import { useActionState, type MouseEvent } from "react";
import { declineGuildInvite, joinGuild } from "@/server/actions/guild";
import type { ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Icon } from "@/components/ui/Icon";

export interface GuildInviteActionsProps {
  guildId: string;
  guildName: string;
  /** True when the guild filled up after the invitation was sent. */
  full: boolean;
}

/**
 * Accept or decline one standing invitation.
 *
 * This replaces the old GuildJoinButton, which sat on every row of the guild
 * directory and needed nothing but a guild id — see joinGuild for why that was
 * the bug rather than the feature. An invitation is not a reservation, so a
 * guild that filled up in the meantime still shows here; it simply cannot be
 * accepted until a seat frees.
 */
export function GuildInviteActions({
  guildId,
  guildName,
  full,
}: GuildInviteActionsProps) {
  const [joinState, join] = useActionState<ActionState, FormData>(joinGuild, {});
  const [declineState, decline] = useActionState<ActionState, FormData>(
    declineGuildInvite,
    {}
  );
  const error = joinState.error ?? declineState.error;

  const confirmDecline = (event: MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm(`לדחות את ההזמנה מ"${guildName}"? ההזמנה תימחק.`)) {
      event.preventDefault();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {full ? (
          <span className="inline-block rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400">
            מלאה 🚫
          </span>
        ) : (
          <form action={join}>
            <input type="hidden" name="guildId" value={guildId} />
            <SubmitButton
              className="btn btn-dark px-3 py-1 text-xs"
              pendingText="מצטרף..."
            >
              <Icon name="attack" size={14} className="inline-block align-text-bottom text-bone" />{" "}
              הצטרף
            </SubmitButton>
          </form>
        )}

        <form action={decline}>
          <input type="hidden" name="guildId" value={guildId} />
          <SubmitButton
            variant="secondary"
            className="btn btn-ghost px-3 py-1 text-xs"
            pendingText="דוחה..."
            onClick={confirmDecline}
          >
            דחה
          </SubmitButton>
        </form>
      </div>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
