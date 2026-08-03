import type { IconName } from "@/components/ui/Icon";

/**
 * ------------------------------ VIP · חותם המלוכה ------------------------------
 *
 * A one-off purchase that buys **time, not power**.
 *
 * Everything VIP unlocks is a bulk version of a button the game already gives
 * every player for free: storing four warehouses instead of one, turning every
 * free citizen into soldiers in a click, raising all four warehouses a level.
 * Nothing here produces a resource, adds a point of power, blocks an attack or
 * shortens a cooldown — a paying player ends a session in exactly the state a
 * patient one does, just with eight fewer clicks between him and it.
 *
 * That line is the whole reason the pass can be sold at all, and it is worth
 * defending: the moment a VIP button grants something a free player cannot
 * reach at any click count, the shop stops selling convenience and starts
 * selling the ladder.
 *
 * It never expires. Not a subscription and not a timed buff — there is no
 * `vipUntil`, no countdown in the command bar and no expiry mail to write. It
 * lives on `Empire.vipSince`, so it lasts as long as the empire does (a world
 * reset rebuilds empires and takes it with them, exactly like every other thing
 * an empire owns).
 */

/** Diamonds for the pass. One purchase, forever. */
export const VIP_COST = 1000;

export const VIP_LABEL = "חותם המלוכה";
export const VIP_SHORT = "VIP";

/** Anything holding a `vipSince` stamp — an empire row, or a select of one. */
export interface VipHolder {
  vipSince: Date | null;
}

/** Whether this empire holds the pass. The column is the entitlement. */
export function isVip(empire: VipHolder | null | undefined): boolean {
  return empire?.vipSince != null;
}

/** The perks, as the shop card and the guide list them. */
export interface VipPerk {
  icon: IconName;
  title: string;
  desc: string;
}

export const VIP_PERKS: VipPerk[] = [
  {
    icon: "storage",
    title: "אחסן הכל · שחרר הכל",
    desc: "כל ארבעת המחסנים בלחיצה אחת, במקום שמונה לחיצות בארבעה כרטיסים.",
  },
  {
    icon: "army",
    title: "אמן הכל",
    desc: "כל האזרחים הפנויים הופכים ליחידה שבחרת — בלי להקליד כמות.",
  },
  {
    icon: "upgrades",
    title: "שדרג את כל המחסנים",
    desc: "מעלה רמה בכל מחסן שאתה יכול לממן, בלחיצה אחת.",
  },
  {
    icon: "spark",
    title: "מפקדה מהירה בכל מסך",
    desc: "כפתור בסרגל העליון שפותח את כל הפעולות האלה — ואת הבנק — מכל עמוד במשחק.",
  },
];

/** The one-liner shown wherever a locked VIP control explains itself. */
export const VIP_LOCK_HINT = `נעול · נפתח עם ${VIP_LABEL}`;
