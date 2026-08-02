import "server-only";
import { parseDiscordInvite } from "@/lib/community";
import { logError } from "@/server/errorLog";
import { appBaseUrl } from "@/server/mailer";

/**
 * The game's side of the Discord channel: where the invite lives, and how the
 * server speaks into the room.
 *
 * Two independent environment variables, because they are two different
 * decisions and either one may be made first:
 *
 *   DISCORD_URL          the public invite — https://discord.gg/xxxxxxx
 *   DISCORD_WEBHOOK_URL  a channel webhook, for automatic announcements
 *
 * Both are optional and both fail closed. With neither set the site simply has
 * no community channel: every link is hidden, nothing is posted anywhere, and
 * no code path changes behaviour. That is deliberate — the channel is being
 * built by somebody else, and the site had to be ready before it exists.
 *
 * Deliberately *not* `NEXT_PUBLIC_`. A NEXT_PUBLIC value is inlined into the
 * browser bundle at build time, which would make the invite a build-time
 * constant and put the webhook one careless import away from the client. These
 * are read per request on the server and the invite reaches client components
 * as a plain prop.
 */

/** The configured invite, or null while the channel is still being built. */
export function discordInviteUrl(): string | null {
  return parseDiscordInvite(process.env.DISCORD_URL);
}

/**
 * Discord's own webhook endpoints, and nothing else.
 *
 * The announcer posts game state — season podiums, war results, broadcast text
 * — so a mistyped or hostile value would be an outbound feed of the game's
 * events to an arbitrary host, chosen by whatever wrote the environment. Pinning
 * the host keeps a typo from becoming that.
 */
function webhookUrl(): string | null {
  const raw = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (host !== "discord.com" && host !== "discordapp.com" && host !== "ptb.discord.com") {
      return null;
    }
    if (!url.pathname.startsWith("/api/webhooks/")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Is anything wired up at all — used by the admin screens to say so. */
export function isDiscordAnnouncerConfigured(): boolean {
  return webhookUrl() !== null;
}

/** The stripe down the side of the embed, by what is being announced. */
const COLORS = {
  /** Antique gold — the game's own colour, for plain announcements. */
  announcement: 0xc4a032,
  /** Golden hour: it is loud on the site, it is loud here. */
  event: 0xe8850c,
  /** War results. */
  war: 0xb02a37,
  /** A season closing — the rarest post the channel will ever get. */
  season: 0x8a5cd6,
} as const;

export type AnnouncementKind = keyof typeof COLORS;

export interface Announcement {
  kind: AnnouncementKind;
  title: string;
  body: string;
  /** Where to read more — a link back into the game. */
  url?: string | null;
}

/** Discord's own ceilings; over them the whole POST is rejected with a 400. */
const TITLE_MAX = 256;
const BODY_MAX = 4000;

function clamp(value: string, max: number): string {
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Post one announcement to the channel. Never throws, never blocks the caller's
 * outcome.
 *
 * Everything about this is defensive on purpose: it is called from the tail of
 * an admin action, a war settlement and a season close — work that has already
 * succeeded and been committed by the time we get here. A Discord outage, a
 * revoked webhook or a slow network must not turn a completed season close into
 * an error on somebody's page load, so every failure is swallowed into the
 * error log and the caller is told nothing.
 *
 * Two details that are not decoration:
 *
 *  - `allowed_mentions: { parse: [] }`. An admin broadcast is free text, and a
 *    broadcast containing "@everyone" would otherwise ping an entire Discord
 *    server from a game form — a megaphone nobody meant to hand out. Mentions
 *    are stripped of their power; the text still reads as written.
 *  - A hard timeout. Without one an unresponsive webhook host holds the request
 *    open for as long as it feels like.
 *
 * Callers must invoke this **outside** any database transaction. A network call
 * inside one holds a connection open for the length of someone else's outage.
 */
export async function announceToDiscord(announcement: Announcement): Promise<boolean> {
  const url = webhookUrl();
  if (!url) return false;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "קראלדור",
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: clamp(announcement.title, TITLE_MAX),
            description: clamp(announcement.body, BODY_MAX),
            url: announcement.url || undefined,
            color: COLORS[announcement.kind],
          },
        ],
      }),
      signal: AbortSignal.timeout(5_000),
      // Nothing about a webhook POST is cacheable, and Next will happily try.
      cache: "no-store",
    });
    if (!response.ok) {
      await logError(
        "discord.announce",
        new Error(`webhook responded ${response.status}`)
      );
      return false;
    }
    return true;
  } catch (err) {
    // Includes the timeout: an AbortError here means Discord did not answer in
    // five seconds, which is not the game's problem to escalate.
    await logError("discord.announce", err);
    return false;
  }
}

/**
 * Absolute link back into the game, for the "read more" on an embed.
 *
 * Discord will not linkify a relative path, and the announcement is read
 * somewhere that has no idea what host the game runs on. Shares `appBaseUrl`
 * with the mailer — the same question, already answered there, and answered
 * without trusting the request's Host header.
 */
export function gameLink(path: string): string | undefined {
  try {
    return new URL(path, appBaseUrl()).toString();
  } catch {
    return undefined;
  }
}
