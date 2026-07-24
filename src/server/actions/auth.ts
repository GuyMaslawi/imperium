"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSessionUserId } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { verifyGoogleIdToken } from "@/lib/google";
import { newEmpireData } from "@/lib/game/createEmpire";
import { getTunables } from "@/lib/game/config";

export interface AuthState {
  error?: string;
}

/**
 * Create the fresh empire for `userId` inside a transaction, mapping the empire
 * name unique-constraint hit (P2002) to a friendly error. Shared by the
 * password register flow and the Google onboarding flow. Returns `null` on
 * success, or an `AuthState` with the error message to surface.
 */
async function createEmpireForUser(
  userId: string,
  empireName: string
): Promise<AuthState | null> {
  const [activeSeason, tunables] = await Promise.all([
    prisma.gameSeason.findFirst({ where: { isActive: true }, select: { id: true } }),
    getTunables(),
  ]);
  try {
    await prisma.empire.create({
      data: newEmpireData(userId, empireName, activeSeason?.id, tunables.starting),
    });
  } catch (e) {
    if (e && typeof e === "object" && (e as { code?: string }).code === "P2002") {
      return { error: "שם האימפריה כבר תפוס, בחר שם אחר" };
    }
    return { error: "אירעה שגיאה ביצירת האימפריה, נסה שוב" };
  }
  return null;
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "שם חייב להכיל לפחות 2 תווים").max(40),
  empireName: z.string().trim().min(2, "שם האימפריה חייב להכיל לפחות 2 תווים").max(40),
  email: z.string().trim().toLowerCase().email("כתובת אימייל לא תקינה"),
  password: z.string().min(8, "סיסמה חייבת להכיל לפחות 8 תווים").max(100),
});

export async function register(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  // Throttle mass account/empire creation from one origin (resource exhaustion,
  // empire-name squatting). Generous enough not to hinder a real person.
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return { error: "יותר מדי נסיונות הרשמה. נסה שוב מאוחר יותר." };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    empireName: formData.get("empireName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { name, empireName, email, password } = parsed.data;

  // No pre-flight "does this email exist?" query: it was both a TOCTOU race with
  // the insert and an enumeration oracle (a fast email-taken reply, returned
  // before the bcrypt hash below, told an attacker which emails are registered
  // purely from latency). We always hash and attempt the insert, letting the
  // unique constraints be the single source of truth (P2002 handling below), so
  // both the taken and free paths do the same work. (The friendly "email taken"
  // message is still returned on the constraint hit — full enumeration hardening
  // would need out-of-band email verification, which the app has no infra for.)
  const passwordHash = await bcrypt.hash(password, 10);

  const [activeSeason, tunables] = await Promise.all([
    prisma.gameSeason.findFirst({ where: { isActive: true }, select: { id: true } }),
    getTunables(),
  ]);

  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash, name },
      });
      await tx.empire.create({
        data: newEmpireData(created.id, empireName, activeSeason?.id, tunables.starting),
      });
      return created;
    });
  } catch (e) {
    // The pre-checks above are not atomic with the insert; a concurrent signup
    // can still trip the unique constraints on User.email / Empire.name. Map the
    // Prisma P2002 to the same friendly message instead of crashing.
    if (e && typeof e === "object" && (e as { code?: string }).code === "P2002") {
      const target = String((e as { meta?: { target?: unknown } }).meta?.target ?? "");
      if (target.includes("name")) return { error: "שם האימפריה כבר תפוס, בחר שם אחר" };
      return { error: "כתובת האימייל כבר רשומה במערכת" };
    }
    return { error: "אירעה שגיאה בהרשמה, נסה שוב" };
  }

  await createSession(user.id, user.tokenVersion);
  redirect("/game/base");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("כתובת אימייל לא תקינה"),
  password: z.string().min(1, "יש להזין סיסמה"),
});

