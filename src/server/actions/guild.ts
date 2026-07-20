"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { GuildRole, GuildSpellType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import {
  GUILD_AID_MAX_LEVEL,
  GUILD_CAPACITY_MAX_LEVEL,
  GUILD_CREATION_COST_DIAMONDS,
  GUILD_NAME_MAX_LENGTH,
  GUILD_NAME_MIN_LENGTH,
  GUILD_SPELL_BUFF_MS,
  GUILD_SPELL_MAX_LEVEL,
  GUILD_SPELL_META,
  aidUpgradeCostGold,
  capacityUpgradeCostGold,
  guildAidPct,
  guildCapacity,
  guildSpellBonusPct,
  spellCastCostDiamonds,
  spellUpgradeCostDiamonds,
} from "@/lib/game/guild";
import type { ActionState } from "./game";

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

function revalidateGuild() {
  revalidatePath("/game", "layout");
}

/**
 * Spend diamonds inside a transaction. The guarded update means concurrent
 * purchases can never drive the balance negative; returns false when the
 * empire lacks enough diamonds.
 */
async function spendDiamonds(
  tx: Prisma.TransactionClient,
  empireId: string,
  cost: number
): Promise<boolean> {
  const updated = await tx.empire.updateMany({
    where: { id: empireId, diamonds: { gte: cost } },
    data: { diamonds: { decrement: cost } },
  });
  return updated.count > 0;
}

/**
 * Spend gold from the guild treasury. The guarded update means concurrent
 * guild-wide upgrades can never drive the treasury negative; returns false
 * when the treasury lacks enough gold.
 */
async function spendGuildGold(
  tx: Prisma.TransactionClient,
  guildId: string,
  cost: number
): Promise<boolean> {
  const updated = await tx.guild.updateMany({
    where: { id: guildId, goldBalance: { gte: cost } },
    data: { goldBalance: { decrement: cost } },
  });
  return updated.count > 0;
}

type MembershipWithGuild = Prisma.GuildMemberGetPayload<{
  include: { guild: true };
}>;

/**
 * Shared shell for actions that require an existing guild membership:
 * applies pending updates and loads the caller's membership + guild inside
 * one transaction so validation and the mutation are atomic.
 */
async function runMemberAction(
  perform: (
    membership: MembershipWithGuild,
    tx: Prisma.TransactionClient,
    empireId: string
  ) => Promise<ActionState>
): Promise<ActionState> {
  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      await applyPendingUpdates(empireId, tx);
      const membership = await tx.guildMember.findUnique({
        where: { empireId },
        include: { guild: true },
      });
      if (!membership) return { error: "אינך חבר בברית." };
      return perform(membership, tx, empireId);
    });

    revalidateGuild();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

/* ------------------------------ create / join / leave ------------------------------ */

const guildNameSchema = z
  .string()
  .trim()
  .min(GUILD_NAME_MIN_LENGTH, "שם הברית קצר מדי")
  .max(GUILD_NAME_MAX_LENGTH, "שם הברית ארוך מדי");

export async function createGuild(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = guildNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "שם ברית לא תקין" };
  }
  const name = parsed.data;

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      const empire = await applyPendingUpdates(empireId, tx);

      const existingMembership = await tx.guildMember.findUnique({
        where: { empireId },
      });
      if (existingMembership) return { error: "אתה כבר חבר בברית." };

      const nameTaken = await tx.guild.findUnique({ where: { name } });
      if (nameTaken) return { error: "שם הברית כבר תפוס — בחר שם אחר." };

      if (empire.diamonds < GUILD_CREATION_COST_DIAMONDS) {
        return {
          error: `הקמת ברית עולה ${GUILD_CREATION_COST_DIAMONDS} יהלומים — אין לך מספיק.`,
        };
      }
      if (!(await spendDiamonds(tx, empireId, GUILD_CREATION_COST_DIAMONDS))) {
        return {
          error: `הקמת ברית עולה ${GUILD_CREATION_COST_DIAMONDS} יהלומים — אין לך מספיק.`,
        };
      }

      // Founder becomes the leader; all four spells open at level 1 (=1%).
      await tx.guild.create({
        data: {
          name,
          members: { create: { empireId, role: "LEADER" } },
          spells: {
            createMany: {
              data: (
                Object.keys(GUILD_SPELL_META) as GuildSpellType[]
              ).map((type) => ({ type })),
            },
          },
        },
      });

      return { success: `הברית "${name}" הוקמה — אתה המנהיג!` };
    });

    revalidateGuild();
    return result;
  } catch {
    return { error: "אירעה שגיאה, נסה שוב" };
  }
}

