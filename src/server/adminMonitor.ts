import "server-only";
import { prisma } from "@/lib/prisma";
import { bannedWhere, notBannedWhere } from "@/lib/ban";
import { ATTACK_TURN_COST, SPY_TURN_COST } from "@/lib/game/constants";

/**
 * The data behind /admin/monitor — what is happening on the site right now.
 *
 * The design constraint is that the game keeps almost no history. There are no
 * periodic snapshots of anyone's balances, so "this player's gold tripled
 * overnight" is not a question the database can answer. What it *can* answer is
 * what players **did**: every raid, spy run, boss march, expedition, deposit and
 * purchase leaves a dated row. So every signal here is built out of actions
 * within a window, plus a handful of present-tense balances read against the
 * ceiling the design says they should sit under.
 *
 * That shape is also what makes it cheap: each query is a `groupBy` or a `take`
 * over an indexed, time-bounded slice, never a scan of the whole game.
 */

/** The window every "recent" figure on the screen is measured over. */
export const MONITOR_WINDOW_HOURS = 24;

const windowStart = (now: Date, hours = MONITOR_WINDOW_HOURS) =>
  new Date(now.getTime() - hours * 3_600_000);

/* ------------------------------ pulse ------------------------------ */

export interface MonitorPulse {
  playersActive24h: number;
  playersActive1h: number;
  signups24h: number;
  awaitingVerification: number;
  lockedOut: number;
  banned: number;
  attacks24h: number;
  spies24h: number;
  revenue24hIls: number;
  totalEmpires: number;
}

/**
 * "Active" means *did something that wrote a row* — raided, spied, marched on
 * the boss, sent the hero out, banked gold or wrote to another player.
 *
 * Deliberately not derived from a `lastSeen` column, because there isn't one
 * that means anything: `Empire.updatedAt` only moves when the lazy clock has
 * ticks to settle, so an idle refresh does not touch it and a player returning
 * from a week away moves it once. Counting actions is both honest and already
 * indexed.
 */
async function activeEmpireIds(since: Date): Promise<Set<string>> {
  const [battles, spies, bosses, quests, banks, mail] = await Promise.all([
    prisma.battleReport.findMany({
      where: { createdAt: { gte: since } },
      select: { attackerEmpireId: true },
      distinct: ["attackerEmpireId"],
    }),
    prisma.spyReport.findMany({
      where: { createdAt: { gte: since } },
      select: { attackerEmpireId: true },
      distinct: ["attackerEmpireId"],
    }),
    prisma.bossFight.findMany({
      where: { createdAt: { gte: since } },
      select: { empireId: true },
      distinct: ["empireId"],
    }),
    prisma.heroQuest.findMany({
      where: { startedAt: { gte: since } },
      select: { empireId: true },
    }),
    prisma.bankTransaction.findMany({
      where: { createdAt: { gte: since }, type: { not: "INTEREST" } },
      select: { empireId: true },
      distinct: ["empireId"],
    }),
    prisma.message.findMany({
      where: { createdAt: { gte: since }, senderEmpireId: { not: null } },
      select: { senderEmpireId: true },
      distinct: ["senderEmpireId"],
    }),
  ]);

  const ids = new Set<string>();
  for (const r of battles) ids.add(r.attackerEmpireId);
  for (const r of spies) ids.add(r.attackerEmpireId);
  for (const r of bosses) ids.add(r.empireId);
  for (const r of quests) ids.add(r.empireId);
  for (const r of banks) ids.add(r.empireId);
  for (const r of mail) if (r.senderEmpireId) ids.add(r.senderEmpireId);
  return ids;
}

export async function getPulse(now: Date): Promise<MonitorPulse> {
  const day = windowStart(now);
  const hour = windowStart(now, 1);

  const [
    active24h,
    active1h,
    signups24h,
    awaitingVerification,
    lockedOut,
    banned,
    attacks24h,
    spies24h,
    revenue,
    totalEmpires,
  ] = await Promise.all([
    activeEmpireIds(day),
    activeEmpireIds(hour),
    prisma.user.count({ where: { createdAt: { gte: day } } }),
    prisma.user.count({ where: { emailVerified: null, ...notBannedWhere(now) } }),
    prisma.user.count({ where: { lockedUntil: { gt: now } } }),
    prisma.user.count({ where: bannedWhere(now) }),
    prisma.battleReport.count({ where: { createdAt: { gte: day } } }),
    prisma.spyReport.count({ where: { createdAt: { gte: day } } }),
    prisma.diamondPurchase.aggregate({
      where: { status: "PAID", isTest: false, paidAt: { gte: day } },
      _sum: { priceIls: true },
    }),
    prisma.empire.count(),
  ]);

  return {
    playersActive24h: active24h.size,
    playersActive1h: active1h.size,
    signups24h,
    awaitingVerification,
    lockedOut,
    banned,
    attacks24h,
    spies24h,
    revenue24hIls: revenue._sum.priceIls ?? 0,
    totalEmpires,
  };
}

