import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { CHAT_THREAD_LIST_MAX, TYPING_LIMIT } from "@/lib/game/chat";

/**
 * The chat's database-shaped behaviour.
 *
 * Three things here cannot be tested anywhere else. The conversation list is a
 * `DISTINCT ON` over a subquery that folds both directions of a thread into one
 * `partner` column — an in-memory fake would be testing the fake. Read receipts
 * are an `updateMany` fired only when the loaded page actually holds an unread
 * inbound line, so "does opening a thread clear exactly that thread's badge"
 * is a question about rows. And moderation hides rather than deletes, which is
 * only meaningful if every read path filters it back out.
 *
 * The session is the one thing stubbed: these actions read the caller's empire
 * from the auth layer, which needs a request. Everything below it is real.
 */

let currentEmpireId: string | null = null;
let currentRole: "USER" | "ADMIN" = "USER";
const currentUserId = "chat-test-admin";

vi.mock("@/lib/auth", () => ({
  getActiveEmpireId: async () => currentEmpireId,
}));

vi.mock("@/lib/admin", () => ({
  getSessionUser: async () => ({
    id: currentUserId,
    email: "chat-test@example.test",
    name: "chat-test",
    role: currentRole,
    bannedAt: null,
    bannedUntil: null,
    emailVerified: new Date(),
  }),
  logAdmin: async () => {},
}));

const {
  getChatPulse,
  getChatRoster,
  getChatThread,
  getChatThreads,
  getGlobalChat,
  hideChatMessage,
  searchChatPlayers,
  sendChat,
  setTyping,
} = await import("@/server/actions/chat");

const prisma = new PrismaClient();
const TAG = `ch${Date.now().toString(36)}`;

let alpha: { id: string; name: string };
let beta: { id: string; name: string };
/** A sender of its own, so the burst budget the other two are spending does not
 *  answer a test about addressing rules. */
let gamma: { id: string; name: string };
/** Two empires that never poll anything: presence is stamped by the act of
 *  reading the chat, so an "offline" fixture has to be one no other test has
 *  touched. Sharing one would make these assertions depend on file order. */
let delta: { id: string; name: string };
let epsilon: { id: string; name: string };

async function makeEmpire(label: string) {
  const user = await prisma.user.create({
    data: {
      email: `${label}@${TAG}.test`,
      name: label,
      passwordHash: "x",
      emailVerified: new Date(),
    },
  });
  return prisma.empire.create({
    data: { userId: user.id, name: `${TAG}-${label}`, gold: 0, turns: 0, citizens: 0 },
    select: { id: true, name: true },
  });
}

beforeAll(async () => {
  alpha = await makeEmpire("alpha");
  beta = await makeEmpire("beta");
  gamma = await makeEmpire("gamma");
  delta = await makeEmpire("delta");
  epsilon = await makeEmpire("epsilon");
});

