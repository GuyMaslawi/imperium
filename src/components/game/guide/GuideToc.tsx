"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";

export interface TocEntry {
  id: string;
  title: string;
  icon: IconName;
}

/** Smooth jump that lands the heading below the sticky command bar. */
function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY - 88,
    behavior: "smooth",
  });
}

/**
 * The manual's index card: every section as a numbered pill, with scroll-spy
 * marking where the reader currently is.
 *
 * Deliberately a normal-flow card rather than a sticky rail: the game layout
 * wraps every screen in an OrnateFrame carrying `overflow-hidden`, which makes
 * it a scrollport — and `position: sticky` inside a scrollport that never
 * scrolls simply never engages. The floating {@link BackToTop} button covers
 * the "get me back to the index" case instead.
 */
export function GuideToc({ entries }: { entries: TocEntry[] }) {
  const t = useT();
  const [active, setActive] = useState("");

  useEffect(() => {
    const nodes = entries
      .map((e) => document.getElementById(e.id))
      .filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return;

    // "Which section am I reading" = the topmost one whose heading has settled
    // into the upper band of the viewport.
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((r) => r.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -70% 0px", threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [entries]);

  return (
    <nav aria-label={t("תוכן המדריך")} className="panel-gold rounded-xl p-3 sm:p-4">
      <p className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-dim">
        <span className="rule-gold w-6" />
        {t("תוכן העניינים")}
        <span className="rule-gold flex-1" />
      </p>
      {/* One column until there is room for two. Two columns on a phone leaves
          each cell ~70px of text after the index number and the icon, which
          truncated every entry in the index — "שעון המ…", "מכרות ו…", "מסעות
          ה…" — and an index you cannot read is not an index. */}
      <ul className="grid grid-cols-1 gap-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {entries.map((e, i) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => jumpTo(e.id)}
              data-active={active === e.id}
              className="guide-toc-link w-full text-right"
            >
              <span className="nums w-5 shrink-0 text-[10px] opacity-50">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Icon name={e.icon} size={14} className="shrink-0 opacity-70" />
              <span className="truncate">{e.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Floating "back to the index" button. Appears once the reader is well past
 * the top and returns them to the table of contents in one tap — the manual is
 * long enough that scrolling back by hand is a real cost.
 */
export function BackToTop() {
  const t = useT();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("חזרה לתוכן העניינים")}
      // Sits a launcher's height above the corner: the chat dock owns the
      // bottom-left of every game screen.
      className={`fixed bottom-20 left-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-gold/60 bg-[#12100b]/95 text-gold-bright shadow-[0_8px_30px_rgba(0,0,0,0.8)] transition-all duration-200 hover:border-gold hover:bg-[#1b1710] ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 19V6M12 6l-6 6M12 6l6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
