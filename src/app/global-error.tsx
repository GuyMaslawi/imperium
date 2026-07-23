"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors thrown in the root layout / outside any
 * nested error.tsx (e.g. /login, /register, /admin render failures). It replaces
 * the whole document, so it must render its own <html>/<body>. Keeps a themed,
 * self-contained recovery screen instead of Next's raw overlay in production.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "#09090b",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <span style={{ fontSize: "3rem" }}>🛠️</span>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fbbf24" }}>
          משהו השתבש
        </h1>
        <p style={{ maxWidth: "24rem", fontSize: "0.875rem", color: "#a1a1aa" }}>
          אירעה שגיאה בלתי צפויה. אפשר לנסות שוב.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            borderRadius: "0.5rem",
            border: "1px solid #b45309",
            background: "#f59e0b",
            color: "#1c1917",
            cursor: "pointer",
          }}
        >
          🔄 נסה שוב
        </button>
      </body>
    </html>
  );
}
