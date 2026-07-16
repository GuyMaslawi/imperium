"use client";

import { useActionState } from "react";
import { createGuild } from "@/server/actions/guild";
import type { ActionState } from "@/server/actions/game";
import {
  GUILD_CREATION_COST_DIAMONDS,
  GUILD_NAME_MAX_LENGTH,
} from "@/lib/game/guild";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export interface GuildCreateFormProps {
  /** The player's diamond balance — the form disables when it can't cover the cost. */
  diamonds: number;
}

export function GuildCreateForm({ diamonds }: GuildCreateFormProps) {
  const [state, action] = useActionState<ActionState, FormData>(createGuild, {});
  const canAfford = diamonds >= GUILD_CREATION_COST_DIAMONDS;

  return (
    <form action={action} className="mt-4 space-y-4">
      <div>
        <label
          htmlFor="guild-name"
          className="mb-1.5 block text-sm font-semibold text-gold"
        >
          שם הברית
        </label>
        <input
          id="guild-name"
          name="name"
          type="text"
          required
          maxLength={GUILD_NAME_MAX_LENGTH}
          placeholder="לדוגמה: אבירי השולחן"
          className="w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
        />
      </div>

      <SubmitButton
        className="btn btn-dark w-full py-3"
        disabled={!canAfford}
        pendingText="מקים ברית..."
      >
        ⚒️ שלם {GUILD_CREATION_COST_DIAMONDS} 💎 והקם ברית
      </SubmitButton>

      {!canAfford && (
        <p className="text-center text-xs text-red-400">
          אין לך מספיק יהלומים להקמת ברית.
        </p>
      )}

      <FormMessage error={state.error} success={state.success} />

      <p className="text-center text-[11px] leading-relaxed text-zinc-500">
        הקמת ברית דורשת משאבים ורצינות. בחר שם בתבונה.
      </p>
    </form>
  );
}
