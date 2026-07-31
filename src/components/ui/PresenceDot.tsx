/**
 * Whether a player has the game open right now, drawn the same way everywhere.
 *
 * The single source of the *fact* is `Empire.lastSeenAt` run through
 * `isOnline()` — a heartbeat the chat dock's shut-pane pulse stamps every 25
 * seconds from whatever screen the player is on, so it means "a browser had the
 * game open", not "the chat is open". This file is only the mark: a filled green
 * dot with a slow halo for here, a hollow ring for away.
 *
 * It lives in `ui/` rather than beside the chat because presence is read in two
 * very different places — the chat roster, where it answers "will they reply?",
 * and the rankings ladder, where it answers "will they notice me coming?" — and
 * the two must never drift into two different-looking dots.
 *
 * Purely presentational (no hooks), so it renders in a server component as
 * happily as inside the client-side dock.
 */

/** The word the dot says out loud, in the tooltip and in the labelled pill. */
const PRESENCE_WORD = { on: "מחובר עכשיו", off: "לא מחובר" } as const;

export function PresenceDot({
  online,
  label = false,
}: {
  /** `undefined` = presence is not disclosed here; the dot draws nothing. */
  online?: boolean;
  /** Spell it out in a word beside the dot, for surfaces with no legend. */
  label?: boolean;
}) {
  // Undisclosed presence draws nothing. A hollow dot reads as "this player is
  // away", and some callers genuinely do not know — see searchChatPlayers.
  if (online === undefined) return null;

  const word = online ? PRESENCE_WORD.on : PRESENCE_WORD.off;
  const dot = (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        online
          ? "presence-online bg-accent-green"
          : "border border-bone-dim/50 bg-transparent"
      }`}
    />
  );

  if (!label) {
    // The title carries the meaning for anyone who cannot read a coloured dot.
    return <span title={word}>{dot}</span>;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-bold ${
        online
          ? "border-accent-green/50 bg-accent-green/10 text-accent-green"
          : "border-border-subtle bg-panel-inset text-zinc-500"
      }`}
    >
      {dot}
      {word}
    </span>
  );
}
