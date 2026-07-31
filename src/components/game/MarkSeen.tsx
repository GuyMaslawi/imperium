"use client";

import { useEffect, useRef } from "react";
import { clearInboxCount, refreshInboxPulse } from "./inboxPulse";

/**
 * Fires a server action once on mount — used by the messages/reports pages
 * to mark their content as seen so the sidebar badges clear.
 *
 * `clears` names which command-bar badge this page is the acknowledgement for.
 * The live pulse is zeroed for it immediately rather than after the write lands,
 * because the whole round trip happens *behind* an already-painted page: without
 * it the player reads their mail with "3 new" still pulsing at them, which reads
 * as broken. The re-poll afterwards is what replaces the optimistic zero with
 * the server's own answer.
 */
export function MarkSeen({
  action,
  clears,
}: {
  action: () => Promise<void>;
  clears?: "reports" | "messages";
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (clears) clearInboxCount(clears);
    void action().then(() => {
      if (clears) refreshInboxPulse();
    });
  }, [action, clears]);
  return null;
}
