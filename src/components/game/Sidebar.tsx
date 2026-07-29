"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/server/actions/auth";
import { Meter } from "@/components/ui/Meter";
import { Tip } from "@/components/ui/Tip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatCompact } from "@/lib/game/format";
import { LivingPortrait } from "@/components/game/LivingPortrait";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  /**
   * How the badge reads. "muted" is a neutral count (recruits waiting);
   * "attention" is something the player can act on right now, so it takes the
   * gold treatment and pulses the row — matching the rewards pill in the
   * command bar (see InboxNav).
   */
  badgeTone?: "muted" | "attention";
  /**
   * Replaces the badge's number with a word. Some badges are not a count of
   * anything — a guild war either is on the air or it is not — and rendering
   * that as "1" reads like an unread item.
   */
  badgeText?: string;
};

export type SidebarProps = {
  empireName: string;
  heroClass: string;
  /** Portrait art of the chosen hero class (see heroClassImage). */
  heroImage?: string;
  /** rgb triple for the class — the portrait's own light. */
  heroAccent?: string;
  heroLevel: number;
  /** Prestige count — how many times the hero was reset at level 100. */
  heroResets?: number;
  /** Unspent hero points waiting to be allocated. */
  heroPoints?: number;
  /** Hero health, 0–100. */
  heroHealthPct: number;
  /** Health has hit zero: the hero is out until he rises (see isHeroDead). */
  heroDead?: boolean;
  heroXp: number;
  heroXpMax: number;
  recruits: number;
  /** Achievement rewards unlocked and waiting to be collected. */
  collectableAchievements?: number;
  /** The hero is back from an expedition and his haul is uncollected. */
  heroQuestReady?: boolean;
  /** In a guild — the only players the war arena exists for, so the only ones who see it. */
  inGuild?: boolean;
  /** A guild war is on the air right now: the row lights up for the half hour. */
  guildWarLive?: boolean;
};

/**
 * Desktop-only sidebar column (hidden below the lg breakpoint). It sticks just
 * under the command bar while the page scrolls — see .sidebar-sticky in
 * globals.css, which owns position/top/align-self/max-height (a `position`
 * utility loses to .ornate-shell's unlayered position:relative). The inner
 * wrapper scrolls on its own when the nav outgrows the viewport, so the aside
 * stays clipped and its ornate frame stays painted around the edge.
 */
export function Sidebar(props: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="ornate-shell sidebar-sticky hidden w-full shrink-0 overflow-hidden rounded-lg lg:flex lg:w-72 lg:flex-col">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-3">
        <SidebarContent {...props} pathname={pathname} />
      </div>
    </aside>
  );
}

/** "Has this hydrated yet" as a store: false on the server, true in the browser. */
const subscribeNever = () => () => {};

