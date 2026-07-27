"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * The bank screen's effect bus.
 *
 * `BankActions` (the form) and `BankVault` (the drawing) sit in different
 * branches of the page, so a successful transfer has to travel sideways for
 * the coins to fall into the vault. Two separate contexts on purpose: the
 * firing function must keep a stable identity, because the form triggers it
 * from an effect — bundling it with the changing pulse would re-fire the
 * effect every time the pulse itself changed.
 */

export type BankPulseKind = "deposit" | "withdraw";

export interface BankPulse {
  /** Monotonic id — remounts the coin layer so an identical repeat replays. */
  id: number;
  kind: BankPulseKind;
}

/** How long the coin burst is allowed to live before it is cleared. */
const PULSE_MS = 1600;

const FireContext = createContext<(kind: BankPulseKind) => void>(() => {});
const PulseContext = createContext<BankPulse | null>(null);

export function BankFxProvider({ children }: { children: ReactNode }) {
  const [pulse, setPulse] = useState<BankPulse | null>(null);
  const nextId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fire = useCallback((kind: BankPulseKind) => {
    nextId.current += 1;
    setPulse({ id: nextId.current, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPulse(null), PULSE_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <FireContext.Provider value={fire}>
      <PulseContext.Provider value={pulse}>{children}</PulseContext.Provider>
    </FireContext.Provider>
  );
}

/** Stable across renders — safe to list in an effect's dependencies. */
export function useBankFire() {
  return useContext(FireContext);
}

export function useBankPulse() {
  return useContext(PulseContext);
}
