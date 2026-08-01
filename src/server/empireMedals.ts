import "server-only";
import { prisma } from "@/lib/prisma";
import { GLORY_KEYS, MEDAL_KEYS, selectMedals, type MedalView } from "@/lib/game/achievements";
import { getGloryChampions } from "@/server/gloryBoard";

/**
 * The medals one empire has earned, for the column on its profile.
 *
 * **Receipts only — no snapshot.** The obvious implementation is
 * `gatherAchievementStats(empireId)` and a filter over the built ladder, which
 * is what the achievements screen does. It is the wrong tool here: that
 * snapshot is a dozen aggregates over battle reports, spy reports, items,
 * buildings and the army, plus (for `rank_one`) a power scan of the whole city
 * bucket — and the profile is the page every player opens about somebody else,
 * repeatedly. What this reads instead is the two receipt tables, both of which
 * are indexed on `(empireId, key)` by their unique constraint, so a dossier
 * costs two bounded lookups however decorated the empire is.
 *
 * The two receipts mean different things and both count:
 *
 *  - `EmpireGloryAward` is stamped automatically the moment the empire is
 *    observed meeting a capstone condition (see gloryBoard.ts).
 *  - `EmpireAchievement` is written when the player presses collect.
 *
 * Six of the eleven medals have no glory stamp at all — they are not on the
 * records board — so for those the claim receipt is the only evidence there is.
 * Where both exist the earlier date wins: the stamp is the arrival and the claim
 * can come days later, and a medal should be dated to when it was *earned*.
 *
 * The consequence worth knowing: a player who reached a non-capstone milestone
 * and never pressed collect wears no medal for it. That is the honest reading of
 * the data available cheaply, and the fix is one click on their own screen.
 */
export async function getEmpireMedals(empireId: string): Promise<MedalView[]> {
  const [awards, claims] = await Promise.all([
    prisma.empireGloryAward.findMany({
      where: { empireId, key: { in: [...MEDAL_KEYS] } },
      select: { key: true, awardedAt: true },
    }),
    prisma.empireAchievement.findMany({
      where: { empireId, key: { in: [...MEDAL_KEYS] } },
      select: { key: true, claimedAt: true },
    }),
  ]);

  const earned = new Map<string, { at: Date; worldFirst: boolean }>();
  for (const { key, awardedAt } of awards) earned.set(key, { at: awardedAt, worldFirst: false });
  for (const { key, claimedAt } of claims) {
    const held = earned.get(key);
    if (!held) earned.set(key, { at: claimedAt, worldFirst: false });
    else if (claimedAt < held.at) held.at = claimedAt;
  }
  if (earned.size === 0) return [];

  // Being *first in the world* to a capstone is the loudest thing this column
  // can say, so it is worth the extra read — but only when there is a capstone
  // to be first to. Six of the eleven medals never appear on the records board,
  // so an empire decorated only with those pays nothing for the check.
  if (GLORY_KEYS.some((key) => earned.has(key))) {
    const champions = await getGloryChampions();
    for (const [key, champion] of champions) {
      const held = earned.get(key);
      if (held && champion.empireId === empireId) held.worldFirst = true;
    }
  }

  return selectMedals(earned);
}