/* ------------------------------ security ------------------------------ */

export interface ThrottleRow {
  family: string;
  label: string;
  subject: string;
  count: number;
  resetAt: Date;
}

/**
 * Which rate-limit buckets are hot right now, straight off the shared counter
 * table. This is the closest thing the app has to a security feed: a burst of
 * `login-email` hits on one account is an online brute-force attempt in
 * progress, and `register` hits from one address is someone farming accounts.
 *
 * Only the family is shown, never the subject. `login-email` keys are sha256
 * digests by design (see the limiter), and an IP is a bystander's address as
 * often as an attacker's — the useful signal is "this family is being hammered,
 * this many times, until this time", and the account behind it is reachable
 * through the failed-login list below.
 */
const THROTTLE_FAMILIES: { prefix: string; label: string }[] = [
  { prefix: "login-email", label: "התחברות לחשבון מסוים" },
  { prefix: "login-ip", label: "התחברות מכתובת מסוימת" },
  { prefix: "register", label: "הרשמות מכתובת" },
  { prefix: "google", label: "התחברות Google" },
  { prefix: "chpw", label: "שינוי סיסמה" },
  { prefix: "verify-token", label: "מימוש טוקן אימות" },
  { prefix: "verify-resend", label: "שליחת מייל אימות מחדש" },
  { prefix: "verify-mail-to", label: "מיילים לנמען אחד" },
  { prefix: "msg-send", label: "שליחת הודעות" },
  { prefix: "preflight", label: "פתיחת הזמנת יהלומים" },
  { prefix: "capture", label: "סגירת תשלום" },
];

export async function getHotThrottles(now: Date, take = 12): Promise<ThrottleRow[]> {
  const rows = await prisma.rateLimitBucket.findMany({
    where: { resetAt: { gt: now }, count: { gte: 3 } },
    orderBy: { count: "desc" },
    take,
  });

  return rows.map((row) => {
    const family = THROTTLE_FAMILIES.find((f) => row.key.startsWith(f.prefix));
    const subject = row.key.slice((family?.prefix.length ?? 0) + 1);
    return {
      family: family?.prefix ?? "other",
      label: family?.label ?? row.key.split(":")[0],
      // Digests and IPs alike are truncated: enough to tell two subjects apart
      // across a refresh, not enough to be a list of anyone's addresses.
      subject: subject.length > 10 ? `${subject.slice(0, 10)}…` : subject,
      count: row.count,
      resetAt: row.resetAt,
    };
  });
}

export interface FailedLoginRow {
  userId: string;
  name: string;
  email: string;
  failedLogins: number;
  lockedUntil: Date | null;
}

/** Accounts currently carrying failed logins — the other half of the picture. */
export async function getFailedLogins(take = 10): Promise<FailedLoginRow[]> {
  const users = await prisma.user.findMany({
    where: { failedLogins: { gt: 0 } },
    orderBy: { failedLogins: "desc" },
    take,
    select: {
      id: true,
      name: true,
      email: true,
      failedLogins: true,
      lockedUntil: true,
    },
  });
  return users.map((u) => ({ userId: u.id, ...u }));
}

/* ------------------------------ anomalies ------------------------------ */

export interface AnomalyRow {
  empireId: string;
  name: string;
  value: number;
  /** Second figure the row is judged against (the ceiling, or what was paid). */
  against: number;
  /** True when the row is outside what the design says is reachable. */
  flagged: boolean;
  note: string;
}

/**
 * Turns burned on raids and spy runs in the window, against what a day of play
 * can actually produce.
 *
 * This is the single most useful exploit signal the game can compute. Turns are
 * the only rate limit on attacking, every path that mints them is deliberately
 * capped, and every previous economy exploit found in this codebase — the 144×
 * wings, the season-pass farm — showed up first as somebody acting far more
 * often than the clock allows. A player over the ceiling either bought turn
 * packages (visible in their purchase history) or found something.
 */