/** The hamburger glyph, morphing into an X while the drawer is open. */
function BurgerGlyph({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={open ? "M6 6l12 12" : "M3 6h18"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 12h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={`origin-center transition-opacity duration-150 ${open ? "opacity-0" : "opacity-100"}`}
      />
      <path
        d={open ? "M18 6L6 18" : "M3 18h18"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Mobile navigation: one hamburger button — the drawer's only control — plus a
 * slide-in drawer holding the full sidebar. Hidden at lg+, where the static
 * <Sidebar> takes over.
 *
 * Both live in a portal on <body>, not in the command bar where the trigger is
 * laid out. The bar sets `backdrop-blur`, and a filtered ancestor becomes the
 * containing block for `position: fixed` descendants — a drawer rendered inside
 * it is clipped to the 3.75rem header strip and trapped under the bar's z-40
 * stacking context. The bar keeps a same-size placeholder so the row's layout
 * is unchanged, and the button re-anchors itself over that slot with the same
 * fixed offsets the header uses (dir=ltr, so: leading edge on the left).
 */
export function MobileMenu(props: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Portals cannot render on the server; until hydration the command bar paints
  // an inert copy of the glyph so the bar never flashes a hole where it goes.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  // While open: Escape closes, the back button closes (the only navigation that
  // can start while the drawer covers everything — taps on its own links are
  // handled below), and the page behind it does not scroll.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", close);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", close);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* The slot the button occupies in the command bar's flex row — a bare
          spacer once the real (fixed) button is painted over it. */}
      <div className="h-10 w-10 shrink-0 lg:hidden" aria-hidden>
        {!mounted && (
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border-gold-strong bg-black/30 text-gold-bright">
            <BurgerGlyph open={false} />
          </div>
        )}
      </div>

      {mounted &&
        createPortal(
          <div className={`fixed inset-0 z-[60] lg:hidden ${open ? "" : "pointer-events-none"}`}>
            <div
              onClick={() => setOpen(false)}
              className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
                open ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden
            />

            <aside
              dir="rtl"
              // Any nav link tapped inside the drawer closes it (delegated click).
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) setOpen(false);
              }}
              // Offscreen is not just invisible: while closed the drawer is out
              // of the tab order and out of the accessibility tree entirely.
              inert={!open}
              className={`ornate-shell absolute inset-y-0 right-0 flex w-[86vw] max-w-xs flex-col gap-4 overflow-y-auto rounded-l-lg p-3 pt-[calc(var(--header-h)+0.75rem)] transition-transform duration-200 ${
                open ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <SidebarContent {...props} pathname={pathname} />
            </aside>

            {/* Mirrors the command bar's own row box, so the button lands
                exactly on the placeholder it replaces — and stays above the
                backdrop and the drawer, the single thing that toggles them. */}
            <div
              dir="ltr"
              className="pointer-events-none absolute inset-x-0 top-0 flex h-[var(--header-h)] items-center px-2 sm:px-3 md:px-5"
            >
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
                aria-expanded={open}
                className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-md border bg-black/30 backdrop-blur transition-colors ${
                  open
                    ? "border-crimson/60 text-crimson-bright"
                    : "border-border-gold-strong text-gold-bright hover:border-gold"
                }`}
              >
                <BurgerGlyph open={open} />
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/** The full sidebar body — shared by the desktop column and the mobile drawer. */
function SidebarContent({
  empireName,
  heroClass,
  heroImage,
  heroAccent,
  heroLevel,
  heroResets = 0,
  heroPoints = 0,
  heroHealthPct,
  heroDead = false,
  heroXp,
  heroXpMax,
  recruits,
  collectableAchievements = 0,
  heroQuestReady = false,
  inGuild = false,
  guildWarLive = false,
  pathname,
}: SidebarProps & { pathname: string }) {
  // One flat list — no section headings. History lives in the top command bar
  // (see InboxNav), so it deliberately has no entry here.
  const navItems: NavItem[] = [
    { href: "/game/base", label: "בסיס", icon: "base" },
    {
      href: "/game/hero",
      label: "גיבור",
      icon: "hero",
      // A returned hero is one thing to collect, so it wears the same gold
      // "1" the achievements row does rather than inventing a second dialect
      // of badge for a count that is only ever 0 or 1.
      badge: heroQuestReady ? 1 : 0,
      badgeTone: "attention",
    },
    { href: "/game/rankings", label: "דירוג", icon: "rankings" },
    { href: "/game/weapons", label: "מפעל", icon: "factory" },
    { href: "/game/army", label: "ניהול", icon: "army", badge: recruits },
    { href: "/game/production", label: "מכונות", icon: "mine" },
    { href: "/game/guild", label: "ברית", icon: "guild" },
    // Guild-only, and hidden rather than disabled: a locked door on the nav for
    // a screen a guildless player can do nothing with is just noise. The page
    // enforces the same rule itself — see /game/war.
    ...(inGuild
      ? [
          {
            href: "/game/war",
            label: "מלחמת בריתות",
            icon: "attack" as IconName,
            badge: guildWarLive ? 1 : 0,
            badgeText: "חי",
            badgeTone: "attention" as const,
          },
        ]
      : []),
    { href: "/game/diamonds", label: "יהלומים", icon: "diamond" },
    { href: "/game/bank", label: "בנק", icon: "bank" },
    { href: "/game/storage", label: "מחסנים", icon: "storage" },
    {
      href: "/game/achievements",
      label: "הישגים",
      icon: "achievements",
      badge: collectableAchievements,
      badgeTone: "attention",
    },
    { href: "/game/upgrades", label: "שדרוגים", icon: "upgrades" },
    { href: "/game/guide", label: "מדריך", icon: "reports" },
  ];

  const xpPct = heroXpMax > 0 ? Math.round((heroXp / heroXpMax) * 100) : 0;

  return (
    <>
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

      {/* History, messages and the admin control center now live in the top
          command bar — see InboxNav and AdminNav. */}

      {/* hero card */}
      <div className="panel-gold rounded-lg p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative">
            {/* a div, not a span: the portrait frame below is flow content */}
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-crimson/50 bg-gradient-to-b from-[#2a1520] to-[#0e0b12] shadow-inner">
              {heroImage ? (
                /* Chrome, and on screen on every page — so this one only
                   breathes, on a long cycle, with no embers or halo. */
                <LivingPortrait
                  src={heroImage}
                  alt={heroClass}
                  className="absolute inset-0"
                  accent={heroAccent}
                  tilt={2}
                  drift={34}
                  halo={false}
                />
              ) : (
                <Icon name="hero" size={30} className="text-crimson-bright" />
              )}
            </div>
            <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap">
              <Tip tip="רמת הגיבור — עולה מניסיון שנצבר בקרבות">
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
          </div>
          <div className="min-w-0 flex-1 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Tip tip="מקצוע הגיבור">
                <span className="text-[11px] text-zinc-400">{heroClass}</span>
              </Tip>
            </div>
            <p className="font-bold text-gold-bright">גיבור</p>
            {/* Health, not a stat ratio: this is the bar that actually moves —
                every breached defence takes a bite out of it, and at zero the
                hero is out of the fight until he is raised. */}
            {heroDead ? (
              <Tip
                tip="הגיבור נפל בקרב — כל נקודותיו והבונוסים שלו מושבתים עד שיקום לתחייה. לחץ לפרטים."
                className="mt-1.5 w-full"
              >
                <Link
                  href="/game/hero"
                  className="flex w-full items-center justify-center gap-1 rounded-full border border-red-500/50 bg-red-950/60 px-2 py-0.5 text-[10px] font-black text-red-300"
                >
                  💀 הגיבור מת
                </Link>
              </Tip>
            ) : (
              <Tip tip={`בריאות הגיבור: ${heroHealthPct}%`} className="mt-1.5 w-full">
                <Meter value={heroHealthPct} tone="health" className="w-full" />
              </Tip>
            )}
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
            <Tip
              tip={
                heroDead
                  ? "הגיבור מת — חוזר לחיים שעה אחרי שנפל, או מיידית תמורת יהלומים"
                  : "בריאות הגיבור — כל תקיפה שפורצת את ההגנה שלך מורידה ממנה"
              }
            >
              <span
                className={`flex items-center gap-0.5 ${
                  heroDead ? "font-black text-red-500" : "text-red-400"
                }`}
              >
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
        <p className="mt-1 text-left text-[10px] text-zinc-500">
          <span className="nums" dir="ltr">
            {formatCompact(heroXp)}/{formatCompact(heroXpMax)}
          </span>{" "}
          ניסיון
        </p>
      </div>

      {/* nav sections */}
      <nav>
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const hasBadge = item.badge != null && item.badge > 0;
            // Only an actionable badge pulses the row, and never while the
            // player is already standing on that page.
            const calling = hasBadge && item.badgeTone === "attention" && !active;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-gold/12 text-gold-bright shadow-[inset_3px_0_0_var(--gold)]"
                      : calling
                        ? "nav-glow-gold text-gold-bright hover:text-gold-bright"
                        : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.label}
                    {hasBadge && (
                      <span
                        className={`rounded px-1.5 text-[10px] font-bold nums ${
                          item.badgeTone === "attention"
                            ? "bg-gold font-black text-black"
                            : "bg-black/40 text-zinc-400"
                        }`}
                      >
                        {item.badgeText ?? formatCompact(item.badge!)}
                      </span>
                    )}
                  </span>
                  <Icon
                    name={item.icon}
                    size={20}
                    className={
                      active
                        ? "text-crimson-bright"
                        : calling
                          ? "text-gold-bright"
                          : "text-bone-dim opacity-90 group-hover:text-bone"
                    }
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
