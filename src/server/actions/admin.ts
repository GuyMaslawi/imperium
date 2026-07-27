"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type {
  BuildingType,
  EmpireUpgradeType,
  GuildRole,
  HeroItemSlot,
  HeroRarity,
  MessageKind,
  MiniGameType,
  Prisma,
  ResourceStorageType,
  Role,
  WeaponCategory,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdmin } from "@/lib/admin";
import { weaponByKey } from "@/lib/game/weapons";
import { GUILD_AID_MAX_LEVEL, GUILD_CAPACITY_MAX_LEVEL } from "@/lib/game/guild";
import { MINIGAME_TYPE_META } from "@/lib/game/minigame";
import { HERO_MAX_HEALTH } from "@/lib/game/hero";
import {
  DEFAULT_TUNABLES,
  getTunables,
  mergeTunables,
  type GameTunables,
} from "@/lib/game/config";
import { newEmpireData } from "@/lib/game/createEmpire";

export interface AdminActionState {
  error?: string;
  success?: string;
}

/* ------------------------------ helpers ------------------------------ */

/**
 * A user-facing admin error whose message is safe to return to the client.
 * Anything thrown that is NOT an AdminError (Prisma/DB errors, ZodError from a
 * tampered enum field, unexpected runtime failures) is treated as internal and
 * replaced with a generic message by `toErr`, so DB schema/column names and
 * other internals never leak to the admin client.
 */
class AdminError extends Error {}

function toErr(e: unknown): AdminActionState {
  // Next.js control-flow signals (redirect / notFound) are thrown as errors
  // carrying a `digest`. They must propagate so the framework can act on them —
  // swallowing them here would leak a "NEXT_REDIRECT;…" string to the client and
  // silently drop the redirect (e.g. an expired admin session never lands on /login).
  if (
    e &&
    typeof e === "object" &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    ((e as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (e as { digest: string }).digest === "NEXT_NOT_FOUND")
  ) {
    throw e;
  }
  // Only our own AdminError messages are safe to surface. Everything else is
  // an internal failure — log it server-side and return a generic message so
  // no DB/stack internals reach the client.
  if (e instanceof AdminError) return { error: e.message };
  console.error("[admin action]", e);
  return { error: "אירעה שגיאה, נסה שוב" };
}

// Upper bound for any admin-entered number. Prevents a fat-fingered or hostile
// value (e.g. 1e308) from overflowing a column or corrupting the economy; it
// sits well above any legitimate resource total. Applied symmetrically so
// negative inputs are bounded too (callers still Math.max(0, …) where needed).
const ADMIN_NUM_MAX = 1_000_000_000_000; // 1e12

function clampNum(n: number): number {
  return Math.max(-ADMIN_NUM_MAX, Math.min(ADMIN_NUM_MAX, n));
}

/** Read a required numeric form field (finite, bounded). Throws on invalid input. */
function num(formData: FormData, key: string): number {
  const raw = formData.get(key);
  const n = Number(raw);
  if (raw == null || raw === "" || !Number.isFinite(n)) {
    throw new AdminError(`ערך לא תקין בשדה ${key}`);
  }
  return clampNum(n);
}

/** Read an optional numeric field (bounded); returns `fallback` when blank. */
function optNum(formData: FormData, key: string, fallback = 0): number {
  const raw = formData.get(key);
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? clampNum(n) : fallback;
}

/**
 * Guard against peer-admin takeover. There is no super-admin tier, so every
 * admin is otherwise omnipotent over every other admin — one admin could reset
 * another's password, ban them out (locking them at requireAdmin), or delete
 * them. This blocks mutating a target that is *itself* an ADMIN unless it's the
 * caller's own account. Promoting a plain USER to ADMIN stays allowed.
 */
async function assertNotPeerAdmin(
  admin: { id: string },
  targetUserId: string
): Promise<void> {
  if (!targetUserId || targetUserId === admin.id) return;
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  });
  if (target?.role === "ADMIN") {
    throw new AdminError("אין הרשאה לפעול על חשבון אדמין אחר");
  }
}

/**
 * Read a trimmed string field, truncated to `maxLen`.
 *
 * Numbers here are carefully clamped but strings used to be unbounded, so a
 * multi-megabyte broadcast body was `createMany`'d onto every empire in the
 * game in a single call. The default is generous enough for every real field;
 * pass a larger cap explicitly for message bodies.
 */
function str(formData: FormData, key: string, maxLen = 500): string {
  return String(formData.get(key) ?? "")
    .trim()
    .slice(0, maxLen);
}

/**
 * Validate an optional message link. Only internal paths are allowed.
 *
 * Every legitimate value in the codebase is a relative route ("/game/..."), and
 * an admin-authored absolute URL rendered as a trusted in-game link is a
 * broadcast-scale phishing primitive — the message UI presents it as the game's
 * own "view full report" affordance to every player at once.
 *
 * Rather than blocklisting prefixes, resolve the value against a sentinel origin
 * and require that the origin survives. Prefix checks kept missing forms that
 * browsers treat as protocol-relative: `//evil.tld` was caught, but per the
 * WHATWG URL spec a special-scheme URL treats `/\` exactly like `//`, so
 * `/\evil.tld/x` passed the old guard and resolved to `https://evil.tld/x`.
 * `next/link` does not save us there — it classifies the value as local and
 * renders it verbatim, so a ctrl/middle-click hands it straight to the browser.
 */
const HREF_SENTINEL_ORIGIN = "https://href-check.invalid";

