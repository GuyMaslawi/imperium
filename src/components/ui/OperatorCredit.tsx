import { getLegalOperator } from "@/lib/legal";

/**
 * The copyright line at the bottom of every public screen.
 *
 * The business behind the game — not the game — is what a copyright notice
 * names, so this reads from the same `LEGAL_OPERATOR_NAME` the policy pages
 * publish rather than hard-coding "קראלדור". One env var moves the credit on
 * every surface at once, and the next site this business builds gets its footer
 * by setting the same variable.
 *
 * Fails closed: while the name is unset `getLegalOperator()` hands back a
 * placeholder label, and "© מפעיל השירות" is worse than no line at all — an
 * unnamed rights-holder is not a claim anyone can act on. So the component
 * renders nothing until the real name is configured.
 *
 * Server component: it reads server-only env. The year comes from the server
 * clock for the same reason — a client-rendered year would differ from the
 * server's markup on New Year's Eve and hydrate mismatched.
 */
export function OperatorCredit({ className = "" }: { className?: string }) {
  const { name } = getLegalOperator();
  const configured = !!process.env.LEGAL_OPERATOR_NAME?.trim();
  if (!configured) return null;

  return (
    <p className={`text-center text-[11px] text-zinc-600 ${className}`}>
      {/* The name is Latin inside an RTL document: without the isolate the ©
          and the year drift to the wrong side of it. */}
      <span dir="ltr" className="inline-block">
        © {new Date().getFullYear()} {name}
      </span>
      {" · "}
      כל הזכויות שמורות
    </p>
  );
}
