import { Icon } from "@/components/ui/Icon";

/**
 * The one way the site links out to the community channel.
 *
 * Every surface that offers Discord — the sidebar, the auth screens, the chat
 * dock, the guide, the community page — renders this, so the invite is opened
 * the same way everywhere: a new tab, `rel="noreferrer"` (a game screen's URL
 * can carry a report id; there is no reason to hand it to Discord), and nothing
 * at all when the channel has not been configured yet.
 *
 * `url` is a prop rather than an environment read on purpose: the value lives in
 * a server-only module (see server/discord.ts), and each caller passes what it
 * was given. A component that read the env itself would render an empty link in
 * client bundles and nobody would notice.
 */
export function DiscordLink({
  url,
  variant = "inline",
  label = "קהילת קראלדור בדיסקורד",
  className = "",
}: {
  url: string | null;
  /**
   * `button` — a gold CTA, for a page that is asking you to join.
   * `pill`   — a bordered chip in Discord's own blurple, for a footer.
   * `strip`  — a full-width bar, for docking under a panel header.
   * `inline` — a quiet text link, for a paragraph or a nav row.
   *
   * Each one carries its *whole* look, including hover: variants that shared a
   * base and were patched by the caller's className collided on colour, and two
   * equally specific utility rules are settled by stylesheet order rather than
   * by which one was passed last.
   */
  variant?: "button" | "pill" | "strip" | "inline";
  label?: string;
  /** Layout only — margins and sizing. Colour belongs to the variant. */
  className?: string;
}) {
  if (!url) return null;

  const base =
    variant === "button"
      ? "btn btn-gold inline-flex items-center gap-2 px-5 py-2 text-sm"
      : variant === "pill"
        ? "inline-flex items-center gap-2 rounded-lg border border-[#5865F2]/45 bg-[#5865F2]/12 px-4 py-2 text-xs font-bold text-[#c7ccff] transition-colors hover:border-[#5865F2] hover:bg-[#5865F2]/25 hover:text-white"
        : variant === "strip"
          ? "flex items-center justify-center gap-2 border-b border-[#5865F2]/30 bg-[#5865F2]/12 px-2.5 py-1.5 text-[11px] font-bold text-[#c7ccff] transition-colors hover:bg-[#5865F2]/22 hover:text-white"
          : "inline-flex items-center gap-1.5 transition-colors hover:text-gold";

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={`${base} ${className}`}
    >
      <Icon
        name="discord"
        size={variant === "button" ? 18 : variant === "pill" ? 16 : 14}
        className="shrink-0"
      />
      {label}
    </a>
  );
}