function optHref(formData: FormData, key: string): string | null {
  const raw = str(formData, key, 500);
  if (!raw) return null;
  const reject = () => {
    throw new AdminError("קישור חייב להיות נתיב פנימי שמתחיל ב-/");
  };
  if (!raw.startsWith("/")) reject();
  let resolved: URL;
  try {
    resolved = new URL(raw, HREF_SENTINEL_ORIGIN);
  } catch {
    return reject();
  }
  // Anything that steered off the sentinel origin was not an internal path.
  if (resolved.origin !== HREF_SENTINEL_ORIGIN) reject();
  return raw;
}

/**
 * Rows per statement for the broadcast/gift fan-out.
 *
 * These target every empire in the game. As one statement that is a single
 * `IN (…)` list and a single `createMany` with one row per player, which runs
 * into Postgres bind-parameter limits and holds the whole payload in memory
 * once the player count is large. Admin-only, so this is a scaling limit rather
 * than an attacker-reachable one.
 */
const BULK_BATCH_SIZE = 1000;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function revalidateEmpire(userId?: string) {
  revalidatePath("/admin/users");
  if (userId) revalidatePath(`/admin/users/${userId}`);
  // The edited player's own game view must reflect changes immediately.
  revalidatePath("/game", "layout");
}

/**
 * Resolve a broadcast/gift target ("scope") to a concrete list of empire ids.
 * scope: "all" | "season" | "guild" | "empire"; scopeId used by the last three.
 */
async function resolveTargetEmpireIds(scope: string, scopeId: string): Promise<string[]> {
  if (scope === "empire") {
    return scopeId ? [scopeId] : [];
  }
  if (scope === "season") {
    const rows = await prisma.empire.findMany({
      where: { seasonId: scopeId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
  if (scope === "guild") {
    const rows = await prisma.guildMember.findMany({
      where: { guildId: scopeId },
      select: { empireId: true },
    });
    return rows.map((r) => r.empireId);
  }
  // "all"
  const rows = await prisma.empire.findMany({ select: { id: true } });
  return rows.map((r) => r.id);
}

/* ============================================================= */
/*                      USER ACCOUNT ACTIONS                     */
/* ============================================================= */

const roleSchema = z.enum(["USER", "ADMIN"]);

/** Edit a user's name, email and role. */
export async function updateUserAccount(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const userId = str(formData, "userId");
    const name = str(formData, "name");
    const email = str(formData, "email").toLowerCase();
    const role = roleSchema.parse(formData.get("role")) as Role;

    if (name.length < 2) return { error: "שם קצר מדי" };
    if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "אימייל לא תקין" };
    if (userId === admin.id && role !== "ADMIN") {
      return { error: "אי אפשר להסיר לעצמך הרשאות אדמין" };
    }
    // Can't edit (rename / re-email / demote) another admin's account.
    await assertNotPeerAdmin(admin, userId);

    const clash = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
      select: { id: true },
    });
    if (clash) return { error: "האימייל כבר תפוס על ידי משתמש אחר" };

    // Moving an account to a different address invalidates the proof of
    // ownership that was taken for the old one, so re-gate verification and
    // revoke every live session. Otherwise the row stays "verified" for an
    // address nobody has ever confirmed, and whoever was signed in keeps their
    // session across the identity change. This is the only email-mutation path
    // in the app, so it is the only place that invariant can be broken.
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const emailChanged = target != null && target.email !== email;
    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role,
        ...(emailChanged
          ? { emailVerified: null, tokenVersion: { increment: 1 } }
          : {}),
      },
    });
    await logAdmin(admin, {
      action: "user.update",
      targetType: "user",
      targetId: userId,
      summary: `עודכן משתמש ${email} (תפקיד: ${role})`,
    });
    revalidateEmpire(userId);
    return { success: "פרטי המשתמש עודכנו" };
  } catch (e) {
    return toErr(e);
  }
}

/** Ban or unban a user (blocks login and all game access). */
export async function toggleUserBan(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const userId = str(formData, "userId");
    if (userId === admin.id) return { error: "אי אפשר לחסום את עצמך" };
    await assertNotPeerAdmin(admin, userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { bannedAt: true, email: true },
    });
    if (!user) return { error: "המשתמש לא נמצא" };

    const banned = user.bannedAt == null;
    await prisma.user.update({
      where: { id: userId },
      data: {
        bannedAt: banned ? new Date() : null,
        // Bumping tokenVersion invalidates every JWT already issued to this
        // account, so the ban takes effect on the next request instead of
        // relying on each call site to re-read bannedAt. Sessions are stateless
        // and last 30 days; any path that checks only the signature would
        // otherwise keep serving a banned user until the token expired.
        ...(banned ? { tokenVersion: { increment: 1 } } : {}),
      },
    });
    await logAdmin(admin, {
      action: banned ? "user.ban" : "user.unban",
      targetType: "user",
      targetId: userId,
      summary: `${banned ? "נחסם" : "הוסרה חסימה מ"} ${user.email}`,
    });
    revalidateEmpire(userId);
    return { success: banned ? "המשתמש נחסם" : "החסימה הוסרה" };
  } catch (e) {
    return toErr(e);
  }
}

/** Force-set a new password for a user. */
export async function resetUserPassword(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const userId = str(formData, "userId");
    await assertNotPeerAdmin(admin, userId);
    const password = String(formData.get("password") ?? "");
    if (password.length < 8) return { error: "סיסמה חייבת להכיל לפחות 8 תווים" };

    const passwordHash = await bcrypt.hash(password, 10);
    // Bump tokenVersion so every session issued under the old password is
    // revoked — a reset must lock out anyone holding a stale/leaked cookie.
    await prisma.user.update({
      where: { id: userId },
      // Clearing the lockout is what makes this the support path for a player
      // locked out by someone else guessing at their account.
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        failedLogins: 0,
        lockedUntil: null,
      },
    });
    await logAdmin(admin, {
      action: "user.reset_password",
      targetType: "user",
      targetId: userId,
      summary: "אופסה סיסמת משתמש",
    });
    return { success: "הסיסמה אופסה בהצלחה" };
  } catch (e) {
    return toErr(e);
  }
}