const guildIdSchema = z.object({ guildId: z.string().min(1) });

export async function joinGuild(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = guildIdSchema.safeParse({ guildId: formData.get("guildId") });
  if (!parsed.success) return { error: "ברית לא תקינה" };
  const { guildId } = parsed.data;

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      await applyPendingUpdates(empireId, tx);

      const existingMembership = await tx.guildMember.findUnique({
        where: { empireId },
      });
      if (existingMembership) return { error: "אתה כבר חבר בברית." };

      // Lock the guild row so concurrent joins serialize. Under READ COMMITTED
      // two joins into the last seat each insert their own row and neither sees
      // the other's uncommitted insert, so both counts stay within capacity and
      // both commit — overfilling the guild. The FOR UPDATE lock makes the
      // second join wait until the first commits, so its re-count below sees the
      // new member.
      await tx.$queryRaw`SELECT id FROM "Guild" WHERE id = ${guildId} FOR UPDATE`;

      const guild = await tx.guild.findUnique({ where: { id: guildId } });
      if (!guild) return { error: "הברית לא נמצאה." };

      await tx.guildMember.create({ data: { guildId, empireId } });

      // Re-count after inserting — throwing rolls the join back if a
      // concurrent join filled the last seat.
      const memberCount = await tx.guildMember.count({ where: { guildId } });
      if (memberCount > guildCapacity(guild.capacityLevel)) {
        throw new Error("guild full");
      }

      return { success: `הצטרפת לברית "${guild.name}"!` };
    });

    revalidateGuild();
    return result;
  } catch {
    return { error: "הברית מלאה או שאירעה שגיאה — נסה שוב." };
  }
}

export async function leaveGuild(): Promise<ActionState> {
  return runMemberAction(async (membership, tx, empireId) => {
    const { guild } = membership;

    if (membership.role === "LEADER") {
      const memberCount = await tx.guildMember.count({
        where: { guildId: guild.id },
      });
      if (memberCount > 1) {
        return { error: "מנהיג לא יכול לעזוב — העבר קודם את ההנהגה." };
      }
      // Last member out disbands the guild; leftover treasury gold is
      // returned so it can never be lost.
      if (guild.goldBalance > 0) {
        await tx.empire.update({
          where: { id: empireId },
          data: { gold: { increment: guild.goldBalance } },
        });
      }
      await tx.guild.delete({ where: { id: guild.id } });
      return { success: `הברית "${guild.name}" פורקה והזהב שנותר הוחזר אליך.` };
    }

    await tx.guildMember.delete({ where: { empireId } });
    return { success: `עזבת את הברית "${guild.name}".` };
  });
}

/* ------------------------------ roles & kicks ------------------------------ */

const targetMemberSchema = z.object({ targetEmpireId: z.string().min(1) });

async function loadTargetMember(
  tx: Prisma.TransactionClient,
  guildId: string,
  targetEmpireId: string
) {
  return tx.guildMember.findFirst({
    where: { guildId, empireId: targetEmpireId },
    include: { empire: { select: { name: true } } },
  });
}

