"use client";

import { useActionState, type ReactNode } from "react";
import type { StorableResource } from "@/lib/game/constants";
import { RESOURCE_META } from "@/lib/game/constants";
import type { ActionState } from "@/server/actions/game";
import {
  buyResourceBoost,
  buyShopDiscount,
  buyTurns,
  castBankInterestSpell,
  castCitySiegeSpell,
  resetHeroPointsWithDiamonds,
} from "@/server/actions/diamondShop";
import {
  BOOST_MAX_PCT,
  BOOST_STEP_COST,
  BOOST_STEP_PCT,
  BANK_INTEREST_SPELL_COST,
  CITY_SPELL_COST,
  HERO_POINTS_RESET_COST,
  SHOP_DISCOUNT_COST,
  SHOP_DISCOUNT_PCT,
  TURN_PACKAGES,
} from "@/lib/game/diamondShop";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";

/**
 * Date + time of an ISO timestamp, e.g. "20.07 · 14:30" — the day is shown so a
 * next-day expiry isn't mistaken for today. Deterministic — no Date.now in render.
 */
function whenLabel(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

function ActiveBadge({ label }: { label: string }) {
  return (
    <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-xs font-semibold text-emerald-400">
      {label}
    </span>
  );
}

function SectionTitle({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
        <span aria-hidden>{icon}</span>
        {title}
      </h2>
      {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
    </div>
  );
}

/* ------------------------------ resource boost ------------------------------ */

function ResourceBoostCard({
  resource,
  pct,
  activeUntil,
  diamonds,
}: {
  resource: StorableResource;
  pct: number;
  activeUntil: string | null;
  diamonds: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(buyResourceBoost, {});
  const meta = RESOURCE_META[resource];
  const atCap = pct >= BOOST_MAX_PCT;

  return (
    <div className="panel-inset flex flex-col gap-2 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <span aria-hidden className="text-lg">{meta.icon}</span>
          תוספת {meta.label}
        </p>
        <span
          className="nums rounded-full border border-gold/40 bg-panel-inset px-2.5 py-0.5 text-xs font-black text-gold-bright"
          dir="ltr"
        >
          +{pct}%
        </span>
      </div>
      <p className="text-[11px] text-zinc-500">
        כל רכישה +{BOOST_STEP_PCT}% לתפוקה · עד +{BOOST_MAX_PCT}% · 24ש׳
      </p>

      <form className="mt-auto grid gap-1.5">
        <input type="hidden" name="resource" value={resource} />
        {activeUntil && <ActiveBadge label={`✨ פעיל עד ${whenLabel(activeUntil)}`} />}
        {atCap ? (
          <span className="flex items-center justify-center gap-1 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-center text-xs font-semibold text-gold">
            <Icon name="rankings" size={14} /> בתקרה (+{BOOST_MAX_PCT}%)
          </span>
        ) : (
          <SubmitButton
            className="btn btn-gold w-full"
            formAction={action}
            disabled={diamonds < BOOST_STEP_COST}
            pendingText="רוכש..."
          >
            +{BOOST_STEP_PCT}% · {BOOST_STEP_COST} <Icon name="diamond" size={14} className="inline-block align-text-bottom" />
          </SubmitButton>
        )}
      </form>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}

/* ------------------------------ shop discount ------------------------------ */

function DiscountCard({
  activeUntil,
  diamonds,
}: {
  activeUntil: string | null;
  diamonds: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(buyShopDiscount, {});
  return (
    <div className="panel-inset flex flex-col gap-1.5 rounded-lg p-3">
      <p className="flex items-center gap-2 text-sm font-bold text-zinc-100">
        <span aria-hidden className="text-lg">🏷️</span>
        הנחת חנות {SHOP_DISCOUNT_PCT}%
      </p>
      <p className="text-[11px] text-zinc-500">
        {SHOP_DISCOUNT_PCT}% הנחה על רכישת נשק וכל השדרוגים (מכרות, מחסנים, שדרוגי
        אימפריה) למשך 24 שעות.
      </p>
      <form className="mt-auto grid gap-1.5">
        {activeUntil ? (
          <ActiveBadge label={`✨ פעיל עד ${whenLabel(activeUntil)}`} />
        ) : (
          <SubmitButton
            className="btn btn-gold w-full"
            formAction={action}
            disabled={diamonds < SHOP_DISCOUNT_COST}
            pendingText="רוכש..."
          >
            הפעל הנחה · {SHOP_DISCOUNT_COST} <Icon name="diamond" size={14} className="inline-block align-text-bottom" />
          </SubmitButton>
        )}
      </form>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}

/* ------------------------------ turn packages ------------------------------ */

/** "12 שעות" / "45 דקות" from a whole number of hours. */
function cooldownLabel(hours: number): string {
  return hours >= 1 ? `${hours} שעות` : `${Math.round(hours * 60)} דקות`;
}

/** One turn package as a compact row inside the shared turns box. */
function TurnPackageRow({
  index,
  turns,
  cost,
  cooldownHours,
  readyAt,
  diamonds,
}: {
  index: number;
  turns: number;
  cost: number;
  cooldownHours: number;
  readyAt: string | null;
  diamonds: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(buyTurns, {});
  const onCooldown = readyAt != null;

  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="turns" size={18} className="shrink-0 text-crimson-bright" />
          <div className="leading-tight">
            <p className="nums text-sm font-black text-amber-300" dir="ltr">
              {formatNumber(turns)}
            </p>
            <p className="text-[10px] text-zinc-500">
              אחת ל־{cooldownLabel(cooldownHours)}
            </p>
          </div>
        </div>

        <form className="shrink-0">
          <input type="hidden" name="packageIndex" value={index} />
          {onCooldown ? (
            <span className="inline-block rounded-lg border border-zinc-600/40 bg-zinc-700/10 px-2 py-1.5 text-center text-[10px] font-semibold text-zinc-400">
              זמין ב־{whenLabel(readyAt!)}
            </span>
          ) : (
            <SubmitButton
              className="btn btn-gold min-w-[4.5rem] px-2 py-1.5"
              formAction={action}
              disabled={diamonds < cost}
              pendingText="..."
            >
              {cost} <Icon name="diamond" size={13} className="inline-block align-text-bottom" />
            </SubmitButton>
          )}
        </form>
      </div>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}

function TurnPackagesBox({
  turnReadyAt,
  diamonds,
}: {
  turnReadyAt: (string | null)[];
  diamonds: number;
}) {
  return (
    <div className="panel-inset max-w-xs rounded-lg px-3 divide-y divide-border-subtle/60">
      {TURN_PACKAGES.map((pkg, i) => (
        <TurnPackageRow
          key={i}
          index={i}
          turns={pkg.turns}
          cost={pkg.cost}
          cooldownHours={pkg.cooldownHours}
          readyAt={turnReadyAt[i] ?? null}
          diamonds={diamonds}
        />
      ))}
    </div>
  );
}

/* ------------------------------ hero points reset ------------------------------ */

function HeroResetCard({
  allocatedPoints,
  used,
  diamonds,
}: {
  allocatedPoints: number;
  used: boolean;
  diamonds: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    resetHeroPointsWithDiamonds,
    {}
  );
  return (
    <div className="panel-inset flex flex-col gap-1.5 rounded-lg p-3">
      <p className="flex items-center gap-2 text-sm font-bold text-zinc-100">
        <span aria-hidden className="text-lg">🔄</span>
        איפוס נקודות גיבור
      </p>
      <p className="text-[11px] text-zinc-500">
        משחרר את כל הנקודות שהקצית (התקפה/הגנה/משאבים) חזרה לנקודות פנויות, בלי
        לגעת ברמה. פעם אחת בעונה.
      </p>
      <p className="text-xs text-zinc-400">
        מוקצות כרגע:{" "}
        <span className="nums font-black text-gold-bright" dir="ltr">
          {allocatedPoints}
        </span>
      </p>
      <form className="mt-auto grid gap-1.5">
        {used ? (
          <span className="rounded-lg border border-zinc-600/40 bg-zinc-700/10 px-3 py-2 text-center text-xs font-semibold text-zinc-400">
            כבר נוצל העונה
          </span>
        ) : (
          <SubmitButton
            className="btn btn-gold w-full"
            formAction={action}
            disabled={diamonds < HERO_POINTS_RESET_COST || allocatedPoints === 0}
            pendingText="מאפס..."
          >
            אפס · {HERO_POINTS_RESET_COST} <Icon name="diamond" size={14} className="inline-block align-text-bottom" />
          </SubmitButton>
        )}
      </form>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}

/* ------------------------------ bank interest spell ------------------------------ */

function BankInterestCard({
  preview,
  readyAt,
  diamonds,
}: {
  preview: number;
  readyAt: string | null;
  diamonds: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    castBankInterestSpell,
    {}
  );
  return (
    <div className="panel-inset flex flex-col gap-1.5 rounded-lg p-3">
      <p className="flex items-center gap-2 text-sm font-bold text-zinc-100">
        <Icon name="bank" size={18} />
        קסם ריבית בנק
      </p>
      <p className="text-[11px] text-zinc-500">
        צובר מיידית תשלום ריבית אחד לבנק, לפי הרמה שלך. ניתן להטיל אחת ל־24 שעות.
      </p>
      <p className="text-xs text-zinc-400">
        ריבית נוכחית:{" "}
        <span className="nums inline-flex items-center gap-1 font-black text-emerald-400" dir="ltr">
          <Icon name="gold" size={14} className="text-gold" /> {formatNumber(preview)}
        </span>
      </p>
      <form className="mt-auto grid gap-1.5">
        {readyAt ? (
          <span className="rounded-lg border border-zinc-600/40 bg-zinc-700/10 px-3 py-2 text-center text-xs font-semibold text-zinc-400">
            בקירור · זמין ב־{whenLabel(readyAt)}
          </span>
        ) : (
          <SubmitButton
            className="btn btn-gold w-full"
            formAction={action}
            disabled={diamonds < BANK_INTEREST_SPELL_COST || preview <= 0}
            pendingText="מטיל..."
          >
            הטל · {BANK_INTEREST_SPELL_COST} 💎
          </SubmitButton>
        )}
      </form>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}

/* ------------------------------ city siege spell ------------------------------ */

export interface SiegeTarget {
  id: string;
  name: string;
  cities: number;
}

function CitySiegeCard({
  targets,
  readyAt,
  diamonds,
  casterCities,
}: {
  targets: SiegeTarget[];
  readyAt: string | null;
  diamonds: number;
  casterCities: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(castCitySiegeSpell, {});
  const locked = casterCities <= 1;
  const noTargets = targets.length === 0;

  return (
    <div className="panel-inset flex flex-col gap-1.5 rounded-lg p-3">
      <p className="flex items-center gap-2 text-sm font-bold text-zinc-100">
        <span aria-hidden className="text-lg">🏙️</span>
        קסם ירידת עיר
      </p>
      <p className="text-[11px] text-zinc-500">
        מוריד ליריב עיר אחת (ומקטין את קיבולת האזרחים שלו בהתאם). ניתן להטיל אחת
        לשעה. לא ניתן לפגוע ביריב שנותרה לו עיר אחת בלבד. נפתח מעיר 2 ומעלה.
      </p>

      <form className="mt-auto grid gap-1.5">
        {locked ? (
          <span className="rounded-lg border border-zinc-600/40 bg-zinc-700/10 px-3 py-2 text-center text-xs font-semibold text-zinc-400">
            נפתח מעיר 2 ומעלה
          </span>
        ) : readyAt ? (
          <span className="rounded-lg border border-zinc-600/40 bg-zinc-700/10 px-3 py-2 text-center text-xs font-semibold text-zinc-400">
            בקירור · זמין ב־{whenLabel(readyAt)}
          </span>
        ) : noTargets ? (
          <span className="rounded-lg border border-zinc-600/40 bg-zinc-700/10 px-3 py-2 text-center text-xs font-semibold text-zinc-400">
            אין יעדים זמינים
          </span>
        ) : (
          <>
            <select
              name="targetEmpireId"
              required
              defaultValue=""
              dir="rtl"
              className="w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-xs text-zinc-100 focus:border-gold/60 focus:outline-none"
            >
              <option value="" disabled>
                בחר יעד…
              </option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.cities} ערים
                </option>
              ))}
            </select>
            <SubmitButton
              className="btn btn-gold w-full"
              formAction={action}
              disabled={diamonds < CITY_SPELL_COST}
              pendingText="מוריד עיר..."
            >
              הורד עיר · {CITY_SPELL_COST} <Icon name="diamond" size={14} className="inline-block align-text-bottom" />
            </SubmitButton>
          </>
        )}
      </form>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}

/* ------------------------------ shop shell ------------------------------ */

export interface DiamondShopProps {
  diamonds: number;
  boosts: { resource: StorableResource; pct: number; activeUntil: string | null }[];
  turnReadyAt: (string | null)[];
  discountActiveUntil: string | null;
  allocatedPoints: number;
  pointsResetUsed: boolean;
  interestPreview: number;
  bankReadyAt: string | null;
  citySiegeReadyAt: string | null;
  siegeTargets: SiegeTarget[];
  casterCities: number;
}

export function DiamondShop({
  diamonds,
  boosts,
  turnReadyAt,
  discountActiveUntil,
  allocatedPoints,
  pointsResetUsed,
  interestPreview,
  bankReadyAt,
  citySiegeReadyAt,
  siegeTargets,
  casterCities,
}: DiamondShopProps) {
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle icon={<Icon name="mine" size={20} className="text-crimson" />} title="בונוס תפוקת משאבים" hint="עד +200% לכל משאב · 24ש׳" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {boosts.map((b) => (
            <ResourceBoostCard key={b.resource} {...b} diamonds={diamonds} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          icon={<Icon name="turns" size={20} className="text-crimson" />}
          title="חבילות תורות"
        />
        <TurnPackagesBox turnReadyAt={turnReadyAt} diamonds={diamonds} />
      </section>

      <section>
        <SectionTitle icon={<Icon name="spark" size={20} className="text-crimson" />} title="קסמים ושירותים" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DiscountCard activeUntil={discountActiveUntil} diamonds={diamonds} />
          <BankInterestCard
            preview={interestPreview}
            readyAt={bankReadyAt}
            diamonds={diamonds}
          />
          <HeroResetCard
            allocatedPoints={allocatedPoints}
            used={pointsResetUsed}
            diamonds={diamonds}
          />
          <CitySiegeCard
            targets={siegeTargets}
            readyAt={citySiegeReadyAt}
            diamonds={diamonds}
            casterCities={casterCities}
          />
        </div>
      </section>
    </div>
  );
}