/** Permanently delete a user and their empire (cascade). */
export async function deleteUser(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const userId = str(formData, "userId");
    if (userId === admin.id) return { error: "אי אפשר למחוק את עצמך" };
    await assertNotPeerAdmin(admin, userId);
    const confirm = str(formData, "confirm");
    if (confirm !== "DELETE") return { error: 'יש להקליד DELETE לאישור המחיקה' };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    await prisma.user.delete({ where: { id: userId } });
    await logAdmin(admin, {
      action: "user.delete",
      targetType: "user",
      targetId: userId,
      summary: `נמחק משתמש ${user?.email ?? userId}`,
    });
    revalidatePath("/admin/users");
    return { success: "המשתמש נמחק" };
  } catch (e) {
    return toErr(e);
  }
}

/* ============================================================= */
/*                       EMPIRE STATE EDIT                       */
/* ============================================================= */

/** Set the empire core scalars (resources, level, name, wheel spins). */
export async function updateEmpireCore(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    const name = str(formData, "name");
    if (name.length < 2) return { error: "שם אימפריה קצר מדי" };

    const clash = await prisma.empire.findFirst({
      where: { name, NOT: { id: empireId } },
      select: { id: true },
    });
    if (clash) return { error: "שם האימפריה כבר תפוס" };

    await prisma.empire.update({
      where: { id: empireId },
      data: {
        name,
        level: Math.max(1, Math.round(num(formData, "level"))),
        gold: Math.max(0, num(formData, "gold")),
        wood: Math.max(0, num(formData, "wood")),
        iron: Math.max(0, num(formData, "iron")),
        stone: Math.max(0, num(formData, "stone")),
        diamonds: Math.max(0, num(formData, "diamonds")),
        citizens: Math.max(0, Math.round(num(formData, "citizens"))),
        turns: Math.max(0, Math.round(num(formData, "turns"))),
        wheelSpins: Math.max(0, Math.round(num(formData, "wheelSpins"))),
      },
    });
    await logAdmin(admin, {
      action: "empire.core",
      targetType: "empire",
      targetId: empireId,
      summary: `עודכנו נתוני ליבה של ${name}`,
    });
    revalidateEmpire(userId);
    return { success: "נתוני האימפריה עודכנו" };
  } catch (e) {
    return toErr(e);
  }
}

/** Set the army counts. */
export async function updateArmy(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    const data = {
      soldiers: Math.max(0, Math.round(num(formData, "soldiers"))),
      spies: Math.max(0, Math.round(num(formData, "spies"))),
      mineSlaves: Math.max(0, Math.round(num(formData, "mineSlaves"))),
    };
    await prisma.army.upsert({
      where: { empireId },
      create: { empireId, ...data },
      update: data,
    });
    await logAdmin(admin, {
      action: "empire.army",
      targetType: "empire",
      targetId: empireId,
      summary: `צבא עודכן: ${data.soldiers} חיילים / ${data.spies} מרגלים / ${data.mineSlaves} עבדים`,
    });
    revalidateEmpire(userId);
    return { success: "הצבא עודכן" };
  } catch (e) {
    return toErr(e);
  }
}

/** Set the bank gold balance. */
export async function updateBank(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    const goldBalance = Math.max(0, num(formData, "goldBalance"));
    await prisma.bankAccount.upsert({
      where: { empireId },
      create: { empireId, goldBalance },
      update: { goldBalance },
    });
    await logAdmin(admin, {
      action: "empire.bank",
      targetType: "empire",
      targetId: empireId,
      summary: `יתרת בנק הוגדרה ל-${Math.round(goldBalance)}`,
    });
    revalidateEmpire(userId);
    return { success: "הבנק עודכן" };
  } catch (e) {
    return toErr(e);
  }
}

/** Set one building's level + assigned slaves. */
export async function updateBuilding(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    const type = str(formData, "type") as BuildingType;
    const level = Math.max(0, Math.round(num(formData, "level")));
    const slavesAssigned = Math.max(0, Math.round(optNum(formData, "slavesAssigned")));
    await prisma.building.upsert({
      where: { empireId_type: { empireId, type } },
      create: { empireId, type, level, slavesAssigned },
      update: { level, slavesAssigned },
    });
    await logAdmin(admin, {
      action: "empire.building",
      targetType: "empire",
      targetId: empireId,
      summary: `מבנה ${type} → רמה ${level}`,
    });
    revalidateEmpire(userId);
    return { success: "המבנה עודכן" };
  } catch (e) {
    return toErr(e);
  }
}

/** Set one warehouse's level + stored amount. */
export async function updateStorage(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    const resourceType = str(formData, "resourceType") as ResourceStorageType;
    const level = Math.max(1, Math.round(num(formData, "level")));
    const storedAmount = Math.max(0, num(formData, "storedAmount"));
    await prisma.resourceStorage.upsert({
      where: { empireId_resourceType: { empireId, resourceType } },
      create: { empireId, resourceType, level, storedAmount },
      update: { level, storedAmount },
    });
    await logAdmin(admin, {
      action: "empire.storage",
      targetType: "empire",
      targetId: empireId,
      summary: `מחסן ${resourceType} → רמה ${level}`,
    });
    revalidateEmpire(userId);
    return { success: "המחסן עודכן" };
  } catch (e) {
    return toErr(e);
  }
}

