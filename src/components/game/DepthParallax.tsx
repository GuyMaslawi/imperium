"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

/**
 * Renders a still through its depth map so the figure genuinely separates from
 * its background: near pixels swing further than far ones as the pointer moves,
 * which is the cue the brain reads as volume. A flat CSS lean can only slide the
 * whole plate at once and never produces it.
 *
 * The displacement is solved by refinement rather than in one step. Sampling the
 * depth at the *original* pixel and shifting by it smears every silhouette,
 * because the depth belongs to whatever the pixel used to be; re-reading the
 * depth at each newly displaced position converges on the pixel that truly
 * belongs there, and edges stay intact. Four passes is where the improvement
 * stops being visible.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2 uAim;       // pointer, -1..1
uniform vec2 uUvScale;   // cover-fit window
uniform vec2 uUvOffset;
uniform vec2 uDrift;     // slow ambient wander
uniform float uZoom;     // breathing overscan
uniform float uStrength;
uniform float uFocus;    // depth that stays pinned
uniform float uBreathe;  // figure-only swell, signed
uniform float uSway;     // figure-only drift, signed, strongest low in frame

void main() {
  // canvas space -> image space: drift about the centre, then crop to cover
  vec2 uv = (vUv - 0.5) / uZoom + 0.5;
  uv = uv * uUvScale + uUvOffset + uDrift;

  // How much this pixel belongs to the subject rather than the scene behind it.
  // The depth map already encodes exactly that, so it doubles as a free matte —
  // no segmentation pass, and the edge is soft enough not to cut a hard seam.
  float near = texture2D(uDepth, clamp(uv, 0.0, 1.0)).r;
  float subject = smoothstep(uFocus - 0.12, uFocus + 0.18, near);

  // Breathing: the figure swells a hair about the middle of the frame while the
  // background holds still. Moving the whole plate would read as a camera push;
  // moving only the near pixels reads as a chest.
  vec2 pivot = uUvOffset + uUvScale * 0.5;
  vec2 life = (uv - pivot) * (uBreathe * subject);

  // Sway builds toward the foot of the frame, so cloaks and robes stir while
  // heads stay put — the opposite would look like a nod.
  float height = (uv.y - uUvOffset.y) / max(uUvScale.y, 0.0001);
  life.x += uSway * subject * (1.0 - smoothstep(0.0, 0.75, height));

  vec2 base = uv + life;

  vec2 travel = uAim * uStrength;
  vec2 p = base;
  for (int i = 0; i < 4; i++) {
    float d = texture2D(uDepth, clamp(p, 0.0, 1.0)).r;
    p = base + travel * (d - uFocus);
  }

  gl_FragColor = texture2D(uImage, clamp(p, 0.0, 1.0));
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Non-power-of-two art is the norm here, so: clamped, unmipped, linear. */
function upload(gl: WebGLRenderingContext, image: HTMLImageElement) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return tex;
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`portrait texture failed: ${src}`));
    img.src = src;
  });
}

/** "50% 0%" -> [0.5, 0], measured from the top-left like CSS does. */
function parseFocus(objectPosition: string): [number, number] {
  const parts = objectPosition.trim().split(/\s+/);
  const pct = (v: string | undefined, fallback: number) => {
    const n = Number.parseFloat(v ?? "");
    return Number.isFinite(n) ? n / 100 : fallback;
  };
  return [pct(parts[0], 0.5), pct(parts[1], 0.5)];
}

