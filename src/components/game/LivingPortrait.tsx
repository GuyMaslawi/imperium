"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { DepthParallax } from "@/components/game/DepthParallax";
import { portraitAssets } from "@/lib/game/portraitAssets";

/**
 * Ember specks drifting up the frame. The table is fixed rather than random so
 * the server and the client render identical markup — a randomised layout would
 * hydrate mismatched. `x` is the column (%), `dx` the sideways drift (px).
 */
const EMBERS = [
  { x: 14, size: 3, dur: 12, delay: 0, dx: 12, opacity: 0.75 },
  { x: 28, size: 2, dur: 16, delay: 3.2, dx: -9, opacity: 0.55 },
  { x: 41, size: 4, dur: 14, delay: 6.5, dx: 16, opacity: 0.6 },
  { x: 55, size: 2, dur: 18, delay: 1.4, dx: -14, opacity: 0.5 },
  { x: 63, size: 3, dur: 13, delay: 8.1, dx: 8, opacity: 0.7 },
  { x: 72, size: 2, dur: 17, delay: 4.6, dx: -6, opacity: 0.45 },
  { x: 84, size: 3, dur: 15, delay: 10.3, dx: 13, opacity: 0.65 },
  { x: 92, size: 2, dur: 19, delay: 7.2, dx: -11, opacity: 0.4 },
  { x: 6, size: 2, dur: 20, delay: 12.0, dx: 10, opacity: 0.42 },
  { x: 48, size: 3, dur: 11, delay: 14.5, dx: -8, opacity: 0.6 },
];

/** css | depth (2.5D shader) | clip (looping video). */
type Mode = "css" | "depth" | "clip";

const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * Whether the visitor has asked the interface to hold still. Modelled as an
 * external store rather than effect-driven state so the server renders "no
 * motion", hydration matches, and a visitor toggling the setting mid-session is
 * obeyed immediately instead of on the next navigation.
 */
function useReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

const noSubscribe = () => () => {};

/**
 * False through SSR and the hydration pass, true afterwards — the seam where it
 * becomes legal to ask what this device can actually do.
 */
function useMounted() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

/** Metered or explicitly data-saving connections never get a video loop. */
function isDataSaving() {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (!conn) return false;
  return Boolean(conn.saveData) || /^(slow-)?2g$/.test(conn.effectiveType ?? "");
}

/**
 * A character portrait that behaves like it is alive rather than printed, at
 * whatever tier its art supports.
 *
 * Every portrait gets the free tier: the still breathes on a slow zoom-and-drift
 * cycle, leans away from the pointer, throws embers in the subject's accent
 * colour and carries a pulsing halo. Where the build found a depth map beside
 * the still, `rich` portraits upgrade to a shader that gives the figure real
 * volume; where it found a clip, they upgrade again to full motion. Callers
 * never name those files — {@link portraitAssets} reports what exists, so
 * producing the art is the whole of the work.
 *
 * The tier is chosen after mount, not during render: the server has no idea
 * whether this visitor can run WebGL, is on a metered connection, or has asked
 * for stillness, and guessing would either mismatch on hydration or ship motion
 * to someone who declined it. So the still renders first and the upgrade paints
 * over it once it is genuinely ready — which doubles as the failure path, since
 * an upgrade that never arrives just leaves a portrait that already looked right.
 *
 * The art is the only thing that moves: framing gradients passed as `children`
 * are drawn above it but stay pinned to the frame, so a fade meant to blend the
 * portrait into the panel edge never slides off that edge.
 */
