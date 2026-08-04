import "server-only";
import { selectWorldMedals, type MedalView } from "@/lib/game/achievements";
import { getLocale } from "@/i18n/server";
import { getGloryChampions } from "@/server/gloryBoard";

/**
 * The world records this empire holds, for the case at the top of its profile.
 *
 * **World records only — not a milestone list.** This column used to show
 * eleven "medals of honour": every capstone the empire had ever reached, read
 * off the two receipt tables. The trouble is that a capstone reached is not a
 * distinction — ten cities, hero 100, every weapon model, and above all rank 1
 * of a city bucket are all things that every serious empire eventually has, and
 * rank 1 is *occupied from the moment the second player registers*. A wall that
 * everybody's dossier wears says nothing about the dossier you are reading. So
 * the only thing that reaches this case now is being **first in the world** to a
 * capstone: a fact about this empire's place among all the others, which is
 * exactly what somebody sizing up a rival came here to learn.
 *
 * The narrowing makes the read cheaper as well as truer. Nothing per-empire is
 * queried at all: `getGloryChampions` is one `DISTINCT ON` that returns one row
 * per capstone — five rows, however many people play — and holding a record is
 * simply being named in it. The two indexed receipt lookups this used to do on
 * the page every player opens about everybody else are gone.
 *
 * Most dossiers therefore return nothing, and that is the point: a case that is
 * *there* now means something at a glance.
 */
export async function getEmpireMedals(empireId: string): Promise<MedalView[]> {
  const champions = await getGloryChampions();
  return selectWorldMedals(champions, empireId, await getLocale());
}
