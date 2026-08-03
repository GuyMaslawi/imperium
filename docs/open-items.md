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

### 1.2 Publish the operator identity · **contained in code 08-01, still needs your details**

`LEGAL_OPERATOR_NAME` = `GM-business` (the עוסק פטור) and `LEGAL_CONTACT_EMAIL` =
`kraldorsupport@gmail.com` are set in `.env` **and** on Vercel production.
`LEGAL_OPERATOR_TAX_ID` is set locally but **not** on Vercel, and
`LEGAL_OPERATOR_CITY` is still commented out — so in production the operator is
one value short of published and the store stays shut. Adding the dealer number
to Vercel is the last step, and it is a deliberate one: for an עוסק פטור that
number is your ת.ז., and the policy pages print it publicly.

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

### 1.4 Finish the Grow connection · **code complete 08-03, waiting on credentials**

The whole Grow integration is written and tested; what is missing is input only
Grow can give you. The store stays on the mock provider until all three of these
are set, so nothing about the current deploy changes when you merge it.

Set on Vercel (and in `.env` for local work):

| Variable | Where it comes from |
| --- | --- |
| `GROW_USER_ID` | Grow panel — the business identifier |
| `GROW_PAGE_CODE` | Grow panel — the payment-page identifier |
| `GROW_CALLBACK_SECRET` | **you generate it**: `openssl rand -hex 24`. Letters and digits only, ≥24 chars |
| `GROW_ENV` | `sandbox` (default) → `production` when you go live |
| `GROW_PAYMENT_METHODS` | optional. Default `1,6,13,14` = card, Bit, Apple Pay, Google Pay |

Then, in the Grow panel, set the server callback (`notifyUrl`) to:

```
https://<your-domain>/api/pay/grow/<GROW_CALLBACK_SECRET>
```

The secret is in the *path*, not a query string, because Grow rejects special
characters in `notifyUrl`. It is the endpoint's only credential — Grow does not
sign its callbacks — so treat it like a password: never commit it, and rotate it
in both places at once if it leaks. Rotating is safe at any moment except while
a payment is mid-flight.

Two things to confirm in the panel **before the first real charge**, both marked
`VERIFY:` in `src/server/grow.ts`:

1. the parameter names for the order lookup (`getPaymentProcessInfo`), and
2. the status-code table — the code trusts `statusCode === "2"` to mean paid.

Both fail **closed**: anything unrecognised leaves the purchase PENDING and
visible in `/admin/purchases` rather than crediting diamonds. So the failure mode
of getting these wrong is a payment you have to settle by hand, not a leak.

Order of operations for go-live: sandbox credentials → one end-to-end test
purchase → check the row in `/admin/purchases` and that a receipt was issued →
`GROW_ENV=production` → one real ₪ purchase, confirm the money lands in the bank
→ `DIAMOND_PURCHASES_LIVE=true`. The interlocks in `arePurchasesLive()` enforce
that ordering; they do not enforce that you actually looked at your bank account.

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
