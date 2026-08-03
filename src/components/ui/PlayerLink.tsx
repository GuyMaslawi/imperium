import Link from "next/link";

/**
 * A player's name, always a door into his dossier.
 *
 * The name of another empire is never dead text in this game: it is the thing
 * you click to decide whether to spy, raid, mail or ally. The ladders had that
 * link from the start, but the places you actually *meet* a rival — your inbox,
 * the battle history, the guild roster, the war feed — printed the name flat,
 * so learning who hit you meant going back to the rankings and searching for
 * him by hand. Every one of those now renders through here.
 *
 * `empireId` is nullable on purpose. A sender or a recruiter whose account was
 * deleted keeps his name in the row (the FKs are SetNull, not Cascade) but has
 * no dossier left to open — those degrade to plain text rather than to a link
 * that 404s. It is a plain component with no hooks, so client tables and server
 * pages can both render it.
 */
export function PlayerLink({
  empireId,
  name,
  className = "",
  title,
  staff = false,
}: {
  empireId: string | null | undefined;
  name: string;
  className?: string;
  /** Tooltip; defaults to naming what the link opens. */
  title?: string;
  /**
   * Render as the game's own account: molten gold with a highlight travelling
   * across it (`.staff-name` in globals.css).
   *
   * Off by default and passed explicitly, rather than looked up in here. This
   * component is deliberately hook-free and query-free so client tables and
   * server pages can both render it, and every caller that can actually *show*
   * a staff empire — chat, mail, a guild roster, the dossier itself — already
   * has the flag in the row it is drawing. Everywhere else a staff empire is
   * simply absent (see src/lib/staff.ts), so there is nothing to decorate.
   */
  staff?: boolean;
}) {
  // The gradient fill replaces the colour utilities a caller passes, so the
  // staff class goes last and the two are never both meaningful.
  const cls = `${className} ${staff ? "staff-name" : ""}`.trim();
  if (!empireId) return <span className={cls}>{name}</span>;
  return (
    <Link
      href={`/game/empires/${empireId}`}
      title={title ?? (staff ? `הנהלת המשחק — ${name}` : `הפרופיל של ${name}`)}
      className={`underline-offset-4 hover:text-gold-bright hover:underline ${cls}`}
    >
      {name}
    </Link>
  );
}