export function DepthParallax({
  image,
  depth,
  objectPosition = "50% 0%",
  strength = 0.05,
  focus = 0.5,
  life = 1,
  breathPeriod = 4.6,
  zoom = 1.06,
  drift = 26,
  animate,
  aim,
  onReady,
}: {
  image: string;
  depth: string;
  objectPosition?: string;
  /** Peak displacement as a fraction of the image, at full pointer deflection. */
  strength?: number;
  /** The depth that stays pinned; everything else parallaxes around it. */
  focus?: number;
  /** Scales the figure's own breathing and sway. 0 holds the figure still. */
  life?: number;
  /** Seconds per breath. Deliberately far shorter than `drift`, which is what
   *  separates "the character is alive" from "the camera is moving". */
  breathPeriod?: number;
  /** Overscan, so displaced samples never reach past the art's edge. */
  zoom?: number;
  /** Seconds per breathe-and-wander cycle. */
  drift?: number;
  /** False under prefers-reduced-motion: one static frame, no loop. */
  animate: boolean;
  /** Pointer aim in -1..1, mutated by the parent so moving it costs no render. */
  aim: MutableRefObject<{ x: number; y: number }>;
  /** Fired once the canvas is actually painting, so the still can stand down. */
  onReady?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read inside the render loop rather than closed over, so a prop change never
  // means tearing down the GL context. A frame of lag is invisible at 60fps.
  const live = useRef({ strength, focus, life, breathPeriod, zoom, drift, animate, objectPosition });
  useEffect(() => {
    live.current = { strength, focus, life, breathPeriod, zoom, drift, animate, objectPosition };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let frame = 0;
    let gl: WebGLRenderingContext | null = null;
    const smoothed = { x: 0, y: 0 };
    let visible = true;
    let observer: IntersectionObserver | null = null;

    const start = async () => {
      let art: HTMLImageElement;
      let depthMap: HTMLImageElement;
      try {
        [art, depthMap] = await Promise.all([load(image), load(depth)]);
      } catch {
        return; // the still underneath simply stays — nothing to clean up yet
      }
      if (disposed) return;

      gl =
        canvas.getContext("webgl", {
          alpha: false,
          antialias: false,
          depth: false,
          powerPreference: "low-power",
        }) ?? null;
      if (!gl) return;

      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      const program = vs && fs ? gl.createProgram() : null;
      if (!gl || !vs || !fs || !program) return;

      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      const aPos = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.activeTexture(gl.TEXTURE0);
      upload(gl, art);
      gl.activeTexture(gl.TEXTURE1);
      upload(gl, depthMap);

      const u = (name: string) => gl!.getUniformLocation(program, name);
      const uImage = u("uImage");
      const uDepth = u("uDepth");
      const uAim = u("uAim");
      const uUvScale = u("uUvScale");
      const uUvOffset = u("uUvOffset");
      const uDrift = u("uDrift");
      const uZoom = u("uZoom");
      const uStrength = u("uStrength");
      const uFocus = u("uFocus");
      const uBreathe = u("uBreathe");
      const uSway = u("uSway");

      gl.uniform1i(uImage, 0);
      gl.uniform1i(uDepth, 1);

      const imageAspect = art.naturalWidth / art.naturalHeight;
      let cw = 0;
      let ch = 0;

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
        const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (w === cw && h === ch) return;
        cw = w;
        ch = h;
        canvas.width = w;
        canvas.height = h;
        gl!.viewport(0, 0, w, h);
      };

      const observerResize = new ResizeObserver(resize);
      observerResize.observe(canvas);

      // An off-screen portrait has nothing to say; parking the loop keeps a
      // page of them from burning frames on art nobody is looking at.
      observer = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
        },
        { threshold: 0 },
      );
      observer.observe(canvas);

      const t0 = performance.now();
      let painted = false;

      const render = (now: number) => {
        if (disposed) return;
        frame = requestAnimationFrame(render);
        const cfg = live.current;
        if (!visible && painted) return;
        resize();

        // ease toward the pointer so the figure has weight instead of snapping
        const target = cfg.animate ? aim.current : { x: 0, y: 0 };
        smoothed.x += (target.x - smoothed.x) * 0.08;
        smoothed.y += (target.y - smoothed.y) * 0.08;

        const canvasAspect = cw / ch;
        const [fx, fy] = parseFocus(cfg.objectPosition);
        let sx = 1;
        let sy = 1;
        if (canvasAspect > imageAspect) sy = imageAspect / canvasAspect;
        else sx = canvasAspect / imageAspect;
        // gl's v axis runs bottom-up, so a top anchor sits at the far end
        gl!.uniform2f(uUvScale, sx, sy);
        gl!.uniform2f(uUvOffset, (1 - sx) * fx, (1 - sy) * (1 - fy));

        const phase = cfg.animate
          ? ((now - t0) / 1000 / Math.max(1, cfg.drift)) * Math.PI * 2
          : 0;
        const breathe = cfg.animate ? (1 - Math.cos(phase)) / 2 : 0;
        gl!.uniform1f(uZoom, cfg.zoom + breathe * 0.045);
        gl!.uniform2f(uDrift, Math.sin(phase) * 0.006, Math.sin(phase * 0.7) * 0.004);
        gl!.uniform2f(uAim, smoothed.x, smoothed.y);
        gl!.uniform1f(uStrength, cfg.strength);
        gl!.uniform1f(uFocus, cfg.focus);

        // ~1.4% swell and 0.8% sway at life=1. Because only the near pixels
        // move, the silhouette samples from just outside itself, and a big
        // enough push would drag a halo of background in with it — but frame
        // diffs stayed clean out to life=2.5, so this sits well inside the
        // artifact ceiling while still being plainly visible.
        const beat = cfg.animate ? (now - t0) / 1000 : 0;
        const cycle = (period: number, offset = 0) =>
          Math.sin((beat / Math.max(0.5, period)) * Math.PI * 2 + offset);
        gl!.uniform1f(uBreathe, cycle(cfg.breathPeriod) * cfg.life * 0.014);
        gl!.uniform1f(uSway, cycle(cfg.breathPeriod * 1.7, 1.1) * cfg.life * 0.008);

        gl!.drawArrays(gl!.TRIANGLES, 0, 3);

        if (!painted) {
          painted = true;
          onReady?.();
        }
      };

      frame = requestAnimationFrame(render);

      return () => observerResize.disconnect();
    };

    const cleanupPromise = start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      void cleanupPromise.then((fn) => fn?.());
      // Free the GPU memory now rather than waiting for the context to be
      // collected — a page can only hold a dozen or so live GL contexts.
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Only the art identity should ever rebuild the context.
  }, [image, depth, aim, onReady]);

  return <canvas ref={canvasRef} className="lp-canvas" aria-hidden />;
}
