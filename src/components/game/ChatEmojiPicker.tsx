"use client";

import { useEffect, useRef, useState } from "react";

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

/**
 * The button and its tray. `onPick` receives one emoji; the tray stays open so
 * a run of them can be tapped, and closes on Escape, on a click outside, or on
 * the button itself.
 */
export function ChatEmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(GROUPS[0]!.key);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = GROUPS.find((g) => g.key === group) ?? GROUPS[0]!;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
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

      {open && (
        // Anchored to the button and opening upward: the composer sits at the
        // bottom of the dock, so a tray that opened downward would be off-screen.
        <div className="absolute bottom-11 left-0 z-10 w-[min(19rem,80vw)] overflow-hidden rounded-xl border border-gold/40 bg-[#12111a] shadow-[0_14px_40px_rgba(0,0,0,0.8)]">
          <div className="flex border-b border-border-subtle">
            {GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGroup(g.key)}
                className={`flex-1 py-1.5 text-base transition-colors ${
                  g.key === group
                    ? "bg-gold/15"
                    : "opacity-60 hover:bg-white/5 hover:opacity-100"
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
      )}
    </div>
  );
}
