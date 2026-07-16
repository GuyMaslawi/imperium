"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Silently re-fetches the page's server data on an interval (and on window
 * focus), so shared views — the rankings table, enemy profiles — reflect
 * other players' moves live without a manual reload. Client state (scroll,
 * inputs) is preserved; only the Server Component payload is refreshed.
 */
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      // Skip background tabs — the focus listener catches up on return.
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = setInterval(refresh, intervalMs);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [router, intervalMs]);

  return null;
}
