import type { ComponentType, SVGProps } from "react";
import {
  GiTwoCoins, GiWoodPile, GiMetalBar, GiStoneBlock, GiCutDiamond,
  GiThreeFriends, GiSandsOfTime, GiSpartanHelmet, GiSpy, GiCrossedSwords,
  GiCheckedShield, GiCastle, GiAnvil, GiMineWagon, GiBank, GiChest,
  GiUpgrade, GiFlyingFlag, GiBowman, GiTrophy, GiRibbonMedal,
  GiScrollUnfurled, GiEnvelope, GiGears, GiExitDoor, GiCrown,
  GiRollingDices, GiTargetPrize, GiShoppingBag, GiPresent, GiSparkles,
  GiHeartInside, GiHealthPotion,
} from "react-icons/gi";

/**
 * IMPERIUM icon set — professional game-art silhouettes (game-icons.net via
 * react-icons). Each icon renders in `currentColor`, so it takes the antique
 * gold of a heading or the bone tone of the nav automatically. One shared
 * component keeps every call site (`<Icon name="gold" />`) stable regardless of
 * which underlying glyph we choose.
 */

export type IconName =
  | "gold" | "wood" | "iron" | "stone" | "diamond" | "citizens" | "turns"
  | "army" | "spy" | "attack" | "shield" | "base" | "factory" | "mine"
  | "bank" | "storage" | "upgrades" | "guild" | "hero" | "rankings"
  | "achievements" | "reports" | "messages" | "settings" | "logout"
  | "crown" | "dice" | "wheel" | "shop" | "gift" | "spark" | "heart" | "potion";

const GLYPHS: Record<IconName, ComponentType<SVGProps<SVGSVGElement>>> = {
  gold: GiTwoCoins,
  wood: GiWoodPile,
  iron: GiMetalBar,
  stone: GiStoneBlock,
  diamond: GiCutDiamond,
  citizens: GiThreeFriends,
  turns: GiSandsOfTime,
  army: GiSpartanHelmet,
  spy: GiSpy,
  attack: GiCrossedSwords,
  shield: GiCheckedShield,
  base: GiCastle,
  factory: GiAnvil,
  mine: GiMineWagon,
  bank: GiBank,
  storage: GiChest,
  upgrades: GiUpgrade,
  guild: GiFlyingFlag,
  hero: GiBowman,
  rankings: GiTrophy,
  achievements: GiRibbonMedal,
  reports: GiScrollUnfurled,
  messages: GiEnvelope,
  settings: GiGears,
  logout: GiExitDoor,
  crown: GiCrown,
  dice: GiRollingDices,
  wheel: GiTargetPrize,
  shop: GiShoppingBag,
  gift: GiPresent,
  spark: GiSparkles,
  heart: GiHeartInside,
  potion: GiHealthPotion,
};

export function Icon({
  name,
  size = 20,
  className,
  title,
  ...rest
}: { name: IconName; size?: number; title?: string } & SVGProps<SVGSVGElement>) {
  const Glyph = GLYPHS[name];
  return (
    <Glyph
      width={size}
      height={size}
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
    </Glyph>
  );
}

/**
 * Map a resource key to its icon name — the single source of truth for which
 * glyph a resource wears. Every surface (command bar, mines, warehouses, wheel,
 * season pass, boss loot, hero items, battle reports) resolves through here, so
 * a resource never shows two different icons in two different screens.
 *
 * Accepts both the singular `diamond` and the `diamonds` balance key, since
 * call sites legitimately hold either.
 */
export const RESOURCE_ICON: Record<string, IconName> = {
  gold: "gold", wood: "wood", iron: "iron", stone: "stone",
  diamond: "diamond", diamonds: "diamond", citizens: "citizens", turns: "turns",
};

/**
 * Authentic per-resource icon tint, so each resource reads at a glance — and
 * the companion source of truth to `RESOURCE_ICON`. Pair the two whenever a
 * resource is shown as a value; the only icons that opt out are section-heading
 * ornaments, which follow the crimson heading language instead.
 */
export const RESOURCE_ICON_COLOR: Record<string, string> = {
  gold: "text-gold-bright",
  wood: "text-amber-600",
  iron: "text-slate-300",
  stone: "text-stone-400",
  diamond: "text-cyan-300",
  diamonds: "text-cyan-300",
  citizens: "text-bone",
  turns: "text-emerald-400",
};

/** Icon name + tint for a resource key, ready to spread onto `<Icon>`. */
export function resourceIcon(key: string): { name: IconName; className: string } {
  return { name: RESOURCE_ICON[key], className: RESOURCE_ICON_COLOR[key] };
}
