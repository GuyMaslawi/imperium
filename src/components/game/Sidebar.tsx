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
  /** Mine slaves owned but not assigned to any machine — idle, producing nothing. */
  freeMineSlaves?: number;
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
  freeMineSlaves = 0,
  collectableAchievements = 0,
  heroQuestReady = false,
  inGuild = false,
  guildWarLive = false,
  pathname,
}: SidebarProps & { pathname: string }) {
  // One flat list — no section headings. History lives in the top command bar
  // (see InboxNav), so it deliberately has no entry here.
  //
  // Every row below renders with `prefetch={false}`, which is not the usual
  // advice and is deliberate. Next prefetches a <Link> the moment it enters the
  // viewport, and this whole list is in the viewport on every screen of the
  // game — so one page view asked the server to render fifteen more. None of
  // them are static, so each prefetch is a real function invocation with real
  // queries behind it, and a dynamic prefetch is not reused for long, so
  // navigating re-fires the entire list.
  //
  // What that cost in production: during one player's evening session, 2,106 of
  // his 2,328 requests were prefetches — a 10:1 ratio of speculative renders to
  // pages he actually opened. Attacking is the worst case, because the action
  // redirects to a fresh battle report and the sidebar re-mounts each time; two
  // or three attacks in a row were enough to cross Vercel's per-IP ceiling and
  // hand him a 429 on the report he had just earned.
  //
  // The navigation still feels instant without it: every /game route has a
  // loading.tsx, so the skeleton paints immediately on click.
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
    // Directly under the ladder, because it is the ladder's stakes: the same
    // ranking, priced in diamonds.
    { href: "/game/prizes", label: "פרסים", icon: "gift" },
    { href: "/game/weapons", label: "מפעל", icon: "factory" },
    { href: "/game/army", label: "ניהול", icon: "army", badge: recruits },
    // Idle mine slaves read exactly like waiting recruits on the row above:
    // a neutral count of something sitting unused, not an alert.
    {
      href: "/game/production",
      label: "מכונות",
      icon: "mine",
      badge: freeMineSlaves,
    },
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
    // Points at the game's own community page rather than straight out to
    // Discord: the invite may not exist yet, the page works either way, and a
    // player who lands there also gets the house rules and the welcome purse.
    { href: "/game/community", label: "קהילה", icon: "discord" },
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

      {/* hero card — portrait on one side, everything that reads about him
          stacked beside it. The gauges used to hang in a block *under* the
          whole row, which left the width next to the portrait empty and pushed
          the card two rows taller than it needs to be. */}
      <div className="panel-gold rounded-lg p-3">
        <div className="flex items-stretch gap-3">
          {/* The portrait takes whatever height the text column settles on
              rather than a fixed one — a taller frame is the only thing here
              that wants more room, so the art absorbs the slack instead of the
              card carrying a blank strip beside it. */}
          <div className="relative w-[5.5rem] shrink-0">
            {/* a div, not a span: the portrait frame below is flow content */}
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg border border-crimson/50 bg-gradient-to-b from-[#2a1520] to-[#0e0b12] shadow-inner">
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
          {/* Name and class share one line — the class used to own a row of its
              own and, being pushed to the far edge, read as a caption for the
              blank space rather than for the hero. Both gauges read the same
              way — label on the leading edge, its number on the trailing one,
              the bar directly beneath — so health and experience line up
              instead of scattering numbers around the card. Level lives on the
              portrait badge only, and each number appears exactly once. */}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="shrink-0 font-bold text-gold-bright">גיבור</p>
              {/* On the trailing edge, on the same column as the two numbers
                  below it: every row of the card now reads "what it is" on one
                  side and "which one / how much" on the other. */}
              <Tip tip="מקצוע הגיבור">
                <span className="truncate rounded-full border border-border-subtle bg-black/30 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                  {heroClass}
                </span>
              </Tip>
            </div>

            {/* Health, not a stat ratio: this is the bar that actually moves —
                every breached defence takes a bite out of it, and at zero the
                hero is out of the fight until he is raised. */}
            {heroDead ? (
              <Tip
                tip="הגיבור נפל בקרב — כל נקודותיו והבונוסים שלו מושבתים עד שיקום לתחייה. לחץ לפרטים."
                className="w-full"
              >
                <Link
                  href="/game/hero"
                  className="flex w-full items-center justify-center gap-1 rounded-full border border-red-500/50 bg-red-950/60 px-2 py-1 text-[10px] font-black text-red-300"
                >
                  💀 הגיבור מת
                </Link>
              </Tip>
            ) : (
              <HeroGauge
                icon="heart"
                label="חיים"
                value={`${heroHealthPct}%`}
                accent="text-red-300"
                tone="health"
                meterValue={heroHealthPct}
                tip="חיי הגיבור — כל תקיפה שפורצת את ההגנה שלך מורידה מהם"
              />
            )}
            <HeroGauge
              icon="spark"
              label="ניסיון"
              value={`${formatCompact(heroXp)}/${formatCompact(heroXpMax)} · ${xpPct}%`}
              accent="text-purple-300"
              tone="xp"
              meterValue={heroXp}
              meterMax={heroXpMax}
              tip="ניסיון הגיבור — נצבר מקרבות: ניצחון בתקיפה מעניק הכי הרבה, גם הגנה מוצלחת מזכה. במלוא הבר הגיבור עולה רמה"
            />
          </div>
        </div>

        {/* The one badge in the card that asks for an action — full width under
            the row, where it is a target rather than a chip squeezed beside the
            name, and only present when there is something to spend. */}
        {heroPoints > 0 && (
          <Tip
            tip="נקודות גיבור פנויות — הקצה אותן בעמוד הגיבור (כל נקודה = +1%)"
            className="mt-2 block w-full"
          >
            <Link
              href="/game/hero"
              className="flex w-full items-center justify-center gap-1 rounded-full border border-purple-400/50 bg-purple-600/25 px-2 py-0.5 text-[10px] font-black text-purple-200"
            >
              <Icon name="spark" size={11} />
              {heroPoints} נקודות פנויות
            </Link>
          </Tip>
        )}
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
                  // Prefetch off — see the note above `navItems`. Every row here
                  // is in the viewport at all times, so the default would fire a
                  // request per row on every render.
                  prefetch={false}
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

/**
 * One gauge in the hero card: an icon+label on the leading edge, its number on
 * the trailing one, and the bar underneath spanning both. Every bar in the card
 * uses it, so they all say where their number came from — a bare bar with a
 * figure floating somewhere else in the panel is what made the card unreadable.
 * Spans throughout: the Tip trigger is itself a span.
 */
function HeroGauge({
  icon,
  label,
  value,
  accent,
  tone,
  meterValue,
  meterMax = 100,
  tip,
}: {
  icon: IconName;
  label: string;
  /** Already-formatted reading — a percentage, or "have/need · pct". */
  value: string;
  /** Text colour class shared by the label and the number. */
  accent: string;
  tone: "xp" | "health";
  meterValue: number;
  meterMax?: number;
  tip: string;
}) {
  return (
    <Tip tip={tip} className="w-full">
      <span className="block w-full">
        <span
          className={`flex items-baseline justify-between gap-2 text-[11px] font-semibold ${accent}`}
        >
          <span className="flex items-center gap-1">
            <Icon name={icon} size={12} />
            {label}
          </span>
          <span className="nums" dir="ltr">
            {value}
          </span>
        </span>
        <Meter value={meterValue} max={meterMax} tone={tone} className="mt-1 w-full" />
      </span>
    </Tip>
  );
}
