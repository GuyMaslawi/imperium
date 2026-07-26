"use client";

import { useEffect, useRef, useState } from "react";
import { STORE_CURRENCY } from "@/lib/game/diamondStore";
import { captureDiamondOrder, createDiamondOrder } from "@/server/actions/diamondStore";

/**
 * PayPal Smart Buttons for one diamond package.
 *
 * The browser half of the approval flow: the SDK opens PayPal's own window, and
 * the two server actions do everything that touches money —
 * `createDiamondOrder` prices the package and opens the order,
 * `captureDiamondOrder` captures it and credits the diamonds. Nothing here is
 * trusted: the component sends a package id and an order id, never an amount.
 */

/* The slice of the PayPal SDK we use. The SDK is loaded from PayPal's CDN at
   runtime, so there are no published types to import. */
interface PayPalButtonsInstance {
  render(container: HTMLElement): Promise<void>;
  close?(): void;
}

interface PayPalNamespace {
  Buttons(options: {
    style?: Record<string, string | number>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: (err: unknown) => void;
  }): PayPalButtonsInstance;
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

const SDK_SCRIPT_ID = "paypal-sdk";

// One load per page, shared by every checkout modal that opens.
let sdkPromise: Promise<void> | null = null;

function loadPayPalSdk(clientId: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.paypal) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SDK_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("sdk failed")));
      return;
    }
    const params = new URLSearchParams({
      "client-id": clientId,
      currency: STORE_CURRENCY,
      intent: "capture",
      components: "buttons",
      locale: "he_IL",
      // Digital goods bought with a game balance — the deferred-payment funding
      // sources add nothing here and clutter the button stack.
      "disable-funding": "paylater,credit",
    });
    const script = document.createElement("script");
    script.id = SDK_SCRIPT_ID;
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later mount retry rather than caching the failure forever.
      sdkPromise = null;
      script.remove();
      reject(new Error("sdk failed"));
    };
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export function PayPalCheckout({
  clientId,
  packageId,
  onPaid,
}: {
  clientId: string;
  packageId: string;
  /** Called with the credited diamond count once the payment has settled. */
  onPaid: (diamonds: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "processing" | "unavailable">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  // The callbacks below live inside the PayPal buttons for the lifetime of the
  // component, so they read the current props/setters through a ref instead of
  // capturing the first render's copies.
  const latest = useRef({ packageId, onPaid });
  useEffect(() => {
    latest.current = { packageId, onPaid };
  });

  useEffect(() => {
    let cancelled = false;
    let buttons: PayPalButtonsInstance | null = null;

    loadPayPalSdk(clientId)
      .then(() => {
        if (cancelled || !host.current || !window.paypal) {
          if (!cancelled) setPhase("unavailable");
          return;
        }

        buttons = window.paypal.Buttons({
          style: { layout: "vertical", color: "gold", shape: "pill", label: "pay" },

          createOrder: async () => {
            setError(null);
            const res = await createDiamondOrder(latest.current.packageId);
            if (!res.ok) {
              setError(res.message);
              // Rejecting keeps PayPal from opening its window on a failed open.
              throw new Error(res.message);
            }
            return res.orderId;
          },

          onApprove: async (data) => {
            setPhase("processing");
            const res = await captureDiamondOrder(data.orderID);
            if (cancelled) return;
            if (!res.ok) {
              setError(res.message);
              setPhase("ready");
              return;
            }
            latest.current.onPaid(res.diamonds);
          },

          onCancel: () => {
            if (!cancelled) setError("התשלום בוטל — לא חויבת.");
          },

          onError: (err) => {
            console.error("[paypal] buttons error:", err);
            if (!cancelled) setError("שגיאה בתקשורת מול PayPal. נסה שוב.");
          },
        });

        buttons
          .render(host.current)
          .then(() => {
            if (!cancelled) setPhase("ready");
          })
          .catch(() => {
            if (!cancelled) setPhase("unavailable");
          });
      })
      .catch(() => {
        if (!cancelled) setPhase("unavailable");
      });

    return () => {
      cancelled = true;
      // Tear the iframe down on unmount (modal closed) so a re-open renders a
      // fresh set of buttons instead of stacking them.
      try {
        buttons?.close?.();
      } catch {
        /* the SDK throws if it already tore itself down — nothing to do */
      }
    };
  }, [clientId]);

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {phase === "unavailable" ? (
        <p className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-center text-sm text-amber-200">
          לא ניתן לטעון את PayPal כרגע. בדוק את החיבור (או חוסם פרסומות) ונסה שוב.
        </p>
      ) : (
        <>
          {phase === "loading" && (
            <p className="text-center text-sm text-zinc-400">טוען את PayPal…</p>
          )}
          {phase === "processing" && (
            <p className="text-center text-sm font-bold text-sky-300">
              מאשר את התשלום וזוקף יהלומים…
            </p>
          )}
          {/* PayPal renders its own LTR iframe here; the wrapper keeps it out of
              the page's RTL flow. */}
          <div
            ref={host}
            dir="ltr"
            className={phase === "processing" ? "pointer-events-none opacity-50" : ""}
          />
        </>
      )}
    </div>
  );
}
