"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The chat's emoji tray.
 *
 * A hand-picked list rather than a picker library: the published pages run under
 * a CSP that blocks every external host, an emoji-data package is hundreds of
 * kilobytes shipped to every player for a grid of buttons, and a war game does
 * not need the full Unicode set — it needs swords, crowns, faces and a thumb.
 * The glyphs come from the player's own system font, so nothing is downloaded
 * at all.
 *
 * Grouped, because a flat wall of two hundred emoji is unusable at this width;
 * the group a player wants is one tap away and the tray remembers nothing.
 */
const GROUPS: { key: string; label: string; emoji: string[] }[] = [
  {
    key: "war",
    label: "⚔️",
    emoji: [
      "⚔️", "🗡️", "🛡️", "🏹", "🪓", "🔱", "🏰", "🚩", "🏴", "👑",
      "💰", "💎", "🪙", "🔥", "💀", "☠️", "⚰️", "🐉", "🦅", "🐺",
      "🦁", "🐗", "🐍", "🦂", "🎯", "💣", "⚡", "🌪️", "🩸", "⛓️",
    ],
  },
  {
    key: "faces",
    label: "😀",
    emoji: [
      "😀", "😁", "😂", "🤣", "😅", "😊", "😇", "🙂", "😉", "😍",
      "😘", "😜", "🤪", "🧐", "🤓", "😎", "🥳", "😏", "😒", "😔",
      "😢", "😭", "😤", "😡", "🤬", "🤯", "😱", "😨", "😴", "🤗",
      "🤔", "🤫", "🙄", "😳", "🥵", "🥶", "🤢", "🤠", "😈", "👻",
    ],
  },
  {
    key: "hands",
    label: "👍",
    emoji: [
      "👍", "👎", "👌", "✌️", "🤝", "🙏", "💪", "👏", "✋", "👊",
      "🤛", "🤜", "🫡", "🤙", "👋", "🫰", "☝️", "👇", "👉", "👈",
    ],
  },
  {
    key: "marks",
    label: "✨",
    emoji: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "💯", "✅",
      "❌", "⭐", "🌟", "✨", "🎉", "🎊", "🔔", "⏳", "🕐", "❓",
      "❗", "💤", "🍺", "🍻", "🎁", "🏆", "🥇", "🤝", "🧠", "👀",
    ],
  },
];

/** Tray width in px, before it is clamped to a narrow viewport. */
const TRAY_WIDTH = 304; // 19rem
/** Breathing room kept between the tray and the viewport edge. */
const MARGIN = 8;

/**
 * The button and its tray. `onPick` receives one emoji; the tray stays open so
 * a run of them can be tapped, and closes on Escape, on a click outside, or on
 * the button itself.
 *
 * The tray is portalled to `document.body` and positioned `fixed` rather than
 * absolutely inside the composer. It used to be an `absolute … left-0` panel,
 * which put it at the mercy of its ancestors: the chat dock clips itself with
 * `overflow-hidden` to keep its rounded corners, and under `dir="rtl"` the
 * button lands at the *right* edge of a 22.5rem panel — so a 19rem tray growing
 * rightwards from `left-0` ran straight off the panel and was sliced in half.
 * Escaping the clip entirely is the only fix that stays correct wherever the
 * dock is later moved to, and it lets the tray be clamped to the *viewport*
 * instead of to whatever box happens to contain the button.
 */
export function ChatEmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(GROUPS[0]!.key);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  /** Null until the first measurement, so the tray never paints at 0,0. */
  const [box, setBox] = useState<{ left: number; bottom: number; width: number } | null>(null);

  const place = useCallback(() => {
    const anchor = buttonRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(TRAY_WIDTH, window.innerWidth - MARGIN * 2);
    // Centred on the button, then pushed back inside whichever edge it crossed.
    const wanted = rect.left + rect.width / 2 - width / 2;
    const left = Math.min(Math.max(MARGIN, wanted), window.innerWidth - width - MARGIN);
    setBox({ left, bottom: window.innerHeight - rect.top + MARGIN, width });
  }, []);

  // Measured before paint: a tray that positions itself in a passive effect
  // flashes at the wrong spot for a frame.
  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || trayRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // `true` on scroll: the composer grows as the draft wraps and the dock can
    // sit inside scrolled ancestors, and a fixed tray does not follow either.
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  const active = GROUPS.find((g) => g.key === group) ?? GROUPS[0]!;

  const tray = open && box && (
    <div
      ref={trayRef}
      dir="rtl"
      style={{ left: box.left, bottom: box.bottom, width: box.width }}
      // Just above the dock's own z-50, since it now shares the body with it —
      // and still below the drawer and the modals.
      className="fixed z-[55] overflow-hidden rounded-xl border border-gold/40 bg-[#12111a] shadow-[0_14px_40px_rgba(0,0,0,0.8)] print:hidden"
    >
      <div className="flex border-b border-border-subtle">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setGroup(g.key)}
            className={`flex-1 py-1.5 text-base transition-colors ${
              g.key === group ? "bg-gold/15" : "opacity-60 hover:bg-white/5 hover:opacity-100"
            }`}
          >
            <span aria-hidden>{g.label}</span>
          </button>
        ))}
      </div>
      <div className="chat-scroll grid max-h-40 grid-cols-8 gap-0.5 overflow-y-auto p-1.5">
        {active.emoji.map((emoji, index) => (
          <button
            // The same glyph appears in two groups (🤝), so the index is
            // part of the key.
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => onPick(emoji)}
            className="rounded-md py-1 text-lg leading-none transition-colors hover:bg-gold/20"
          >
            <span aria-hidden>{emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-label="אימוג׳ים"
        aria-expanded={open}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors ${
          open
            ? "border-gold/60 bg-gold-deep/30"
            : "border-border-subtle bg-panel-inset hover:border-gold/50"
        }`}
      >
        <span aria-hidden>🙂</span>
      </button>

      {tray && createPortal(tray, document.body)}
    </div>
  );
}
