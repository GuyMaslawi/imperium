"use client";

import Script from "next/script";
import { useCallback, useRef, useState, useTransition } from "react";
import { googleSignIn } from "@/server/actions/auth";
import { FormMessage } from "@/components/ui/FormMessage";
import { useT, useLocale } from "@/i18n/client";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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

/**
 * "Continue with Google" button, backed by Google Identity Services.
 *
 * GIS renders its own button into `btnRef` and hands us a signed ID token in the
 * callback; we forward it to the `googleSignIn` server action, which verifies it
 * and starts a session (or routes a brand-new user to onboarding). Renders
 * nothing when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is unset, so the page still works
 * before Google is configured.
 */
export function GoogleSignInButton() {
  const t = useT();
  const locale = useLocale();
  const btnRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

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

  const init = useCallback(() => {
    const g = (window as unknown as { google?: GsiClient }).google;
    if (!g || !btnRef.current || !CLIENT_ID) return;
    g.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleCredential });
    g.accounts.id.renderButton(btnRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 320,
      // Google renders the button's own wording ("Continue with Google"), and
      // it takes a locale rather than inheriting the document's. Pinned to
      // "he" it stayed Hebrew on an otherwise English screen — the one control
      // above the sign-in form, in the wrong language.
      locale,
    });
  }, [handleCredential, locale]);

  if (!CLIENT_ID) return null;

  return (
    <div className="space-y-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={init}
      />
      <div ref={btnRef} className="flex min-h-[44px] justify-center" />
      {pending && (
        <p className="text-center text-sm text-zinc-400">
          {t("מתחבר עם Google...")}
        </p>
      )}
      <FormMessage error={error} />
    </div>
  );
}

/**
 * "או" divider used to separate the Google button from the email/password form.
 */
export function AuthDivider() {
  const t = useT();
  if (!CLIENT_ID) return null;
  return (
    <div className="flex items-center gap-3 text-xs text-zinc-500">
      <span className="h-px flex-1 bg-border-subtle" />
      {t("או")}
      <span className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
