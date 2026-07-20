"use client";

import { useState, useTransition } from "react";
import type { HeroRarity } from "@prisma/client";
import Link from "next/link";
import { discardHeroItems, upgradeHeroItems } from "@/server/actions/hero";
import type { ActionState } from "@/server/actions/game";
import { ItemTile } from "@/components/game/ItemTile";
import { ItemDialog } from "@/components/game/ItemDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Tip } from "@/components/ui/Tip";
import {
  HERO_BAG_CAPACITY,
  RARITY_META,
  RARITY_ORDER,
  SLOT_META,
  itemUpgradeCost,
  nextTierLevel,
} from "@/lib/game/hero";
import { itemDetails, uiRarity, type HeroItemView } from "@/components/game/heroItemView";

/** Identical items (same slot+level) merged into one tile, keeping every id. */
type BagStack = {
  key: string;
  slot: HeroItemView["slot"];
  level: number;
  rarity: HeroRarity;
  ids: string[];
};

/**
 * The hero's bag: unequipped items in a 24-slot grid with rarity filters.
 * Clicking an item opens its detail dialog (wear / upgrade / discard). A
 * selection mode lets the player mark many items and discard or upgrade them
 * all at once.
 */
export function HeroBag({
  items,
  heroLevel,
  gold,
}: {
  items: HeroItemView[];
  heroLevel: number;
  gold: number;
}) {
  const [filter, setFilter] = useState<HeroRarity | null>(null);
  const [openItem, setOpenItem] = useState<HeroItemView | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmUpgrade, setConfirmUpgrade] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<ActionState>({});

  const rarityRank = (r: HeroRarity) => RARITY_ORDER.indexOf(r);

  // Merge identical items (same slot+level look and perform identically) into a
  // single stack, keeping every underlying id so bulk actions still apply to
  // the whole stack.
  const stackMap = new Map<string, BagStack>();
  for (const it of items) {
    const key = `${it.slot}-${it.level}`;
    const cur = stackMap.get(key);
    if (cur) cur.ids.push(it.id);
    else
      stackMap.set(key, {
        key,
        slot: it.slot,
        level: it.level,
        rarity: it.rarity,
        ids: [it.id],
      });
  }
  const stacks = [...stackMap.values()].sort(
    (a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.level - a.level
  );
  const visible = filter ? stacks.filter((s) => s.rarity === filter) : stacks;
  // Pad only to complete the last row so the grid stays tidy; real capacity is
  // shown in the header, and the grid scrolls past ~4 rows.
  const COLS = 6;
  const emptySlots =
    visible.length === 0 ? COLS : (COLS - (visible.length % COLS)) % COLS;

  // Expand the selected stacks back to the individual item ids the actions need.
  const selectedIds = stacks
    .filter((s) => selected.has(s.key))
    .flatMap((s) => s.ids);
  const selectedIdSet = new Set(selectedIds);

  const allVisibleSelected =
    visible.length > 0 && visible.every((s) => selected.has(s.key));

  const toggleSelect = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selectAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((s) => s.key)));

  const exitSelect = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const runBulk = (
    action: (prev: ActionState, fd: FormData) => Promise<ActionState>
  ) => {
    if (selectedIds.length === 0) return;
    const fd = new FormData();
    fd.set("itemIds", selectedIds.join(","));
    startTransition(async () => {
      const res = await action({}, fd);
      setMsg(res);
      if (res.success) exitSelect();
    });
  };

  const selectedCount = selectedIds.length;
  // Selected items that can still be upgraded (not yet legendary), with the
  // gold each costs — the total drives the confirmation dialog.
  const selectedUpgrades = items
    .filter((i) => selectedIdSet.has(i.id) && nextTierLevel(i.level) !== null)
    .map((i) => ({ item: i, cost: itemUpgradeCost(i.level) ?? 0 }));
  const selectedUpgradeable = selectedUpgrades.length;
  const totalUpgradeCost = selectedUpgrades.reduce((sum, u) => sum + u.cost, 0);
  const canAffordAll = gold >= totalUpgradeCost;

  const confirmUpgradeAll = () => {
    setConfirmUpgrade(false);
    runBulk(upgradeHeroItems);
  };

  return (
    <div className="panel-gold rounded-xl p-4">
      <div className="flex items-center justify-between">
        <Tip tip="חפצים שנלכדו בקרבות וממתינים בתיק. לחיצה על חפץ פותחת את פרטיו — שם אפשר ללבוש, לשדרג או לזרוק.">
          <h2 className="cursor-help text-base font-bold tracking-wide text-gold-bright">
            התיק
          </h2>
        </Tip>
        <div className="flex items-center gap-2">
          {items.length > 0 &&
            (selecting ? (
              <button
                onClick={exitSelect}
                className="btn btn-ghost px-3 py-1.5 text-xs"
              >
                בטל
              </button>
            ) : (
              <button
                onClick={() => setSelecting(true)}
                className="btn btn-ghost px-3 py-1.5 text-xs"
              >
                בחירה
              </button>
            ))}
          <Tip tip="הקטלוג המלא: כל החפצים הקיימים במשחק, מרמה 1 עד 100 בכל הדרגות" side="bottom">
            <Link href="/game/hero/items" className="btn btn-ghost px-3 py-1.5 text-xs">
              לכל הפריטים
            </Link>
          </Tip>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
        {selecting ? (
          <button
            onClick={selectAll}
            disabled={visible.length === 0}
            className="btn btn-ghost px-3 py-1 text-xs"
          >
            {allVisibleSelected ? "נקה בחירה" : "סמן הכל"}
          </button>
        ) : (
          <Tip tip={`מקום בתיק: עד ${HERO_BAG_CAPACITY} חפצים. כשהתיק מלא — לא נלכדים חפצים חדשים בקרב!`}>
            <span className="cursor-help">סלוטים</span>
          </Tip>
        )}
        <span className="nums" dir="ltr">
          {selecting ? `${selectedCount} נבחרו` : `${items.length}/${HERO_BAG_CAPACITY}`}
        </span>
      </div>

      <div className="mt-2 max-h-[21rem] overflow-y-auto pr-0.5">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {visible.map((stack) => {
            const isSelected = selected.has(stack.key);
            const view: HeroItemView = {
              id: stack.ids[0],
              slot: stack.slot,
              level: stack.level,
              rarity: stack.rarity,
            };
            return (
              <button
                key={stack.key}
                type="button"
                onClick={() =>
                  selecting ? toggleSelect(stack.key) : setOpenItem(view)
                }
                className={`relative block w-full rounded-xl transition ${
                  selecting && isSelected
                    ? "ring-2 ring-gold ring-offset-2 ring-offset-black"
                    : ""
                }`}
                aria-label={`${SLOT_META[stack.slot].label} רמה ${stack.level}${
                  stack.ids.length > 1 ? ` ×${stack.ids.length}` : ""
                }`}
              >
                <ItemTile
                  slug={SLOT_META[stack.slot].slug}
                  icon={SLOT_META[stack.slot].icon}
                  level={stack.level}
                  rarity={uiRarity(stack.rarity)}
                  details={
                    selecting
                      ? undefined
                      : itemDetails(view, heroLevel, { hint: "לחץ לפרטים" })
                  }
                />
                {stack.ids.length > 1 && (
                  <span
                    aria-hidden
                    className="nums absolute left-1 top-1 z-10 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-black text-gold-bright"
                    dir="ltr"
                  >
                    ×{stack.ids.length}
                  </span>
                )}
                {selecting && (
                  <span
                    aria-hidden
                    className={`absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-black ${
                      isSelected
                        ? "border-gold bg-gold text-black"
                        : "border-white/50 bg-black/70 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="panel-inset flex aspect-square items-center justify-center rounded-xl text-zinc-700"
            >
              <span aria-hidden className="text-xl">
                ◇
              </span>
            </div>
          ))}
        </div>
      </div>

      {(msg.error || msg.success) && (
        <p
          className={`mt-3 text-xs font-semibold ${
            msg.error ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {msg.error ?? msg.success}
        </p>
      )}

      {/* bulk action bar */}
      {selecting && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => runBulk(discardHeroItems)}
            disabled={pending || selectedCount === 0}
            className="btn py-2 text-sm font-black text-white disabled:opacity-45"
            style={{ background: "linear-gradient(180deg,#b91c1c,#7f1d1d)" }}
          >
            זרוק הכל ({selectedCount})
          </button>
          <button
            onClick={() => setConfirmUpgrade(true)}
            disabled={pending || selectedUpgradeable === 0}
            title={selectedUpgradeable === 0 ? "אין פריטים לשדרוג מבין הנבחרים" : undefined}
            className="btn btn-dark py-2 text-sm"
          >
            שדרג הכל ({selectedUpgradeable})
          </button>
        </div>
      )}

      <div className="rule-gold my-4" />

      {/* rarity filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`btn px-3 py-1.5 text-xs ${
            filter === null ? "btn-gold" : "btn-ghost text-zinc-300"
          }`}
        >
          הכל ({items.length})
        </button>
        {RARITY_ORDER.map((r) => {
          const count = items.filter((i) => i.rarity === r).length;
          return (
            <button
              key={r}
              onClick={() => setFilter(filter === r ? null : r)}
              className={`btn px-3 py-1.5 text-xs ${
                filter === r ? "btn-gold" : `btn-ghost ${RARITY_META[r].tone}`
              }`}
            >
              {RARITY_META[r].label} ({count})
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        חפצים נלכדים בניצחון בתקיפה על שחקנים אחרים — ככל שהחפץ נדיר יותר, כך
        קשה יותר ללכוד אותו.
      </p>

      {openItem && (
        <ItemDialog
          item={openItem}
          heroLevel={heroLevel}
          gold={gold}
          equipped={false}
          onClose={() => setOpenItem(null)}
        />
      )}

      {confirmUpgrade && (
        <Dialog
          open
          onClose={() => setConfirmUpgrade(false)}
          labelledBy="confirm-upgrade-title"
        >
          <h2
            id="confirm-upgrade-title"
            className="text-lg font-black text-gold-bright"
          >
            שדרוג חפצים
          </h2>
          <p className="mt-2 text-sm text-zinc-300">
            עומדים לשדרג{" "}
            <span className="nums font-bold text-zinc-100">
              {selectedUpgradeable}
            </span>{" "}
            חפצים לדרגה הבאה.
          </p>

          <div className="panel-inset mt-4 rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">עלות כוללת</span>
              <span
                className={`nums font-black ${
                  canAffordAll ? "text-gold-bright" : "text-red-400"
                }`}
                dir="ltr"
              >
                <Icon name="gold" size={14} className="inline align-[-2px]" /> {totalUpgradeCost.toLocaleString("he-IL")}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-zinc-500">הזהב שלך</span>
              <span className="nums text-xs font-bold text-zinc-300" dir="ltr">
                <Icon name="gold" size={14} className="inline align-[-2px]" /> {Math.floor(gold).toLocaleString("he-IL")}
              </span>
            </div>
          </div>

          {!canAffordAll && (
            <p className="mt-3 text-xs font-semibold text-amber-300">
              אין מספיק זהב לשדרוג הכל — ישודרגו הזולים ביותר עד שייגמר הזהב.
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setConfirmUpgrade(false)}
              disabled={pending}
              className="btn btn-ghost py-2 text-sm"
            >
              ביטול
            </button>
            <button
              onClick={confirmUpgradeAll}
              disabled={pending}
              className="btn btn-gold py-2 text-sm"
            >
              {pending ? "משדרג…" : "אישור שדרוג"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