/** Set one empire upgrade's level. */
export async function updateUpgrade(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    const type = str(formData, "type") as EmpireUpgradeType;
    const level = Math.max(1, Math.round(num(formData, "level")));
    await prisma.empireUpgrade.upsert({
      where: { empireId_type: { empireId, type } },
      create: { empireId, type, level },
      update: { level },
    });
    await logAdmin(admin, {
      action: "empire.upgrade",
      targetType: "empire",
      targetId: empireId,
      summary: `שדרוג ${type} → רמה ${level}`,
    });
    revalidateEmpire(userId);
    return { success: "השדרוג עודכן" };
  } catch (e) {
    return toErr(e);
  }
}

/** Set a weapon category's unlocked tier. */
export async function updateWeaponUnlock(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    const category = str(formData, "category") as WeaponCategory;
    const unlockedTier = Math.max(1, Math.round(num(formData, "unlockedTier")));
    await prisma.empireWeaponUnlock.upsert({
      where: { empireId_category: { empireId, category } },
      create: { empireId, category, unlockedTier },
      update: { unlockedTier },
    });
    await logAdmin(admin, {
      action: "empire.weapon_unlock",
      targetType: "empire",
      targetId: empireId,
      summary: `פתיחת נשק ${category} → טיר ${unlockedTier}`,
    });
    revalidateEmpire(userId);
    return { success: "פתיחת הנשק עודכנה" };
  } catch (e) {
    return toErr(e);
  }
}

/** Set the quantity of one weapon (0 removes it from the arsenal). */
export async function setWeaponQuantity(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    const weaponKey = str(formData, "weaponKey");
    if (!weaponByKey(weaponKey)) return { error: "מפתח נשק לא קיים" };
    const quantity = Math.max(0, Math.round(num(formData, "quantity")));

    if (quantity === 0) {
      await prisma.empireWeapon.deleteMany({ where: { empireId, weaponKey } });
    } else {
      await prisma.empireWeapon.upsert({
        where: { empireId_weaponKey: { empireId, weaponKey } },
        create: { empireId, weaponKey, quantity },
        update: { quantity },
      });
    }
    await logAdmin(admin, {
      action: "empire.weapon",
      targetType: "empire",
      targetId: empireId,
      summary: `נשק ${weaponKey} → ${quantity}`,
    });
    revalidateEmpire(userId);
    return { success: "מלאי הנשק עודכן" };
  } catch (e) {
    return toErr(e);
  }
}

/** Set the hero stats. */
export async function updateHero(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    const heroClass = z
      .enum(["WARLORD", "GUARDIAN", "MERCHANT", "SHADOW"])
      .parse(formData.get("heroClass"));
    // Health doubles as the life/death switch: setting it to 0 kills the hero
    // here and now (starting his revival hour), anything above raises him.
    const health = Math.max(
      0,
      Math.min(HERO_MAX_HEALTH, Math.round(num(formData, "health")))
    );
    const data = {
      heroClass,
      health,
      diedAt: health <= 0 ? new Date() : null,
      level: Math.max(1, Math.round(num(formData, "level"))),
      xp: Math.max(0, Math.round(num(formData, "xp"))),
      unspentPoints: Math.max(0, Math.round(num(formData, "unspentPoints"))),
      attackPoints: Math.max(0, Math.round(num(formData, "attackPoints"))),
      defensePoints: Math.max(0, Math.round(num(formData, "defensePoints"))),
      resourcePoints: Math.max(0, Math.round(num(formData, "resourcePoints"))),
      resets: Math.max(0, Math.round(num(formData, "resets"))),
    };
    await prisma.hero.upsert({
      where: { empireId },
      create: { empireId, ...data },
      update: data,
    });
    await logAdmin(admin, {
      action: "empire.hero",
      targetType: "empire",
      targetId: empireId,
      summary: `גיבור → רמה ${data.level}`,
    });
    revalidateEmpire(userId);
    return { success: "הגיבור עודכן" };
  } catch (e) {
    return toErr(e);
  }
}

const slotSchema = z.enum([
  "SWORD",
  "GAUNTLETS",
  "WINGS",
  "HELMET",
  "ARMOR",
  "SHIELD",
  "PANTS",
  "BOOTS",
  "RELIC",
]);
const raritySchema = z.enum(["COMMON", "RARE", "EPIC", "LEGENDARY"]);

/** Grant a hero item to an empire's hero. */
export async function grantHeroItem(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    const slot = slotSchema.parse(formData.get("slot")) as HeroItemSlot;
    const rarity = raritySchema.parse(formData.get("rarity")) as HeroRarity;
    const level = Math.max(1, Math.round(num(formData, "level")));

    const hero = await prisma.hero.upsert({
      where: { empireId },
      create: { empireId },
      update: {},
      select: { id: true },
    });
    await prisma.heroItem.create({
      data: { heroId: hero.id, slot, level, rarity, equipped: false },
    });
    await logAdmin(admin, {
      action: "empire.hero_item",
      targetType: "empire",
      targetId: empireId,
      summary: `פריט גיבור הוענק: ${slot} ${rarity} רמה ${level}`,
    });
    revalidateEmpire(userId);
    return { success: "הפריט הוענק לגיבור" };
  } catch (e) {
    return toErr(e);
  }
}

/** Delete a hero item. */
export async function deleteHeroItem(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const itemId = str(formData, "itemId");
    const userId = str(formData, "userId");
    await prisma.heroItem.delete({ where: { id: itemId } });
    await logAdmin(admin, {
      action: "empire.hero_item_delete",
      targetType: "heroItem",
      targetId: itemId,
      summary: "נמחק פריט גיבור",
    });
    revalidateEmpire(userId);
    return { success: "הפריט נמחק" };
  } catch (e) {
    return toErr(e);
  }
}

