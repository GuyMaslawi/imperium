import type { CSSProperties } from "react";

/**
 * The material palette every ore-tinted drawing reads — mine rigs, warehouse
 * silos and the two summary banners. One table, four custom properties, so a
 * resource looks like the same substance wherever it is drawn.
 *
 * The tints are deliberately *material* colours (molten gold, cut timber, cold
 * steel, quarried granite) rather than the flat icon tints in `Icon.tsx`: the
 * icon has to read at 14px, a lit scene has to read as a pile of the stuff.
 */
export type OreKind = "gold" | "wood" | "iron" | "stone";

export interface OreTint {
  /** Shadowed bottom of a pile. */
  deep: string;
  /** The body colour. */
  mid: string;
  /** Lit crest / highlight. */
  bright: string;
  /** Translucent light this material throws — used for glows and blooms. */
  glow: string;
}

export const ORE_TINT: Record<OreKind, OreTint> = {
  gold: {
    deep: "#5f4713",
    mid: "#d3a93e",
    bright: "#f6e39b",
    glow: "rgba(228, 195, 90, 0.45)",
  },
  wood: {
    deep: "#3a2410",
    mid: "#a8622c",
    bright: "#e0a469",
    glow: "rgba(200, 124, 58, 0.38)",
  },
  iron: {
    deep: "#2b3138",
    mid: "#8f9dab",
    bright: "#dfe7f0",
    glow: "rgba(158, 178, 198, 0.34)",
  },
  stone: {
    deep: "#2e2b27",
    mid: "#8b8279",
    bright: "#d8d1c6",
    glow: "rgba(170, 160, 146, 0.30)",
  },
};

/** The four custom properties an ore-tinted scene reads, ready to spread. */
export function oreVars(resource: OreKind): CSSProperties {
  const tint = ORE_TINT[resource];
  return {
    "--ore-deep": tint.deep,
    "--ore": tint.mid,
    "--ore-bright": tint.bright,
    "--ore-glow": tint.glow,
  } as CSSProperties;
}
