/**
 * Stub for the `server-only` package under test.
 *
 * `server-only` has no runtime behaviour at all — it exists so a bundler errors
 * when server code is pulled into a client bundle. Node cannot resolve it
 * outside Next's build, so the modules that (correctly) import it would be
 * untestable without this. Aliased in vitest.config.ts.
 */
export {};
