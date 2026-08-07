/**
 * שער קראלדור — the animated backdrop behind every screen in front of the game
 * (login, register, onboarding, verify-email, 404).
 *
 * This is the first thing a visitor ever sees of the game, and until now it was
 * a form on a flat gradient. The scene gives that first impression the thing
 * the rest of the site already has: a world that is awake. A besieged capital
 * at night — battlements, lit windows, a warglow on the horizon that flares
 * when a distant engine fires, embers riding the updraught, ravens crossing.
 *
 * It follows the same recipe as every other scene on the site (see the `gate-`
 * block at the end of globals.css):
 *
 *  - Pure CSS motion. No libraries, no JS, no client component — this file is a
 *    server component that renders markup and hands the animation to the
 *    stylesheet, so the scene costs the first paint nothing and cannot delay
 *    the form behind a hydration wait.
 *  - **No `Math.random()`.** Every position, size and delay comes from the fixed
 *    tables below, so the server's HTML and the client's first render agree.
 *  - Everything animates `transform`/`opacity` only, and the whole block is
 *    silenced under `prefers-reduced-motion: reduce`.
 *
 * The scene is `position: fixed` and `aria-hidden`: it sits behind the content
 * at z-0 and never scrolls, so a tall screen (registration, with the class
 * picker) scrolls its form over a still horizon rather than dragging a skyline
 * along with it.
 */

/** Stars: x/y in %, `d` the twinkle offset, `s` the size in px. */
const STARS = [
  { x: 6, y: 12, d: 0.0, s: 2 },
  { x: 13, y: 30, d: 1.8, s: 1 },
  { x: 18, y: 7, d: 3.1, s: 2 },
  { x: 24, y: 21, d: 0.9, s: 1 },
  { x: 29, y: 38, d: 2.4, s: 1 },
  { x: 33, y: 9, d: 1.2, s: 2 },
  { x: 39, y: 26, d: 3.6, s: 1 },
  { x: 44, y: 5, d: 0.4, s: 1 },
  { x: 48, y: 34, d: 2.9, s: 2 },
  { x: 53, y: 15, d: 1.5, s: 1 },
  { x: 58, y: 29, d: 3.3, s: 1 },
  { x: 62, y: 8, d: 0.7, s: 2 },
  { x: 67, y: 22, d: 2.1, s: 1 },
  { x: 71, y: 40, d: 1.1, s: 1 },
  { x: 76, y: 11, d: 3.8, s: 2 },
  { x: 81, y: 27, d: 0.2, s: 1 },
  { x: 85, y: 6, d: 2.6, s: 1 },
  { x: 90, y: 33, d: 1.7, s: 2 },
  { x: 94, y: 18, d: 3.0, s: 1 },
  { x: 97, y: 43, d: 0.6, s: 1 },
  { x: 3, y: 45, d: 2.2, s: 1 },
  { x: 36, y: 48, d: 3.4, s: 1 },
  { x: 65, y: 47, d: 1.4, s: 1 },
];

/**
 * The capital's silhouette, drawn left to right. `x`/`w`/`h` are percentages of
 * the skyline strip; `kind` picks the roofline:
 *
 *   wall  — a low crenellated curtain wall, no windows worth lighting
 *   keep  — a square tower with battlements and a grid of lit windows
 *   spire — a pointed roof flying a pennant
 *
 * `lit` is the window-flicker offset, so no two towers breathe together.
 */
const TOWERS = [
  { x: -2, w: 14, h: 34, kind: "wall", lit: 0 },
  { x: 9, w: 7, h: 58, kind: "keep", lit: 1.3 },
  { x: 15, w: 10, h: 40, kind: "wall", lit: 0 },
  { x: 23, w: 6, h: 72, kind: "spire", lit: 2.6 },
  { x: 28, w: 11, h: 44, kind: "wall", lit: 0 },
  { x: 37, w: 8, h: 64, kind: "keep", lit: 0.7 },
  { x: 44, w: 12, h: 96, kind: "spire", lit: 1.9 },
  { x: 55, w: 8, h: 62, kind: "keep", lit: 3.2 },
  { x: 62, w: 10, h: 42, kind: "wall", lit: 0 },
  { x: 70, w: 7, h: 76, kind: "spire", lit: 0.4 },
  { x: 76, w: 9, h: 48, kind: "wall", lit: 0 },
  { x: 84, w: 7, h: 60, kind: "keep", lit: 2.2 },
  { x: 90, w: 14, h: 36, kind: "wall", lit: 0 },
];