/** Remove an empire from its guild. */
export async function removeFromGuild(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    await prisma.guildMember.deleteMany({ where: { empireId } });
    await logAdmin(admin, {
      action: "empire.guild_remove",
      targetType: "empire",
      targetId: empireId,
      summary: "הוסר מהברית",
    });
    revalidateEmpire(userId);
    return { success: "האימפריה הוסרה מהברית" };
  } catch (e) {
    return toErr(e);
  }
}

/* ============================================================= */
/*                    MESSAGES / BROADCAST                       */
/* ============================================================= */

/** Send a direct system message to a single empire. */
export async function sendMessageToEmpire(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const empireId = str(formData, "empireId");
    const userId = str(formData, "userId");
    const title = str(formData, "title", 200);
    const body = str(formData, "body", 4000);
    const href = optHref(formData, "href");
    if (!title || !body) return { error: "יש למלא כותרת ותוכן" };

    await prisma.message.create({
      data: { empireId, kind: "SYSTEM", title, body, href },
    });
    await logAdmin(admin, {
      action: "message.direct",
      targetType: "empire",
      targetId: empireId,
      summary: `הודעה נשלחה: ${title}`,
    });
    revalidateEmpire(userId);
    return { success: "ההודעה נשלחה" };
  } catch (e) {
    return toErr(e);
  }
}

const kindSchema = z.enum(["SYSTEM", "BATTLE", "SPY"]);

/** Broadcast a message to a target audience (all / season / guild / empire). */
export async function broadcastMessage(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const scope = str(formData, "scope") || "all";
    const scopeId = str(formData, "scopeId");
    const title = str(formData, "title", 200);
    const body = str(formData, "body", 4000);
    const href = optHref(formData, "href");
    const kind = (kindSchema.safeParse(formData.get("kind")).data ?? "SYSTEM") as MessageKind;
    if (!title || !body) return { error: "יש למלא כותרת ותוכן" };

    const empireIds = await resolveTargetEmpireIds(scope, scopeId);
    if (empireIds.length === 0) return { error: "אין נמענים בקבוצה שנבחרה" };

    for (const batch of chunk(empireIds, BULK_BATCH_SIZE)) {
      await prisma.message.createMany({
        data: batch.map((empireId) => ({ empireId, kind, title, body, href })),
      });
    }
    await logAdmin(admin, {
      action: "message.broadcast",
      targetType: "broadcast",
      targetId: scope === "empire" ? scopeId : scope,
      summary: `שידור "${title}" ל-${empireIds.length} אימפריות`,
      details: { scope, scopeId, count: empireIds.length },
    });
    revalidatePath("/game", "layout");
    return { success: `ההודעה נשלחה ל-${empireIds.length} אימפריות` };
  } catch (e) {
    return toErr(e);
  }
}

/* ============================================================= */
/*                        GIFTS / PRIZES                         */
/* ============================================================= */

/**
 * Grant a resource/diamond bundle (and an optional accompanying message) to a
 * target audience. Amounts are added to the current balances.
 */
export async function sendGift(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const scope = str(formData, "scope") || "all";
    const scopeId = str(formData, "scopeId");

    const bundle = {
      gold: Math.max(0, optNum(formData, "gold")),
      wood: Math.max(0, optNum(formData, "wood")),
      iron: Math.max(0, optNum(formData, "iron")),
      stone: Math.max(0, optNum(formData, "stone")),
      diamonds: Math.max(0, optNum(formData, "diamonds")),
      citizens: Math.max(0, Math.round(optNum(formData, "citizens"))),
      turns: Math.max(0, Math.round(optNum(formData, "turns"))),
      wheelSpins: Math.max(0, Math.round(optNum(formData, "wheelSpins"))),
    };
    const anyResource = Object.values(bundle).some((v) => v > 0);
    const title = str(formData, "title", 200);
    const body = str(formData, "body", 4000);
    if (!anyResource && !title) {
      return { error: "יש להזין לפחות משאב אחד או הודעה" };
    }

    const empireIds = await resolveTargetEmpireIds(scope, scopeId);
    if (empireIds.length === 0) return { error: "אין נמענים בקבוצה שנבחרה" };

    const increments: Prisma.EmpireUpdateManyMutationInput = {};
    if (bundle.gold) increments.gold = { increment: bundle.gold };
    if (bundle.wood) increments.wood = { increment: bundle.wood };
    if (bundle.iron) increments.iron = { increment: bundle.iron };
    if (bundle.stone) increments.stone = { increment: bundle.stone };
    if (bundle.diamonds) increments.diamonds = { increment: bundle.diamonds };
    if (bundle.citizens) increments.citizens = { increment: bundle.citizens };
    if (bundle.turns) increments.turns = { increment: bundle.turns };
    if (bundle.wheelSpins) increments.wheelSpins = { increment: bundle.wheelSpins };

    await prisma.$transaction(async (tx) => {
      for (const batch of chunk(empireIds, BULK_BATCH_SIZE)) {
        if (anyResource) {
          await tx.empire.updateMany({ where: { id: { in: batch } }, data: increments });
        }
        if (title) {
          await tx.message.createMany({
            data: batch.map((empireId) => ({
              empireId,
              kind: "SYSTEM" as const,
              title,
              body: body || "קיבלת מתנה מההנהלה!",
            })),
          });
        }
      }
    });
    await logAdmin(admin, {
      action: "gift.send",
      targetType: "gift",
      targetId: scope === "empire" ? scopeId : scope,
      summary: `מתנה נשלחה ל-${empireIds.length} אימפריות`,
      details: { scope, scopeId, bundle, count: empireIds.length },
    });
    revalidatePath("/game", "layout");
    return { success: `המתנה נשלחה ל-${empireIds.length} אימפריות` };
  } catch (e) {
    return toErr(e);
  }
}

/* ============================================================= */
/*                          SEASONS                             */
/* ============================================================= */

