import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  bannedAt: Date | null;
  /** Null until the address is confirmed. See `purchaseDiamondPackage`. */
  emailVerified: Date | null;
}

/** Emails that are auto-promoted to ADMIN (comma-separated ADMIN_EMAILS env). */
function bootstrapAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** The logged-in user (id/email/name/role/ban), or null if not authenticated. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      bannedAt: true,
      emailVerified: true,
    },
  });
  return user ?? null;
});

/** Whether the current session belongs to an admin (no redirect). */
export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.role === "ADMIN" && !user.bannedAt;
}

/**
 * Require an admin session or redirect away. Lazily promotes a user whose
 * email is in ADMIN_EMAILS the first time they hit an admin route, so the
 * very first admin bootstraps without a manual DB edit.
 */
export const requireAdmin = cache(async (): Promise<SessionUser> => {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.bannedAt) redirect("/login");

  if (user.role !== "ADMIN" && bootstrapAdminEmails().has(user.email.toLowerCase())) {
    // Strictly one-shot: promote only while the system has NO admin at all.
    //
    // Registration never verifies that the registrant owns the address, so
    // without this guard anyone who signs up with an ADMIN_EMAILS address (the
    // owner's is guessable, and ADMIN_EMAILS stays set in the deployed env
    // forever) would be promoted the moment they touched any admin action. The
    // unique constraint on User.email is not a defence — it only holds while
    // that address already has an account, so the hole reopens whenever an
    // ADMIN_EMAILS entry is rotated, added, or its user row deleted.
    // Belt and braces alongside the zero-admin check: the bootstrap is the one
    // place where merely *claiming* an address grants privilege, so require
    // that the claim has actually been proved.
    const claimant = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true },
    });
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount === 0 && claimant?.emailVerified) {
      await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      await logAdmin(user, {
        action: "admin.bootstrap",
        targetType: "user",
        targetId: user.id,
        summary: `Bootstrapped first admin from ADMIN_EMAILS (${user.email})`,
      });
      return { ...user, role: "ADMIN" };
    }
  }

  if (user.role !== "ADMIN") redirect("/game/base");
  return user;
});

/** Append an entry to the admin audit trail. Best-effort — never throws. */
export async function logAdmin(
  admin: Pick<SessionUser, "id" | "email">,
  entry: {
    action: string;
    targetType?: string;
    targetId?: string;
    summary?: string;
    details?: Prisma.InputJsonValue;
  }
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        summary: entry.summary,
        details: entry.details,
      },
    });
  } catch (e) {
    // Losing an audit row must never block the actual admin action — but a
    // silently dropped row means destructive operations (resetSeason wipes every
    // empire, deleteUser, saveTunables) can complete with no trace at all, so
    // the failure has to be observable somewhere.
    console.error("[admin-audit] failed to record entry", entry.action, e);
  }
}
