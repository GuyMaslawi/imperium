"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdmin } from "@/lib/admin";
import { isBanned } from "@/lib/ban";
import {
  clearImpersonationReturn,
  createSession,
  destroySession,
  readImpersonationReturn,
  setImpersonationReturn,
} from "@/lib/auth";
import type { AdminActionState } from "@/server/actions/admin";

/**
 * "Sign in as this player" — the last thing a per-player admin console needs
 * that editing rows cannot give: seeing and pressing exactly what the player
 * sees and presses.
 *
 * It lives in its own module rather than in admin.ts because only half of it is
 * an admin action: `returnToAdmin` runs while the session belongs to the
 * *player*, so it cannot sit behind `requireAdmin` — its authority comes from
 * the signed return ticket instead.
 *
 * What it deliberately does NOT do is mark the resulting gameplay. Everything
 * done while impersonating is written as the player, indistinguishable from
 * their own actions; the audit log records the entry and the exit, and that is
 * the whole trail. Use it to reproduce and to verify, not to play for someone.
 */
export async function impersonatePlayer(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      bannedAt: true,
      bannedUntil: true,
      emailVerified: true,
      tokenVersion: true,
      empire: { select: { id: true } },
    },
  });
  if (!target) return { error: "המשתמש לא נמצא" };
  // Same rule as every other target-scoped action: no admin acts on a peer.
  if (target.role === "ADMIN" && target.id !== admin.id) {
    return { error: "אין הרשאה להתחזות לחשבון אדמין אחר" };
  }
  // A banned or unverified account is bounced straight back out of /game, and
  // a ban destroys the session on the way — which would strand the admin with
  // no session and no obvious way back. Refuse rather than trap.
  if (isBanned(target)) return { error: "המשתמש בבאן — הסר את הבאן תחילה" };
  if (!target.emailVerified) return { error: "האימייל של המשתמש לא אומת" };
  if (!target.empire) return { error: "למשתמש אין אימפריה" };

  await setImpersonationReturn(admin.id, await currentTokenVersion(admin.id));
  await createSession(target.id, target.tokenVersion);
  await logAdmin(admin, {
    action: "user.impersonate_start",
    targetType: "user",
    targetId: target.id,
    summary: `כניסה בתור ${target.email}`,
  });

  redirect("/game/base");
}

/**
 * Hand the session back to the admin who parked it. Reachable by anyone holding
 * the ticket cookie — which is the point, since the caller is signed in as the
 * player at that moment — but it only ever restores the id the *signed* ticket
 * names, and only while that account is still an unbanned admin.
 */
export async function returnToAdmin(): Promise<void> {
  const ticket = await readImpersonationReturn();
  await clearImpersonationReturn();
  if (!ticket) redirect("/login");

  const adminUser = await prisma.user.findUnique({
    where: { id: ticket.userId },
    select: {
      id: true,
      email: true,
      role: true,
      bannedAt: true,
      bannedUntil: true,
      tokenVersion: true,
    },
  });

  // The ticket is only as good as the account it names still being an admin —
  // and its `ver` pins it to that account's sessions at the time it was issued,
  // so a password reset or ban mid-impersonation revokes the way back too.
  const usable =
    adminUser != null &&
    adminUser.role === "ADMIN" &&
    !isBanned(adminUser) &&
    adminUser.tokenVersion === ticket.tokenVersion;

  if (!usable) {
    await destroySession();
    redirect("/login");
  }

  await createSession(adminUser.id, adminUser.tokenVersion);
  await logAdmin(adminUser, {
    action: "user.impersonate_end",
    targetType: "user",
    targetId: adminUser.id,
    summary: "חזרה לחשבון האדמין",
  });

  redirect("/admin/users");
}

/** The admin's live token version — the ticket must match it to be redeemed. */
async function currentTokenVersion(userId: string): Promise<number> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  return row?.tokenVersion ?? 0;
}
