import Link from "next/link";

/** Themed 404 for missing game resources (bad empire/battle/spy id). */
export default function GameNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="text-5xl">🗺️</span>
      <h1 className="text-2xl font-black text-gold-bright">לא נמצא</h1>
      <p className="max-w-sm text-sm text-zinc-400">
        המשאב שחיפשת לא קיים או שאין לך גישה אליו — ייתכן שהאימפריה, הקרב או הדוח
        נמחקו.
      </p>
      <div className="mt-2 flex gap-2">
        <Link href="/game/base" className="btn btn-gold px-5 py-2 text-sm">
          🏰 חזרה לבסיס
        </Link>
        <Link href="/game/rankings" className="btn btn-ghost px-5 py-2 text-sm">
          🏆 לדירוג
        </Link>
      </div>
    </div>
  );
}
