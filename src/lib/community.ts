/**
 * The community channel — everything about it that is safe on both sides of the
 * wire.
 *
 * The channel itself (Discord) is being built outside the game, so the site is
 * written to work in both states: with an invite configured it links to it from
 * every screen a player might look for it on, and without one it says the
 * channel is on its way instead of rendering a dead button. Nothing here reads
 * the environment — that lives in `src/server/discord.ts`, behind `server-only`,
 * so a client component cannot silently read `undefined` and quietly drop the
 * link. The URL reaches the browser as a prop.
 */

import type { IconName } from "@/components/ui/Icon";

/**
 * Hosts an actual Discord invite can live on.
 *
 * The invite is printed into every player's page and into the auth screens, so
 * it is validated rather than trusted: a mistyped env var (or a pasted tracking
 * link) would otherwise turn the game's own "join us" button into a redirect to
 * somewhere nobody vetted. Anything that is not plainly a Discord URL is
 * treated as *unconfigured*, which is the state the whole feature already
 * degrades to gracefully.
 */
const INVITE_HOSTS = new Set([
  "discord.gg",
  "www.discord.gg",
  "discord.com",
  "www.discord.com",
  "discordapp.com",
  "www.discordapp.com",
]);

/**
 * Normalise a configured invite, or null if it is missing or not a Discord link.
 *
 * https only: an http invite would be downgraded on the wire, and every real
 * Discord invite is https anyway.
 */
export function parseDiscordInvite(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!INVITE_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url.toString();
}

/**
 * Diamonds paid, once ever, for joining the channel.
 *
 * Deliberately small. Nothing outside Discord can verify that the player
 * actually joined — there is no bot, so the button is taken on trust — which
 * means the honest reading of this number is "what the game is willing to hand
 * to anyone who clicks a link once". A generous purse would be a standing
 * invitation to farm it from alternate accounts (see the IP signals on
 * /admin/monitor); 25 is a real welcome and a pointless heist.
 */
export const DISCORD_JOIN_DIAMONDS = 25;

/** What the channel is for — the pitch, in the order it is worth reading. */
export const COMMUNITY_HIGHLIGHTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "spark",
    title: "הכרזות ראשונות",
    body: "שעות זהב, אירועים, עונות חדשות ועדכוני משחק מגיעים לערוץ ברגע שהם עולים — לפעמים לפני שהם באתר.",
  },
  {
    icon: "guild",
    title: "גיוס לבריתות",
    body: "בריתות מחפשות חברים וחברים מחפשים ברית. הרבה יותר מהיר מלנחש מהדירוג מי מקבל אנשים.",
  },
  {
    icon: "attack",
    title: "טקטיקה ועזרה",
    body: "שאלות על כוח, מרגלים, שליטי ערים ומכרות — ושחקנים ותיקים שכבר ניסו את מה שאתה מתלבט לגביו.",
  },
  {
    icon: "reports",
    title: "באגים והצעות",
    body: "משהו נראה שבור או לא הוגן? שם זה מגיע אלינו הכי מהר, עם צילום מסך ובלי טופס.",
  },
];

/**
 * The house rules, printed on the community page.
 *
 * The last one is not filler: the game's own inbox and chat are a broadcast
 * surface an attacker would love, and a player who has internalised "nobody
 * from the staff will ever ask for my password" is immune to the entire class.
 */
export const COMMUNITY_RULES: string[] = [
  "דברו יפה. ביקורת על מהלך במשחק — כן; עלבונות, גזענות והטרדה — החוצה.",
  "בלי ספאם, בלי הצפות ובלי פרסום של משחקים אחרים בערוצים הכלליים.",
  "אל תשתפו סיסמאות, קודי אימות או פרטי תשלום — גם לא בפרטי.",
  "צוות קראלדור לעולם לא יבקש מכם סיסמה, לא בדיסקורד ולא בצ׳אט של המשחק. כל בקשה כזו היא ניסיון גניבה.",
  "באג שמאפשר רווח לא הוגן — דווחו, אל תנצלו. ניצול מודע נגמר בחסימה.",
];
