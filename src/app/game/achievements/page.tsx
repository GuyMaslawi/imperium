import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { AchievementList } from "@/components/game/AchievementList";
import { getAchievementsState } from "@/server/actions/achievements";

export const metadata = { title: "הישגים | IMPERIUM" };

export default async function AchievementsPage() {
  // Settles the empire's pending updates before the conditions are evaluated,
  // so a milestone crossed by an update the player has not "collected" yet
  // (citizens, production) counts on this very load.
  await requireEmpire();

  const state = await getAchievementsState();
  if (!state) return null;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="הישגים"
        subtitle="ACHIEVEMENTS"
        ornament={<Icon name="rankings" size={22} className="text-crimson" />}
      />
      <AchievementList initial={state} />
    </div>
  );
}
