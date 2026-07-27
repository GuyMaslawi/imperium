import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { AchievementList } from "@/components/game/AchievementList";
import { getAchievementsState } from "@/server/achievementState";

export const metadata = { title: "הישגים | IMPERIUM" };

export default async function AchievementsPage() {
  // Settles the empire's pending updates before the conditions are evaluated,
  // so a milestone crossed by an update the player has not collected yet
  // (citizens, production) already counts on this load.
  const empire = await requireEmpire();

  const state = await getAchievementsState(empire.id);
  if (!state) return null;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="הישגים"
        ornament={<Icon name="rankings" size={22} className="text-crimson" />}
      />
      <AchievementList state={state} />
    </div>
  );
}