function parseDate(formData: FormData, key: string): Date {
  const raw = str(formData, key);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new AdminError(`תאריך לא תקין בשדה ${key}`);
  return d;
}

export async function createSeason(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const name = str(formData, "name");
    if (name.length < 2) return { error: "שם עונה קצר מדי" };
    const startsAt = parseDate(formData, "startsAt");
    const endsAt = parseDate(formData, "endsAt");
    if (endsAt <= startsAt) return { error: "תאריך הסיום חייב להיות אחרי ההתחלה" };

    const season = await prisma.gameSeason.create({ data: { name, startsAt, endsAt } });
    await logAdmin(admin, {
      action: "season.create",
      targetType: "season",
      targetId: season.id,
      summary: `נוצרה עונה ${name}`,
    });
    revalidatePath("/admin/seasons");
    return { success: "העונה נוצרה" };
  } catch (e) {
    return toErr(e);
  }
}

export async function updateSeason(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const id = str(formData, "id");
    const name = str(formData, "name");
    if (name.length < 2) return { error: "שם עונה קצר מדי" };
    const startsAt = parseDate(formData, "startsAt");
    const endsAt = parseDate(formData, "endsAt");
    if (endsAt <= startsAt) return { error: "תאריך הסיום חייב להיות אחרי ההתחלה" };

    await prisma.gameSeason.update({ where: { id }, data: { name, startsAt, endsAt } });
    await logAdmin(admin, {
      action: "season.update",
      targetType: "season",
      targetId: id,
      summary: `עודכנה עונה ${name}`,
    });
    revalidatePath("/admin/seasons");
    return { success: "העונה עודכנה" };
  } catch (e) {
    return toErr(e);
  }
}

/** Activate a season (and deactivate all others). */
export async function activateSeason(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const id = str(formData, "id");
    await prisma.$transaction([
      prisma.gameSeason.updateMany({ data: { isActive: false } }),
      prisma.gameSeason.update({ where: { id }, data: { isActive: true } }),
    ]);
    await logAdmin(admin, {
      action: "season.activate",
      targetType: "season",
      targetId: id,
      summary: "עונה הופעלה",
    });
    revalidatePath("/admin/seasons");
    return { success: "העונה הופעלה" };
  } catch (e) {
    return toErr(e);
  }
}

export async function deleteSeason(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const id = str(formData, "id");
    await prisma.gameSeason.delete({ where: { id } });
    await logAdmin(admin, {
      action: "season.delete",
      targetType: "season",
      targetId: id,
      summary: "עונה נמחקה",
    });
    revalidatePath("/admin/seasons");
    return { success: "העונה נמחקה" };
  } catch (e) {
    return toErr(e);
  }
}

/**
 * Nuke-and-reboot the whole game — a full season reset. EVERY empire is deleted
 * and recreated from scratch (fresh buildings, army, upgrades, storages,
 * weapons, hero and bank — identical to a brand-new registration), and ALL
 * guilds are wiped. What survives:
 *   • user accounts, roles and bans (User rows are untouched)
 *   • each player's current DIAMOND balance — carried over so paying customers
 *     never lose what they bought
 *   • the real-money purchase audit trail (DiamondPurchase → onDelete: SetNull,
 *     with userId/email/empireName snapshots)
 * Every other empire record cascades away with the empire it belonged to.
 *
 * This is irreversible and hits all players, so it fires only when the admin
 * types the confirmation phrase. The whole wipe-and-rebuild runs in one
 * transaction: it either resets everyone or no one — never half the players.
 */
export async function resetSeason(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    if (str(formData, "confirm") !== "אפס") {
      return { error: 'כדי לאפס, הקלד "אפס" בשדה האישור' };
    }

    const tunables = await getTunables();
    // The game runs a single active season for everyone; a reset re-homes every
    // rebuilt empire onto it (matching what fresh registrations get), rather
    // than preserving each empire's stale prior seasonId.
    const activeSeason = await prisma.gameSeason.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    // Carry over only the identity + diamond balance of each empire.
    const empires = await prisma.empire.findMany({
      select: { userId: true, name: true, diamonds: true },
    });

    await prisma.$transaction(
      async (tx) => {
        // Guilds first: members, spells and treasury transactions cascade off.
        await tx.guild.deleteMany({});
        // Then every empire — all per-empire records cascade, and diamond
        // purchases detach (SetNull) rather than disappear.
        await tx.empire.deleteMany({});
        // Rebuild a pristine empire for each player, preserving only the name,
        // season assignment and diamond balance.
        for (const e of empires) {
          const data = newEmpireData(
            e.userId,
            e.name,
            activeSeason?.id,
            tunables.starting
          );
          data.diamonds = e.diamonds;
          // No new-player shield on a season reset: everyone restarts equal and
          // may compete immediately. The shield is only for genuine mid-season
          // registrations joining among established players.
          data.protectedUntil = null;
          await tx.empire.create({ data });
        }
      },
      { timeout: 120_000 }
    );

    await logAdmin(admin, {
      action: "season.reset",
      targetType: "season",
      summary: `אופסה העונה — ${empires.length} אימפריות אותחלו, כל הגילדות נמחקו`,
      details: { empiresReset: empires.length },
    });

    revalidatePath("/admin/seasons");
    revalidatePath("/game", "layout");
    return { success: `העונה אופסה — ${empires.length} שחקנים התחילו מחדש` };
  } catch (e) {
    return toErr(e);
  }
}

/* ============================================================= */
/*                           GUILDS                             */
/* ============================================================= */

