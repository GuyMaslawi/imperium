import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/game/format";
import { Icon, RESOURCE_ICON, RESOURCE_ICON_COLOR } from "@/components/ui/Icon";
import { Tip } from "@/components/ui/Tip";
import { ItemTile } from "@/components/game/ItemTile";
import { itemDetails, uiRarityForLevel } from "@/components/game/heroItemView";
import { SLOT_META, itemDisplayName } from "@/lib/game/hero";
import { RESOURCE_META } from "@/lib/game/constants";
import { BOSS_REWARD_RESOURCES, bossByKey, bossImage } from "@/lib/game/bosses";

export const metadata = { title: "קרב בוס | IMPERIUM" };

/** Reward columns, paired with the report field that holds each amount. */
const REWARD_FIELDS = {
  gold: "rewardGold",
  wood: "rewardWood",
  iron: "rewardIron",
  stone: "rewardStone",
} as const;

export default async function BossFightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireEmpire();

  const fight = await prisma.bossFight.findUnique({ where: { id } });
  // A boss run is a private affair — only the empire that marched can read it.
  if (!fight || fight.empireId !== me.id) notFound();

  const boss = bossByKey(fight.bossKey);
  if (!boss) notFound();

  const total = fight.attackerPower + fight.bossPower;
  const myShare = total > 0 ? (fight.attackerPower / total) * 100 : 50;
  const droppedItem =
    fight.droppedItemSlot && fight.droppedItemLevel && fight.droppedItemRarity
      ? {
          slot: fight.droppedItemSlot,
          level: fight.droppedItemLevel,
          rarity: fight.droppedItemRarity,
        }
      : null;

  return (
    <div className="space-y-6" style={{ ["--boss-accent" as string]: boss.accent }}>
      {/* -------- actions -------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/game/rankings" className="btn btn-gold px-5 py-2 text-sm">
            <Icon name="rankings" size={16} className="inline-block align-middle" /> חזרה לבוס העיר
          </Link>
          <Link href="/game/base" className="btn btn-ghost px-5 py-2 text-sm">
            <Icon name="base" size={16} className="inline-block align-middle" /> חזרה לבסיס
          </Link>
        </div>
        <p className="nums text-xs text-zinc-500" dir="ltr">
          {formatDate(fight.createdAt)}
        </p>
      </div>

      {/* -------- verdict banner -------- */}
      <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--boss-accent))]/45 bg-[#0a0709] p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_100%_at_15%_0%,rgb(var(--boss-accent)/0.28),transparent_62%)]"
        />
        <div className="relative flex items-center justify-between gap-4">
          {/* my side */}
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-emerald-500/50 bg-gradient-to-b from-emerald-900/30 to-black shadow-[0_0_30px_-8px_rgba(52,211,153,0.5)]">
              <Icon name="hero" size={36} className="text-emerald-300" />
            </div>
            <p className="font-black text-emerald-300">{me.name}</p>
            <p className="text-[11px] text-zinc-500">תוקף</p>
          </div>

          <div className="flex flex-col items-center">
            <p
              className={`text-4xl font-black tracking-widest ${
                fight.victory ? "text-emerald-400" : "text-red-500"
              }`}
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.8)" }}
            >
              {fight.victory ? "WIN" : "LOSE"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">VS</p>
          </div>

          {/* boss side */}
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-xl border-2 border-[rgb(var(--boss-accent))]/60 bg-gradient-to-b from-[rgb(var(--boss-accent)/0.3)] to-black shadow-[0_0_30px_-8px_rgb(var(--boss-accent)/0.6)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bossImage(boss.key)}
                alt={boss.name}
                className="h-full w-full object-cover object-top"
              />
            </div>
            <p className="font-black text-[rgb(var(--boss-accent))]">{boss.name}</p>
            <p className="text-[11px] text-zinc-500">
              {boss.title} · עיר{" "}
              <span className="nums" dir="ltr">
                {fight.cityTier}
              </span>
            </p>
          </div>
        </div>

        {/* power bar */}
        <div className="relative mt-6">
          <div className="flex h-3 overflow-hidden rounded-full border border-black/60">
            <span
              style={{ width: `${myShare}%` }}
              className="bg-gradient-to-l from-emerald-400 to-emerald-600"
            />
            <span
              style={{ width: `${100 - myShare}%` }}
              className="bg-gradient-to-r from-[rgb(var(--boss-accent))] to-[rgb(var(--boss-accent)/0.4)]"
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="nums font-bold text-emerald-300" dir="ltr">
              {formatNumber(fight.attackerPower)}
            </span>
            <span className="text-zinc-500">כוח קרב</span>
            <span className="nums font-bold text-[rgb(var(--boss-accent))]" dir="ltr">
              {formatNumber(fight.bossPower)}
            </span>
          </div>
        </div>

        <p className="relative mt-4 text-center text-sm text-zinc-400">
          {fight.victory
            ? `${boss.name} נפל. מכלאות המצודה נפתחו והאוצר שלו נלקח.`
            : `${boss.name} הדף את המתקפה. צבאך נסוג — התורות והנופלים אבדו.`}
        </p>
      </div>

      {/* -------- aftermath -------- */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel-inset rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-400">אבדות שלך</p>
          <p className="nums mt-1 text-xl font-black text-red-400" dir="ltr">
            −{formatNumber(fight.soldiersLost)}{" "}
            <Icon name="army" size={18} className="inline-block align-middle" />
          </p>
        </div>
        <div className="panel-inset rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-400">תורות שנוצלו</p>
          <p className="nums mt-1 text-xl font-black text-gold" dir="ltr">
            {formatNumber(fight.turnsSpent)}
          </p>
        </div>
        <div className="panel-inset rounded-xl p-4 text-center">
          <Tip tip="שבויים ששוחררו ממכלאות הבוס — מצטרפים למאגר עבדי המכרות הפנוי שלך.">
            <p className="cursor-help text-xs text-zinc-400">⛓️ שבויים ששוחררו</p>
          </Tip>
          <p className="nums mt-1 text-xl font-black text-emerald-400" dir="ltr">
            +{formatNumber(fight.rewardSlaves)}{" "}
            <Icon name="mine" size={18} className="inline-block align-middle" />
          </p>
        </div>
      </div>

      {/* -------- spoils -------- */}
      {fight.victory && (
        <div className="panel-gold rounded-xl p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gold-bright">
            <Icon name="gold" size={16} /> אוצר {boss.name}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BOSS_REWARD_RESOURCES.map((res) => (
              <div key={res} className="panel-inset rounded-lg p-3 text-center">
                <p className="text-[11px] text-zinc-400">
                  <Icon
                    name={RESOURCE_ICON[res]}
                    size={14}
                    className={`inline-block align-middle ${RESOURCE_ICON_COLOR[res]}`}
                  />{" "}
                  {RESOURCE_META[res].label}
                </p>
                <p className="nums mt-0.5 font-black text-emerald-400" dir="ltr">
                  +{formatNumber(fight[REWARD_FIELDS[res]])}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------- hero -------- */}
      <div className="panel rounded-xl p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gold-bright">
          <Icon name="spark" size={18} className="text-crimson-bright" /> הגיבור שלך
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <Tip tip="ניסיון לגיבור מהקרב מול הבוס. ניצחון מזכה בהרבה יותר מתקיפת שחקן, כי הקרב עולה פי עשרות תורות; גם תבוסה מזכה בקצת.">
            <div className="panel-inset cursor-help rounded-lg p-3 text-center">
              <p className="text-[11px] text-zinc-400">ניסיון שהתקבל</p>
              <p className="nums mt-0.5 text-xl font-black text-purple-300" dir="ltr">
                +{formatNumber(fight.heroXp)} XP
              </p>
            </div>
          </Tip>
          {droppedItem && (
            <div className="flex items-center gap-3">
              <div className="w-20">
                <ItemTile
                  slug={SLOT_META[droppedItem.slot].slug}
                  icon={SLOT_META[droppedItem.slot].icon}
                  level={droppedItem.level}
                  rarity={uiRarityForLevel(droppedItem.level)}
                  details={itemDetails(droppedItem, me.hero?.level ?? 1)}
                  tooltipBelow
                />
              </div>
              <div>
                <p className="text-sm font-black text-gold-bright">
                  <Icon name="gift" size={16} className="inline-block align-middle" /> שלל הבוס:{" "}
                  {itemDisplayName(droppedItem.slot, droppedItem.level)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  רמת פריט{" "}
                  <span className="nums" dir="ltr">
                    {droppedItem.level}
                  </span>{" "}
                  · נוסף לתיק הגיבור
                </p>
                <Link href="/game/hero" className="btn btn-ghost mt-2 px-3 py-1 text-xs">
                  <Icon name="attack" size={14} className="inline-block align-middle" /> לציוד הגיבור
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
