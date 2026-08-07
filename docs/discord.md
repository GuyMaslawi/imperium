# The community channel (Discord)

The site is wired for a Discord server that lives outside the repo. Everything
is driven by **four optional environment variables**, and every surface degrades
gracefully while they are unset — which is the state the game shipped in, on
purpose, so the site could be ready before the channel was.

```
DISCORD_URL                  the public invite   https://discord.gg/xxxxxxx
DISCORD_WEBHOOK_URL_EVENTS   events room         https://discord.com/api/webhooks/…/…
DISCORD_WEBHOOK_URL_UPDATES  updates room        https://discord.com/api/webhooks/…/…
DISCORD_WEBHOOK_URL_SUPPORT  support room        https://discord.com/api/webhooks/…/…
```

The announcer posts into **three rooms**, and which one a post lands in is stated
at every call site rather than inferred from its colour:

| Room | What it carries |
|---|---|
| **events** | What happens inside the game, on the clock — a Happy Hour, a mini-game, guild-war results, a season opening or closing, a game-wide gift. Read late is read too late. |
| **updates** | News about the game — what was built, what changed, what is coming. Nothing in it expires. |
| **support** | Somebody is stuck in front of the login screen and has written to us. Not news at all: a work queue, and the only one of the three that should be noisy — an unanswered ticket is a player who never got into the game. |

Separate rooms rather than one because they are read differently: someone who
mutes the channel that fires on every Happy Hour must still hear that the game
got a new feature, and neither of those should bury a person asking for help. A
single feed forces one decision on all three.

The earlier single `DISCORD_WEBHOOK_URL` (one `#הכרזות` room for everything) is
**retired**, and nothing falls back to it — a room whose own variable is unset is
simply not configured. Falling back would quietly resurrect a dead webhook and
post the game's news where nobody is reading.

None is `NEXT_PUBLIC_`. They are read on the server per request
(`src/server/discord.ts`, `server-only`) and the invite reaches client
components as a plain prop — so the webhooks are never one careless import away
from the browser bundle, and the invite is not baked into a static chunk.

All are validated, not trusted. The invite must be an `https` URL on a real
Discord host and a webhook must be an `https://discord.com/api/webhooks/…`
path; anything else is treated as **not configured** rather than rendered or
posted to. A typo therefore turns the feature off instead of pointing the
game's own "join us" button at somewhere nobody vetted.

## What turns on with `DISCORD_URL`

| Surface | What appears |
|---|---|
| `/game/community` | The full page: banner, what the channel is for, the welcome purse, house rules. Reachable from the sidebar ("קהילה") whether or not the invite exists. |
| Sidebar / mobile drawer | The "קהילה" row (always present — it links to the page, not to Discord). |
| Login / register / verify screens | A blurple "הצטרפו לקהילה בדיסקורד" pill under the form. |
| Chat dock | A one-line strip above the public room. |
| `/game/guide` | Section 20, "קהילה". |

Until it is set, every one of those links is hidden and the community page says
the channel is being built.

### The welcome purse

Joining pays `DISCORD_JOIN_DIAMONDS` (25) diamonds, once per empire, recorded
on `Empire.discordJoinedAt`. It is **honour-based** — there is no bot, so
nothing verifies that the player actually joined — and the copy on the page says
so. That is also why the number is small: it has to be worth less than the
effort of farming it from alternate accounts. The payout is a single guarded
`UPDATE … WHERE "discordJoinedAt" IS NULL`, so a double click pays once.

The claim is refused entirely while `DISCORD_URL` is unset — otherwise the purse
would be collectable during exactly the window before the channel exists.

## What turns on with the webhooks

The automatic announcements, each posted **after** its database work has
committed and none of them able to fail the thing that triggered them:

| Event | Room | Where it is posted from |
|---|---|---|
| Admin broadcast **to all players** | admin's pick, **updates** by default | `broadcastMessage` — scoped broadcasts (a season, a guild, one player) are never reposted. |
| An admin gift carrying a message | events | `sendGift` — same rule, and only when there is an inbox message to mirror. A gift landing in every treasury is something that happened today, not news about what was built. |
| A Happy Hour going live | events | `releaseHappyHour` — the one time-critical post: the window closes whether or not anyone noticed it opened. |
| A mini-game going live | events | `releaseMiniGame` — a race with a deadline and capped winners. |
| Guild-war results (top 3) | events | `settleWar`, by whichever reader won the settlement race, so exactly one post per war. |
| **A season opening** | events | `announceSeasonStart`, from both paths that can flip a season live: the lazy `getSeasonGate` activation (only the request that wins the guard posts) and the admin's `activateSeason`. |
| A season closing (podium) | events | `closeSeason`, read back from היכל התהילה after it is written. |
| **A support ticket** | support | `sendSupportMessage` — the first message of a new conversation always posts; later ones are held to one post per thread per ten minutes, so a person writing three short lines produces one notification rather than three. The embed links straight at `/admin/support?thread=…`. |

A broadcast is the only free-text post, so it is the only one that gets to
choose: `/admin/broadcast` carries a "ערוץ דיסקורד" select, defaulting to
updates — a broadcast typed by hand is usually news about the game, and the
events release themselves.

Both ends of a season are news, and the opening is the more urgent of the two:
everyone starts the new season together, so a player who hears about it a week
late has lost a week of a race that cannot be restarted. The close post leads
with the podium line ("קבלו את שלושת השחקנים שהחזיקו מעמד כל הסיזן…") and the
open post carries the season's deadline in **Jerusalem** wall time — the
announcer runs on a UTC host, so the timezone is pinned rather than inherited.

`allowed_mentions: { parse: [] }` is set on every post: an admin broadcast is
free text, and a broadcast containing `@everyone` must not be able to ping an
entire Discord server from a game form.

Failures — an outage, a revoked webhook, a five-second timeout — are swallowed
into the error log (visible on `/admin/monitor`) and nothing else. The log key
carries the room (`discord.announce.events` / `discord.announce.updates` /
`discord.announce.support`): with three webhooks live, "the announcer is broken"
is not actionable until you know which one went silent. `/admin/broadcast` says
which of the two announcement rooms are configured, and `/admin/support` says so
for its own — the support screen is emphatic about it, because without that
webhook nobody learns a ticket exists until an admin happens to open the page.

## Creating the webhooks

In Discord: **Server Settings → Integrations → Webhooks → New Webhook**, once per
room, pointed at that room's channel, and copy each URL. Give them channels
players can read but not post in; the game only ever writes.

## Setting them on Vercel

Project → Settings → Environment Variables, then **redeploy** — Vercel injects
environment variables at deploy time, so a new value does not reach a running
deployment on its own.
