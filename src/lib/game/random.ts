/**
 * Cryptographically secure replacement for `Math.random()` on anything of value.
 *
 * V8 implements `Math.random` as xorshift128+ — fast, but its internal state is
 * recoverable from a modest run of observed outputs, and this game publishes
 * outputs constantly: every wheel spin returns its winning wedge index, and
 * every attack reveals whether an item dropped. Once the state is recovered,
 * future rolls are predictable, which turns "spin when a legendary is due" into
 * a viable strategy against loot, item drops and prize wedges.
 *
 * Uses Web Crypto rather than `node:crypto` so the same module is safe to pull
 * into a Client Component bundle; `crypto.getRandomValues` is a global in Node
 * 18+ and in every browser the app supports.
 *
 * Returns a float in [0, 1) with 32 bits of entropy — the same contract as
 * `Math.random`, so it drops straight into the existing `random: () => number`
 * seams that the game logic already accepts for testability.
 */
export function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 2 ** 32;
}