export async function getTurnBurn(
  now: Date,
  dailyTurnCeiling: number,
  take = 10
): Promise<AnomalyRow[]> {
  const since = windowStart(now);
  const [battles, spies] = await Promise.all([
    prisma.battleReport.groupBy({
      by: ["attackerEmpireId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.spyReport.groupBy({
      by: ["attackerEmpireId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const spent = new Map<string, number>();
  for (const r of battles) {
    spent.set(
      r.attackerEmpireId,
      (spent.get(r.attackerEmpireId) ?? 0) + r._count._all * ATTACK_TURN_COST
    );
  }
  for (const r of spies) {
    spent.set(
      r.attackerEmpireId,
      (spent.get(r.attackerEmpireId) ?? 0) + r._count._all * SPY_TURN_COST
    );
  }

  const top = [...spent.entries()].sort((a, b) => b[1] - a[1]).slice(0, take);
  if (top.length === 0) return [];

  const names = await empireNames(top.map(([id]) => id));
  return top.map(([empireId, value]) => ({
    empireId,
    name: names.get(empireId) ?? "—",
    value,
    against: dailyTurnCeiling,
    flagged: value > dailyTurnCeiling,
    note:
      value > dailyTurnCeiling
        ? "מעל מה שיום שלם של תורות מייצר — בדוק רכישות חבילות תורות"
        : "בתוך התקרה",
  }));
}

/**
 * Diamonds held against diamonds actually paid for.
 *
 * Diamonds are the real-money currency, so a large balance with nothing bought
 * behind it is the shape a minted-currency exploit would take. It is not proof
 * on its own — the wheel pays diamonds, admin gifts pay diamonds, and the
 * founding grant is free — which is why the row shows both numbers and flags
 * only the gap rather than the balance.
 */
export async function getDiamondGap(
  freeGrantAllowance: number,
  take = 10
): Promise<AnomalyRow[]> {
  const empires = await prisma.empire.findMany({
    where: { diamonds: { gt: freeGrantAllowance } },
    orderBy: { diamonds: "desc" },
    take,
    select: { id: true, name: true, diamonds: true, userId: true },
  });
  if (empires.length === 0) return [];

  const paid = await prisma.diamondPurchase.groupBy({
    by: ["userId"],
    where: { status: "PAID", userId: { in: empires.map((e) => e.userId) } },
    _sum: { diamonds: true },
  });
  const paidBy = new Map(paid.map((p) => [p.userId, p._sum.diamonds ?? 0]));

  return empires.map((e) => {
    const bought = paidBy.get(e.userId) ?? 0;
    const unexplained = Math.floor(e.diamonds) - bought;
    return {
      empireId: e.id,
      name: e.name,
      value: Math.floor(e.diamonds),
      against: bought,
      flagged: unexplained > freeGrantAllowance,
      note:
        unexplained > freeGrantAllowance
          ? `${unexplained.toLocaleString("he-IL")} ללא רכישה — גלגל, מתנות אדמין, או משהו אחר`
          : "מוסבר ברכישות ובמענק הפתיחה",
    };
  });
}

/* ------------------------------ errors ------------------------------ */

export interface ErrorRow {
  id: string;
  source: string;
  message: string;
  path: string | null;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

/**
 * Recent application errors, newest occurrence first.
 *
 * Deduplicated at write time by (source, message) — see server/errorLog — so a
 * bad deploy shows up as one row with a big counter rather than ten thousand
 * rows that bury the four other bugs underneath it. The counter is the signal:
 * a `count` of 1 is a curiosity, a `count` of 400 is an outage.
 */
export async function getRecentErrors(take = 15): Promise<ErrorRow[]> {
  const rows = await prisma.errorLog.findMany({
    orderBy: { lastSeen: "desc" },
    take,
    select: {
      id: true,
      source: true,
      message: true,
      path: true,
      count: true,
      createdAt: true,
      lastSeen: true,
    },
  });
  return rows.map(({ createdAt, ...r }) => ({ ...r, firstSeen: createdAt }));
}

/** Errors recorded in the window — the number the header alerts on. */
export async function countErrors(now: Date): Promise<number> {
  const rows = await prisma.errorLog.aggregate({
    where: { lastSeen: { gte: windowStart(now) } },
    _sum: { count: true },
  });
  return rows._sum.count ?? 0;
}

/* ------------------------------ live feed ------------------------------ */

export type FeedKind =
  | "battle"
  | "spy"
  | "boss"
  | "purchase"
  | "signup"
  | "guild";

export interface FeedItem {
  id: string;
  kind: FeedKind;
  at: Date;
  text: string;
  /** Admin-side link to the subject, when there is one worth opening. */
  href: string | null;
}

async function empireNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.empire.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((r) => [r.id, r.name]));
}

/**
 * One chronological stream of everything that happened, newest first.
 *
 * Assembled from six tables rather than a single events table because the game
 * has no such table — adding one would mean a write on every action for the
 * benefit of one screen. Each source is capped before the merge, so the cost is
 * fixed however busy the game gets; the merge then cuts to `take`.
 */
export async function getFeed(now: Date, take = 40): Promise<FeedItem[]> {
  const since = windowStart(now, 72);
  const per = Math.max(take, 20);

  const [battles, spies, bosses, purchases, signups, joins] = await Promise.all([
    prisma.battleReport.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: per,
      select: {
        id: true,
        createdAt: true,
        attackerEmpireId: true,
        defenderEmpireId: true,
        winnerEmpireId: true,
        stolenGold: true,
      },
    }),
    prisma.spyReport.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: per,
      select: {
        id: true,
        createdAt: true,
        attackerEmpireId: true,
        defenderEmpireId: true,
        success: true,
      },
    }),
    prisma.bossFight.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: per,
      select: { id: true, createdAt: true, empireId: true, bossKey: true, victory: true },
    }),
    prisma.diamondPurchase.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: per,
      select: {
        id: true,
        createdAt: true,
        empireName: true,
        diamonds: true,
        priceIls: true,
        status: true,
        isTest: true,
      },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: per,
      select: {
        id: true,
        createdAt: true,
        name: true,
        emailVerified: true,
        empire: { select: { name: true } },
      },
    }),
    prisma.guildMember.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: per,
      select: {
        id: true,
        createdAt: true,
        empire: { select: { name: true } },
        guild: { select: { name: true } },
      },
    }),
  ]);

  const names = await empireNames([
    ...battles.flatMap((b) => [b.attackerEmpireId, b.defenderEmpireId]),
    ...spies.flatMap((s) => [s.attackerEmpireId, s.defenderEmpireId]),
    ...bosses.map((b) => b.empireId),
  ]);
  const who = (id: string) => names.get(id) ?? "—";
  const gold = (n: number) => Math.floor(n).toLocaleString("he-IL");

  const items: FeedItem[] = [
    ...battles.map((b) => ({
      id: `b${b.id}`,
      kind: "battle" as const,
      at: b.createdAt,
      text:
        b.winnerEmpireId === b.attackerEmpireId
          ? `${who(b.attackerEmpireId)} הביס את ${who(b.defenderEmpireId)}${
              b.stolenGold > 0 ? ` ובזז ${gold(b.stolenGold)} זהב` : " (בלי שלל)"
            }`
          : `${who(b.defenderEmpireId)} הדף התקפה של ${who(b.attackerEmpireId)}`,
      href: null,
    })),
    ...spies.map((s) => ({
      id: `s${s.id}`,
      kind: "spy" as const,
      at: s.createdAt,
      text: s.success
        ? `${who(s.attackerEmpireId)} ריגל בהצלחה אחרי ${who(s.defenderEmpireId)}`
        : `${who(s.attackerEmpireId)} נתפס מרגל אצל ${who(s.defenderEmpireId)}`,
      href: null,
    })),
    ...bosses.map((b) => ({
      id: `k${b.id}`,
      kind: "boss" as const,
      at: b.createdAt,
      text: `${who(b.empireId)} ${b.victory ? "הפיל את" : "נכשל מול"} בוס העיר`,
      href: null,
    })),
    ...purchases.map((p) => ({
      id: `p${p.id}`,
      kind: "purchase" as const,
      at: p.createdAt,
      text: `${p.empireName ?? "—"} — ${p.diamonds.toLocaleString("he-IL")} יהלומים ב-₪${p.priceIls.toFixed(2)} · ${p.status}${p.isTest ? " (בדיקה)" : ""}`,
      href: "/admin/purchases",
    })),
    ...signups.map((u) => ({
      id: `u${u.id}`,
      kind: "signup" as const,
      at: u.createdAt,
      text: `נרשם: ${u.empire?.name ?? u.name}${u.emailVerified ? "" : " — עדיין לא אימת מייל"}`,
      href: `/admin/users/${u.id}`,
    })),
    ...joins.map((m) => ({
      id: `g${m.id}`,
      kind: "guild" as const,
      at: m.createdAt,
      text: `${m.empire.name} הצטרף לברית ${m.guild.name}`,
      href: "/admin/guilds",
    })),
  ];

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take);
}
