"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared client-side motion helpers.
 *
 * The animated screens (bank vault, mine rigs, warehouse silos) all need the
 * same three things: a number that rolls to its new value, a "has the first
 * frame painted yet" flag so a bar can grow from empty, and a one-shot pulse a
 * settled server action can fire. They live here so the three screens behave
 * identically instead of each re-deriving the timing.
 *
 * Everything here degrades on its own under `prefers-reduced-motion` — the
 * count-up lands in a single frame — but the *decorative* CSS still has to be
 * silenced by the reduced-motion block in globals.css.
 */

/** True when the visitor asked the OS to keep motion to a minimum. */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Counts from the previously shown value up to `value`. Starts at 0 so the
 * figure rolls in when the page first paints, then animates the delta after
 * every action that changes it.
 */
export function useCountUp(value: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  // The number the last painted frame actually showed. The roll always starts
  // from here, so a cancelled run (StrictMode's double mount, or a value that
  // changes mid-count) resumes from the digits on screen instead of jumping —
  // and, critically, never leaves the counter stranded on a value it only
  // *intended* to reach.
  const shown = useRef(0);

  useEffect(() => {
    const start = shown.current;
    if (start === value) return;
    // A zero-length roll lands on the final value in the very first frame,
    // which is how the reduced-motion case skips the count.
    const span = prefersReducedMotion() ? 0 : duration;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = span === 0 ? 1 : Math.min(1, (now - t0) / span);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(start + (value - start) * eased);
      shown.current = next;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}

/**
 * False for the first painted frame, true afterwards — the hook that lets a
 * fill level *rise* into its vessel instead of appearing already at its level.
 * The flag is flipped from a frame callback so the browser has committed the
 * empty state before the height transition starts.
 */
export function useAfterFirstPaint(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return ready;
}

export interface Pulse<K extends string = string> {
  /** Monotonic id — remount a burst layer on it so a repeat replays. */
  id: number;
  kind: K;
}

/**
 * A one-shot effect trigger owned by a single component. Fire it when a server
 * action settles and the drawing beside the form plays its burst; the pulse
 * clears itself after `ttlMs` so the burst layer unmounts.
 *
 * `fire` keeps a stable identity, so it is safe to list in the dependencies of
 * the effect that watches an action state.
 */
export function usePulse<K extends string = string>(ttlMs = 1500) {
  const [pulse, setPulse] = useState<Pulse<K> | null>(null);
  const nextId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fire = useCallback(
    (kind: K) => {
      nextId.current += 1;
      setPulse({ id: nextId.current, kind });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setPulse(null), ttlMs);
    },
    [ttlMs]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return [pulse, fire] as const;
}