/** Embers off the rooftops: x in %, `d` delay, `dur` climb time, `s` scale. */
const EMBERS = [
  { x: 8, d: 0.0, dur: 13, s: 1.0 },
  { x: 16, d: 4.5, dur: 17, s: 0.7 },
  { x: 23, d: 9.0, dur: 15, s: 1.2 },
  { x: 31, d: 2.0, dur: 19, s: 0.6 },
  { x: 38, d: 11.5, dur: 14, s: 1.0 },
  { x: 45, d: 6.5, dur: 16, s: 0.8 },
  { x: 52, d: 1.0, dur: 21, s: 1.3 },
  { x: 59, d: 13.0, dur: 15, s: 0.7 },
  { x: 66, d: 7.5, dur: 18, s: 1.0 },
  { x: 73, d: 3.5, dur: 14, s: 0.9 },
  { x: 80, d: 10.0, dur: 20, s: 1.2 },
  { x: 88, d: 5.5, dur: 16, s: 0.7 },
  { x: 95, d: 12.5, dur: 18, s: 1.0 },
];

/** Cloud bands: y in %, `dur` the crossing time, `o` the opacity, `h` height. */
const CLOUDS = [
  { y: 14, dur: 90, d: 0, o: 0.1, h: 5 },
  { y: 27, dur: 130, d: -40, o: 0.07, h: 7 },
  { y: 41, dur: 70, d: -20, o: 0.12, h: 4 },
  { y: 52, dur: 110, d: -70, o: 0.08, h: 6 },
];

/** A flock crossing the moon. `y` in %, `d` the stagger, `s` the scale. */
const BIRDS = [
  { y: 19, d: 0, s: 1.0, dur: 34 },
  { y: 23, d: 1.4, s: 0.75, dur: 34 },
  { y: 16, d: 2.6, s: 0.6, dur: 34 },
];

export function GateScene() {
  return (
    <div className="gate-scene" aria-hidden>
      {/* The night itself, and the fires beyond the walls. */}
      <div className="gate-sky" />
      <div className="gate-warglow" />

      <div className="gate-stars">
        {STARS.map((s, i) => (
          <span
            key={i}
            style={
              {
                "--x": `${s.x}%`,
                "--y": `${s.y}%`,
                "--d": `${s.d}s`,
                "--s": `${s.s}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="gate-moon" />

      <div className="gate-birds">
        {BIRDS.map((b, i) => (
          <span
            key={i}
            style={
              {
                "--y": `${b.y}%`,
                "--d": `${b.d}s`,
                "--s": b.s,
                "--dur": `${b.dur}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="gate-clouds">
        {CLOUDS.map((c, i) => (
          <span
            key={i}
            style={
              {
                "--y": `${c.y}%`,
                "--h": `${c.h}%`,
                "--dur": `${c.dur}s`,
                "--d": `${c.d}s`,
                "--o": c.o,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Two ridges behind the city, so the horizon has depth before the
          silhouette starts. */}
      <div className="gate-ridge gate-ridge-far" />
      <div className="gate-ridge gate-ridge-near" />

      {/* The flash of a distant engine, once every twenty-odd seconds. It is
          the only thing in the scene that is *not* a loop you can read as a
          loop — which is the point: it makes the horizon feel occupied. Behind
          the skyline, so it throws the silhouette into relief. */}
      <div className="gate-flash" />

      <div className="gate-skyline">
        {TOWERS.map((t, i) => (
          <span
            key={i}
            className={`gate-tower gate-${t.kind}`}
            style={
              {
                "--i": i,
                "--x": `${t.x}%`,
                "--w": `${t.w}%`,
                "--h": `${t.h}%`,
                "--lit": `${t.lit}s`,
              } as React.CSSProperties
            }
          >
            {t.kind === "spire" && <i className="gate-pennant" />}
          </span>
        ))}
      </div>

      <div className="gate-embers">
        {EMBERS.map((e, i) => (
          <span
            key={i}
            style={
              {
                "--x": `${e.x}%`,
                "--d": `${e.d}s`,
                "--dur": `${e.dur}s`,
                "--s": e.s,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Mist over the rooftops, and a vignette that pulls the eye back to the
          form in the middle. Both sit in front of the city. */}
      <div className="gate-fog" />
      <div className="gate-vignette" />
    </div>
  );
}
