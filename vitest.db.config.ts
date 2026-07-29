import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The database suite. Run with `npm run test:db`, never as part of `npm test`.
 *
 * These tests exist because the invariants they cover are *properties of
 * Postgres*, not of our TypeScript: a guarded `updateMany(gte)` that cannot
 * overdraw, an `ON CONFLICT` counter that cannot be raced past its limit, a
 * settlement that pays exactly once. Mocking the database here would mean
 * asserting that the mock behaves the way we assumed — which is precisely the
 * assumption that was wrong in every concurrency bug this project has shipped.
 *
 * They run serially (one file at a time, no parallel suites) because they share
 * one database, and every one of them cleans up the rows it created.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    // A cold Postgres connection plus a 30-way concurrent burst needs more than
    // the 5s default.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
