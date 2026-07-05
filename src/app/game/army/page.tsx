import { requireEmpire } from "@/lib/auth";
import { UNIT_META, UNIT_KEYS } from "@/lib/game/constants";
import { armyPower } from "@/lib/game/power";
import { formatNumber } from "@/lib/game/format";
import { TrainCard } from "@/components/game/TrainCard";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "צבא | אימפריום" };

export default async function ArmyPage() {
  const empire = await requireEmpire();
  const army = empire.army;
  const power = armyPower(army);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-zinc-100">הצבא שלך ⚔️</h1>
          <p className="mt-1 text-sm text-zinc-400">
            אמן יחידות כדי להגן על האימפריה ולתקוף יריבים.
          </p>
        </div>
        <Card className="!p-3 text-center">
          <p className="text-xs text-zinc-400">עוצמה צבאית כוללת</p>
          <p className="text-xl font-black text-gold">⚡ {formatNumber(power)}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
  );
}