export async function kickGuildMember(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = targetMemberSchema.safeParse({
    targetEmpireId: formData.get("targetEmpireId"),
  });
  if (!parsed.success) return { error: "חבר לא תקין" };
  const { targetEmpireId } = parsed.data;

  return runMemberAction(async (membership, tx) => {
    if (targetEmpireId === membership.empireId) {
      return { error: "לא ניתן להרחיק את עצמך — השתמש בעזיבת הברית." };
    }
    const target = await loadTargetMember(tx, membership.guildId, targetEmpireId);
    if (!target) return { error: "החבר לא נמצא בברית." };

    // Leaders kick anyone; deputies kick plain members only.
    const mayKick =
      membership.role === "LEADER" ||
      (membership.role === "DEPUTY" && target.role === "MEMBER");
    if (!mayKick) return { error: "אין לך הרשאה להרחיק את החבר הזה." };

    await tx.guildMember.delete({ where: { id: target.id } });
    await tx.message.create({
      data: {
        empireId: targetEmpireId,
        kind: "SYSTEM",
        title: "🏰 הורחקת מהברית",
        body: `הורחקת מהברית "${membership.guild.name}".`,
        href: "/game/guild",
      },
    });

    return { success: `${target.empire.name} הורחק מהברית.` };
  });
}

const setRoleSchema = z.object({
  targetEmpireId: z.string().min(1),
  role: z.enum(["DEPUTY", "MEMBER"]),
});

