import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Two suites, deliberately separated.
 *
 * `tests/unit` is pure game logic — no database, no network, no Next runtime —
 * so it runs in a couple of seconds anywhere, including on a machine with no
 * Postgres. That is what makes it worth running on every save.
 *
 * `tests/db` exercises the invariants that only exist *because* of concurrency:
 * guarded debits, claim-once payouts, the shared rate limiter. Those cannot be
 * tested without a real database — an in-memory fake would be testing the fake,
 * since the whole point is what Postgres does under `ON CONFLICT` and row locks.
 * They need `PRISMA_DATABASE_URL` pointing at a scratch database and are run
 * with `npm run test:db`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` is a build-time marker with no runtime; Node cannot
      // resolve it. See tests/stubs/server-only.ts.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    // Default run = the fast suite. The DB suite opts in via its own script.
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/lib/game/**/*.ts"],
      // Catalogue/label modules and client-only view helpers carry no logic
      // worth asserting; counting them only makes the number look worse than
      // the coverage actually is.
      exclude: ["src/lib/game/**/*.d.ts"],
      reporter: ["text-summary", "html"],
    },
  },
});
