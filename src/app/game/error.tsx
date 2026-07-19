"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";

/** Graceful error boundary for /game/* so a thrown error shows a themed
 *  recovery screen instead of the raw Next.js error overlay. */
export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="text-5xl">🛠️</span>
      <h1 className="text-2xl font-black text-gold-bright">משהו השתבש</h1>
      <p className="max-w-sm text-sm text-zinc-400">
        אירעה שגיאה בטעינת המסך. אפשר לנסות שוב או לחזור לבסיס.
      </p>
      <div className="mt-2 flex gap-2">
        <button onClick={reset} className="btn btn-gold px-5 py-2 text-sm">
          🔄 נסה שוב
        </button>
        <Link href="/game/base" className="btn btn-ghost px-5 py-2 text-sm">
          <Icon name="base" size={16} className="inline-block align-middle" /> חזרה לבסיס
        </Link>
      </div>
    </div>
  );
}
