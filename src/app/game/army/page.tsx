import { requireEmpire } from "@/lib/auth";
import { UNIT_META, UNIT_KEYS } from "@/lib/game/constants";
import { formatNumber } from "@/lib/game/format";
import { TrainCard } from "@/components/game/TrainCard";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata = { title: "צבא | אימפריום" };

export default async function ArmyPage() {
  const empire = await requireEmpire();
  const army = empire.army;

  return (
    <div className="space-y-6">
      <SectionHeading title="ניהול" subtitle="CITY MANAGEMENT" ornament="🛠️" />

      <div className="panel-gold rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <span aria-hidden>🔥</span>
            אימון מגויסים
          </h2>
          <span className="rounded-lg border border-gold/40 bg-panel-inset px-3 py-1 text-sm">
            <span className="text-gold-dim">אזרחים פנויים </span>
            <span className="nums font-black text-gold-bright" dir="ltr">
              👥 {formatNumber(empire.citizens)}
            </span>
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {UNIT_KEYS.map((key) => {
            const meta = UNIT_META[key];
            return (
              <TrainCard
                key={key}
                unit={key}
                label={meta.labelPlural}
                icon={meta.icon}
                description={meta.description}
                owned={army?.[key] ?? 0}
                power={meta.power}
                availableCitizens={empire.citizens}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
