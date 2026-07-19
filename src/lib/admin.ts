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
    select: { id: true, email: true, name: true, role: true, bannedAt: true },
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
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    return { ...user, role: "ADMIN" };
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
  } catch {
    // Losing an audit row must never block the actual admin action.
  }
}
