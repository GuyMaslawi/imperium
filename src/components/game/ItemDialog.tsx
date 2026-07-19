"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { ItemTile, formatBonus } from "@/components/game/ItemTile";
import { uiRarity, type HeroItemView } from "@/components/game/heroItemView";
import {
  discardHeroItem,
  equipHeroItem,
  unequipHeroItem,
  upgradeHeroItem,
} from "@/server/actions/hero";
import type { ActionState } from "@/server/actions/game";
import {
  HERO_STAT_META,
  RARITY_META,
  SLOT_META,
  canEquipItem,
  discardWheelSpinChance,
  itemBonusValue,
  itemDisplayName,
  itemResourceBreakdown,
  itemUpgradeCost,
  nextTierLevel,
  tierForLevel,
} from "@/lib/game/hero";

/**
 * Full-screen detail dialog for a single hero item: shows its stats large and
 * offers the three actions — wear/remove, upgrade to the next tier level (for
 * gold), and discard. Opened by clicking a tile in the bag or on the hero.
 */
export function ItemDialog({
  item,
  heroLevel,
  gold,
  equipped,
  onClose,
}: {
  item: HeroItemView;
  heroLevel: number;
  gold: number;
  /** Whether this item is currently worn (shows "remove" instead of "wear"). */
  equipped: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<ActionState>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Local level copy: upgrading keeps the dialog open, so it must reflect the
  // new level itself (the parent still holds the pre-upgrade snapshot).
  const [level, setLevel] = useState(item.level);

  const slotMeta = SLOT_META[item.slot];
  const statMeta = HERO_STAT_META[slotMeta.stat];
  const resourceLines = itemResourceBreakdown(item.slot, level);
  const rarity = tierForLevel(level);
  const rarityMeta = RARITY_META[rarity];
  const bonus = itemBonusValue(item.slot, level);
  const unit = bonus.flat ? "" : "%";

  const upgradeToLevel = nextTierLevel(level);
  const upgradeCost = itemUpgradeCost(level);
  const nextTier = upgradeToLevel != null ? tierForLevel(upgradeToLevel) : null;
  const nextBonus =
    upgradeToLevel != null ? itemBonusValue(item.slot, upgradeToLevel).value : null;
  const canAfford = upgradeCost != null && gold >= upgradeCost;

  const meetsLevel = canEquipItem(heroLevel, level);

  const run = (
    action: (prev: ActionState, fd: FormData) => Promise<ActionState>
  ) => {
    const fd = new FormData();
    fd.set("itemId", item.id);
    startTransition(async () => {
      const res = await action({}, fd);
      if (res.success) onClose();
      else setMsg(res);
    });
  };

  // Throwing an item away may reward a wheel spin (🎡 in the success text). On a
  // win keep the dialog open so the player actually sees the reward; otherwise
  // close as usual.
  const doDiscard = () => {
    const fd = new FormData();
    fd.set("itemId", item.id);
    startTransition(async () => {
      const res = await discardHeroItem({}, fd);
      if (res.success?.includes("🎡")) setMsg(res);
      else if (res.success) onClose();
      else setMsg(res);
    });
  };

  const doUpgrade = () => {
    const target = upgradeToLevel;
    if (target == null) return;
    const fd = new FormData();
    fd.set("itemId", item.id);
    startTransition(async () => {
      const res = await upgradeHeroItem({}, fd);
      setMsg(res);
      if (res.success) setLevel(target);
    });
  };

  const titleId = `item-dialog-${item.id}`;

  return (
    <Dialog open onClose={onClose} labelledBy={titleId}>
      {/* header */}
      <div className="flex items-start gap-4">
        <div className="w-24 shrink-0">
          <ItemTile
            slug={slotMeta.slug}
            icon={slotMeta.icon}
            level={level}
            rarity={uiRarity(rarity)}
            size="lg"
          />
        </div>
        <div className="flex-1 pt-1">
          <h2 id={titleId} className={`text-lg font-black ${rarityMeta.tone}`}>
            {itemDisplayName(item.slot, level)}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            דרגה: <span className={rarityMeta.tone}>{rarityMeta.label}</span>
            {" · "}רמת פריט:{" "}
            <span className="nums text-zinc-200">{level}</span>
          </p>
          {equipped && (
            <span className="mt-2 inline-block rounded bg-emerald-600/90 px-2 py-0.5 text-[10px] font-black text-white">
              לבוש כעת
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="סגור"
          className="btn btn-ghost -mt-1 h-8 w-8 !p-0 text-base"
        >
          ✕
        </button>
      </div>

      <div className="rule-gold my-4" />

      {/* stats */}
      <div className="space-y-2 text-sm">
        {resourceLines.length > 0 ? (
          <div className="space-y-1">
            {resourceLines.map((line) => (
              <div key={line.label} className="flex items-center justify-between">
                <span className="text-zinc-400">
                  {line.icon} {line.label}
                </span>
                <span className="nums font-black text-emerald-400" dir="ltr">
                  +{formatBonus(line.value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">
              {statMeta.icon} {statMeta.label}
            </span>
            <span className="nums font-black text-emerald-400" dir="ltr">
              +{formatBonus(bonus.value)}{unit}
            </span>
          </div>
        )}
        <p className="text-[11px] leading-relaxed text-zinc-500">
          {statMeta.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">דרישת רמה</span>
          <span
            className={`nums text-xs font-bold ${
              meetsLevel ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {meetsLevel ? "✓" : "✗"} גיבור רמה {level}
          </span>
        </div>
      </div>

      {/* upgrade preview */}
      {upgradeToLevel != null && nextTier != null && (
        <div className="panel-inset mt-4 rounded-lg p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">שדרוג לרמה</span>
            <span className={`font-black ${RARITY_META[nextTier].tone}`}>
              <span className="nums" dir="ltr">{upgradeToLevel}</span> · {RARITY_META[nextTier].label}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-zinc-500">בונוס לאחר שדרוג</span>
            <span className="nums font-bold text-emerald-300" dir="ltr">
              +{formatBonus(bonus.value)}{unit} → +{formatBonus(nextBonus ?? 0)}{unit}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-zinc-500">עלות</span>
            <span
              className={`nums font-bold ${canAfford ? "text-gold-bright" : "text-red-400"}`}
              dir="ltr"
            >
              🪙 {upgradeCost?.toLocaleString("he-IL")}
            </span>
          </div>
        </div>
      )}

      {(msg.error || msg.success) && (
        <p
          className={`mt-3 text-xs font-semibold ${
            msg.error ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {msg.error ?? msg.success}
        </p>
      )}

      {/* actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {equipped ? (
          <button
            onClick={() => run(unequipHeroItem)}
            disabled={pending}
            className="btn btn-ghost col-span-2 py-2 text-sm"
          >
            הסר לתיק
          </button>
        ) : (
          <button
            onClick={() => run(equipHeroItem)}
            disabled={pending || !meetsLevel}
            title={meetsLevel ? undefined : `עלה לרמה ${level} כדי ללבוש`}
            className="btn btn-gold col-span-2 py-2 text-sm"
          >
            {meetsLevel ? "לבש" : `דרוש רמה ${level}`}
          </button>
        )}

        <button
          onClick={doUpgrade}
          disabled={pending || upgradeToLevel == null || !canAfford}
          title={
            upgradeToLevel == null
              ? "הפריט כבר ברמה הגבוהה ביותר"
              : !canAfford
                ? "אין מספיק זהב"
                : undefined
          }
          className="btn btn-dark py-2 text-sm"
        >
          {upgradeToLevel == null ? "רמה מקסימלית" : "שדרג"}
        </button>

        {confirmDiscard ? (
          <button
            onClick={doDiscard}
            disabled={pending}
            className="btn py-2 text-sm font-black text-white"
            style={{ background: "linear-gradient(180deg,#b91c1c,#7f1d1d)" }}
          >
            אישור זריקה
          </button>
        ) : (
          <button
            onClick={() => setConfirmDiscard(true)}
            disabled={pending}
            className="btn btn-ghost py-2 text-sm text-red-300"
          >
            זרוק
          </button>
        )}
      </div>

      {confirmDiscard && (
        <p className="mt-2 text-center text-xs text-amber-300/80">
          🎡 סיכוי {Math.round(discardWheelSpinChance(level) * 100)}% לזכות בסיבוב
          גלגל מזל מהזריקה
        </p>
      )}
    </Dialog>
  );
}
