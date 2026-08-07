import { requireEmpire } from "@/lib/auth";
import { GuideContent } from "@/components/game/GuideContent";

export const metadata = { title: "מדריך המשחק | KRALDOR" };

/**
 * The manual, inside the game shell.
 *
 * The manual itself lives in `components/game/GuideContent` because the same
 * words are also published at `/guide`, in front of the login — see the note
 * there. This route is the gate and nothing else: `requireEmpire` both keeps the
 * page in step with the rest of `/game` (banned out, unverified redirected,
 * season break honoured) and settles the reader's pending updates on the way in,
 * exactly as every other screen does.
 */
export default async function GuidePage() {
  await requireEmpire();
  return <GuideContent />;
}
