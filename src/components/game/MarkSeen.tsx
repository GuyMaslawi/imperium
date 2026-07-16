"use client";

import { useEffect, useRef } from "react";

/**
 * Fires a server action once on mount — used by the messages/reports pages
 * to mark their content as seen so the sidebar badges clear.
 */
export function MarkSeen({ action }: { action: () => Promise<void> }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void action();
  }, [action]);
  return null;
}