export async function updateGuild(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const id = str(formData, "id");
    const name = str(formData, "name");
    if (name.length < 2) return { error: "שם ברית קצר מדי" };
    const capacityLevel = Math.min(
      GUILD_CAPACITY_MAX_LEVEL,
      Math.max(1, Math.round(num(formData, "capacityLevel")))
    );
    const aidLevel = Math.min(
      GUILD_AID_MAX_LEVEL,
      Math.max(0, Math.round(num(formData, "aidLevel")))
    );

    const clash = await prisma.guild.findFirst({
      where: { name, NOT: { id } },
      select: { id: true },
    });
    if (clash) return { error: "שם הברית כבר תפוס" };

    await prisma.guild.update({
      where: { id },
      data: { name, capacityLevel, aidLevel },
    });
    await logAdmin(admin, {
      action: "guild.update",
      targetType: "guild",
      targetId: id,
      summary: `עודכנה ברית ${name}`,
    });
    revalidatePath("/admin/guilds");
    return { success: "הברית עודכנה" };
  } catch (e) {
    return toErr(e);
  }
}

const guildRoleSchema = z.enum(["LEADER", "DEPUTY", "MEMBER"]);

/** Set a guild member's role. */
export async function setGuildMemberRole(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const memberId = str(formData, "memberId");
    const role = guildRoleSchema.parse(formData.get("role")) as GuildRole;
    await prisma.guildMember.update({ where: { id: memberId }, data: { role } });
    await logAdmin(admin, {
      action: "guild.member_role",
      targetType: "guildMember",
      targetId: memberId,
      summary: `תפקיד חבר ברית → ${role}`,
    });
    revalidatePath("/admin/guilds");
    return { success: "תפקיד החבר עודכן" };
  } catch (e) {
    return toErr(e);
  }
}

export async function deleteGuild(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const id = str(formData, "id");
    await prisma.guild.delete({ where: { id } });
    await logAdmin(admin, {
      action: "guild.delete",
      targetType: "guild",
      targetId: id,
      summary: "ברית פורקה",
    });
    revalidatePath("/admin/guilds");
    return { success: "הברית פורקה" };
  } catch (e) {
    return toErr(e);
  }
}

/* ============================================================= */
/*                       GLOBAL BALANCE                          */
/* ============================================================= */

/** Persist edited global tunables (only known numeric fields are kept). */
export async function saveTunables(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const overlay: Record<string, Record<string, number>> = {};
    for (const group of Object.keys(DEFAULT_TUNABLES) as (keyof GameTunables)[]) {
      overlay[group] = {};
      for (const field of Object.keys(DEFAULT_TUNABLES[group])) {
        const raw = formData.get(`${group}.${field}`);
        const n = Number(raw);
        if (raw != null && raw !== "" && Number.isFinite(n)) {
          overlay[group][field] = n;
        }
      }
    }
    const merged = mergeTunables(overlay);
    await prisma.gameConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", data: merged as unknown as Prisma.InputJsonValue },
      update: { data: merged as unknown as Prisma.InputJsonValue },
    });
    await logAdmin(admin, {
      action: "config.save",
      targetType: "config",
      summary: "עודכן איזון גלובלי",
      details: merged as unknown as Prisma.InputJsonValue,
    });
    revalidatePath("/admin/balance");
    return { success: "האיזון הגלובלי נשמר" };
  } catch (e) {
    return toErr(e);
  }
}

/* ============================================================= */
/*                         MINI-GAMES                           */
/* ============================================================= */

const miniTypeSchema = z.enum(["GUESS_NUMBER", "FIND_BALL"]);

/** Random integer in [min, max] (inclusive). */
function randInt(min: number, max: number): number {
  // These pick the mini-game's *secret answer*, so the generator has to be
  // unpredictable. V8's Math.random is xorshift128+ — fast, but its internal
  // state is recoverable from a modest run of observed outputs, and every
  // created game leaks one. randomInt draws from the CSPRNG and is also free of
  // the modulo bias a hand-rolled `% range` would introduce.
  return randomInt(min, max + 1);
}

/** Build a fresh secret config (with a new random answer) for a mini-game. */
function freshConfig(
  type: MiniGameType,
  params: { min: number; max: number; cups: number }
): { min?: number; max?: number; cups?: number; answer: number } {
  if (type === "GUESS_NUMBER") {
    return { min: params.min, max: params.max, answer: randInt(params.min, params.max) };
  }
  return { cups: params.cups, answer: randInt(0, params.cups - 1) };
}

function readPrizeBundle(formData: FormData) {
  return {
    prizeGold: Math.max(0, optNum(formData, "prizeGold")),
    prizeWood: Math.max(0, optNum(formData, "prizeWood")),
    prizeIron: Math.max(0, optNum(formData, "prizeIron")),
    prizeStone: Math.max(0, optNum(formData, "prizeStone")),
    prizeDiamonds: Math.max(0, optNum(formData, "prizeDiamonds")),
    prizeCitizens: Math.max(0, Math.round(optNum(formData, "prizeCitizens"))),
    prizeTurns: Math.max(0, Math.round(optNum(formData, "prizeTurns"))),
    prizeWheelSpins: Math.max(0, Math.round(optNum(formData, "prizeWheelSpins"))),
  };
}

/** Upper bound on a timed release: one week, in minutes. */
const MAX_DURATION_MINUTES = 7 * 24 * 60;

/**
 * Release an event to all players: fresh answer, cleared entries, live.
 * `durationMinutes` > 0 sets a deadline the event expires at on its own (no
 * scheduler involved — the deadline is enforced on read; see minigame.ts).
 */
