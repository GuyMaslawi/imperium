"use client";

import { useActionState } from "react";
import { joinGuild } from "@/server/actions/guild";
import type { ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";

export interface GuildJoinButtonProps {
  guildId: string;
  full: boolean;
}

export function GuildJoinButton({ guildId, full }: GuildJoinButtonProps) {
  const [state, action] = useActionState<ActionState, FormData>(joinGuild, {});

  if (full) {
    return (
      <span className="inline-block rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400">
        מלאה 🚫
      </span>
    );
  }

  return (
    <form action={action} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="guildId" value={guildId} />
      <SubmitButton
        variant="secondary"
        className="btn btn-ghost px-3 py-1 text-xs"
        pendingText="מצטרף..."
      >
        ⚔️ הצטרף
      </SubmitButton>
      {state.error && (
        <span className="text-[10px] text-red-400">{state.error}</span>
      )}
    </form>
  );
}
