import { PORTRAIT_ASSETS } from "@/lib/game/portraitAssets.generated";

/**
 * The optional companions of a character still. Each one upgrades the portrait
 * a tier: a depth map buys real parallax, a clip buys full motion. Absent
 * fields simply mean that tier of art has not been produced yet, and the
 * portrait falls back to the tier below it.
 */
export interface PortraitAssets {
  /** Greyscale depth map — white is near, black is far. */
  depth?: string;
  /**
   * The depth that stays pinned while everything else parallaxes around it —
   * the map's median, so half the image swings each way. Measured when the map
   * was produced; absent maps fall back to the shader's default.
   */
  focus?: number;
  webm?: string;
  mp4?: string;
}

const NONE: PortraitAssets = {};

/**
 * What extra art exists for a still, by its public path. Generated at build
 * time from the files actually on disk, so this can never promise a clip that
 * would 404.
 */
export function portraitAssets(src: string): PortraitAssets {
  return PORTRAIT_ASSETS[src] ?? NONE;
}
