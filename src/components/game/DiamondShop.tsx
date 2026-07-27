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
  resetHeroPointsWithDiamonds,
  reviveHeroWithDiamonds,
} from "@/server/actions/diamondShop";
import {
  BOOST_MAX_PCT,
  BOOST_STEP_COST,
  BOOST_STEP_PCT,
  BANK_INTEREST_SPELL_COST,
  HERO_POINTS_RESET_COST,
  HERO_REVIVE_COST,
  SHOP_DISCOUNT_COST,
  SHOP_DISCOUNT_PCT,
  TURN_PACKAGES,
} from "@/lib/game/diamondShop";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon, RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
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
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
        <span aria-hidden>{icon}</span>
        {title}
      </h2>
      <span className="hidden h-px flex-1 bg-gradient-to-l from-transparent via-gold-dim/40 to-transparent sm:block" />
      {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
    </div>
  );
}

/** Price chip used on every buy button: "40 💎". */
function Price({ cost }: { cost: number }) {
  return (
    <span className="nums inline-flex items-center gap-1" dir="ltr">
      {cost}
      <Icon name="diamond" size={14} className="text-cyan-300" />
    </span>
  );
}

/**
 * Shared card shell for every shop item — a titled header, a fixed-height
 * description block and an action pinned to the bottom. The uniform structure
 * is what keeps a grid row from developing ragged holes: every card in a row
 * stretches to the same height and its button sits on the same baseline.
 */
function ShopCard({
  icon,
  title,
  badge,
  desc,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  badge?: ReactNode;
  desc: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="panel-inset flex h-full flex-col rounded-xl p-3.5 transition-colors hover:border-gold/30">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-zinc-100">
          <span className="shrink-0" aria-hidden>
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </p>
        {badge}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">{desc}</p>
      <div className="mt-auto grid gap-1.5 pt-3">{children}</div>
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
    <ShopCard
      icon={
        <Icon
          name={RESOURCE_ICON[resource]}
          size={18}
          className={RESOURCE_ICON_COLOR[resource]}
        />
      }
      title={`תוספת ${meta.label}`}
      badge={
        <span
          className={`nums shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-black ${
            pct > 0
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
              : "border-border-subtle bg-panel text-zinc-500"
          }`}
          dir="ltr"
        >
          +{pct}%
        </span>
      }
      desc={
        <>
          כל רכישה +{BOOST_STEP_PCT}% לתפוקה · עד +{BOOST_MAX_PCT}% · 24ש׳
          {activeUntil && (
            <span className="mt-1 block text-emerald-400/90">
              ✨ פעיל עד {whenLabel(activeUntil)}
            </span>
          )}
        </>
      }
    >
      <form>
        <input type="hidden" name="resource" value={resource} />
        {atCap ? (
          <span className="flex items-center justify-center gap-1 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-center text-xs font-semibold text-gold">
            <Icon name="rankings" size={14} /> בתקרה (+{BOOST_MAX_PCT}%)
          </span>
        ) : (
          <SubmitButton
            className="btn btn-gold w-full px-3 py-2 text-sm"
            formAction={action}
            disabled={diamonds < BOOST_STEP_COST}
            pendingText="רוכש..."
          >
            +{BOOST_STEP_PCT}% · <Price cost={BOOST_STEP_COST} />
          </SubmitButton>
        )}
      </form>
      <FormMessage error={state.error} success={state.success} />
    </ShopCard>
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
    <ShopCard
      icon={<span className="text-lg">🏷️</span>}
      title={`הנחת חנות ${SHOP_DISCOUNT_PCT}%`}
      desc={`${SHOP_DISCOUNT_PCT}% הנחה על רכישת נשק וכל השדרוגים (מכרות, מחסנים, שדרוגי אימפריה) למשך 24 שעות.`}
    >
      <form>
        {activeUntil ? (
          <ActiveBadge label={`✨ פעיל עד ${whenLabel(activeUntil)}`} />
        ) : (
          <SubmitButton
            className="btn btn-gold w-full px-3 py-2 text-sm"
            formAction={action}
            disabled={diamonds < SHOP_DISCOUNT_COST}
            pendingText="רוכש..."
          >
            הפעל הנחה · <Price cost={SHOP_DISCOUNT_COST} />
          </SubmitButton>
        )}
      </form>
      <FormMessage error={state.error} success={state.success} />
    </ShopCard>
  );
}

/* ------------------------------ turn packages ------------------------------ */

/** "12 שעות" / "45 דקות" from a whole number of hours. */
function cooldownLabel(hours: number): string {
  return hours >= 1 ? `${hours} שעות` : `${Math.round(hours * 60)} דקות`;
}

