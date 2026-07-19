"use server";

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
import { DEFAULT_TUNABLES, mergeTunables, type GameTunables } from "@/lib/game/config";

export interface AdminActionState {
  error?: string;
  success?: string;
}

/* ------------------------------ helpers ------------------------------ */

function toErr(e: unknown): AdminActionState {
  const message = e instanceof Error ? e.message : "אירעה שגיאה";
  return { error: message };
}

/** Read a required numeric form field (finite). Throws on invalid input. */
function num(formData: FormData, key: string): number {
  const raw = formData.get(key);
  const n = Number(raw);
  if (raw == null || raw === "" || !Number.isFinite(n)) {
    throw new Error(`ערך לא תקין בשדה ${key}`);
  }
  return n;
}

/** Read an optional numeric field; returns `fallback` when blank. */
function optNum(formData: FormData, key: string, fallback = 0): number {
  const raw = formData.get(key);
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
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

    const clash = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
      select: { id: true },
    });
    if (clash) return { error: "האימייל כבר תפוס על ידי משתמש אחר" };

    await prisma.user.update({ where: { id: userId }, data: { name, email, role } });
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { bannedAt: true, email: true },
    });
    if (!user) return { error: "המשתמש לא נמצא" };

    const banned = user.bannedAt == null;
    await prisma.user.update({
      where: { id: userId },
      data: { bannedAt: banned ? new Date() : null },
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
    const password = String(formData.get("password") ?? "");
    if (password.length < 6) return { error: "סיסמה חייבת להכיל לפחות 6 תווים" };

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
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
    const data = {
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
    const title = str(formData, "title");
    const body = str(formData, "body");
    const href = str(formData, "href") || null;
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
    const title = str(formData, "title");
    const body = str(formData, "body");
    const href = str(formData, "href") || null;
    const kind = (kindSchema.safeParse(formData.get("kind")).data ?? "SYSTEM") as MessageKind;
    if (!title || !body) return { error: "יש למלא כותרת ותוכן" };

    const empireIds = await resolveTargetEmpireIds(scope, scopeId);
    if (empireIds.length === 0) return { error: "אין נמענים בקבוצה שנבחרה" };

    await prisma.message.createMany({
      data: empireIds.map((empireId) => ({ empireId, kind, title, body, href })),
    });
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
    const title = str(formData, "title");
    const body = str(formData, "body");
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
      if (anyResource) {
        await tx.empire.updateMany({ where: { id: { in: empireIds } }, data: increments });
      }
      if (title) {
        await tx.message.createMany({
          data: empireIds.map((empireId) => ({
            empireId,
            kind: "SYSTEM" as const,
            title,
            body: body || "קיבלת מתנה מההנהלה!",
          })),
        });
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
  if (Number.isNaN(d.getTime())) throw new Error(`תאריך לא תקין בשדה ${key}`);
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
    const goldBalance = Math.max(0, num(formData, "goldBalance"));
    const capacityLevel = Math.max(1, Math.round(num(formData, "capacityLevel")));

    const clash = await prisma.guild.findFirst({
      where: { name, NOT: { id } },
      select: { id: true },
    });
    if (clash) return { error: "שם הברית כבר תפוס" };

    await prisma.guild.update({
      where: { id },
      data: { name, goldBalance, capacityLevel },
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
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

/** Create a new (inactive) mini-game with a preset prize. */
export async function createMiniGame(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const admin = await requireAdmin();
    const type = miniTypeSchema.parse(formData.get("type")) as MiniGameType;
    const title = str(formData, "title");
    if (title.length < 2) return { error: "כותרת קצרה מדי" };

    const min = Math.round(optNum(formData, "min", 1));
    const max = Math.round(optNum(formData, "max", 100));
    const cups = Math.min(6, Math.max(2, Math.round(optNum(formData, "cups", 3))));
    if (type === "GUESS_NUMBER" && max <= min) {
      return { error: "הטווח לא תקין (מקסימום חייב להיות גדול ממינימום)" };
    }
    const maxAttempts = Math.max(1, Math.round(optNum(formData, "maxAttempts", 5)));
    const maxWinners = Math.max(0, Math.round(optNum(formData, "maxWinners", 0)));

    const event = await prisma.miniGameEvent.create({
      data: {
        type,
        title,
        config: freshConfig(type, { min, max, cups }),
        maxAttempts,
        maxWinners,
        ...readPrizeBundle(formData),
      },
    });
    await logAdmin(admin, {
      action: "minigame.create",
      targetType: "minigame",
      targetId: event.id,
      summary: `נוצר מיני-משחק "${title}"`,
    });
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

    const cfg = (event.config ?? {}) as Record<string, number>;
    const params = {
      min: cfg.min ?? 1,
      max: cfg.max ?? 100,
      cups: cfg.cups ?? 3,
    };

    await prisma.$transaction([
      prisma.miniGameEvent.updateMany({ data: { isActive: false } }),
      prisma.miniGameEntry.deleteMany({ where: { eventId: id } }),
      prisma.miniGameEvent.update({
        where: { id },
        data: {
          isActive: true,
          winnersCount: 0,
          activatedAt: new Date(),
          endedAt: null,
          config: freshConfig(event.type, params),
        },
      }),
    ]);
    await logAdmin(admin, {
      action: "minigame.activate",
      targetType: "minigame",
      targetId: id,
      summary: `שוחרר מיני-משחק "${event.title}" לכל השחקנים`,
    });
    revalidatePath("/admin/minigame");
    revalidatePath("/game", "layout");
    return { success: "המיני-משחק שוחרר לכל השחקנים! 🎉" };
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
      data: { isActive: false, endedAt: new Date() },
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
