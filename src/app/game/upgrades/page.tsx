import { requireEmpire } from "@/lib/auth";
import {
  EMPIRE_UPGRADE_META,
  EMPIRE_UPGRADE_TYPES,
  empireUpgradeCostFor,
  empireUpgradeMaxLevel,
  cityHeroLevelRequired,
  MAX_CITIES,
  cityCost,
} from "@/lib/game/constants";
import { UpgradeCard } from "@/components/game/UpgradeCard";
import { CityFoundCard } from "@/components/game/CityFoundCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card, CardTitle } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";

export const metadata = { title: "שדרוגים | אימפריום" };

export default async function UpgradesPage() {
  const empire = await requireEmpire();

  const available = {
    gold: Math.floor(empire.gold),
    wood: Math.floor(empire.wood),
    iron: Math.floor(empire.iron),
    stone: Math.floor(empire.stone),
  };

  const cities = empire.cities;
  const citizens = empire.citizens;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="שדרוגים"
        ornament={<Icon name="upgrades" size={22} className="text-crimson" />}
      />

      {/* -------- cities (עליית עיר) -------- */}
      <section className="space-y-4">
        <p className="panel-inset rounded-xl p-4 text-center text-sm text-zinc-400">
          כל עלייה בעיר מכפילה את תפוקת המכרות (×מספר העיר) ופותחת עוד רמות
          לשדרוג קבלת האזרחים — עד{" "}
          <span className="font-bold text-gold-bright nums" dir="ltr">
            ×{MAX_CITIES}
          </span>{" "}
          תפוקה ברמת עיר {MAX_CITIES}. אין תקרה לכמות האזרחים שאפשר לצבור.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* overview */}
          <Card variant="gold">
            <CardTitle>
              <Icon name="base" size={20} className="text-crimson-bright" />
              הממלכה שלך
            </CardTitle>

            <div className="mb-4 flex items-center gap-1.5">
              {Array.from({ length: MAX_CITIES }).map((_, i) => (
                <span
                  key={i}
                  className={`flex h-9 flex-1 items-center justify-center rounded border-2 text-sm ${
                    i < cities
                      ? "border-gold bg-gold/15 text-gold-bright"
                      : "border-border-subtle bg-panel-inset opacity-50"
                  }`}
                  title={`עיר ${i + 1}`}
                >
                  <Icon name="base" size={16} />
                </span>
              ))}
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <dt className="text-zinc-400">ערים</dt>
                <dd className="text-lg font-black text-gold nums" dir="ltr">
                  {cities} / {MAX_CITIES}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-400">
                  <Icon name="citizens" size={14} className="inline align-[-2px] text-bone" /> אזרחים
                </dt>
                <dd className="font-bold text-zinc-100 nums" dir="ltr">
                  {formatNumber(citizens)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* upgrade to the next city */}
          <CityFoundCard
            cities={cities}
            maxCities={MAX_CITIES}
            heroLevel={empire.hero?.level ?? 1}
            heroRequired={cityHeroLevelRequired(cities)}
            cost={cityCost(cities)}
            available={available}
            soldiersAvailable={empire.army?.soldiers ?? 0}
          />
        </div>
      </section>

      {/* -------- empire upgrades -------- */}
      <p className="panel-inset rounded-xl p-4 text-center text-sm text-zinc-400">
        שדרוגי אימפריה קבועים שמשפרים אזרחים, מודיעין, בנקאות וקבלת תורות.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EMPIRE_UPGRADE_TYPES.map((type) => {
          const meta = EMPIRE_UPGRADE_META[type];
          const upgrade = empire.upgrades.find((u) => u.type === type);
          const level = upgrade?.level ?? 1;
          const maxLevel = empireUpgradeMaxLevel(type, cities);
          const isMaxLevel = maxLevel !== undefined && level >= maxLevel;
          return (
            <UpgradeCard
              key={type}
              upgradeType={type}
              label={meta.label}
              icon={meta.icon}
              description={meta.description}
              level={level}
              currentEffect={meta.effectLabel(level)}
              nextEffect={meta.effectLabel(level + 1)}
              upgradeCost={empireUpgradeCostFor(type, level)}
              available={available}
              isMaxLevel={isMaxLevel}
            />
          );
        })}
      </div>
    </div>
  );
}
