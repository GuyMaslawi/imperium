import type { ReactNode } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { DiscordLink } from "@/components/ui/DiscordLink";
import { OperatorCredit } from "@/components/ui/OperatorCredit";
import { PublicNav } from "@/components/public/PublicNav";
import { SupportChat } from "@/components/support/SupportChat";
import { hasSupportThread } from "@/server/actions/support";
import { discordInviteUrl } from "@/server/discord";
import { getT } from "@/i18n/server";

export async function AuthShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  /** Widen the shell for screens with the visual hero-class picker. */
  wide?: boolean;
}) {
  const discord = discordInviteUrl();
  const t = await getT();
  // Resolved here, from the cookie, so the support dock knows at first paint
  // whether it has a conversation to poll for — see SupportChat.
  const hasThread = await hasSupportThread();
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(224,35,51,0.10),transparent_60%)] px-4 py-12">
      {/* Above the crest, on every screen in front of the login: the manual,
          last season's champions, the policies, the community, and the language
          switch. The switch is the one control here that genuinely cannot be
          skipped — a visitor who does not read Hebrew has no account yet, so
          there is no setting of theirs to carry a preference, and every other
          word on the page is one they cannot read. */}
      <PublicNav className="mb-8" />
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={72} className="mb-3 drop-shadow-[0_6px_20px_rgba(224,35,51,0.35)]" />
          {/* Spelled out rather than reusing <Logo> so the wordmark can stack
              above the crest at hero size; the crimson letter matches it. */}
          <h1 className="text-4xl font-black tracking-[0.18em] text-bone-bright">
            KRA<span className="text-crimson-bright">L</span>DOR
          </h1>
          <p className="mt-1 text-xs font-semibold tracking-[0.4em] text-bone-dim">
            {t("קראלדור")}
          </p>
          <p className="mt-3 text-sm text-zinc-400">
            {t("בנה אימפריה. צור ברית. כבוש את הדירוג.")}
          </p>
        </div>
        <div className="ornate-shell rounded-2xl p-6">
          {children}
        </div>

        {/* Below the form, not inside it: someone who cannot get in — a
            forgotten password, an unverified address, a ban they want to argue
            — has nowhere else on this screen to reach a human, and the channel
            is that place. Hidden entirely until the invite is configured. */}
        {discord && (
          <div className="mt-5 flex justify-center">
            <DiscordLink
              url={discord}
              variant="pill"
              label={t("הצטרפו לקהילה בדיסקורד")}
            />
          </div>
        )}

        {/* The public entry point is where a payment gateway's underwriter (and
            a player looking for the refund rules) goes hunting for the
            policies, so they hang off every auth screen. */}
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-zinc-500">
          <Link href="/terms" className="transition-colors hover:text-gold">
            {t("תנאי שימוש")}
          </Link>
          <span aria-hidden className="text-zinc-700">
            •
          </span>
          <Link href="/refund" className="transition-colors hover:text-gold">
            {t("ביטולים והחזרים")}
          </Link>
          <span aria-hidden className="text-zinc-700">
            •
          </span>
          <Link href="/privacy" className="transition-colors hover:text-gold">
            {t("פרטיות")}
          </Link>
        </nav>

        <OperatorCredit className="mt-3" />
      </div>

      {/* The dock, on every screen in front of the game. This is the only place
          in the app where somebody can be completely stuck — the mail never
          arrived, the Google button loops, a payment went through on an account
          that will not open — and none of those people can reach the in-game
          chat, which is addressed by empire id. */}
      <SupportChat hasThread={hasThread} discordUrl={discord} />
    </main>
  );
}