export function LivingPortrait({
  src,
  alt,
  className = "",
  objectPosition = "50% 0%",
  accent = "228 195 90",
  embers = 0,
  tilt = 8,
  drift = 26,
  sheen = false,
  halo = true,
  rich = false,
  depthStrength = 0.05,
  life = 1,
  children,
}: {
  src: string;
  alt: string;
  /** Classes for the clipping frame — positioning and rounding live here. */
  className?: string;
  objectPosition?: string;
  /** rgb triple ("228 195 90") tinting the embers and the halo. */
  accent?: string;
  /** How many ember specks rise off the art; 0 disables them. */
  embers?: number;
  /** Pointer-parallax travel in px. Must stay under the art's overscan, so
   *  small frames want a small number; 0 disables the lean. */
  tilt?: number;
  /** Seconds for one full breathe-and-drift cycle. */
  drift?: number;
  /** An occasional light sweep across the art. */
  sheen?: boolean;
  /** A pulsing halo bled in from the frame edges. */
  halo?: boolean;
  /** Allow the expensive tiers. Reserve it for portraits large enough to repay
   *  a GL context or a video download — a 56px avatar is not one. */
  rich?: boolean;
  /** Depth displacement as a fraction of the image, at full deflection. */
  depthStrength?: number;
  /** Scales the figure's own breathing and sway (depth tier only). 0 stills it. */
  life?: number;
  /** Framing gradients — drawn above the art, below the embers. */
  children?: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  /** Pointer aim in -1..1. Mutated, never state: the shader reads it every
   *  frame, and re-rendering React on pointermove would be absurd. */
  const aim = useRef({ x: 0, y: 0 });

  const [upgraded, setUpgraded] = useState(false);
  const assets = portraitAssets(src);
  const reduced = useReducedMotion();
  const mounted = useMounted();

  // Which tier this portrait actually gets. Derived, never stored: the inputs
  // are all external facts, and holding a copy of them in state would only
  // create a window where the copy is wrong.
  const mode: Mode =
    !rich || !mounted
      ? "css"
      : (assets.webm || assets.mp4) && !reduced && !isDataSaving()
        ? "clip"
        : assets.depth
          ? "depth"
          : "css";

  // A fresh callback each render would land in DepthParallax's dependency list
  // and rebuild the GL context on every parent update.
  const markUpgraded = useCallback(() => setUpgraded(true), []);

  const flush = useCallback(() => {
    raf.current = 0;
    const el = frame.current;
    if (!el) return;
    el.style.setProperty("--lp-tx", `${(aim.current.x * -tilt).toFixed(2)}px`);
    el.style.setProperty("--lp-ty", `${(aim.current.y * -tilt).toFixed(2)}px`);
  }, [tilt]);

  const setAim = useCallback(
    (x: number, y: number) => {
      aim.current.x = x;
      aim.current.y = y;
      // The shader polls the ref; only the CSS tier needs a write.
      if (tilt > 0 && !raf.current) raf.current = requestAnimationFrame(flush);
    },
    [flush, tilt],
  );

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Touch and pen get no lean — there is no hover to drive it, and reacting to
  // a tap would read as a glitch rather than as depth.
  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = frame.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAim(
      Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)),
      Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2)),
    );
  };

  const style = {
    "--lp-accent": accent,
    "--lp-drift": `${drift}s`,
  } as CSSProperties;

  const clip = mode === "clip";
  const depth = mode === "depth" && assets.depth;

  return (
    <div
      ref={frame}
      style={style}
      onPointerMove={handleMove}
      onPointerLeave={() => setAim(0, 0)}
      className={`lp-frame ${className}`}
    >
      {/* The shader owns the lean in depth mode; leaving the CSS one running
          would stack a second, differently-timed parallax on top of it. */}
      <div className={`lp-tilt${depth && upgraded ? " lp-tilt-locked" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`lp-art${upgraded ? " lp-art-still" : ""}`}
          style={{ objectPosition }}
          src={src}
          alt={alt}
        />

        {clip && (
          <video
            className={`lp-upgrade${upgraded ? " lp-upgrade-in" : ""}`}
            style={{ objectPosition }}
            poster={src}
            aria-hidden
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            onPlaying={markUpgraded}
          >
            {assets.webm && <source src={assets.webm} type="video/webm" />}
            {assets.mp4 && <source src={assets.mp4} type="video/mp4" />}
          </video>
        )}

        {depth && (
          <div className={`lp-upgrade${upgraded ? " lp-upgrade-in" : ""}`}>
            <DepthParallax
              image={src}
              depth={assets.depth!}
              objectPosition={objectPosition}
              strength={depthStrength}
              focus={assets.focus}
              life={life}
              drift={drift}
              animate={!reduced}
              aim={aim}
              onReady={markUpgraded}
            />
          </div>
        )}

        {sheen && <span aria-hidden className="lp-sheen" />}
      </div>

      {children}

      {halo && <span aria-hidden className="lp-halo" />}

      {embers > 0 &&
        EMBERS.slice(0, embers).map((e, i) => (
          <span
            key={i}
            aria-hidden
            className="lp-ember-track"
            style={
              {
                left: `${e.x}%`,
                "--lp-dur": `${e.dur}s`,
                "--lp-delay": `${e.delay}s`,
                "--lp-dx": `${e.dx}px`,
                "--lp-o": e.opacity,
              } as CSSProperties
            }
          >
            <span className="lp-ember" style={{ width: e.size, height: e.size }} />
          </span>
        ))}
    </div>
  );
}