// A valid bcrypt hash (cost 10) of a throwaway string. When no account matches
// the email we still run a bcrypt.compare against this so the response takes the
// same time as a real password check — otherwise an attacker could tell which
// emails are registered purely from login latency (the compare is skipped for a
// missing user via short-circuit).
const LOGIN_TIMING_DUMMY_HASH =
  "$2b$10$e3STZXV8u3ZN76vG9DTWbOdwJq4HByWmLRugxd/ULnd.vXxy/R2V2";

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  // Two-axis throttle against online brute force: a broad per-IP cap (a single
  // origin hammering many accounts) and a tighter per-email cap (many origins
  // targeting one account). Either tripping refuses the attempt without a DB or
  // bcrypt round, so throttled traffic stays cheap.
  const ip = await clientIp();
  if (!rateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000)) {
    return { error: "יותר מדי נסיונות התחברות. נסה שוב מאוחר יותר." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { email, password } = parsed.data;

  if (!rateLimit(`login-email:${email}`, 10, 15 * 60 * 1000)) {
    return { error: "יותר מדי נסיונות התחברות לחשבון זה. נסה שוב מאוחר יותר." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always run a bcrypt.compare (against a dummy hash when the user is missing)
  // so both branches cost the same — no account-enumeration timing side-channel.
  const passwordOk = await bcrypt.compare(
    password,
    user?.passwordHash ?? LOGIN_TIMING_DUMMY_HASH
  );
  if (!user || !passwordOk) {
    return { error: "אימייל או סיסמה שגויים" };
  }
  if (user.bannedAt) {
    return { error: "החשבון נחסם על ידי ההנהלה" };
  }

  await createSession(user.id, user.tokenVersion);
  redirect("/game/base");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/**
 * Sign in (or sign up) with a Google Identity Services credential (ID token).
 *
 * Flow: verify the token server-side, then resolve the account by Google id;
 * failing that, link to an existing password account with the same *verified*
 * email; failing that, create a new password-less account. A fresh account has
 * no empire yet, so we route it to /onboarding to name its empire; returning
 * users go straight to the game. Redirects on success (throws NEXT_REDIRECT);
 * returns an `AuthState` only on failure.
 */
export async function googleSignIn(credential: string): Promise<AuthState> {
  const ip = await clientIp();
  if (!rateLimit(`google:${ip}`, 20, 15 * 60 * 1000)) {
    return { error: "יותר מדי נסיונות התחברות. נסה שוב מאוחר יותר." };
  }

  if (typeof credential !== "string" || !credential) {
    return { error: "התחברות Google נכשלה, נסה שוב" };
  }

  const identity = await verifyGoogleIdToken(credential);
  if (!identity) {
    return { error: "אימות מול Google נכשל, נסה שוב" };
  }
  // Only trust identities Google has verified — an unverified email could belong
  // to someone else and would let an attacker link into their account below.
  if (!identity.emailVerified) {
    return { error: "כתובת האימייל של חשבון Google אינה מאומתת" };
  }

  const name = identity.name.slice(0, 40);

  // 1) Known Google account → straight login.
  let user = await prisma.user.findUnique({ where: { googleId: identity.googleId } });

  // 2) No Google link yet, but a (password) account owns this verified email →
  //    link the Google identity onto it so both sign-in methods reach one empire.
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: identity.googleId,
          image: byEmail.image ?? identity.picture ?? null,
        },
      });
    }
  }

  // 3) Brand-new user → create a password-less account (no empire yet).
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          email: identity.email,
          name,
          googleId: identity.googleId,
          image: identity.picture ?? null,
        },
      });
    } catch (e) {
      // A concurrent Google sign-in for the same email/sub can still trip the
      // unique constraints; re-resolve rather than crash.
      if (e && typeof e === "object" && (e as { code?: string }).code === "P2002") {
        user =
          (await prisma.user.findUnique({ where: { googleId: identity.googleId } })) ??
          (await prisma.user.findUnique({ where: { email: identity.email } }));
      }
      if (!user) return { error: "אירעה שגיאה בהרשמה, נסה שוב" };
    }
  }

  if (user.bannedAt) {
    return { error: "החשבון נחסם על ידי ההנהלה" };
  }

  await createSession(user.id, user.tokenVersion);

  // Route by whether the account already has an empire.
  const empire = await prisma.empire.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  redirect(empire ? "/game/base" : "/onboarding");
}

const onboardingSchema = z.object({
  empireName: z.string().trim().min(2, "שם האימפריה חייב להכיל לפחות 2 תווים").max(40),
});

/**
 * Create the empire for the currently-signed-in user who doesn't have one yet
 * (the Google onboarding step). Guards against being called by an unauthenticated
 * user or one who already owns an empire.
 */
export async function createEmpireForCurrentUser(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const existing = await prisma.empire.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) redirect("/game/base");

  const parsed = onboardingSchema.safeParse({ empireName: formData.get("empireName") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const err = await createEmpireForUser(userId, parsed.data.empireName);
  if (err) return err;

  redirect("/game/base");
}
