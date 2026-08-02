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
}: {
  empireId: string | null | undefined;
  name: string;
  className?: string;
  /** Tooltip; defaults to naming what the link opens. */
  title?: string;
}) {
  if (!empireId) return <span className={className}>{name}</span>;
  return (
    <Link
      href={`/game/empires/${empireId}`}
      title={title ?? `הפרופיל של ${name}`}
      className={`underline-offset-4 hover:text-gold-bright hover:underline ${className}`}
    >
      {name}
    </Link>
  );
}
