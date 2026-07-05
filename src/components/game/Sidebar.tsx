"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/server/actions/auth";

const NAV_ITEMS = [
  { href: "/game/base", label: "בסיס", icon: "🏰" },
  { href: "/game/production", label: "ייצור", icon: "⚒️" },
  { href: "/game/army", label: "צבא", icon: "⚔️" },
  { href: "/game/weapons", label: "נשקים", icon: "🗡️" },
  { href: "/game/rankings", label: "דירוג", icon: "🏆" },
  { href: "/game/reports", label: "דוחות", icon: "📜" },
  { href: "/game/storage", label: "מחסנים", icon: "🏛️" },
  { href: "/game/bank", label: "בנק", icon: "🏦" },
  { href: "/game/upgrades", label: "שדרוגים", icon: "📈" },
  { href: "/game/settings", label: "הגדרות", icon: "⚙️" },
] as const;

export function Sidebar({
  empireName,
  empireLevel,
}: {
  empireName: string;
  empireLevel: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border-subtle bg-surface md:min-h-[calc(100vh-49px)] md:w-56 md:border-b-0 md:border-l">
      <div className="border-b border-border-subtle px-4 py-4">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-2xl">👑</span>
          <div className="min-w-0">
            <p className="truncate font-bold text-gold">{empireName}</p>
            <p className="text-xs text-zinc-400">רמה {empireLevel}</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-row gap-1 overflow-x-auto p-2 md:flex-1 md:flex-col md:overflow-x-visible">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-gold/15 text-gold"
                  : "text-zinc-300 hover:bg-surface-raised hover:text-zinc-100"
              }`}
            >
              <span aria-hidden className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-border-subtle p-2 md:block">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-surface-raised hover:text-red-400"
          >
            <span aria-hidden className="text-lg">🚪</span>
            התנתקות
          </button>
        </form>
      </div>
    </aside>
  );
}