/** One turn package as a card, sized to match the rest of the shop grid. */
function TurnPackageCard({
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

  return (
    <div className="panel-inset flex h-full flex-col items-center rounded-xl p-3.5 text-center transition-colors hover:border-gold/30">
      <Icon name="turns" size={26} className="text-crimson-bright" />
      <p className="nums mt-2 text-2xl font-black leading-none text-amber-300" dir="ltr">
        {formatNumber(turns)}
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">תורות</p>
      <p className="mt-2 text-[11px] text-zinc-500">
        זמין אחת ל־{cooldownLabel(cooldownHours)}
      </p>

      <div className="mt-auto grid w-full gap-1.5 pt-3">
        <form>
          <input type="hidden" name="packageIndex" value={index} />
          {readyAt ? (
            <span className="block rounded-lg border border-zinc-600/40 bg-zinc-700/10 px-2 py-2 text-center text-[11px] font-semibold text-zinc-400">
              זמין ב־{whenLabel(readyAt)}
            </span>
          ) : (
            <SubmitButton
              className="btn btn-gold w-full px-3 py-2 text-sm"
              formAction={action}
              disabled={diamonds < cost}
              pendingText="רוכש..."
            >
              קנה · <Price cost={cost} />
            </SubmitButton>
          )}
        </form>
        <FormMessage error={state.error} success={state.success} />
      </div>
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
    <ShopCard
      icon={<span className="text-lg">🔄</span>}
      title="איפוס נקודות גיבור"
      badge={
        <span
          className="nums shrink-0 rounded-full border border-border-subtle bg-panel px-2.5 py-0.5 text-xs font-black text-gold-bright"
          dir="ltr"
        >
          {allocatedPoints}
        </span>
      }
      desc="משחרר את כל הנקודות שהקצית (התקפה/הגנה/משאבים) חזרה לנקודות פנויות, בלי לגעת ברמה. פעם אחת בעונה."
    >
      <form>
        {used ? (
          <span className="block rounded-lg border border-zinc-600/40 bg-zinc-700/10 px-3 py-2 text-center text-xs font-semibold text-zinc-400">
            כבר נוצל העונה
          </span>
        ) : (
          <SubmitButton
            className="btn btn-gold w-full px-3 py-2 text-sm"
            formAction={action}
            disabled={diamonds < HERO_POINTS_RESET_COST || allocatedPoints === 0}
            pendingText="מאפס..."
          >
            אפס · <Price cost={HERO_POINTS_RESET_COST} />
          </SubmitButton>
        )}
      </form>
      <FormMessage error={state.error} success={state.success} />
    </ShopCard>
  );
}

/* ------------------------------ hero revival ------------------------------ */

function HeroReviveCard({ dead, diamonds }: { dead: boolean; diamonds: number }) {
  const [state, action] = useActionState<ActionState, FormData>(
    reviveHeroWithDiamonds,
    {}
  );
  return (
    <ShopCard
      icon={<span className="text-lg">💀</span>}
      title="החייאת גיבור"
      badge={
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-black ${
            dead
              ? "border-red-500/50 bg-red-500/10 text-red-300"
              : "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {dead ? "מת" : "חי"}
        </span>
      }
      desc={`מקים גיבור שנפל בקרב מיד ל־100% חיים, במקום להמתין שעה. כל עוד הוא מת — הנקודות, החפצים ובונוס המחלקה שלו מושבתים.`}
    >
      <form>
        {dead ? (
          <SubmitButton
            className="btn btn-gold w-full px-3 py-2 text-sm"
            formAction={action}
            disabled={diamonds < HERO_REVIVE_COST}
            pendingText="מחייה..."
          >
            החייה · <Price cost={HERO_REVIVE_COST} />
          </SubmitButton>
        ) : (
          <ActiveBadge label="✨ הגיבור שלך חי ובועט" />
        )}
      </form>
      <FormMessage error={state.error} success={state.success} />
    </ShopCard>
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
    <ShopCard
      icon={<Icon name="bank" size={18} className="text-gold" />}
      title="קסם ריבית בנק"
      badge={
        <span
          className="nums inline-flex shrink-0 items-center gap-1 rounded-full border border-border-subtle bg-panel px-2.5 py-0.5 text-xs font-black text-emerald-400"
          dir="ltr"
        >
          <Icon name="gold" size={13} className="text-gold-bright" />
          {formatNumber(preview)}
        </span>
      }
      desc="צובר מיידית תשלום ריבית אחד לבנק, לפי הרמה שלך. ניתן להטיל אחת ל־24 שעות."
    >
      <form>
        {readyAt ? (
          <span className="block rounded-lg border border-zinc-600/40 bg-zinc-700/10 px-3 py-2 text-center text-xs font-semibold text-zinc-400">
            בקירור · זמין ב־{whenLabel(readyAt)}
          </span>
        ) : (
          <SubmitButton
            className="btn btn-gold w-full px-3 py-2 text-sm"
            formAction={action}
            disabled={diamonds < BANK_INTEREST_SPELL_COST || preview <= 0}
            pendingText="מטיל..."
          >
            הטל · <Price cost={BANK_INTEREST_SPELL_COST} />
          </SubmitButton>
        )}
      </form>
      <FormMessage error={state.error} success={state.success} />
    </ShopCard>
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
  /** The hero has fallen — the revival card is live. */
  heroDead: boolean;
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
  heroDead,
}: DiamondShopProps) {
  return (
    <div className="space-y-7">
      <section>
        <SectionTitle
          icon={<Icon name="mine" size={20} className="text-crimson" />}
          title="בונוס תפוקת משאבים"
          hint={`עד +${BOOST_MAX_PCT}% לכל משאב · 24ש׳`}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {boosts.map((b) => (
            <ResourceBoostCard key={b.resource} {...b} diamonds={diamonds} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          icon={<Icon name="turns" size={20} className="text-crimson" />}
          title="חבילות תורות"
          hint="לכל חבילה קירור משלה"
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TURN_PACKAGES.map((pkg, i) => (
            <TurnPackageCard
              key={pkg.cooldownKind}
              index={i}
              turns={pkg.turns}
              cost={pkg.cost}
              cooldownHours={pkg.cooldownHours}
              readyAt={turnReadyAt[i] ?? null}
              diamonds={diamonds}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          icon={<Icon name="spark" size={20} className="text-crimson" />}
          title="קסמים ושירותים"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <HeroReviveCard dead={heroDead} diamonds={diamonds} />
        </div>
      </section>
    </div>
  );
}
