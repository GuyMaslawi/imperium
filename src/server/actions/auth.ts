"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { newEmpireData } from "@/lib/game/createEmpire";
import { getTunables } from "@/lib/game/config";

export interface AuthState {
  error?: string;
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

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) return { error: "כתובת האימייל כבר רשומה במערכת" };

  const existingEmpire = await prisma.empire.findUnique({ where: { name: empireName } });
  if (existingEmpire) return { error: "שם האימפריה כבר תפוס, בחר שם אחר" };

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

  await createSession(user.id);
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

  await createSession(user.id);
  redirect("/game/base");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
