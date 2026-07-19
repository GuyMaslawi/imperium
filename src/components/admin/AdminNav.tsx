"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "לוח בקרה", icon: "📊", exact: true },
  { href: "/admin/users", label: "שחקנים", icon: "👥" },
  { href: "/admin/broadcast", label: "שידור ומתנות", icon: "📣" },
  { href: "/admin/minigame", label: "מיני-משחק", icon: "🎯" },
  { href: "/admin/seasons", label: "עונות", icon: "📅" },
  { href: "/admin/guilds", label: "בריתות", icon: "🤝" },
  { href: "/admin/balance", label: "איזון גלובלי", icon: "⚖️" },
  { href: "/admin/audit", label: "יומן פעולות", icon: "📜" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-gold/12 text-gold-bright shadow-[inset_3px_0_0_var(--gold)]"
                : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            <span>{link.label}</span>
            <span aria-hidden className="text-base opacity-90">
              {link.icon}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
