"use client";

import { useActionState, type MouseEvent } from "react";
import type { GuildRole } from "@prisma/client";
import {
  kickGuildMember,
  setGuildRole,
  transferGuildLeadership,
} from "@/server/actions/guild";
import type { ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";

export interface GuildMemberActionsProps {
  targetEmpireId: string;
  targetName: string;
  targetRole: GuildRole;
  /** The viewer's own role — decides which buttons render. */
  viewerRole: GuildRole;
}

/**
 * Row actions in the member table: leaders promote/demote deputies, transfer
 * leadership and kick anyone; deputies kick plain members.
 */
export function GuildMemberActions({
  targetEmpireId,
  targetName,
  targetRole,
  viewerRole,
}: GuildMemberActionsProps) {
  const t = useT();
  const [kickState, kickAction] = useActionState<ActionState, FormData>(
    kickGuildMember,
    {}
  );
  const [roleState, roleAction] = useActionState<ActionState, FormData>(
    setGuildRole,
    {}
  );
  const [transferState, transferAction] = useActionState<ActionState, FormData>(
    transferGuildLeadership,
    {}
  );

  const isLeader = viewerRole === "LEADER";
  const mayKick =
    isLeader || (viewerRole === "DEPUTY" && targetRole === "MEMBER");
  if (!isLeader && !mayKick) return null;

  const confirmClick =
    (message: string) => (event: MouseEvent<HTMLButtonElement>) => {
      if (!window.confirm(message)) event.preventDefault();
    };

  const error = kickState.error ?? roleState.error ?? transferState.error;

  return (
    <form className="flex flex-wrap items-center justify-end gap-1.5">
      <input type="hidden" name="targetEmpireId" value={targetEmpireId} />
      {isLeader && (
        <>
          <input
            type="hidden"
            name="role"
            value={targetRole === "DEPUTY" ? "MEMBER" : "DEPUTY"}
          />
          <SubmitButton
            variant="secondary"
            className="btn btn-ghost px-2 py-1 text-[11px]"
            formAction={roleAction}
            pendingText="..."
          >
            {targetRole === "DEPUTY" ? (
              <>
                <Icon name="army" size={13} className="inline-block align-text-bottom" />{" "}
                {t("הורד לחבר")}
              </>
            ) : (
              <>
                <Icon name="spark" size={13} className="inline-block align-text-bottom" />{" "}
                {t("מנה לסגן")}
              </>
            )}
          </SubmitButton>
          <SubmitButton
            variant="secondary"
            className="btn btn-ghost px-2 py-1 text-[11px]"
            formAction={transferAction}
            onClick={confirmClick(
              t("להעביר את הנהגת הברית ל־{name}? אתה תהפוך לסגן.", { name: targetName })
            )}
            pendingText="..."
          >
            <Icon name="crown" size={13} className="inline-block align-text-bottom" />{" "}
            {t("העבר הנהגה")}
          </SubmitButton>
        </>
      )}
      {mayKick && (
        <SubmitButton
          variant="danger"
          className="px-2 py-1 text-[11px]"
          formAction={kickAction}
          onClick={confirmClick(t("להרחיק את {name} מהברית?", { name: targetName }))}
          pendingText="..."
        >
          {t("❌ הרחק")}
        </SubmitButton>
      )}
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </form>
  );
}
