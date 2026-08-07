"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { googleSignIn } from "@/server/actions/auth";
import { FormMessage } from "@/components/ui/FormMessage";
import { useT, useLocale } from "@/i18n/client";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** Google Identity Services will not render a button wider than this. */
const MAX_WIDTH = 400;
const MIN_WIDTH = 200;

// Minimal shape of the pieces of the Google Identity Services SDK we touch.
interface GsiCredentialResponse {
  credential?: string;
}
interface GsiClient {
  accounts: {
    id: {
      initialize: (opts: {
        client_id: string;
        callback: (res: GsiCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        opts: Record<string, unknown>
      ) => void;
    };
  };
}

/** The official four-colour mark. Google's own dark button puts it straight on
 *  black, which is why it needs no white tile here either. */
function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/**
 * "Continue with Google", in the game's own obsidian-and-gold, backed by Google
 * Identity Services.
 *
 * ## Why there are two buttons stacked
 *
 * GIS only hands out an ID token through a button *it* renders — there is no
 * "give me the credential" call to wire to a button of ours, and the OAuth code
 * flow that would allow one needs a client secret and a token exchange this app
 * has no reason to grow. So the real GIS button is still the click target; it
 * is simply transparent, and our own skin is painted over it with
 * `pointer-events: none` so every click, tap and Enter lands on Google's button
 * underneath. Hover and focus are styled from the wrapper (`:hover`,
 * `:focus-within`), which is what keeps the invisible button's keyboard focus
 * visible.
 *
 * Two consequences worth knowing before editing:
 *  - **The wrapper is sized by the GIS button, not the other way round.** The
 *    skin is `inset-0` over it, so the painted button and the clickable area
 *    can never drift apart — no dead border, no click that misses.
 *  - GIS takes its width in pixels and caps it at 400, so the width is measured
 *    from the host element and the button re-rendered when that changes.
 *
 * The mark, the wording and the proportions follow Google's branding rules; the
 * surface is ours.
 *
 * Renders nothing when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is unset, so the page
 * still works before Google is configured.
 */
export function GoogleSignInButton() {
  const t = useT();
  const locale = useLocale();
  const hostRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [width, setWidth] = useState(0);
  // Two separate facts, and the button needs BOTH before it can be rendered:
  // the SDK has loaded, and the host has been measured. The SDK half is a flag
  // set from <Script onReady> rather than the render call itself, because
  // next/script keeps the handler from the render that created it — that
  // closure held `width: 0` forever, so the one call that had the SDK bailed
  // out on the width and every call that had the width ran before the SDK
  // existed. Nothing was ever rendered and the skin sat over a hole.
  //
  // `onReady` (not `onLoad`) is also what covers a client-side navigation
  // between /login and /register: it fires on every mount of this component,
  // including when the script is already on the page.
  const [sdkReady, setSdkReady] = useState(false);
  // Set once GIS has actually put a button under the skin.
  const [ready, setReady] = useState(false);

  const handleCredential = useCallback((res: GsiCredentialResponse) => {
    const credential = res.credential;
    if (!credential) {
      setError(t("התחברות Google נכשלה, נסה שוב"));
      return;
    }
    setError(undefined);
    startTransition(async () => {
      // On success the action redirects (throws NEXT_REDIRECT) and never returns
      // here; a returned value always carries an error to show.
      const result = await googleSignIn(credential);
      if (result?.error) setError(result.error);
    });
    // `t` is memoised on the locale (see useT), so this callback is still
    // stable for the whole life of a page in one language.
  }, [t]);

  // The panel is 400px of usable width on the login screen and wider on the
  // registration screen, where the button stays centred at its 400px cap.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () =>
      setWidth(
        Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(host.clientWidth)))
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const g = (window as unknown as { google?: GsiClient }).google;
    if (!sdkReady || !g || !btnRef.current || !CLIENT_ID || !width) return;
    g.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleCredential });
    // renderButton appends, so a re-render on a width or locale change would
    // stack a second button under the skin.
    btnRef.current.replaceChildren();
    g.accounts.id.renderButton(btnRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width,
      // Google renders the button's own wording ("Continue with Google"), and
      // it takes a locale rather than inheriting the document's. Pinned to
      // "he" it stayed Hebrew on an otherwise English screen. Invisible now,
      // but it is still the button's accessible name.
      locale,
    });
    setReady(true);
  }, [sdkReady, handleCredential, locale, width]);

  if (!CLIENT_ID) return null;

  return (
    <div className="space-y-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
      />
      <div ref={hostRef} className="flex justify-center">
        <div className="gauth" data-pending={pending || undefined}>
          {/* The real button: full size, fully transparent, and the only thing
              on this screen that can actually start a Google sign-in. */}
          <div ref={btnRef} className="gauth-real" />
          {/* The skin. aria-hidden and click-through: the button underneath
              already carries the accessible name. */}
          <span aria-hidden className="gauth-skin">
            <span className="gauth-glyph">
              <GoogleG />
            </span>
            <span className="gauth-label">
              {pending ? t("מתחבר עם Google...") : t("המשך עם Google")}
            </span>
            <span className="gauth-gleam" />
          </span>
          {/* Until GIS has rendered there is nothing to click, and a button
              that looks ready but is not is worse than one that is visibly
              waking up. */}
          {!ready && <span aria-hidden className="gauth-wait" />}
        </div>
      </div>
      <FormMessage error={error} />
    </div>
  );
}

/**
 * The rule between the Google button and the email/password form. A gold
 * hairline that fades out from a diamond, rather than two flat grey lines —
 * it is the only piece of furniture between the screen's two ways in.
 */
export function AuthDivider() {
  const t = useT();
  if (!CLIENT_ID) return null;
  return (
    <div className="gauth-divider">
      <span className="gauth-rule" />
      <span className="gauth-or">{t("או")}</span>
      <span className="gauth-rule" />
    </div>
  );
}
