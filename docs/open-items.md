# Open items — what still needs fixing

The running list of everything known-and-not-fixed, carried across the seven
security audits (2026-07-23 → 2026-08-01). Anything already fixed lives in the
audit notes, not here. Order is by what it costs you if it goes wrong, not by
how hard it is.

Nothing on this list is a live exploit. The code-level defects found in each
audit were fixed in that audit; what is left is infrastructure that only you can
touch, compliance that needs your real details, and design calls that are yours
to make.

---

## 1. Infrastructure — only you can do these

### 1.1 Rotate the Neon production password · **highest severity, open since 07-25**

The credential in `.env.local` was read by a subagent during the 07-25 audit and
is still valid. It grants full read/write to the production database: every
account, every purchase record, every balance.

Neon console → reset the role password → update `PRISMA_DATABASE_URL` and
`PRISMA_DIRECT_URL` (and the Vercel↔Neon integration's own `DATABASE_URL`) on
Vercel → redeploy. Nothing in the repo needs to change.

### 1.2 Publish the operator identity · **PayPlus asked for two more fields on 08-04**

Five values are now required before the store may open, because PayPlus's
underwriting asks for them by name:

| Variable | Status |
| --- | --- |
| `LEGAL_OPERATOR_NAME` | set locally + on Vercel (`GM-business`) |
| `LEGAL_CONTACT_EMAIL` | set locally + on Vercel |
| `LEGAL_OPERATOR_TAX_ID` | set locally, **not on Vercel** |
| `LEGAL_CONTACT_PHONE` | **empty — new** |
| `LEGAL_OPERATOR_ADDRESS` | **empty — new**, full postal address |

`LEGAL_OPERATOR_CITY` is retired: it published a city only, which satisfied the
consumer-protection rule but not the gateway. It still answers as a fallback so a
mid-migration deploy does not drop the place of business off the page, but it no
longer counts toward `complete`.

All five print publicly on `/terms`, `/refund` and `/privacy`, and for a
home-run עוסק פטור the address is a home address and the tax id is a ת.ז. If
that is not acceptable, a **תא דואר** satisfies the address requirement and a
second number (Google Voice, a cheap SIM) satisfies the phone — both are normal
and neither weakens the disclosure.

**The exposure itself is now closed by construction** — selling without naming
the merchant is what the law and the gateways care about, so that state can no
longer happen:

- `arePurchasesLive()` carries a third interlock: no operator, no store. Players
  see the store chained shut; admins still get the checkout for testing.
- `/terms`, `/refund` and `/privacy` say the details are pending instead of
  printing the placeholder as though it were a real merchant.
- The buy screen tells an admin exactly which of the three go-live conditions is
  missing, by env var name.

What is left is the input only you have: set the remaining values on Vercel (and
in `.env` for local work) — the name and the dealer number are the two the
interlock still waits on — and the pages fill themselves in, the interlock opens.
For an עוסק פטור the dealer number is your ת.ז. See `src/lib/legal.ts`.

### 1.3 Confirm `TRUSTED_PROXY_HOPS` matches Vercel's edge

`clientIp()` reads the client address `TRUSTED_PROXY_HOPS` entries from the
*right* of `X-Forwarded-For` (default 1), because everything to the left is
attacker-controllable. If Vercel's header shape differs from that assumption,
every per-IP limiter (login, register, client-error) is keyed on a value a
client can rotate at will — which silently removes the brute-force ceiling.

Verify once against a known address in production (log it, or read it back from
a `RateLimitBucket` key) and set the env var if the default is wrong. Cheap to
check, expensive to be wrong about.

### 1.4 Finish the PayPlus connection · **code complete 08-04, one value missing**

The gateway is **PayPlus**, not Grow. Grow wanted **₪500/month** for API access;
PayPlus charges **₪29.9**. Everything is written and tested — `src/server/payplus.ts`,
the signed callback at `/api/pay/payplus`, and the shared settlement path in
`src/server/orderSettle.ts` that both gateways run through.

`src/server/grow.ts` stays in the tree. It works, it is tested, and keeping it is
cheaper than rewriting it if the pricing ever changes. `getPaymentProvider()`
prefers PayPlus; a deploy with both configured charges through PayPlus.

Set on Vercel (and in `.env` for local work):

| Variable | Where it comes from |
| --- | --- |
| `PAYPLUS_API_KEY` | PayPlus panel — **already in `.env`** |
| `PAYPLUS_SECRET_KEY` | PayPlus panel — **already in `.env`**; also the HMAC key for callbacks |
| `PAYPLUS_PAGE_UID` | **← THE MISSING ONE.** Panel → **דפי תשלום** → the page's UID |
| `PAYPLUS_ENV` | `staging` (default) → `production` when you go live |

Then, in the PayPlus panel, set the callback (`refURL_callback`) to:

```
https://<your-domain>/api/pay/payplus
```

There is no callback secret to invent, unlike Grow: **PayPlus signs the body**
(HMAC-SHA256 under `PAYPLUS_SECRET_KEY`, base64, in the `hash` header, with a
`PayPlus` User-Agent), and that signature is the endpoint's authentication. The
amount is still re-read from `Transactions/View` before anything is credited —
a signature proves the message is theirs, not that it is fresh or unique.

Two things to confirm in the panel before the first real charge:

1. the payment page's **charge method** — the API call deliberately omits
   `charge_method` so the page's own setting applies, because the documented enum
   is ambiguous and guessing wrong yields an authorisation that never captures;
2. the success **status code** — the code trusts `"000"`, marked `VERIFY:`.

Both fail **closed**: anything unrecognised leaves the purchase PENDING and
visible in `/admin/purchases` rather than crediting diamonds.

Order of operations for go-live: page UID → staging test purchase (PayPlus
publishes sandbox card numbers) → check the row in `/admin/purchases` and that a
receipt was issued → `PAYPLUS_ENV=production` → one real ₪ purchase, confirm the
money lands in the bank → `DIAMOND_PURCHASES_LIVE=true`. The interlocks in
`arePurchasesLive()` enforce that ordering; they do not enforce that you actually
looked at your bank account.

Still outstanding on the commercial side: the acquirer contract (1.2% domestic),
whether there is a **minimum monthly commission**, whether a **rolling reserve**
applies to virtual-currency merchants, and Bit (+₪16.9/mo + 1.4%, ~15 business
days). None of them block the code.

### 1.5 Edge rules for unauthenticated floods

The poll ceilings added on 07-30 and 08-01 are per-instance, in-process, and
per-empire — they blunt one hostile *signed-in* client. A distributed or
unauthenticated flood is not something app code can answer; that is Vercel WAF /
firewall rules. Configuration, not code.

---

## 2. Product decisions I did not make for you

### 2.1 Presence is a targeting oracle again

The 07-30 audit blinded `searchChatPlayers` because a name lookup answering
*"is this empire at the keyboard right now?"* is sharper intel than a spy
mission — knowing a rival is away means their gold is not banked and they will
not re-shield.

Since then the dot was deliberately added to the city ladder, the global boards
and the rival dossier. The consequence worth knowing: **the search blinding no
longer buys anything** — search by name → empire id → open the profile → read
the dot. Either the dot is intended intel everywhere (in which case putting it
back on search costs nothing) or it is not (in which case the three new places
are the leak). Right now the game is halfway between the two positions.

### 2.2 `getInboxPulse` cadence · **performance, not security**

Every signed-in player polls it every **4 seconds on every screen**, and a round
costs ~9 queries — roughly 135 queries/minute per active player, ~225 qps at 100
concurrent. The ceiling added on 08-01 stops a looping client; it does not touch
this baseline.

`VISIBLE_MS` in `src/components/game/inboxPulse.ts`: 4s → 6s cuts the hottest
path in the app by a third, for a latency change nobody will feel. Your call
whether live badges are worth the current bill on a free Neon tier.

### 2.3 Economy calls carried from earlier audits

None of these are bugs — the code does exactly what it says. They are balance
positions nobody has ruled on:

- **The wheel doubles daily**, capped at `WHEEL_MAX_DOUBLINGS` 20 → ~5.24B per
  spin from day 21, at ~6 spins/day. And `wheelPrizeAmount` keys off the *season*
  day, not the account's age, so **an account created on day 30 gets
  5.24B-a-spin prizes on its first daily update**. Clamp to account age, or lower
  the ceiling, or accept it.
- **The wheel pays diamonds** — the real-money currency — at a day-scaling rate.
- **Turns are both the cost of earning pass XP and a pass reward** (attacking is
  roughly breakeven on day 1 and runaway by day 60).
- **Tier-8 premium is a guaranteed LEGENDARY every cycle**, with no
  once-per-season guard.
- **Founding a city opens a fresh full-health boss life immediately**, bypassing
  the hourly revive, because the life is keyed `(empireId, cityTier)`. Bounded by
  the city gold wall and `MAX_CITIES` 10, so at most ten extra hauls a season.
- **Weapons are strictly better than soldiers at the boss**: the blood price is
  proportional to soldiers held while damage comes from soldiers *and* weapons,
  so the optimal build is a token garrison plus a big arsenal (measured: 200
  soldiers + weapons lost 3 where 60,000 soldiers at the same power lost 938, for
  the same haul and the same grade).
- **Per-target attack cooldown / daily hit cap** — explicitly declined on 07-23;
  turns are the only limit on attacking. Listed so the decision stays visible,
  not to reopen it.

### 2.4 Registration answers whether an email is registered

Decided on 2026-08-01 to leave it. Closing it properly means signup stops
creating a session, `verifyEmailToken` creates it instead, and resend works off a
short-lived cookie — a rebuild of the most critical path in a live app that takes
money, to close an oracle already capped at 5 attempts/hour/IP. Login itself is
fully enumeration-hardened. **Do not "fix" this without deciding to do the whole
rebuild.**

---

## 3. Latent — no action needed yet, but do not lose it

### 3.1 Google ID tokens are accepted without a nonce

`verifyGoogleIdToken` checks issuer, audience, expiry and `email_verified`,
which is correct for a single-origin GIS button. A replayed token from another
origin becomes reachable the moment the OAuth client gains a **second authorised
origin** (a staging domain, a mobile app, a custom domain added alongside
`imperium-rho.vercel.app`). Add the nonce round-trip *before* adding that origin,
not after.

### 3.2 Keep the privacy policy in step with the schema

The `signupIp`/`lastLoginIp` columns landed on 07-31 and the policy still
described IPs as rate-limiter-only until 08-01. **Adding a column that holds
personal data means editing `src/app/privacy/page.tsx` and bumping
`LEGAL_UPDATED.privacy` in the same change** — a published policy that no longer
describes what the database holds is the kind of gap that is only ever found by
the wrong person.

### 3.3 The shared rate limiter fails open

`rateLimit` returns `true` when Postgres is unreachable, deliberately: a limiter
that takes signup and login down with the database is a worse outage than the one
it prevents, and the in-process pre-filter still caps what one instance passes
through. Documented here so it is a known position rather than a discovery.

---

## Where the detail lives

Each item's full reasoning, measurements and the code it touches are in the
audit notes for the pass that found it: 07-23 (pre-launch), 07-25, 07-26, 07-27,
07-29, 07-30 and 08-01.
