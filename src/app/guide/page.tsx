import { PublicShell } from "@/components/public/PublicShell";
import { GuideContent } from "@/components/game/GuideContent";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return {
    title: t("מדריך המשחק | קראלדור"),
    description: t(
      "כל מה שצריך לדעת על קראלדור: כלכלה, קרבות, ריגול, גיבור, בריתות ועונות — המדריך המלא, פתוח לכולם."
    ),
  };
}

export const dynamic = "force-dynamic";

/**
 * The manual, in public.
 *
 * Same component, same numbers, no account (see GuideContent). Three reasons it
 * is worth a route of its own rather than staying behind the login:
 *
 *  - it is the honest answer to "what is this game" — a stranger deciding
 *    whether to sign up can read the actual rules first, including how the
 *    diamond economy works, which is the question a paying player asks last and
 *    should be able to ask first;
 *  - it is the only substantial page on the site a search engine can index;
 *  - it is what a support answer links to. "See the guide" is useless if the
 *    person you are answering cannot get in.
 *
 * Deliberately **not** gated on the season. Between seasons the game is shut and
 * every other route lands on `/season` (see seasonGuard) — but the manual is not
 * a game screen, and the break is exactly when a curious visitor has time to
 * read it. It quotes live tunables, which stand while the world is frozen.
 */
export default async function PublicGuidePage() {
  const t = await getT();
  return (
    <PublicShell
      title={t("מדריך המשחק")}
      subtitle={t(
        "המדריך המלא — אותו אחד שנמצא בתוך המשחק, עם המספרים החיים של העונה הנוכחית."
      )}
    >
      <GuideContent publicView />
    </PublicShell>
  );
}
