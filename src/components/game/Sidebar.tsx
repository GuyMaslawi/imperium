"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/server/actions/auth";
import { DuelBar, Meter } from "@/components/ui/Meter";
import { Tip } from "@/components/ui/Tip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatCompact } from "@/lib/game/format";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

export function Sidebar({
  empireName,
  heroClass,
  heroLevel,
  heroResets = 0,
  heroPoints = 0,
  heroAttackPct = 0,
  heroDefensePct = 0,
  heroHealthPct,
  heroXp,
  heroXpMax,
  recruits,
  unreadMessages = 0,
  newReports = 0,
  isAdmin = false,
}: {
  empireName: string;
  heroClass: string;
  heroLevel: number;
  /** Prestige count — how many times the hero was reset at level 100. */
  heroResets?: number;
  /** Unspent hero points waiting to be allocated. */
  heroPoints?: number;
  /** Total hero attack/defense % (points + equipped items). */
  heroAttackPct?: number;
  heroDefensePct?: number;
  heroHealthPct: number;
  heroXp: number;
  heroXpMax: number;
  recruits: number;
  /** Unread inbox messages — badge on the הודעות button. */
  unreadMessages?: number;
  /** Reports created since the last reports-page visit — badge on היסטוריה. */
  newReports?: number;
  /** Show the admin control-center link (admins only). */
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  const sections: NavSection[] = [
    {
      title: "פעולות",
      items: [
        { href: "/game/base", label: "בסיס", icon: "base" },
        { href: "/game/hero", label: "גיבור", icon: "hero" },
        { href: "/game/rankings", label: "דירוג", icon: "rankings" },
        { href: "/game/weapons", label: "מפעל", icon: "factory" },
        { href: "/game/army", label: "ניהול", icon: "army", badge: recruits },
        { href: "/game/production", label: "מכונות", icon: "mine" },
        { href: "/game/guild", label: "ברית", icon: "guild" },
      ],
    },
    {
      title: "משאבים",
      items: [
        { href: "/game/diamonds", label: "יהלומים", icon: "diamond" },
        { href: "/game/diamonds/buy", label: "רכישת יהלומים", icon: "shop" },
        { href: "/game/bank", label: "בנק", icon: "bank" },
        { href: "/game/storage", label: "מחסנים", icon: "storage" },
        { href: "/game/achievements", label: "הישגים", icon: "achievements" },
        { href: "/game/upgrades", label: "שדרוגים", icon: "upgrades" },
        { href: "/game/reports", label: "דוחות", icon: "reports" },
      ],
    },
  ];

  const xpPct = heroXpMax > 0 ? Math.round((heroXp / heroXpMax) * 100) : 0;

  return (
    <aside className="ornate-shell flex w-full shrink-0 flex-col gap-4 rounded-lg p-3 lg:w-72">
      {/* header: logout + settings + welcome */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <form action={logout}>
            <button
              type="submit"
              title="התנתקות"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-zinc-400 transition-colors hover:border-red-500/50 hover:text-red-400"
            >
              <Icon name="logout" size={17} />
            </button>
          </form>
          <Link
            href="/game/settings"
            title="הגדרות"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-zinc-400 transition-colors hover:border-crimson/50 hover:text-crimson-bright"
          >
            <Icon name="settings" size={17} />
          </Link>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11px] text-zinc-400">ברוך שובך,</p>
          <p className="flex items-center justify-end gap-1.5 truncate font-black text-gold-bright">
            {empireName}
            <Icon name="crown" size={16} className="shrink-0 text-crimson-bright" />
          </p>
        </div>
      </div>

      {/* messages / history */}
      <div className="grid grid-cols-2 gap-2">
        <Tip tip="היסטוריית קרבות וריגול" side="bottom" className="w-full">
          <Link
            href="/game/reports"
            className={`btn btn-ghost relative w-full px-2 py-1.5 text-xs ${
              pathname.startsWith("/game/reports") ? "border-gold text-white" : ""
            }`}
          >
            <Icon name="reports" size={15} /> היסטוריה
            {newReports > 0 && (
              <span className="absolute -left-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white nums">
                {newReports}
              </span>
            )}
          </Link>
        </Tip>
        <Tip tip="התראות על התקפות, מרגלים שנתפסו ועדכוני מערכת" side="bottom" className="w-full">
          <Link
            href="/game/messages"
            className={`btn btn-ghost relative w-full px-2 py-1.5 text-xs ${
              pathname.startsWith("/game/messages") ? "border-gold text-white" : ""
            }`}
          >
            <Icon name="messages" size={15} /> הודעות
            {unreadMessages > 0 && (
              <span className="absolute -left-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white nums">
                {unreadMessages}
              </span>
            )}
          </Link>
        </Tip>
      </div>

      {isAdmin && (
        <Link
          href="/admin"
          className="btn btn-gold flex w-full items-center justify-center gap-1.5 px-2 py-2 text-xs font-bold"
        >
          <Icon name="shield" size={16} /> מרכז שליטה
        </Link>
      )}

      {/* hero card */}
      <div className="panel-gold rounded-lg p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="relative">
            <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-crimson/50 bg-gradient-to-b from-[#2a1520] to-[#0e0b12] shadow-inner">
              <Icon name="hero" size={30} className="text-crimson-bright" />
            </span>
            <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap">
              <Tip tip="רמת הגיבור — עולה מ-XP שנצבר בקרבות">
                <span className="rounded bg-amber-500 px-1.5 text-[10px] font-black text-black shadow">
                  {heroLevel}
                </span>
              </Tip>
              {heroResets > 0 && (
                <Tip tip={`תג איפוס: הגיבור הגיע לרמה 100 ואופס ${heroResets === 1 ? "פעם אחת" : `${heroResets} פעמים`}`}>
                  <span className="rounded bg-purple-600 px-1 text-[10px] font-black text-white shadow">
                    ↻{heroResets}
                  </span>
                </Tip>
              )}
            </span>
          </span>
          <div className="min-w-0 flex-1 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Tip tip="מקצוע הגיבור">
                <span className="text-[11px] text-zinc-400">{heroClass}</span>
              </Tip>
            </div>
            <p className="font-bold text-gold-bright">גיבור</p>
            <Tip
              tip={`יחס הבונוסים של הגיבור: התקפה ${heroAttackPct}% (אדום) מול הגנה ${heroDefensePct}% (כחול)`}
              className="mt-1.5 w-full"
            >
              <DuelBar
                leftPct={
                  heroAttackPct + heroDefensePct > 0
                    ? (heroAttackPct / (heroAttackPct + heroDefensePct)) * 100
                    : 50
                }
                className="w-full"
              />
            </Tip>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <Tip tip="אחוז ההתקדמות לרמה הבאה של הגיבור">
            <span className="flex items-center gap-1 text-purple-300"><Icon name="spark" size={14} /> {xpPct}%</span>
          </Tip>
          <div className="flex items-center gap-1.5">
            <Tip tip="נקודות גיבור פנויות — הקצה אותן בעמוד הגיבור (כל נקודה = +1%)">
              <span className="rounded bg-purple-600/80 px-1.5 py-0.5 text-[10px] font-black text-white">
                {heroPoints}
              </span>
            </Tip>
            <Tip tip="רמת הגיבור">
              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-black">
                {heroLevel}
              </span>
            </Tip>
            <Tip tip="בריאות הגיבור">
              <span className="flex items-center gap-0.5 text-red-400">
                {heroHealthPct} <Icon name="heart" size={13} />
              </span>
            </Tip>
          </div>
        </div>
        <Tip
          tip="ניסיון הגיבור — נצבר מקרבות: ניצחון בתקיפה מעניק הכי הרבה, גם הגנה מוצלחת מזכה"
          className="mt-2 w-full"
        >
          <Meter value={heroXp} max={heroXpMax} tone="xp" className="w-full" />
        </Tip>
        <p className="mt-1 text-left text-[10px] text-zinc-500 nums" dir="ltr">
          {formatCompact(heroXp)}/{formatCompact(heroXpMax)} XP
        </p>
      </div>

      {/* nav sections */}
      <nav className="flex flex-col gap-4">
        {sections.map((section) => {
          return (
            <div key={section.title}>
              <div className="mb-1.5 px-1 text-right text-[11px] font-bold uppercase tracking-widest text-gold-dim">
                {section.title}
              </div>
              <ul className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`group flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                            active
                              ? "bg-gold/12 text-gold-bright shadow-[inset_3px_0_0_var(--gold)]"
                              : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            {item.label}
                            {item.badge != null && item.badge > 0 && (
                              <span className="rounded bg-black/40 px-1.5 text-[10px] font-bold text-zinc-400 nums">
                                {formatCompact(item.badge)}
                              </span>
                            )}
                          </span>
                          <Icon
                            name={item.icon}
                            size={20}
                            className={active ? "text-crimson-bright" : "text-bone-dim opacity-90 group-hover:text-bone"}
                          />
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
