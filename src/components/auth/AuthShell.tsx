import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(212,168,67,0.08),transparent_60%)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-2 text-5xl" aria-hidden>
            👑
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gold">
            אימפריום
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            בנה אימפריה. צור ברית. כבוש את הדירוג.
          </p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-2xl shadow-black/50">
          {children}
        </div>
      </div>
    </main>
  );
}
