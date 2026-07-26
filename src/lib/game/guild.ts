import type { GuildRole, GuildSpellType } from "@prisma/client";
import type { IconName } from "@/components/ui/Icon";

/* ------------------------------ creation & capacity ------------------------------ */

/** Founding a guild costs diamonds — name only, no tag. */
export const GUILD_CREATION_COST_DIAMONDS = 750;

export const GUILD_NAME_MIN_LENGTH = 2;
export const GUILD_NAME_MAX_LENGTH = 30;

/**
 * Member capacity = 1 + capacity level, so a fresh guild (level 1) holds
 * 2 members and each shop expansion adds one seat.
 */
export function guildCapacity(capacityLevel: number): number {
  return 1 + capacityLevel;
}

/** Top capacity level — 10 members. */
export const GUILD_CAPACITY_MAX_LEVEL = 9;

/**
 * Gold cost to expand from `level` to `level + 1`. Guilds have no treasury, so
 * the leader or deputy who buys the seat pays it from their own available gold.
 */
export function capacityUpgradeCostGold(level: number): number {
  return 50_000 * (level + 1);
}

/* ------------------------------ guild aid ------------------------------ */

/**
 * Guild aid pools the whole guild's strength: every member fights with a flat
 * power bonus equal to `aidLevel`% of the guild's total military power — both
 * when attacking and when being attacked — up to a 10% cap. Level starts at 0
 * (no aid) and any member can raise it by paying from their own gold.
 */
export const GUILD_AID_MAX_LEVEL = 10;

export function guildAidPct(level: number): number {
  return Math.min(GUILD_AID_MAX_LEVEL, Math.max(0, level));
}

/**
 * Gold cost to raise aid from `level` to `level + 1`. There is no guild bank —
 * the member who wants the upgrade pays it from their own available gold.
 */
export function aidUpgradeCostGold(level: number): number {
  return 75_000 * (level + 1);
}

/* ------------------------------ spells ------------------------------ */

/**
 * Guild help is measured in power: each spell's level IS its bonus percent.
 * It starts at 1% and the shop upgrades it up to the 30% help cap.
 */
export const GUILD_SPELL_MAX_LEVEL = 30;

export function guildSpellBonusPct(level: number): number {
  return Math.min(GUILD_SPELL_MAX_LEVEL, Math.max(0, level));
}

/** Diamond cost to upgrade a spell from `level` to `level + 1`. */
export function spellUpgradeCostDiamonds(level: number): number {
  return 40 * (level + 1);
}

/** Casting a spell grants the caster a personal buff for 24 hours. */
export const GUILD_SPELL_BUFF_HOURS = 24;
export const GUILD_SPELL_BUFF_MS = GUILD_SPELL_BUFF_HOURS * 60 * 60 * 1000;

/** Diamond cost to cast a spell at the guild's current level. */
export function spellCastCostDiamonds(level: number): number {
  return 10 + guildSpellBonusPct(level) * 2;
}

export interface GuildSpellMeta {
  label: string;
  icon: IconName;
  description: string;
  /** Human-readable effect for a given bonus percent. */
  effectLabel: (pct: number) => string;
}

export const GUILD_SPELL_META: Record<GuildSpellType, GuildSpellMeta> = {
  ATTACK: {
    label: "קסם התקפה",
    icon: "attack",
    description: "מגביר את כוח ההתקפה שלך בקרבות.",
    effectLabel: (pct) => `+${pct}% לכוח ההתקפה למשך ${GUILD_SPELL_BUFF_HOURS} שעות`,
  },
  DEFENSE: {
    label: "קסם הגנה",
    icon: "shield",
    description: "מגביר את כוח ההגנה שלך כשמתקיפים אותך.",
    effectLabel: (pct) => `+${pct}% לכוח ההגנה למשך ${GUILD_SPELL_BUFF_HOURS} שעות`,
  },
  SPY: {
    label: "קסם ריגול",
    icon: "spy",
    description: "משפר את סיכויי ההצלחה של משימות הריגול שלך.",
    effectLabel: (pct) => `+${pct}% לסיכויי הריגול למשך ${GUILD_SPELL_BUFF_HOURS} שעות`,
  },
  RESOURCES: {
    label: "קסם משאבים",
    icon: "mine",
    description: "מאיץ את תפוקת המכרות של האימפריה שלך.",
    effectLabel: (pct) => `+${pct}% לתפוקת המכרות למשך ${GUILD_SPELL_BUFF_HOURS} שעות`,
  },
};

export const GUILD_SPELL_TYPES = Object.keys(GUILD_SPELL_META) as GuildSpellType[];

/* ------------------------------ roles ------------------------------ */

export interface GuildRoleMeta {
  label: string;
  icon: string;
  /** Sort order in the member list — leader first. */
  order: number;
}

export const GUILD_ROLE_META: Record<GuildRole, GuildRoleMeta> = {
  LEADER: { label: "מנהיג", icon: "👑", order: 0 },
  DEPUTY: { label: "סגן", icon: "⭐", order: 1 },
  MEMBER: { label: "חבר", icon: "🪖", order: 2 },
};