async function activateEvent(
  admin: Awaited<ReturnType<typeof requireAdmin>>,
  event: { id: string; type: MiniGameType; config: unknown; title: string },
  durationMinutes: number
): Promise<void> {
  const cfg = (event.config ?? {}) as Record<string, number>;
  const params = { min: cfg.min ?? 1, max: cfg.max ?? 100, cups: cfg.cups ?? 3 };
  const minutes = Math.min(MAX_DURATION_MINUTES, Math.max(0, Math.round(durationMinutes)));
  const endsAt = minutes > 0 ? new Date(Date.now() + minutes * 60_000) : null;

  await prisma.$transaction([
    prisma.miniGameEvent.updateMany({ data: { isActive: false } }),
    prisma.miniGameEntry.deleteMany({ where: { eventId: event.id } }),
    prisma.miniGameEvent.update({
      where: { id: event.id },
      data: {
        isActive: true,
        winnersCount: 0,
        activatedAt: new Date(),
        durationMinutes: minutes,
        endsAt,
        endedAt: null,
        config: freshConfig(event.type, params),
      },
    }),
  ]);
  await logAdmin(admin, {
    action: "minigame.activate",
    targetType: "minigame",
    targetId: event.id,
    summary:
      minutes > 0
        ? `שוחרר מיני-משחק "${event.title}" לכל השחקנים למשך ${minutes} דקות`
        : `שוחרר מיני-משחק "${event.title}" לכל השחקנים`,
  });
  revalidatePath("/admin/minigame");
  revalidatePath("/game", "layout");
}

/** Create a new mini-game with a preset prize (optionally launch it at once). */
export async function createMiniGame(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const type = miniTypeSchema.parse(formData.get("type")) as MiniGameType;
    // Title is optional — fall back to the type's own name so the admin can
    // fire off a game without typing anything.
    const title = str(formData, "title") || MINIGAME_TYPE_META[type].label;

    const min = Math.round(optNum(formData, "min", 1));
    const max = Math.round(optNum(formData, "max", 100));
    const cups = Math.min(6, Math.max(2, Math.round(optNum(formData, "cups", 3))));
    if (type === "GUESS_NUMBER" && max <= min) {
      return { error: "הטווח לא תקין (מקסימום חייב להיות גדול ממינימום)" };
    }
    const maxAttempts = Math.max(1, Math.round(optNum(formData, "maxAttempts", 5)));
    const maxWinners = Math.max(0, Math.round(optNum(formData, "maxWinners", 0)));
    const durationMinutes = Math.min(
      MAX_DURATION_MINUTES,
      Math.max(0, Math.round(optNum(formData, "durationMinutes", 0)))
    );

    const event = await prisma.miniGameEvent.create({
      data: {
        type,
        title,
        config: freshConfig(type, { min, max, cups }),
        maxAttempts,
        maxWinners,
        durationMinutes,
        ...readPrizeBundle(formData),
      },
    });
    await logAdmin(admin, {
      action: "minigame.create",
      targetType: "minigame",
      targetId: event.id,
      summary: `נוצר מיני-משחק "${title}"`,
    });

    // One-click launch: create and immediately release to everyone.
    if (str(formData, "activate") === "1") {
      await activateEvent(admin, event, durationMinutes);
      return {
        success: durationMinutes
          ? `"${title}" נוצר ושוחרר לכל השחקנים למשך ${durationMinutes} דקות! 🎉`
          : `"${title}" נוצר ושוחרר לכל השחקנים! 🎉`,
      };
    }

    revalidatePath("/admin/minigame");
    return { success: "המיני-משחק נוצר. הפעל אותו כדי לשחרר לכולם." };
  } catch (e) {
    return toErr(e);
  }
}

/** Activate a mini-game: fresh answer, cleared entries, live for everyone. */
export async function activateMiniGame(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const id = str(formData, "id");
    const event = await prisma.miniGameEvent.findUnique({ where: { id } });
    if (!event) return { error: "המיני-משחק לא נמצא" };

    // An omitted field keeps the duration the event was last released with.
    const durationMinutes = optNum(formData, "durationMinutes", event.durationMinutes);
    await activateEvent(admin, event, durationMinutes);
    return {
      success:
        durationMinutes > 0
          ? `המיני-משחק שוחרר לכל השחקנים למשך ${Math.round(durationMinutes)} דקות! 🎉`
          : "המיני-משחק שוחרר לכל השחקנים! 🎉",
    };
  } catch (e) {
    return toErr(e);
  }
}

/** Stop the active mini-game. */
export async function deactivateMiniGame(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const id = str(formData, "id");
    await prisma.miniGameEvent.update({
      where: { id },
      // Clearing the deadline too: stopping by hand is the end, so nothing
      // should still read as "expires in N minutes".
      data: { isActive: false, endsAt: null, endedAt: new Date() },
    });
    await logAdmin(admin, {
      action: "minigame.deactivate",
      targetType: "minigame",
      targetId: id,
      summary: "מיני-משחק הופסק",
    });
    revalidatePath("/admin/minigame");
    revalidatePath("/game", "layout");
    return { success: "המיני-משחק הופסק" };
  } catch (e) {
    return toErr(e);
  }
}

/** Delete a mini-game (and its entries). */
export async function deleteMiniGame(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const id = str(formData, "id");
    await prisma.miniGameEvent.delete({ where: { id } });
    await logAdmin(admin, {
      action: "minigame.delete",
      targetType: "minigame",
      targetId: id,
      summary: "מיני-משחק נמחק",
    });
    revalidatePath("/admin/minigame");
    return { success: "המיני-משחק נמחק" };
  } catch (e) {
    return toErr(e);
  }
}

/** Reset all tunables back to code defaults. */
export async function resetTunables(
  _prev: AdminActionState,
  _formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    await prisma.gameConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", data: {} },
      update: { data: {} },
    });
    await logAdmin(admin, {
      action: "config.reset",
      targetType: "config",
      summary: "איזון גלובלי אופס לברירת מחדל",
    });
    revalidatePath("/admin/balance");
    return { success: "האיזון אופס לברירת המחדל" };
  } catch (e) {
    return toErr(e);
  }
}
