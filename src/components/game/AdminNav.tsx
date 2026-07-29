"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Tip } from "@/components/ui/Tip";

/**
 * The admin control-center entrance, parked in the top command bar next to the
 * inbox pills (see InboxNav) so it is one click away from every screen instead
 * of only from the desktop sidebar. Rendered by the layout for admins only —
 * this component draws no conclusions about permissions on its own.
 */
export function AdminNav() {
  const pathname = usePathname();
  const active = pathname.startsWith("/admin");

  return (
    <div dir="rtl" className="flex shrink-0 items-center">
      <Tip tip="מרכז השליטה — ניהול שחקנים, אימפריות, מתנות, איזון והכרזות" side="bottom">
        <Link
          href="/admin"
          aria-label="מרכז שליטה"
          className={`res-pill gap-1.5 border-gold/50 px-2 py-1.5 font-bold transition-colors sm:px-2.5 ${
            active ? "border-gold/80 text-white" : "text-gold-bright hover:text-white"
          }`}
        >
          <Icon name="shield" size={18} className="shrink-0" />
          <span className="hidden text-xs md:inline">מרכז שליטה</span>
        </Link>
      </Tip>
    </div>
  );
}
