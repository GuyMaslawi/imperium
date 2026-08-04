"use client";

import { useActionState, type MouseEvent } from "react";
import { leaveGuild } from "@/server/actions/guild";
import type { ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";

export interface GuildLeaveButtonProps {
  /** A lone leader leaving disbands the guild — the confirm says so. */
  disbands: boolean;
}

export function GuildLeaveButton({ disbands }: GuildLeaveButtonProps) {
  const t = useT();
  const [state, action] = useActionState<ActionState, FormData>(leaveGuild, {});

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const message = disbands
      ? t("אתה החבר האחרון — עזיבה תפרק את הברית והזהב שבקופה יוחזר אליך. להמשיך?")
      : t("לעזוב את הברית?");
    if (!window.confirm(message)) event.preventDefault();
  };

  return (
    <form action={action} className="flex items-center gap-2">
      <SubmitButton
        variant="danger"
        className="px-3 py-1.5 text-xs"
        onClick={handleClick}
        pendingText={t("עוזב...")}
      >
        <Icon name="logout" size={14} className="inline-block align-text-bottom" />{" "}
        {disbands ? t("פרק את הברית") : t("עזוב את הברית")}
      </SubmitButton>
      {state.error && <span className="text-xs text-red-400">{state.error}</span>}
    </form>
  );
}
