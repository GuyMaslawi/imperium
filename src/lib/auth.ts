import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { applyPendingUpdates } from "@/lib/game/updates";

const SESSION_COOKIE = "imperium_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSession(
  userId: string,
  tokenVersion: number
): Promise<void> {
  // `ver` pins the session to the user's current tokenVersion. Bumping the
  // column (e.g. on password reset) invalidates every token issued before it,
  // so a leaked cookie can be revoked even though the JWT itself is stateless.
  const token = await new SignJWT({ sub: userId, ver: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const getSessionUserId = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    // Pin the algorithm so verification can only accept the HS256 tokens we
    // issue (defense-in-depth against algorithm-confusion attacks).
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    if (!userId) return null;

    // Reject tokens whose version no longer matches the account's — this is how
    // a stateless JWT gets revoked (password reset bumps tokenVersion). Tokens
    // predating the `ver` claim read as 0, matching the column default, so they
    // stay valid until their own reset. One indexed PK lookup, cached per request.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    if (!user) return null;
    const tokenVer = typeof payload.ver === "number" ? payload.ver : 0;
    if (tokenVer !== user.tokenVersion) return null;

    return userId;
  } catch {
    return null;
  }
});

/**
 * Resolve the logged-in user's empire id for a server action, **enforcing the
 * ban on every action** — not just on page load.
 *
 * Sessions are stateless 30-day JWTs that a ban does not revoke, and
 * `requireEmpire` only runs on `/game/*` page loads. Without this check a user
 * banned mid-session could keep POSTing to server actions (bank, training,
 * wheel, diamond shop, guild, messages…) indefinitely. Returns `null` when the
 * caller is unauthenticated, has no empire, or is banned.
 */
export const getActiveEmpireId = cache(async (): Promise<string | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const empire = await prisma.empire.findUnique({
    where: { userId },
    select: { id: true, user: { select: { bannedAt: true } } },
  });
  if (!empire || empire.user.bannedAt) return null;
  return empire.id;
});

/**
 * Load the logged-in user's empire or redirect to /login.
 * Applies all pending regular/daily updates before returning, so every
 * page sees an up-to-date empire (buildings, army, storages, upgrades, bank).
 */
export const requireEmpire = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const existing = await prisma.empire.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!existing) redirect("/login");
  // Banned users lose all game access.
  if (existing.user.bannedAt) {
    await destroySession();
    redirect("/login");
  }

  const empire = await applyPendingUpdates(existing.id);
  return { ...empire, user: existing.user };
});
