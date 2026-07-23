"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Graceful error boundary for /admin/* so a thrown error shows a recovery
 *  screen instead of the raw Next.js overlay. */
export default function AdminError({
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
      <h1 className="text-2xl font-black text-gold-bright">שגיאה בלוח הבקרה</h1>
      <p className="max-w-sm text-sm text-zinc-400">
        אירעה שגיאה בטעינת המסך הניהולי. אפשר לנסות שוב או לחזור למשחק.
      </p>
      <div className="mt-2 flex gap-2">
        <button onClick={reset} className="btn btn-gold px-5 py-2 text-sm">
          🔄 נסה שוב
        </button>
        <Link href="/game/base" className="btn btn-ghost px-5 py-2 text-sm">
          חזרה למשחק
        </Link>
      </div>
    </div>
  );
}
