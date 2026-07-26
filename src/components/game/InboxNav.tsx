"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Tip } from "@/components/ui/Tip";

export type InboxNavProps = {
  /** Reports created since the last visit to the history page (red badge). */
  newReports?: number;
  /** Unread inbox messages (green badge). */
  unreadMessages?: number;
};

type Entry = {
  href: string;
  label: string;
  icon: IconName;
  tip: string;
  count: number;
  /** Badge + glow color: red for history, green for messages. */
  tone: "red" | "green";
};

const TONE = {
  red: {
    badge: "bg-red-500 text-white",
    active: "border-red-500/70 text-white",
    idle: "text-red-300/90",
    glow: "inbox-glow-red",
  },
  green: {
    badge: "bg-emerald-500 text-black",
    active: "border-emerald-400/70 text-white",
    idle: "text-emerald-300/90",
    glow: "inbox-glow-green",
  },
} as const;

/**
 * History + messages, parked in the free space of the top command bar so both
 * are reachable from every screen. Each carries its own colored counter badge
 * (red = new battle/spy reports, green = unread mail) and pulses while it has
 * something waiting, so an update can't be missed.
 */
export function InboxNav({ newReports = 0, unreadMessages = 0 }: InboxNavProps) {
  const pathname = usePathname();

  const entries: Entry[] = [
    {
      href: "/game/reports",
      label: "היסטוריה",
      icon: "reports",
      tip: "היסטוריית קרבות וריגול — תקיפות עליי, תקיפות שלי, ריגול עליי וריגול שלי",
      count: newReports,
      tone: "red",
    },
    {
      href: "/game/messages",
      label: "הודעות",
      icon: "messages",
      tip: "תיבת הדואר: הודעות משחקנים, התראות על התקפות, מרגלים שנתפסו ועדכוני מערכת",
      count: unreadMessages,
      tone: "green",
    },
  ];

  return (
    <div dir="rtl" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {entries.map((e) => {
        const active = pathname.startsWith(e.href);
        const tone = TONE[e.tone];
        return (
          <Tip key={e.href} tip={e.tip} side="bottom">
            <Link
              href={e.href}
              aria-label={
                e.count > 0 ? `${e.label} — ${e.count} חדשים` : e.label
              }
              className={`res-pill relative gap-1.5 px-2 py-1.5 font-bold transition-colors sm:px-2.5 ${
                active ? tone.active : `${tone.idle} hover:text-white`
              } ${e.count > 0 ? tone.glow : ""}`}
            >
              <Icon name={e.icon} size={18} className="shrink-0" />
              <span className="hidden text-xs md:inline">{e.label}</span>
              {e.count > 0 && (
                <span
                  className={`absolute -left-1.5 -top-1.5 min-w-[1.1rem] rounded-full px-1 text-center text-[10px] font-black leading-[1.1rem] nums ${tone.badge}`}
                  dir="ltr"
                >
                  {e.count > 99 ? "99+" : e.count}
                </span>
              )}
            </Link>
          </Tip>
        );
      })}
    </div>
  );
}
