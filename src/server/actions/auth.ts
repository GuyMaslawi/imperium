"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth";
import { newEmpireData } from "@/lib/game/createEmpire";
import { getTunables } from "@/lib/game/config";

export interface AuthState {
  error?: string;
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "שם חייב להכיל לפחות 2 תווים").max(40),
  empireName: z.string().trim().min(2, "שם האימפריה חייב להכיל לפחות 2 תווים").max(40),
  email: z.string().trim().toLowerCase().email("כתובת אימייל לא תקינה"),
  password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים").max(100),
});

export async function register(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
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

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, passwordHash, name },
    });
    await tx.empire.create({
      data: newEmpireData(created.id, empireName, activeSeason?.id, tunables.starting),
    });
    return created;
  });

  await createSession(user.id);
  redirect("/game/base");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("כתובת אימייל לא תקינה"),
  password: z.string().min(1, "יש להזין סיסמה"),
});

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
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
