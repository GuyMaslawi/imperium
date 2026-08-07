import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin/AdminNav";
import { OrnateFrame } from "@/components/ui/OrnateFrame";
import { countWaitingSupport } from "@/server/actions/support";

export const metadata = { title: "ניהול | קראלדור" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  // One count, on every admin screen: a player waiting at the door is the one
  // thing in here that goes stale by the minute, and the admin who is on some
  // other page is exactly who needs telling.
  const waitingSupport = await countWaitingSupport();

  return (
    <div dir="rtl" className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1900px] flex-col gap-4 px-3 py-4 lg:flex-row lg:px-5">
        <aside className="ornate-shell flex w-full shrink-0 flex-col gap-4 rounded-lg p-3 lg:w-64">
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 font-black text-gold-bright">
              מרכז שליטה <span aria-hidden>🛡️</span>
            </p>
            <p className="mt-1 truncate text-[11px] text-zinc-500" dir="ltr">
              {admin.email}
            </p>
          </div>

          <Link
            href="/game/base"
            className="btn btn-ghost w-full justify-center px-2 py-1.5 text-xs"
          >
            ← חזרה למשחק
          </Link>

          <AdminNav waitingSupport={waitingSupport} />
        </aside>

        <main className="min-w-0 flex-1">
          <OrnateFrame className="min-h-full p-3 sm:p-4 md:p-6">{children}</OrnateFrame>
        </main>
      </div>
    </div>
  );
}
