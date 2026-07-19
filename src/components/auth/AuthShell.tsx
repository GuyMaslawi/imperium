import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(224,35,51,0.10),transparent_60%)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={72} className="mb-3 drop-shadow-[0_6px_20px_rgba(224,35,51,0.35)]" />
          <h1 className="text-4xl font-black tracking-[0.18em] text-bone-bright">
            IMP<span className="text-crimson-bright">E</span>RIUM
          </h1>
          <p className="mt-1 text-xs font-semibold tracking-[0.4em] text-bone-dim">אימפריום</p>
          <p className="mt-3 text-sm text-zinc-400">
            בנה אימפריה. צור ברית. כבוש את הדירוג.
          </p>
        </div>
        <div className="ornate-shell rounded-2xl p-6">
          {children}
        </div>
      </div>
    </main>
  );
}
