import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * `script-src` keeps `'unsafe-inline'` because the App Router streams RSC
 * payloads through inline `<script>` tags; removing it requires a per-request
 * nonce from `proxy.ts`, which forces every route dynamic. The rest of the
 * policy still buys real mitigation even with inline scripts allowed:
 * `base-uri` blocks `<base>` injection, `form-action` blocks form-hijacking
 * exfiltration, `object-src` kills plugin embeds, and the host allowlists mean
 * an injected tag cannot pull code from an attacker's origin.
 *
 * The accounts.google.com / gstatic entries are what Google Identity Services
 * needs: the GIS client script, the stylesheet it injects into our `<head>` to
 * skin the button, the iframe it renders the button into, the token endpoint it
 * calls, and the avatars it shows.
 *
 * The payment gateway (Grow) is deliberately **not** allowlisted, and does not
 * need to be. Its checkout is a full-page navigation to its own origin, which no
 * directive here governs: `connect-src` does not apply (the API calls are
 * server-to-server), `form-action` does not apply (we assign `location`, we do
 * not submit a form), and `frame-src` does not apply (nothing is embedded). If
 * the hosted page is ever moved into an iframe instead, that is the change that
 * needs `frame-src` plus `payment=` widened in the Permissions-Policy below —
 * and it should fail visibly rather than be pre-authorised now.
 */
// React evaluates code via `eval` in development to rebuild server stacks for
// the error overlay. Production builds never do, so the escape hatch is scoped
// to dev and can't weaken the deployed policy.
const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devEval} https://accounts.google.com https://apis.google.com`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://*.gstatic.com",
  "font-src 'self' data:",
  "connect-src 'self' https://accounts.google.com",
  "frame-src https://accounts.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Drop the framework banner — it tells an attacker which version to look up
  // advisories for.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Two years, preloadable. Vercel terminates TLS for us; this stops a
          // first-request downgrade on any custom domain added later.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Redundant with frame-ancestors for modern browsers, honoured by old ones.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            // `payment` is granted to our own origin only — no gateway iframe
            // to allow yet. The rest stay switched off everywhere.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