afterAll(async () => {
  // Deleting the senders only nulls the FK — the lines themselves survive on
  // purpose (that is the point of `senderName`), so the room has to be swept
  // too or every run leaves its fixtures in the live transcript.
  await prisma.chatMessage.deleteMany({ where: { body: { startsWith: TAG } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  await prisma.rateLimitBucket.deleteMany({
    where: { key: { contains: alpha?.id ?? TAG } },
  });
  await prisma.$disconnect();
});

/** The room is shared by every test run against this database, so assertions
 *  look for this run's own lines rather than at the tail as a whole. */
const mine = <T extends { body: string }>(lines: T[], body: string) =>
  lines.filter((line) => line.body === body);

describe("the public room", () => {
  it("carries a line to another player, attributed and flagged", async () => {
    const body = `${TAG} the gates are open`;
    currentEmpireId = alpha.id;
    const sent = await sendChat({ body });
    expect(sent).toHaveProperty("line");

    currentEmpireId = beta.id;
    const seen = mine((await getGlobalChat()).lines, body);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.name).toBe(alpha.name);
    // The viewer decides what "mine" means — the same row is both.
    expect(seen[0]!.mine).toBe(false);

    currentEmpireId = alpha.id;
    expect(mine((await getGlobalChat()).lines, body)[0]!.mine).toBe(true);
  });

  it("carries emoji through the database intact", async () => {
    // Postgres, Prisma and the sanitiser all sit between the keyboard and the
    // pane; a compound emoji is the thing that breaks if any of them mangles
    // surrogate pairs or strips the joiner.
    const body = `${TAG} ⚔️👑 נתראה בקרב 👨‍👩‍👧`;
    currentEmpireId = gamma.id;
    const sent = await sendChat({ body });
    if (!("line" in sent)) throw new Error(sent.error);
    expect(sent.line.body).toBe(body);

    currentEmpireId = beta.id;
    expect(mine((await getGlobalChat()).lines, body)).toHaveLength(1);
  });

  it("refuses the same line twice in a row", async () => {
    const body = `${TAG} repeat`;
    currentEmpireId = alpha.id;
    expect(await sendChat({ body })).toHaveProperty("line");
    expect(await sendChat({ body })).toHaveProperty("error");
    expect(mine((await getGlobalChat()).lines, body)).toHaveLength(1);
  });
});

describe("private conversations", () => {
  it("badges the recipient, lists the thread, and clears on open", async () => {
    const body = `${TAG} meet me at the wall`;
    currentEmpireId = alpha.id;
    const sent = await sendChat({ body, toEmpireId: beta.id });
    expect(sent).toHaveProperty("line");

    // A private line never reaches the room.
    currentEmpireId = beta.id;
    expect(mine((await getGlobalChat()).lines, body)).toHaveLength(0);

    expect((await getChatPulse()).unread).toBe(1);

    const threads = await getChatThreads();
    const thread = threads.find((t) => t.empireId === alpha.id);
    expect(thread).toBeDefined();
    expect(thread!.preview).toBe(body);
    expect(thread!.unread).toBe(1);

    // Opening the thread is what marks it read.
    const view = await getChatThread(alpha.id);
    expect(view.partner?.id).toBe(alpha.id);
    expect(mine(view.lines, body)).toHaveLength(1);
    expect((await getChatPulse()).unread).toBe(0);

    // The sender's own copy of the conversation reads the same both ways.
    currentEmpireId = alpha.id;
    const back = await getChatThread(beta.id);
    expect(mine(back.lines, body)).toHaveLength(1);
    expect(back.lines.at(-1)!.mine).toBe(true);
    expect((await getChatPulse()).unread).toBe(0);
  });

  it("will not deliver to yourself", async () => {
    currentEmpireId = gamma.id;
    expect(await sendChat({ body: `${TAG} note`, toEmpireId: gamma.id })).toEqual({
      error: "אי אפשר לשלוח הודעה לעצמך",
    });
  });
});

describe("moderation", () => {
  it("takes a hidden line out of every read path", async () => {
    const body = `${TAG} to be removed`;
    currentEmpireId = beta.id;
    const sent = await sendChat({ body });
    if (!("line" in sent)) throw new Error(sent.error);

    currentRole = "USER";
    expect(await hideChatMessage(sent.line.id)).toEqual({ error: "אין הרשאה" });
    expect(mine((await getGlobalChat()).lines, body)).toHaveLength(1);

    currentRole = "ADMIN";
    expect(await hideChatMessage(sent.line.id)).toEqual({ ok: true });
    expect(mine((await getGlobalChat()).lines, body)).toHaveLength(0);
    // Hidden, not deleted: the audit trail still points at a row.
    expect(
      await prisma.chatMessage.count({ where: { id: sent.line.id } })
    ).toBe(1);
    currentRole = "USER";
  });
});

describe("typing markers", () => {
  it("shows in the room, but never to the typist", async () => {
    currentEmpireId = alpha.id;
    await setTyping(null);

    currentEmpireId = beta.id;
    expect((await getGlobalChat()).typing).toContain(alpha.name);

    currentEmpireId = alpha.id;
    expect((await getGlobalChat()).typing).not.toContain(alpha.name);
  });

  it("stays inside the conversation it was aimed at", async () => {
    currentEmpireId = alpha.id;
    await setTyping(beta.id);

    // The room must not light up because someone is typing a private line…
    currentEmpireId = beta.id;
    expect((await getGlobalChat()).typing).not.toContain(alpha.name);
    // …and the partner it was aimed at is the only one who sees it.
    expect((await getChatThread(alpha.id)).typing).toBe(true);

    currentEmpireId = gamma.id;
    expect((await getChatThread(alpha.id)).typing).toBe(false);
  });

  it("drops the marker as soon as the line is sent", async () => {
    currentEmpireId = beta.id;
    await setTyping(null);
    expect(
      await prisma.chatTyping.count({ where: { empireId: beta.id } })
    ).toBe(1);

    expect(await sendChat({ body: `${TAG} done typing` })).toHaveProperty("line");
    expect(
      await prisma.chatTyping.count({ where: { empireId: beta.id } })
    ).toBe(0);
  });
});

describe("the roster", () => {
  it("lists other players, marks whoever is polling as online, and skips me", async () => {
    // alpha has been polling throughout this file, so its heartbeat is fresh;
    // delta has never read anything.
    currentEmpireId = beta.id;
    const roster = await getChatRoster();
    const seen = new Map(roster.map((p) => [p.id, p]));

    expect(seen.has(beta.id)).toBe(false);
    expect(seen.get(alpha.id)?.online).toBe(true);
    expect(seen.get(delta.id)?.online).toBe(false);
    // Online first: the whole point of the ordering.
    expect(roster.findIndex((p) => p.id === alpha.id)).toBeLessThan(
      roster.findIndex((p) => p.id === delta.id)
    );
  });

  it("stamps presence on the poll a player makes without opening anything", async () => {
    currentEmpireId = epsilon.id;
    expect(
      (await prisma.empire.findUnique({
        where: { id: epsilon.id },
        select: { lastSeenAt: true },
      }))!.lastSeenAt
    ).toBeNull();

    await getChatPulse();

    currentEmpireId = beta.id;
    const roster = await getChatRoster();
    expect(roster.find((p) => p.id === epsilon.id)?.online).toBe(true);
  });
});

describe("finding someone to write to", () => {
  it("matches by name and never returns the searcher", async () => {
    currentEmpireId = alpha.id;
    const found = await searchChatPlayers(TAG);
    expect(found.map((p) => p.id)).toContain(beta.id);
    expect(found.map((p) => p.id)).not.toContain(alpha.id);
  });

  it("stays quiet until the query is long enough to mean something", async () => {
    currentEmpireId = alpha.id;
    expect(await searchChatPlayers("a")).toEqual([]);
  });

  it("does not answer 'is this player at the keyboard right now'", async () => {
    // From the 2026-07-30 pentest. Search is a lookup *by name*, so reporting
    // presence there answered a targeted question about any empire in the game,
    // free and unlimited — sharper intelligence than a spy mission, which costs
    // turns, in a game where knowing a rival is away means their gold is not
    // banked and they will not re-shield. The roster and an open thread still
    // carry the dot; search discloses nothing.
    currentEmpireId = alpha.id;
    await getChatPulse(); // alpha's own heartbeat is now definitely fresh

    currentEmpireId = beta.id;
    const found = await searchChatPlayers(`${TAG}-alpha`);
    expect(found.map((p) => p.id)).toContain(alpha.id);
    for (const hit of found) expect(hit.online).toBeUndefined();

    // The roster, asked about the same empire in the same breath, still says so —
    // this is a change to what search discloses, not to presence itself.
    const roster = await getChatRoster();
    expect(roster.find((p) => p.id === alpha.id)?.online).toBe(true);
  });
});

describe("hostile input on the polled paths", () => {
  it("ignores a poll cursor that does not parse instead of failing the read", async () => {
    // `sinceMs` is client-supplied and went straight into `new Date()`. NaN, a
    // string, an object or anything past the Date range produced an *invalid* Date,
    // which Prisma rejects — so a garbage cursor turned a poll into a caught
    // exception, an error-log row and an empty pane. It now degrades to "send me
    // the tail", which is what a client with no cursor asks for.
    currentEmpireId = alpha.id;
    await sendChat({ body: `cursor probe ${TAG}`, toEmpireId: null });

    const garbage = [
      NaN,
      Infinity,
      -Infinity,
      8.64e15 + 1,
      -1,
      0,
      "not-a-number",
      {},
      [],
      true,
      null,
      undefined,
    ];

    for (const cursor of garbage) {
      const room = await getGlobalChat(cursor as number);
      // A refused cursor must read like no cursor at all: the tail, not nothing.
      expect(room.lines.length).toBeGreaterThan(0);

      const thread = await getChatThread(beta.id, cursor as number);
      expect(thread.partner).not.toBeNull();
    }
  });

  it("refuses an unbounded partner id without touching the database", async () => {
    currentEmpireId = alpha.id;
    const view = await getChatThread("x".repeat(4096));
    expect(view.partner).toBeNull();
    expect(view.lines).toEqual([]);
  });

  it("bounds the typing marker's addressee and its rate", async () => {
    // The one write path in the chat with no budget on it: two queries a call,
    // called as fast as a client liked, and `ChatTyping.toEmpireId` has no foreign
    // key behind it — so a 4KB "addressee" was stored verbatim.
    currentEmpireId = alpha.id;

    await setTyping("x".repeat(4096));
    const marker = await prisma.chatTyping.findUnique({
      where: { empireId: alpha.id },
      select: { toEmpireId: true },
    });
    // Not a plausible id, so read as the public room rather than stored.
    expect(marker?.toEmpireId).toBeNull();

    // A real addressee still lands.
    await setTyping(beta.id);
    expect(
      (
        await prisma.chatTyping.findUnique({
          where: { empireId: alpha.id },
          select: { toEmpireId: true },
        })
      )?.toEmpireId
    ).toBe(beta.id);

    // And the budget exists: 200 calls cannot all reach the database. The refusal
    // is silent by design — an indicator must never surface an error over the
    // message someone is mid-way through writing.
    const before = await prisma.rateLimitBucket.findUnique({
      where: { key: `chat-typing:${alpha.id}` },
      select: { count: true },
    });
    await Promise.all(Array.from({ length: 200 }, () => setTyping(null)));
    const after = await prisma.rateLimitBucket.findUniqueOrThrow({
      where: { key: `chat-typing:${alpha.id}` },
      select: { count: true },
    });
    expect(after.count).toBeGreaterThan(before?.count ?? 0);
    expect(after.count).toBeLessThanOrEqual(TYPING_LIMIT);
  });
});

describe("the conversation list is bounded in the database", () => {
  it("ships at most CHAT_THREAD_LIST_MAX threads however many strangers write in", async () => {
    // Anyone can add a row to this scan: a conversation appears the moment someone
    // writes to you, there is no way to leave one and there is no block. The
    // newest-first cut therefore has to happen in SQL, not after the fact in JS.
    const mob: { id: string }[] = [];
    for (let i = 0; i < CHAT_THREAD_LIST_MAX + 5; i++) {
      const user = await prisma.user.create({
        data: {
          email: `mob${i}@${TAG}.test`,
          name: `mob${i}`,
          passwordHash: "x",
          emailVerified: new Date(),
        },
      });
      const empire = await prisma.empire.create({
        data: { userId: user.id, name: `${TAG}-mob${i}`, citizens: 0 },
      });
      mob.push(empire);
      // Written directly: this is about the read path, and routing 35 sends
      // through the per-sender burst budget is not what is under test.
      await prisma.chatMessage.create({
        data: {
          channel: "DIRECT",
          senderEmpireId: empire.id,
          senderName: `${TAG}-mob${i}`,
          recipientEmpireId: alpha.id,
          body: `unsolicited ${i}`,
          createdAt: new Date(Date.now() - (CHAT_THREAD_LIST_MAX + 5 - i) * 1_000),
        },
      });
    }

    currentEmpireId = alpha.id;
    const threads = await getChatThreads();
    expect(threads.length).toBe(CHAT_THREAD_LIST_MAX);
    // The cut keeps the newest and drops the oldest — asserted by membership rather
    // than by absolute position, since alpha also holds conversations from the
    // tests above and they are more recent than these seeded ones.
    const listed = threads.map((t) => t.empireId);
    expect(listed).toContain(mob.at(-1)!.id);
    expect(listed).not.toContain(mob[0]!.id);
    // Newest first, throughout.
    for (let i = 1; i < threads.length; i++) {
      expect(threads[i - 1]!.at).toBeGreaterThanOrEqual(threads[i]!.at);
    }
  });
});