export async function setGuildRole(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = setRoleSchema.safeParse({
    targetEmpireId: formData.get("targetEmpireId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "בקשה לא תקינה" };
  const { targetEmpireId, role } = parsed.data;

  return runMemberAction(async (membership, tx) => {
    if (membership.role !== "LEADER") {
      return { error: "רק המנהיג יכול לשנות תפקידים." };
    }
    if (targetEmpireId === membership.empireId) {
      return { error: "לא ניתן לשנות את התפקיד של עצמך." };
    }
    const target = await loadTargetMember(tx, membership.guildId, targetEmpireId);
    if (!target) return { error: "החבר לא נמצא בברית." };

    await tx.guildMember.update({
      where: { id: target.id },
      data: { role: role as GuildRole },
    });

    return {
      success:
        role === "DEPUTY"
          ? `${target.empire.name} מונה לסגן.`
          : `${target.empire.name} הורד לחבר מן השורה.`,
    };
  });
}

export async function transferGuildLeadership(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = targetMemberSchema.safeParse({
    targetEmpireId: formData.get("targetEmpireId"),
  });
  if (!parsed.success) return { error: "חבר לא תקין" };
  const { targetEmpireId } = parsed.data;

  return runMemberAction(async (membership, tx) => {
    if (membership.role !== "LEADER") {
      return { error: "רק המנהיג יכול להעביר את ההנהגה." };
    }
    if (targetEmpireId === membership.empireId) {
      return { error: "אתה כבר מנהיג הברית." };
    }
    const target = await loadTargetMember(tx, membership.guildId, targetEmpireId);
    if (!target) return { error: "החבר לא נמצא בברית." };

    // The old leader steps down to deputy.
    await tx.guildMember.update({
      where: { id: membership.id },
      data: { role: "DEPUTY" },
    });
    await tx.guildMember.update({
      where: { id: target.id },
      data: { role: "LEADER" },
    });
    await tx.message.create({
      data: {
        empireId: targetEmpireId,
        kind: "SYSTEM",
        title: "👑 מונית למנהיג הברית",
        body: `קיבלת את הנהגת הברית "${membership.guild.name}".`,
        href: "/game/guild",
      },
    });

    return { success: `${target.empire.name} הוא מנהיג הברית החדש.` };
  });
}

/* ------------------------------ guild bank ------------------------------ */

// Empire and guild gold are Float columns, so a "deposit/withdraw all" button
// can submit a fractional amount (e.g. 1234.56). Floor first, then validate,
// so those amounts aren't rejected by an int-only check.
const amountSchema = z.coerce
  .number()
  .finite()
  .transform((n) => Math.floor(n))
  .pipe(z.number().int().min(1).max(1_000_000_000));

export async function depositGuildGold(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = amountSchema.safeParse(formData.get("amount"));
  if (!parsed.success) return { error: "כמות לא תקינה" };
  const amount = parsed.data;

  return runMemberAction(async (membership, tx, empireId) => {
    // Guarded debit — concurrent actions can never drive gold negative.
    const debited = await tx.empire.updateMany({
      where: { id: empireId, gold: { gte: amount } },
      data: { gold: { decrement: amount } },
    });
    if (debited.count === 0) return { error: "אין מספיק זהב זמין להפקדה." };

    const guild = await tx.guild.update({
      where: { id: membership.guildId },
      data: { goldBalance: { increment: amount } },
    });

    const empire = await tx.empire.findUniqueOrThrow({
      where: { id: empireId },
      select: { name: true },
    });
    await tx.guildBankTransaction.create({
      data: {
        guildId: membership.guildId,
        empireId,
        empireName: empire.name,
        type: "DEPOSIT",
        amount,
        balanceAfter: guild.goldBalance,
      },
    });

    return {
      success: `הופקדו ${amount.toLocaleString("he-IL")} זהב בבנק הברית`,
    };
  });
}

export async function withdrawGuildGold(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = amountSchema.safeParse(formData.get("amount"));
  if (!parsed.success) return { error: "כמות לא תקינה" };
  const amount = parsed.data;

  return runMemberAction(async (membership, tx, empireId) => {
    // Guarded debit against the shared treasury.
    const withdrawn = await tx.guild.updateMany({
      where: { id: membership.guildId, goldBalance: { gte: amount } },
      data: { goldBalance: { decrement: amount } },
    });
    if (withdrawn.count === 0) {
      return { error: "אין מספיק זהב בבנק הברית למשיכה." };
    }

    const empire = await tx.empire.update({
      where: { id: empireId },
      data: { gold: { increment: amount } },
      select: { name: true },
    });
    const guild = await tx.guild.findUniqueOrThrow({
      where: { id: membership.guildId },
      select: { goldBalance: true },
    });
    await tx.guildBankTransaction.create({
      data: {
        guildId: membership.guildId,
        empireId,
        empireName: empire.name,
        type: "WITHDRAW",
        amount,
        balanceAfter: guild.goldBalance,
      },
    });

    return {
      success: `נמשכו ${amount.toLocaleString("he-IL")} זהב מבנק הברית`,
    };
  });
}

/* ------------------------------ guild shop ------------------------------ */

const spellTypeSchema = z.object({
  type: z.enum(["ATTACK", "DEFENSE", "SPY", "RESOURCES"]),
});

export async function upgradeGuildSpell(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = spellTypeSchema.safeParse({ type: formData.get("type") });
  if (!parsed.success) return { error: "קסם לא תקין" };
  const type = parsed.data.type as GuildSpellType;

  return runMemberAction(async (membership, tx, empireId) => {
    const spell = await tx.guildSpell.findUnique({
      where: { guildId_type: { guildId: membership.guildId, type } },
    });
    if (!spell) return { error: "הקסם לא נמצא." };
    if (spell.level >= GUILD_SPELL_MAX_LEVEL) {
      return { error: `הקסם כבר ברמה המקסימלית (${GUILD_SPELL_MAX_LEVEL}%).` };
    }

    const cost = spellUpgradeCostDiamonds(spell.level);
    if (!(await spendDiamonds(tx, empireId, cost))) {
      return { error: `השדרוג עולה ${cost} יהלומים — אין לך מספיק.` };
    }

    // Guarded on the current level so two concurrent upgrades can't both
    // pay for the same level; throwing rolls the diamonds back.
    const upgraded = await tx.guildSpell.updateMany({
      where: { id: spell.id, level: spell.level },
      data: { level: { increment: 1 } },
    });
    if (upgraded.count === 0) throw new Error("spell upgrade conflict");

    const meta = GUILD_SPELL_META[type];
    return {
      success: `${meta.label} שודרג ל־${guildSpellBonusPct(spell.level + 1)}% עבור כל הברית!`,
    };
  });
}

export async function upgradeGuildCapacity(): Promise<ActionState> {
  return runMemberAction(async (membership, tx) => {
    const { guild } = membership;
    // Spends the shared treasury — restrict to leadership so a plain member
    // can't drain the guild bank on capacity upgrades.
    if (membership.role === "MEMBER") {
      return { error: "רק מנהיג או סגן יכולים לשדרג מקופת הברית." };
    }
    if (guild.capacityLevel >= GUILD_CAPACITY_MAX_LEVEL) {
      return {
        error: `הברית כבר בקיבולת המקסימלית (${guildCapacity(GUILD_CAPACITY_MAX_LEVEL)} חברים).`,
      };
    }

    // Paid from the shared treasury — the guarded debit also guards the
    // capacity increment, so two concurrent upgrades can't both go through.
    const cost = capacityUpgradeCostGold(guild.capacityLevel);
    if (!(await spendGuildGold(tx, guild.id, cost))) {
      return { error: `ההרחבה עולה ${cost.toLocaleString("he-IL")} זהב מקופת הברית — אין מספיק.` };
    }

    const upgraded = await tx.guild.updateMany({
      where: { id: guild.id, capacityLevel: guild.capacityLevel },
      data: { capacityLevel: { increment: 1 } },
    });
    if (upgraded.count === 0) throw new Error("capacity upgrade conflict");

    return {
      success: `הברית הורחבה ל־${guildCapacity(guild.capacityLevel + 1)} חברים!`,
    };
  });
}

export async function upgradeGuildAid(): Promise<ActionState> {
  return runMemberAction(async (membership, tx) => {
    const { guild } = membership;
    // Spends the shared treasury — restrict to leadership (see upgradeGuildCapacity).
    if (membership.role === "MEMBER") {
      return { error: "רק מנהיג או סגן יכולים לשדרג מקופת הברית." };
    }
    if (guild.aidLevel >= GUILD_AID_MAX_LEVEL) {
      return {
        error: `עזרת הברית כבר ברמה המקסימלית (${GUILD_AID_MAX_LEVEL}%).`,
      };
    }

    const cost = aidUpgradeCostGold(guild.aidLevel);
    if (!(await spendGuildGold(tx, guild.id, cost))) {
      return { error: `השדרוג עולה ${cost.toLocaleString("he-IL")} זהב מקופת הברית — אין מספיק.` };
    }

    const upgraded = await tx.guild.updateMany({
      where: { id: guild.id, aidLevel: guild.aidLevel },
      data: { aidLevel: { increment: 1 } },
    });
    if (upgraded.count === 0) throw new Error("aid upgrade conflict");

    return {
      success: `עזרת הברית שודרגה ל־${guildAidPct(guild.aidLevel + 1)}% מהכוח הכולל של הברית!`,
    };
  });
}

export async function castGuildSpell(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = spellTypeSchema.safeParse({ type: formData.get("type") });
  if (!parsed.success) return { error: "קסם לא תקין" };
  const type = parsed.data.type as GuildSpellType;

  return runMemberAction(async (membership, tx, empireId) => {
    const spell = await tx.guildSpell.findUnique({
      where: { guildId_type: { guildId: membership.guildId, type } },
    });
    if (!spell) return { error: "הקסם לא נמצא." };

    const now = new Date();
    const active = await tx.guildSpellBuff.findFirst({
      where: { empireId, type, expiresAt: { gt: now } },
    });
    if (active) return { error: "הקסם הזה כבר פעיל עליך." };

    const cost = spellCastCostDiamonds(spell.level);
    if (!(await spendDiamonds(tx, empireId, cost))) {
      return { error: `הקסם עולה ${cost} יהלומים — אין לך מספיק.` };
    }

    // Expired rows of this type are dead weight — clean them as we cast.
    await tx.guildSpellBuff.deleteMany({
      where: { empireId, type, expiresAt: { lte: now } },
    });
    await tx.guildSpellBuff.create({
      data: {
        empireId,
        type,
        bonusPct: guildSpellBonusPct(spell.level),
        expiresAt: new Date(now.getTime() + GUILD_SPELL_BUFF_MS),
      },
    });

    const meta = GUILD_SPELL_META[type];
    return {
      success: `${meta.icon} ${meta.label} הופעל — ${meta.effectLabel(guildSpellBonusPct(spell.level))}!`,
    };
  });
}
